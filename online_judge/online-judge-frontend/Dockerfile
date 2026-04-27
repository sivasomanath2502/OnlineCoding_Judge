# ─── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source
COPY . .

# Accept build arg for gateway URL
# Default is localhost:8090 — override when building for production
ARG VITE_GATEWAY_URL=http://localhost:8090
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL

# Build — env var is baked into the JS bundle here
RUN npm run build

# ─── Stage 2: Serve with nginx ────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]