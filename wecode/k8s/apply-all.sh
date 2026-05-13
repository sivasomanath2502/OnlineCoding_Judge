#!/bin/bash
# apply-all.sh
# Run this from inside the k8s/ directory:
#   cd wecode/k8s && bash apply-all.sh
set -e

echo "🚀 Deploying WeCode to Kubernetes..."

# ─── Step 0a: MySQL hostPath — ensure exists, NEVER auto-wipe ────────────────
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
echo "📁 Ensuring Elasticsearch data directory exists..."
minikube ssh "sudo mkdir -p /data/elasticsearch && sudo chmod 777 /data/elasticsearch"
echo "✅ Elasticsearch data directory ready."

# ─── Step 1: Namespace, Config, and Secrets ──────────────────────────────────
kubectl apply -f namespace.yml

# Reset Released PVs so they can rebind
PV_PHASE=$(kubectl get pv mysql-pv -o jsonpath='{.status.phase}' 2>/dev/null || echo "NotFound")
if [ "$PV_PHASE" = "Released" ]; then
  echo "🔄 mysql-pv is Released — clearing claimRef.uid so it can rebind..."
  kubectl patch pv mysql-pv --type=json \
    -p='[{"op":"remove","path":"/spec/claimRef/uid"},{"op":"remove","path":"/spec/claimRef/resourceVersion"}]'
fi

kubectl apply -f configmap.yml
kubectl apply -f secret.yml
kubectl apply -f auth-secret.yml

# ─── Step 2: Infrastructure ───────────────────────────────────────────────────
kubectl apply -f mysql/
kubectl apply -f rabbitmq/
kubectl apply -f redis/

echo "⏳ Waiting for Infrastructure (MySQL, RabbitMQ, Redis)..."
kubectl wait --for=condition=ready pod -l app=mysql -n wecode --timeout=300s
kubectl wait --for=condition=ready pod -l app=rabbitmq -n wecode --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis -n wecode --timeout=60s
echo "✅ Infrastructure ready."

# ─── Step 3: ELK Stack ───────────────────────────────────────────────────────
echo "📊 Deploying ELK Stack..."
kubectl apply -f elk/
echo "⏳ Waiting for ELK (Elasticsearch, Logstash)..."
kubectl wait --for=condition=ready pod -l app=elasticsearch -n wecode --timeout=300s
kubectl wait --for=condition=ready pod -l app=logstash -n wecode --timeout=300s
echo "✅ ELK Stack ready."

# ─── Step 4: Application services ────────────────────────────────────────────
echo "🚀 Deploying application services..."
SERVICES=("submission-service" "worker-service" "result-service" "admin-service" "api-gateway" "wecode-frontend" "auth-service")

for svc in "${SERVICES[@]}"; do
  kubectl apply -f "$svc/"
done

# ─── Step 5: Force rollout for 'latest' images ────────────────────────────
echo "♻️  Forcing rollout to ensure 'latest' images are pulled..."
for svc in "${SERVICES[@]}"; do
  kubectl rollout restart "deployment/$svc" -n wecode
done

echo "⏳ Waiting for rollouts to complete (this may take several minutes)..."
for svc in "${SERVICES[@]}"; do
  echo "Checking $svc..."
  kubectl rollout status "deployment/$svc" -n wecode --timeout=600s
done
echo "✅ All services successfully rolled out!"

# ─── Step 6: Port-forwarding ─────────────────────────────────────────────────
echo "🔌 Automating port-forwarding for local access..."
bash port-forward.sh

echo ""
echo "📋 Pod status:"
kubectl get pods -n wecode
echo ""
echo "🌐 Access URLs:"
echo "  Frontend    : http://$(minikube ip):30000"
echo "  API Gateway : http://$(minikube ip):30090"
echo "  RabbitMQ UI : http://$(minikube ip):31673"
echo "  Kibana      : http://$(minikube ip):31601"
