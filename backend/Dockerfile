# ─────────────────────────────────────────
# Stage 1 – Install dependencies
# ─────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only manifests first for better layer caching
COPY package.json package-lock.json ./

RUN npm ci --omit=dev

# ─────────────────────────────────────────
# Stage 2 – Production image
# ─────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Security: run as non-root user
RUN addgroup -S chatly && adduser -S chatly -G chatly

# Copy installed deps from the previous stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY src ./src
COPY package.json .
COPY .sequelizerc .

# Uploads directory needs to persist; mount a volume on top of this
RUN mkdir -p uploads && chown -R chatly:chatly /app

USER chatly

# Port the Express / Socket.io server listens on
EXPOSE 5001

# Health check – pings the /api/health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5001/health || exit 1

CMD ["node", "src/server.js"]
