# =============================================================
# SlowDash — K8s production image
# Base: official Playwright-ready Node.js image
# =============================================================
FROM mcr.microsoft.com/playwright:v1.61.1-noble

LABEL org.opencontainers.image.source="https://github.com/morningtzh/SlowDash"
LABEL org.opencontainers.image.description="SlowDash — thin-client dashboard server"

# Avoid prompts during apt
ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production

# Create app user (non-root, best practice)
RUN groupadd --gid 1001 slowdash && \
    useradd --uid 1001 --gid slowdash --create-home --shell /bin/bash slowdash

# Create required directories
RUN mkdir -p /etc/slowdash /var/lib/slowdash/output && \
    chown -R slowdash:slowdash /etc/slowdash /var/lib/slowdash

# Install Node.js app
WORKDIR /app
COPY package*.json ./

# Install production dependencies + Playwright system deps already included in base image
RUN npm ci --omit=dev && \
    # Verify Playwright browsers are installed (base image should have them)
    npx playwright install chromium 2>/dev/null || true

# Copy source code
COPY . .

# Ensure entrypoint scripts are executable
RUN chmod +x oneshot.js server.js

# Switch to non-root user
USER slowdash

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/healthz', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

EXPOSE 3000

# Default: run the long-lived server
ENTRYPOINT ["node", "server.js"]
