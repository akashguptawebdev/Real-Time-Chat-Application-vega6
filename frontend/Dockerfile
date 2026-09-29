# ─────────────────────────────────────────
# Stage 1 – Build the React / Vite app
# ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source
COPY . .

# Build args injected at build time by docker-compose
ARG VITE_API_BASE_URL
ARG VITE_SOCKET_URL

# Make them visible to Vite during build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN npm run build

# ─────────────────────────────────────────
# Stage 2 – Serve with Nginx
# ─────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Our custom config (created below)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built static files
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
