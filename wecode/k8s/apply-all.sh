#!/bin/bash
# apply-all.sh
# Run this from inside the k8s/ directory:
#   cd wecode/k8s && bash apply-all.sh

set -e

echo "🚀 Deploying WeCode to Kubernetes..."

# ─── Step 0: Clean MySQL hostPath on Minikube node ──────────────────────────
# ROOT CAUSE FIX: The error "Can't find error-message file errmsg.sys"
# is caused by leftover partial data from a previous crashed MySQL init.
# We wipe the hostPath directory on the Minikube node before applying.
# This is safe in dev — MySQL will do a clean fresh init every time.
echo "🧹 Cleaning MySQL data directory on Minikube node..."
minikube ssh "sudo rm -rf /data/mysql && sudo mkdir -p /data/mysql"
echo "✅ MySQL data directory cleaned."

# ─── Step 1: Namespace ───────────────────────────────────────────────────────
kubectl apply -f namespace.yml

# ─── Step 2: ConfigMap and Secrets ──────────────────────────────────────────
kubectl apply -f configmap.yml
kubectl apply -f secret.yml

# ─── Step 3: Infrastructure ──────────────────────────────────────────────────
kubectl apply -f mysql/
kubectl apply -f rabbitmq/
kubectl apply -f redis/

# ─── Step 4: Wait for infrastructure ─────────────────────────────────────────
echo "⏳ Waiting for MySQL to be ready (may take up to 5 min on first run)..."
kubectl wait --for=condition=ready pod -l app=mysql    -n wecode --timeout=300s

echo "⏳ Waiting for RabbitMQ..."
kubectl wait --for=condition=ready pod -l app=rabbitmq -n wecode --timeout=120s

echo "⏳ Waiting for Redis..."
kubectl wait --for=condition=ready pod -l app=redis    -n wecode --timeout=60s

echo "✅ Infrastructure ready. Deploying services..."

# ─── Step 5: Application services ────────────────────────────────────────────
kubectl apply -f submission-service/
kubectl apply -f worker-service/
kubectl apply -f result-service/
kubectl apply -f admin-service/
kubectl apply -f api-gateway/
kubectl apply -f wecode-frontend/

# ─── Step 6: Wait for services ───────────────────────────────────────────────
echo "⏳ Waiting for services to be ready..."
kubectl wait --for=condition=ready pod -l app=submission-service -n wecode --timeout=300s
kubectl wait --for=condition=ready pod -l app=result-service     -n wecode --timeout=300s
kubectl wait --for=condition=ready pod -l app=api-gateway        -n wecode --timeout=300s

echo "✅ All services deployed!"
echo ""
echo "📋 Pod status:"
kubectl get pods -n wecode

echo ""
echo "🌐 Access URLs:"
echo "  Frontend:   http://$(minikube ip):30000"
echo "  API Gateway : http://$(minikube ip):30090"
echo "  RabbitMQ UI : http://$(minikube ip):31673"