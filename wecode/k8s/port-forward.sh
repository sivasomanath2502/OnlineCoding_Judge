#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# port-forward.sh - HARDENED VERSION FOR JENKINS
# Starts or stops port forwarding for all WeCode services in K8s.
#      Usage:
#          ./port-forward.sh          → start all port forwards
#          ./port-forward.sh stop     → stop all port forwards
#          ./port-forward.sh status   → show what is running
# ─────────────────────────────────────────────────────────────────

# 1. Hardcode environment for background reliability
export KUBECONFIG=${KUBECONFIG:-/var/lib/jenkins/.kube/config}
export JENKINS_NODE_COOKIE=dontKillMe
export BUILD_ID=dontKillMe

NAMESPACE="wecode"
PID_FILE="/tmp/wecode-port-forwards.pid"
LOG_FILE="/tmp/wecode-port-forwards.log"

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
NC='\033[0m'

start_forwards() {
    echo "Starting detached port forwarding..."
    
    # Ensure logs exist and are writable
    touch "$LOG_FILE" "$PID_FILE"
    chmod 666 "$LOG_FILE" "$PID_FILE"

    for SERVICE in "${!SERVICES[@]}"; do
        PORTS="${SERVICES[$SERVICE]}"
        LOCAL_PORT="${PORTS%%:*}"
        REMOTE_PORT="${PORTS##*:}"

        # Kill any existing forward on this port
        fuser -k "${LOCAL_PORT}/tcp" &>/dev/null || true

        # DOUBLE FORK + NOHUP + DISOWN
        # This makes the process an orphan of PID 1
        ( ( nohup kubectl port-forward "svc/$SERVICE" "${LOCAL_PORT}:${REMOTE_PORT}" -n "$NAMESPACE" --address 0.0.0.0 >> "$LOG_FILE" 2>&1 & ) & )
        
        echo -e "  ${GREEN}QUEUED${NC}  $SERVICE → localhost:$LOCAL_PORT"
    done

    echo "Port forwards are now running in the background (detached)."
}

stop_forwards() {
    echo "Stopping all forwards..."
    for PORTS in "${SERVICES[@]}"; do
        LOCAL_PORT="${PORTS%%:*}"
        fuser -k "${LOCAL_PORT}/tcp" &>/dev/null || true
    done
    echo "Done."
}

case "${1:-start}" in
    stop) stop_forwards ;;
    *)    start_forwards ;;
esac
