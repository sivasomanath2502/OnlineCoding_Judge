# Local Setup for Auth Service

1. Generate JWT secret:
   ```bash
   openssl rand -base64 64
   ```
2. Open `src/main/resources/application-local.properties`
3. Replace `REPLACE_WITH_BASE64_JWT_SECRET` with the generated base64 string.
4. Replace `REPLACE_WITH_YOUR_GOOGLE_CLIENT_ID` and `REPLACE_WITH_YOUR_GOOGLE_CLIENT_SECRET` with your Google OAuth credentials.
5. Replace `REPLACE_WITH_ADMIN_EMAIL` with the email that should get `ROLE_ADMIN`.
6. DO NOT commit real secrets to Git.