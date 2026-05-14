# WeCode - Post-Development & Deployment Guide

This guide provides exact steps for local development, manual K8s deployment, and Jenkins pipeline integration.

---

## 1. Secrets Management (Crucial)

### A. Local Development (`application-local.properties`)
When running `auth-service` locally, you must update `wecode-backend/auth-service/src/main/resources/application-local.properties`:

1.  **Generate JWT Secret:**
    ```bash
    openssl rand -base64 64
    ```
2.  **Replace Placeholders:**
    *   `jwt.secret`: Replace `REPLACE_WITH_BASE64_JWT_SECRET` with the output from step 1.
    *   `google.client-id`: Replace `REPLACE_WITH_YOUR_GOOGLE_CLIENT_ID`.
    *   `google.client-secret`: Replace `REPLACE_WITH_YOUR_GOOGLE_CLIENT_SECRET`.
    *   `app.admin-email`: Replace `REPLACE_WITH_ADMIN_EMAIL` (the email that gets Admin access).

**⚠️ SAFETY:** Before running `git add .` or `git commit`, ensure these real values are removed or use `git checkout -- <file>` to revert changes to this file. **NEVER push real secrets to GitHub.**

### B. Kubernetes Secrets (`k8s/auth-secret.yml`)
Since `auth-secret.yml` is in `.gitignore`, it must be created/updated manually on your machine:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: wecode-auth-secret
  namespace: wecode
type: Opaque
stringData:
  GOOGLE_CLIENT_ID: "your-id.apps.googleusercontent.com"
  GOOGLE_CLIENT_SECRET: "your-secret-key"
  JWT_SECRET: "your-base64-jwt-secret"
  GOOGLE_REDIRECT_URI: "http://localhost:8085/auth/google/callback"
  APP_ADMIN_EMAIL: "your-email@gmail.com"
```

---

## 2. Manual K8s Deployment (`apply-all.sh`)

Use this method when you want to bypass Jenkins and deploy directly from your terminal.

### Prerequisites
*   **Docker Hub:** All images must be built and pushed to Docker Hub if you have made code changes.
    ```bash
    # Example for auth-service
    cd wecode-backend/auth-service && mvn clean package -DskipTests
    docker build -t sivasomanath2502/auth-service:latest .
    docker push sivasomanath2502/auth-service:latest
    ```
*   **Minikube:** Must be running (`minikube start`).
*   **Local Secret:** `k8s/auth-secret.yml` must exist in your local folder.

### Steps
1.  **Navigate to K8s folder:**
    ```bash
    cd k8s
    ```
2.  **Run the script:**
    ```bash
    bash apply-all.sh
    ```
3.  **Wait for Rollout:** The script will wait (up to 10m) for all Java services to warm up and pass health checks.
4.  **Access:** The script automatically starts port-forwarding. Keep the terminal open and go to `http://localhost:5173`.

---

## 3. Pipeline Deployment (Jenkins & Ansible)

Use this for automated CI/CD.

### Prerequisites in Jenkins
*   **Docker Credentials:** A "Username with password" credential named `docker-hub-credential` must exist.
*   **Maven/JDK:** Jenkins must have Maven 3 and JDK 17 configured in Global Tool Configuration.

### Steps
1.  **Inject Secrets Manually:**
    Since Jenkins cannot see `auth-secret.yml`, you must apply it once manually to the cluster from your terminal:
    ```bash
    kubectl apply -f k8s/auth-secret.yml -n wecode
    ```
2.  **Trigger Build:**
    *   Push code to GitHub **OR**
    *   Click **Build Now** in the `wecode` root pipeline in Jenkins.
3.  **Wait for Completion:**
    *   The root pipeline will detect changed services and trigger parallel builds.
    *   The final stage runs the Ansible playbook `deploy-app-k8s.yml`.
4.  **How Port Forwarding Works in Pipeline:**
    *   The pipeline starts port-forwarding using `nohup` and `disown`.
    *   It uses `JENKINS_NODE_COOKIE=dontKillMe` to ensure the tunnels stay open after the Jenkins job finishes.
5.  **Access:**
    *   Once Jenkins shows a Green Success, the tunnels are active.
    *   Go to `http://localhost:5173`.
    *   Login via Google. The browser will redirect to `localhost:8085` and then back to `localhost:5173/login/callback` successfully.

---

## Troubleshooting Port Forwards
If you cannot access the site after a successful deployment:
1.  Check active forwards: `ps aux | grep port-forward`
2.  Check startup logs: `cat /tmp/pf-startup.log`
3.  Check error logs: `cat /tmp/wecode-port-forwards.log`
4.  Manually restart if needed: `cd k8s && bash port-forward.sh`
