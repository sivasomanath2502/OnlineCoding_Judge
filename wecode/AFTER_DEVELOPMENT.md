# AFTER_DEVELOPMENT.md — Complete Setup & Deployment Guide

This document provides the definitive steps to verify the application locally and deploy it to Kubernetes using the Jenkins CI/CD pipeline.

---

## 🟢 PHASE 1: LOCAL SETUP & CONFIGURATION

### STEP 1 — Generate JWT Secret
Run this command and copy the output string:
`openssl rand -base64 64`

### STEP 2 — Configure Google OAuth
1. Go to the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Edit your **OAuth 2.0 Client ID**.
3. Add this **Authorized Redirect URI**: `http://localhost:8085/auth/google/callback`.
4. Copy your **Client ID** and **Client Secret**.

### STEP 3 — Fill Local Properties
Open `wecode-backend/auth-service/src/main/resources/application-local.properties`:
- **`google.client-id`**: Paste your Client ID.
- **`google.client-secret`**: Paste your Client Secret.
- **`app.admin-email`**: Set to your email (e.g., `gsomanath2502@gmail.com`).
- **`jwt.secret`**: Paste the string from Step 1.

### STEP 4 — Prepare K8s Auth Secret
Create a file at `wecode/k8s/auth-secret.yaml` (this file is ignored by Git):
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: wecode-auth-secret
  namespace: wecode
type: Opaque
stringData:
  GOOGLE_CLIENT_ID: "your-id-here"
  GOOGLE_CLIENT_SECRET: "your-secret-here"
  JWT_SECRET: "your-jwt-secret-here"
```

---

## 🟡 PHASE 2: LOCAL VERIFICATION (NO DOCKER/K8S)

### STEP 5 — Build & Run Services
1. **Compile:** `cd wecode-backend && ./mvnw clean package -DskipTests`
2. **Infrastructure:** Ensure MySQL, RabbitMQ, and Redis are running locally.
3. **Services:** Start all backend services.
4. **Frontend:** `cd wecode-frontend && npm run dev`

### STEP 6 — Test Public Access & Auth
1. Open `http://localhost:5173`.
2. **Public Test:** Problems should load automatically (checks CORS & Public GET).
3. **Login Test:** Click "Sign In" -> Google Login -> Redirect back to WeCode.
4. **RBAC Test:** If logged in as Admin, the "Admin" link must appear in the navbar.
5. **Verdict Test:** Submit code and verify the new **LeetCode-style verdict** (stats cards & confetti).

---

## 🟠 PHASE 3: PRE-PUSH CLEANUP (CRITICAL) 🛑

Before you `git push` to trigger the automated pipeline, you **MUST** check these files:

### 1. Check for Leaked Secrets
- **`wecode-backend/auth-service/src/main/resources/application-local.properties`**: Revert `google.client-id`, `google.client-secret`, and `jwt.secret` to placeholders (e.g., `REPLACE_WITH_REAL_VALUE`).
- **`wecode-backend/api-gateway/src/main/resources/application-local.properties`**: Ensure no real `jwt.secret` is committed here.

### 2. Verify Git Tracking
- Run `git status`. Ensure `k8s/auth-secret.yaml` is **NOT** listed as a new/changed file. It must remain private on your machine.

### 3. Connection Check
- **`wecode-frontend/src/api/client.js`**: Ensure `BASE_URL` is set to `http://localhost:8090`.
- **`wecode-frontend/src/contexts/AuthContext.jsx`**: Ensure the login redirect points to `http://localhost:8090/auth/google`.

---

## 🔵 PHASE 4: KUBERNETES DEPLOYMENT (VIA PIPELINE)

### STEP 7 — Push to Trigger Pipeline
The ngrok webhook will automatically notify Jenkins when you push.
```bash
git add .
git commit -m "feat: implement public problems access and leetcode-style UI"
git push origin main
```

### STEP 8 — Manual Secret Application
Apply your private secrets to the cluster (Jenkins cannot do this as it doesn't have the file):
```bash
kubectl apply -f k8s/auth-secret.yaml
kubectl apply -f k8s/secret.yml
```

### STEP 9 — Verify & Access
1. **Check Status:** `kubectl get pods -n wecode -w` (Wait for all to be `1/1 Running`).
2. **Port Forward:**
   ```bash
   cd k8s
   ./port-forward.sh
   ```
3. **Access:** Open `http://localhost:5173` and perform the same tests as Step 6.

---

## 🔴 PHASE 5: SECURITY AUDIT (FINAL CHECK)

- **Test 401:** `curl http://localhost:8090/admin/problems` (No token) -> Expected: **200 OK** (Public access enabled).
- **Test 401:** `curl -X POST http://localhost:8090/admin/problems` (No token) -> Expected: **401 Unauthorized**.
- **Test 403:** Attempt to access `/admin` UI as a standard user -> Expected: Redirect to `/`.
- **Test 403:** `curl -X POST -H "Authorization: Bearer <USER_TOKEN>" http://localhost:8090/admin/problems` -> Expected: **403 Forbidden**.
