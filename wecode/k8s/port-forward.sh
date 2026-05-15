#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# port-forward.sh - UNIFIED VERSION (PIPELINE + MANUAL)
# ./port-forward.sh start
# ./port-forward.sh status
# ./port-forward.sh stop
# ─────────────────────────────────────────────────────────────────

# 1. Environment for Jenkins reliability
# Only use Jenkins KUBECONFIG if it exists and is readable, otherwise use default
JENKINS_KUBE="/var/lib/jenkins/.kube/config"
if [ -r "$JENKINS_KUBE" ]; then
    export KUBECONFIG="$JENKINS_KUBE"
fi

export JENKINS_NODE_COOKIE=dontKillMe
export BUILD_ID=dontKillMe

# Find absolute paths
KUBECTL_BIN=$(which kubectl)
LSOF_BIN=$(which lsof)

# 2. Configuration
CURRENT_USER=$(whoami)
NAMESPACE="wecode"
LOG_FILE="/tmp/wecode-port-forwards-${CURRENT_USER}.log"

declare -A SERVICES=(
    ["api-gateway"]="8090:8090"
    ["auth-service"]="8085:8085"
    ["submission-service"]="8081:8081"
    ["result-service"]="8083:8083"
    ["admin-service"]="8084:8084"
    ["wecode-frontend"]="5173:80"
)

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

kill_port_owner() {
    local port=$1
    local pid=$($LSOF_BIN -ti:"${port}")
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}⚠️  Port $port is occupied by PID $pid. Clearing...${NC}"
        # 1. Try normal kill
        kill -9 $pid 2>/dev/null || {
            # 2. Try non-interactive sudo (for Pipeline/Jenkins)
            sudo -n kill -9 $pid 2>/dev/null || {
                # 3. Try interactive sudo (for you/Local)
                echo -e "${YELLOW}🔐 Sudo password may be required to clear port $port...${NC}"
                sudo kill -9 $pid
            }
        }
    fi
}

stop_forwards() {
    echo "Stopping all forwards..."
    for PORTS in "${SERVICES[@]}"; do
        LOCAL_PORT="${PORTS%%:*}"
        kill_port_owner "$LOCAL_PORT"
    done
    echo -e "${GREEN}Cleanup complete.${NC}"
}

start_forwards() {
    # Self-cleaning: Always stop before starting to prevent zombie tunnels
    stop_forwards

    echo "Starting detached port forwarding for: $CURRENT_USER"
    touch "$LOG_FILE"
    echo "--- Start Log: $(date) ---" >> "$LOG_FILE"

    for SERVICE in "${!SERVICES[@]}"; do
        PORTS="${SERVICES[$SERVICE]}"
        LOCAL_PORT="${PORTS%%:*}"
        REMOTE_PORT="${PORTS##*:}"

        # Start port forward in background (detached)
        # Using full path and explicit nohup redirection
        nohup $KUBECTL_BIN port-forward "svc/$SERVICE" "${LOCAL_PORT}:${REMOTE_PORT}" -n "$NAMESPACE" --address 0.0.0.0 >> "$LOG_FILE" 2>&1 &
        
        echo -e "  ${GREEN}ACTIVE${NC}  $SERVICE → localhost:$LOCAL_PORT"
    done

    echo -e "${GREEN}✅ All tunnels established.${NC}"
}

status_forwards() {
    echo "Active port forwards (system-wide):"
    ps aux | grep "kubectl port-forward" | grep -v grep | grep "$NAMESPACE" || echo "None found."
}

case "${1:-start}" in
    stop)   stop_forwards ;;
    status) status_forwards ;;
    *)      start_forwards ;;
esac
