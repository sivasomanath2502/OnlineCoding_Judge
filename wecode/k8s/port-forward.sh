#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# port-forward.sh - USER-SPECIFIC HARDENED VERSION
# ─────────────────────────────────────────────────────────────────

# 1. Environment for Jenkins reliability
export KUBECONFIG=${KUBECONFIG:-/var/lib/jenkins/.kube/config}
export JENKINS_NODE_COOKIE=dontKillMe
export BUILD_ID=dontKillMe

# 2. User-specific files to avoid permission conflicts
CURRENT_USER=$(whoami)
NAMESPACE="wecode"
PID_FILE="/tmp/wecode-port-forwards-${CURRENT_USER}.pid"
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
NC='\033[0m'

start_forwards() {
    echo "Starting detached port forwarding for user: $CURRENT_USER"
    
    # Ensure files exist
    touch "$LOG_FILE" "$PID_FILE"
    > "$PID_FILE" # Clear old PIDs

    for SERVICE in "${!SERVICES[@]}"; do
        PORTS="${SERVICES[$SERVICE]}"
        LOCAL_PORT="${PORTS%%:*}"
        REMOTE_PORT="${PORTS##*:}"

        # Kill any existing forward ON THIS PORT (any user)
        # We use sudo only if available, otherwise just try
        fuser -k "${LOCAL_PORT}/tcp" &>/dev/null || true

        # Start port forward
        # Using 0.0.0.0 for reachability
        # Double fork to ensure it's orphaned from Jenkins
        ( ( nohup kubectl port-forward "svc/$SERVICE" "${LOCAL_PORT}:${REMOTE_PORT}" -n "$NAMESPACE" --address 0.0.0.0 >> "$LOG_FILE" 2>&1 & ) & )
        
        echo -e "  ${GREEN}QUEUED${NC}  $SERVICE → localhost:$LOCAL_PORT"
    done

    echo "Port forwards are now running. Logs: $LOG_FILE"
}

stop_forwards() {
    echo "Stopping all forwards for user $CURRENT_USER..."
    for PORTS in "${SERVICES[@]}"; do
        LOCAL_PORT="${PORTS%%:*}"
        fuser -k "${LOCAL_PORT}/tcp" &>/dev/null || true
    done
    echo "Done."
}

status_forwards() {
    echo "Active port forwards for user $CURRENT_USER:"
    ps aux | grep "kubectl port-forward" | grep -v grep | grep "$NAMESPACE" || echo "None found."
}

case "${1:-start}" in
    stop)   stop_forwards ;;
    status) status_forwards ;;
    *)      start_forwards ;;
esac
