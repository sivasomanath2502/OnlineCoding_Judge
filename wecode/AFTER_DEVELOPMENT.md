# WeCode Final Deployment Guide

This guide ensures your application is correctly built and deployed to Kubernetes, addressing all previous connectivity and synchronization issues.

## 1. Local Build & Push Phase
Run these commands in your terminal to build and push the updated services. This ensures that the fixes for CORS, redirects, and proxying are included in your Docker images.

### A. Frontend (Critical for Proxy Fix)
```bash
cd wecode-frontend
docker build -t sivasomanath2502/wecode-frontend:latest .
docker push sivasomanath2502/wecode-frontend:latest
```

### B. API Gateway (Critical for Routing & Classpath Fix)
**Note:** A `clean` build is mandatory to resolve the `ClassNotFoundException`.

```bash
cd ../wecode-backend
mvn clean package -pl api-gateway -am -DskipTests
cd api-gateway
# Ensure no old artifacts remain
docker build --no-cache -t sivasomanath2502/api-gateway:latest .
docker push sivasomanath2502/api-gateway:latest
```

### C. Auth Service (Critical for Redirect Fix)
```bash
cd ../auth-service
mvn clean package -DskipTests
docker build -t sivasomanath2502/auth-service:latest .
docker push sivasomanath2502/auth-service:latest
```

---

## 2. Kubernetes Deployment Phase
Run the deployment script from the `k8s` directory.

```bash
cd ../../k8s
bash apply-all.sh
```

### Why this works:
1.  **Exhaustive Waiting:** The script now uses `kubectl rollout status` for every service. It will not finish until your new code is 100% healthy and ready.
2.  **No More CORS:** The frontend now proxies all API requests via its own Nginx server.
3.  **Flexible IPs:** Using relative paths (`BASE_URL=''`) means the app works whether you use the Minikube IP or Localhost.

---

## 3. Verification Phase

### Method A: Minikube NodePort (Recommended for full K8s test)
Access the application at the URL shown in the script output:
`http://<MINIKUBE_IP>:30000`

### Method B: Localhost (Recommended for speed)
The script automatically starts `port-forward.sh`. You can access the app at:
`http://localhost:5173`

---

## Troubleshooting "500 Internal Server Error"
If you see a 500 error immediately after the script finishes:
1.  **Wait 30 seconds:** Sometimes the Kubernetes Service load balancer takes a moment to detect the new pods.
2.  **Check Logs:**
    *   Gateway logs: `kubectl logs -l app=api-gateway -n wecode`
    *   Frontend logs: `kubectl logs -l app=wecode-frontend -n wecode`
3.  **Confirm Rebuild:** Ensure you ran the `docker push` commands in Step 1. If you didn't push, Kubernetes will keep running the old "broken" code.
