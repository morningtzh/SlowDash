# =============================================================
# SlowDash — K8s production image
# Base: official Playwright-ready Node.js image
# =============================================================
FROM mcr.microsoft.com/playwright:v1.61.1-noble

LABEL org.opencontainers.image.source="https://github.com/morningtzh/SlowDash"
LABEL org.opencontainers.image.description="SlowDash — thin-client dashboard server"

ENV NODE_ENV=production

# Create app user (non-root) — use high UID to avoid conflicts with base image users
RUN groupadd --gid 10001 slowdash && \
    useradd --uid 10001 --gid 10001 --create-home --shell /bin/bash slowdash && \
    mkdir -p /etc/slowdash /var/lib/slowdash/output /app/output && \
    chown -R slowdash:slowdash /etc/slowdash /var/lib/slowdash /app/output

# Install Node.js dependencies
WORKDIR /app
COPY package*.json ./
# Node 基金会在容器内没用，关掉加速 npm ci
RUN npm config set fund false && \
    npm config set audit false && \
    npm ci --omit=dev

# Copy source code and make scripts executable
COPY . .
RUN chmod +x oneshot.js server.js

# Switch to non-root user
USER slowdash

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/healthz', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

EXPOSE 3000

ENTRYPOINT ["node", "server.js"]
