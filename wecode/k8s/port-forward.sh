#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# port-forward.sh - PERMANENT FIX (AGRESSIVE PORT CLEARING)
# ─────────────────────────────────────────────────────────────────

# 1. Environment
JENKINS_KUBE="/var/lib/jenkins/.kube/config"
if [ -r "$JENKINS_KUBE" ]; then
    export KUBECONFIG="$JENKINS_KUBE"
fi
export JENKINS_NODE_COOKIE=dontKillMe
export BUILD_ID=dontKillMe

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
YELLOW='\033[1;33m'
NC='\033[0m'

kill_port_owner() {
    local port=$1
    # Check if anything is listening on this port (TCP)
    # We use sudo -n lsof to see processes from other users
    local pid=$(sudo -n $LSOF_BIN -ti:"${port}" 2>/dev/null || $LSOF_BIN -ti:"${port}")
    
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}⚠️  Port $port is occupied by PID $pid. Force clearing...${NC}"
        # Use sudo -n for the pipeline (Jenkins) and standard sudo for manual runs
        sudo -n kill -9 $pid 2>/dev/null || sudo kill -9 $pid 2>/dev/null
    fi
}

stop_forwards() {
    echo "Stopping all processes on WeCode ports..."
    for PORTS in "${SERVICES[@]}"; do
        LOCAL_PORT="${PORTS%%:*}"
        kill_port_owner "$LOCAL_PORT"
    done
}

start_forwards() {
    # 1. Clean the ports first
    stop_forwards

    echo "Starting detached port forwarding for: $CURRENT_USER"
    touch "$LOG_FILE"
    echo "--- Start Log: $(date) ---" >> "$LOG_FILE"

    for SERVICE in "${!SERVICES[@]}"; do
        PORTS="${SERVICES[$SERVICE]}"
        LOCAL_PORT="${PORTS%%:*}"
        REMOTE_PORT="${PORTS##*:}"

        # 2. Start the new tunnel
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
