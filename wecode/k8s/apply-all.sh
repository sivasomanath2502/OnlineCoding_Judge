#!/bin/bash
# apply-all.sh
# Run this from inside the k8s/ directory:
#   cd wecode/k8s && bash apply-all.sh
set -e

echo "🚀 Deploying WeCode to Kubernetes..."

# ─── Step 0a: MySQL hostPath — ensure exists, NEVER auto-wipe ────────────────
# Data persists across deploys. To wipe intentionally, run:
#   CLEAN_MYSQL=true bash apply-all.sh
CLEAN_MYSQL="${CLEAN_MYSQL:-false}"

if [ "$CLEAN_MYSQL" = "true" ]; then
  echo "🧹 CLEAN_MYSQL=true — wiping MySQL data directory on Minikube node..."
  minikube ssh "sudo rm -rf /data/mysql && sudo mkdir -p /data/mysql && sudo chmod 777 /data/mysql"
  echo "✅ MySQL data directory wiped and recreated."
else
  echo "📁 Ensuring MySQL data directory exists (data preserved)..."
  minikube ssh "sudo mkdir -p /data/mysql && sudo chmod 777 /data/mysql"
  echo "✅ MySQL data directory ready."
fi

# ─── Step 0b: Ensure Elasticsearch hostPath exists (never wipe) ──────────────
# We do NOT wipe ES data — logs must persist across restarts.
# Only ensure the directory exists with correct permissions.
echo "📁 Ensuring Elasticsearch data directory exists..."
minikube ssh "sudo mkdir -p /data/elasticsearch && sudo chmod 777 /data/elasticsearch"
echo "✅ Elasticsearch data directory ready."

# ─── Step 1a: Namespace ───────────────────────────────────────────────────────
kubectl apply -f namespace.yml

# ─── Step 1b: Reset Released PVs so they can rebind ─────────────────────────
# After namespace deletion, PVs with Retain policy go to "Released".
# Kubernetes won't rebind a Released PV until claimRef is cleared.
# This patches out the UID (not the whole claimRef) so the PV becomes
# Available again and rebinds to the same mysql-pvc.
PV_PHASE=$(kubectl get pv mysql-pv -o jsonpath='{.status.phase}' 2>/dev/null || echo "NotFound")
if [ "$PV_PHASE" = "Released" ]; then
  echo "🔄 mysql-pv is Released — clearing claimRef.uid so it can rebind..."
  kubectl patch pv mysql-pv --type=json \
    -p='[{"op":"remove","path":"/spec/claimRef/uid"},{"op":"remove","path":"/spec/claimRef/resourceVersion"}]'
  echo "✅ mysql-pv reset to Available."
fi

# ─── Step 2: ConfigMap and Secrets ───────────────────────────────────────────
kubectl apply -f configmap.yml
kubectl apply -f secret.yml
kubectl apply -f auth-secret.yaml

# ─── Step 3: Infrastructure ───────────────────────────────────────────────────
kubectl apply -f mysql/
kubectl apply -f rabbitmq/
kubectl apply -f redis/

# ─── Step 4: Wait for infrastructure ─────────────────────────────────────────
echo "⏳ Waiting for MySQL to be ready (may take up to 5 min on first run)..."
kubectl wait --for=condition=ready pod -l app=mysql \
  -n wecode --timeout=300s
echo "⏳ Waiting for RabbitMQ..."
kubectl wait --for=condition=ready pod -l app=rabbitmq \
  -n wecode --timeout=120s
echo "⏳ Waiting for Redis..."
kubectl wait --for=condition=ready pod -l app=redis \
  -n wecode --timeout=60s
echo "✅ Infrastructure ready."

# ─── Step 5: ELK Stack ───────────────────────────────────────────────────────
echo "📊 Deploying ELK Stack..."
kubectl apply -f elk/

echo "⏳ Waiting for Elasticsearch (may take 2-3 min on first run)..."
kubectl wait --for=condition=ready pod -l app=elasticsearch \
  -n wecode --timeout=300s
echo "✅ Elasticsearch ready."

echo "⏳ Waiting for Logstash..."
kubectl wait --for=condition=ready pod -l app=logstash \
  -n wecode --timeout=300s
echo "✅ Logstash ready."

echo "⏳ Waiting for Kibana (non-blocking — takes 3-4 min)..."
kubectl wait --for=condition=ready pod -l app=kibana \
  -n wecode --timeout=300s \
  || echo "⚠️  Kibana still initializing — access it in a few minutes at http://$(minikube ip):31601"
echo "✅ ELK Stack ready."

# ─── Step 6: Application services ────────────────────────────────────────────
echo "🚀 Deploying application services..."
kubectl apply -f submission-service/
kubectl apply -f worker-service/
kubectl apply -f result-service/
kubectl apply -f admin-service/
kubectl apply -f api-gateway/
kubectl apply -f wecode-frontend/

# ─── Step 7: Wait for services ───────────────────────────────────────────────
echo "⏳ Waiting for services to be ready..."
kubectl wait --for=condition=ready pod -l app=submission-service \
  -n wecode --timeout=300s
kubectl wait --for=condition=ready pod -l app=result-service \
  -n wecode --timeout=300s
kubectl wait --for=condition=ready pod -l app=api-gateway \
  -n wecode --timeout=300s
echo "✅ All services deployed!"

# ─── Step 8: Port-forwarding ─────────────────────────────────────────────────
echo "🔌 Automating port-forwarding for local access..."
bash port-forward.sh

# ─── Final status ─────────────────────────────────────────────────────────────
echo ""
echo "📋 Pod status:"
kubectl get pods -n wecode
echo ""
echo "🌐 Access URLs:"
echo "  Frontend    : http://$(minikube ip):30000"
echo "  API Gateway : http://$(minikube ip):30090"
echo "  RabbitMQ UI : http://$(minikube ip):31673"
echo "  Kibana      : http://$(minikube ip):31601"
echo "  Elasticsearch: http://$(minikube ip):9200 (ClusterIP — use port-forward)"/$(minikube ip):9200 (ClusterIP — use port-forward)"