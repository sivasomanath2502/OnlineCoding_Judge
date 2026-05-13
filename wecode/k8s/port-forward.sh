#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# port-forward.sh
# Starts or stops port forwarding for all WeCode services in K8s.
# Usage:
#   ./port-forward.sh          → start all port forwards
#   ./port-forward.sh stop     → stop all port forwards
#   ./port-forward.sh status   → show what is running
# ─────────────────────────────────────────────────────────────────

NAMESPACE="wecode"
PID_FILE="/tmp/wecode-port-forwards.pid"
LOG_FILE="/tmp/wecode-port-forwards.log"

# ─── Service → local:remote port mapping ─────────────────────────
declare -A SERVICES=(
    ["api-gateway"]="8090:8090"
    ["auth-service"]="8085:8085"
    ["submission-service"]="8081:8081"
    ["result-service"]="8083:8083"
    ["admin-service"]="8084:8084"
    ["wecode-frontend"]="5173:80"
    ["rabbitmq"]="15672:15672"
    ["kibana"]="5601:5601"
)

# ─── Colors ───────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

start_forwards() {
    echo -e "${BLUE}Starting port forwarding for WeCode services...${NC}"
    echo ""

    # Check minikube is running
    if ! kubectl get nodes &>/dev/null; then
        echo -e "${RED}ERROR: Cannot connect to Kubernetes cluster.${NC}"
        echo "Make sure minikube is running: minikube start"
        exit 1
    fi

    # Check namespace exists
    if ! kubectl get namespace $NAMESPACE &>/dev/null; then
        echo -e "${RED}ERROR: Namespace '$NAMESPACE' not found.${NC}"
        echo "Run: kubectl apply -f namespace.yaml"
        exit 1
    fi

    # Clear old PID file
    > "$PID_FILE"
    > "$LOG_FILE"

    local started=0
    local skipped=0

    for SERVICE in "${!SERVICES[@]}"; do
        PORTS="${SERVICES[$SERVICE]}"
        LOCAL_PORT="${PORTS%%:*}"
        REMOTE_PORT="${PORTS##*:}"

        # Check if pod is running for this service
        POD_STATUS=$(kubectl get pods -n $NAMESPACE \
            -l app=$SERVICE \
            --field-selector=status.phase=Running \
            -o name 2>/dev/null | head -1)

        if [ -z "$POD_STATUS" ]; then
            echo -e "  ${YELLOW}SKIP${NC}  $SERVICE — pod not running yet"
            ((skipped++))
            continue
        fi

        # Kill any existing forward on this port
        fuser -k "${LOCAL_PORT}/tcp" &>/dev/null || true

        # Start port forward in background
        kubectl port-forward \
            "svc/$SERVICE" \
            "${LOCAL_PORT}:${REMOTE_PORT}" \
            -n "$NAMESPACE" \
            >> "$LOG_FILE" 2>&1 &

        PF_PID=$!
        echo "$PF_PID $SERVICE $LOCAL_PORT" >> "$PID_FILE"

        # Wait briefly to check it started
        sleep 0.5
        if kill -0 $PF_PID 2>/dev/null; then
            echo -e "  ${GREEN}OK${NC}    $SERVICE → localhost:$LOCAL_PORT"
            ((started++))
        else
            echo -e "  ${RED}FAIL${NC}  $SERVICE — port forward failed (check $LOG_FILE)"
        fi
    done

    echo ""
    echo -e "${GREEN}Started: $started   Skipped: $skipped${NC}"
    echo ""
    echo -e "${BLUE}Access URLs:${NC}"
    echo "  Frontend     → http://localhost:5173"
    echo "  API Gateway  → http://localhost:8090"
    echo "  Auth Service → http://localhost:8085"
    echo "  RabbitMQ UI  → http://localhost:15672  (guest/guest)"
    echo "  Kibana       → http://localhost:5601"
    echo ""
    echo -e "PIDs saved to: $PID_FILE"
    echo -e "Run ${YELLOW}./port-forward.sh stop${NC} to stop all."
}

stop_forwards() {
    echo -e "${BLUE}Stopping all WeCode port forwards...${NC}"

    if [ ! -f "$PID_FILE" ]; then
        echo "No PID file found. Nothing to stop."
        return
    fi

    local stopped=0
    while IFS= read -r line; do
        PID=$(echo $line | awk '{print $1}')
        SERVICE=$(echo $line | awk '{print $2}')
        PORT=$(echo $line | awk '{print $3}')

        if kill -0 $PID 2>/dev/null; then
            kill $PID 2>/dev/null
            echo -e "  ${GREEN}STOPPED${NC}  $SERVICE (PID $PID, port $PORT)"
            ((stopped++))
        else
            echo -e "  ${YELLOW}ALREADY GONE${NC}  $SERVICE (PID $PID)"
        fi
    done < "$PID_FILE"

    rm -f "$PID_FILE"
    echo ""
    echo -e "Stopped $stopped port forwards."
}

status_forwards() {
    echo -e "${BLUE}WeCode port forward status:${NC}"
    echo ""

    if [ ! -f "$PID_FILE" ]; then
        echo "No port forwards tracked. Run ./port-forward.sh to start."
        return
    fi

    while IFS= read -r line; do
        PID=$(echo $line | awk '{print $1}')
        SERVICE=$(echo $line | awk '{print $2}')
        PORT=$(echo $line | awk '{print $3}')

        if kill -0 $PID 2>/dev/null; then
            echo -e "  ${GREEN}RUNNING${NC}  $SERVICE → localhost:$PORT (PID $PID)"
        else
            echo -e "  ${RED}DEAD${NC}     $SERVICE → localhost:$PORT (PID $PID)"
        fi
    done < "$PID_FILE"

    echo ""
    echo -e "Log file: $LOG_FILE"
}

# ─── Main ─────────────────────────────────────────────────────────
case "${1:-start}" in
    stop)    stop_forwards ;;
    status)  status_forwards ;;
    start|*) start_forwards ;;
esac