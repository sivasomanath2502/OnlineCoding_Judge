#!/bin/bash
set -e

echo "🚀 Deploying WeCode to Kubernetes..."

# Namespace first
kubectl apply -f namespace.yml

# ConfigMap and Secrets
kubectl apply -f configmap.yml
kubectl apply -f secret.yml


# Infrastructure
kubectl apply -f mysql/
kubectl apply -f rabbitmq/
kubectl apply -f redis/

echo "⏳ Waiting for infrastructure to be ready..."
kubectl wait --for=condition=ready pod -l app=mysql     -n wecode --timeout=120s
kubectl wait --for=condition=ready pod -l app=rabbitmq  -n wecode --timeout=60s
kubectl wait --for=condition=ready pod -l app=redis     -n wecode --timeout=30s

echo "✅ Infrastructure ready. Deploying services..."

# Application services
kubectl apply -f submission-service/
kubectl apply -f worker-service/
kubectl apply -f result-service/
kubectl apply -f admin-service/
kubectl apply -f api-gateway/
kubectl apply -f frontend/

echo "⏳ Waiting for services to be ready..."
kubectl wait --for=condition=ready pod -l app=submission-service -n wecode --timeout=120s
kubectl wait --for=condition=ready pod -l app=result-service     -n wecode --timeout=120s
kubectl wait --for=condition=ready pod -l app=api-gateway        -n wecode --timeout=120s

echo "✅ All services deployed!"
echo ""
echo "📋 Pod status:"
kubectl get pods -n wecode

echo ""
echo "🌐 Access URLs:"
echo "  Frontend:   http://$(minikube ip):30000"
echo "  API Gateway: http://$(minikube ip):30090"
echo "  RabbitMQ:   http://$(minikube ip):31672"