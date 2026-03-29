# Multi-stage production Dockerfile for nself-admin
# Optimized for minimal size with standalone Next.js build
# Multi-platform support: linux/amd64, linux/arm64

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (needed for build)
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./

# Copy only necessary source files (improves cache invalidation)
COPY src ./src
COPY public ./public
COPY next.config.mjs ./
COPY tsconfig.json ./
COPY postcss.config.js ./

# Set build-time environment variables for standalone mode
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV STANDALONE=true

# Build the application in standalone mode
RUN pnpm run build

# Remove dev dependencies to reduce image size
RUN pnpm prune --prod

# Stage 3: Runner (minimal image)
FROM node:20-alpine AS runner
WORKDIR /app

# Install runtime dependencies including nself CLI requirements
# - bash: Required for nself CLI (Alpine uses ash by default)
# - docker-cli, docker-cli-compose: For nself to interact with Docker
# - curl, git: Required by nself commands
# - openssl, nss-tools: For SSL certificate management
# - mkcert: For local SSL certificates (installed separately)
RUN apk add --no-cache \
    bash \
    curl \
    git \
    docker-cli \
    docker-cli-compose \
    openssl \
    nss-tools \
    ca-certificates \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

# Install mkcert for local SSL certificate generation
# Using pre-built binary for Alpine Linux
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then MKCERT_ARCH="amd64"; \
    elif [ "$ARCH" = "aarch64" ]; then MKCERT_ARCH="arm64"; \
    else MKCERT_ARCH="amd64"; fi && \
    curl -fsSL "https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-${MKCERT_ARCH}" \
    -o /usr/local/bin/mkcert && \
    chmod +x /usr/local/bin/mkcert

# Install nself CLI (can be overridden by mounting local source at /opt/nself)
ARG NSELF_VERSION=1.0.0
RUN mkdir -p /opt/nself \
    && curl -fsSL "https://github.com/nself-org/cli/archive/refs/tags/v${NSELF_VERSION}.tar.gz" \
       | tar -xz -C /opt/nself --strip-components=1 \
    && ln -s /opt/nself/bin/nself /usr/local/bin/nself \
    && chmod +x /opt/nself/bin/nself

# Note: For development, mount your local nself source at /opt/nself to override
# The symlink at /usr/local/bin/nself will work with either installed or mounted source

# Copy only the standalone build output (much smaller!)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy graceful shutdown wrapper
COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Create necessary directories for project mount and database
RUN mkdir -p /workspace /app/data \
    && chown -R nextjs:nodejs /workspace /app/data

# Set runtime environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
# Port 3021 is the reserved port for nself-admin (not 3100, which is for Loki)
ENV PORT=3021
ENV ADMIN_VERSION=1.0.0

# Environment variables that can be set at runtime:
# NSELF_PROJECT_PATH - Path to mounted project (default: /workspace)
# NSELF_CLI_PATH     - Override nself CLI location (default: /usr/local/bin/nself)
# DOCKER_HOST        - Docker socket (default: unix:///var/run/docker.sock)

# Add labels for container metadata
LABEL org.opencontainers.image.title="nself-admin"
LABEL org.opencontainers.image.description="Web-based administration interface for nself CLI"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="nself.org"
LABEL org.opencontainers.image.source="https://github.com/acamarata/nself-admin"
LABEL org.opencontainers.image.licenses="Proprietary - Free for personal use, Commercial license required"
LABEL org.opencontainers.image.documentation="https://github.com/acamarata/nself-admin/wiki"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3021/api/health || exit 1

# SECURITY NOTE: Running as root to access Docker socket for nself commands
# This is required because the Docker socket is typically owned by root:docker
#
# For better security in production, consider one of these alternatives:
#
# Option A: Docker Socket Proxy (most secure)
#   - Use tecnativa/docker-socket-proxy
#   - Set DOCKER_HOST=tcp://docker-socket-proxy:2375
#   - Remove socket mount from nself-admin
#
# Option B: Match Host Docker GID
#   - Pass DOCKER_GID build arg matching host's docker group
#   - Uncomment USER nextjs below
#
# For local development, running as root is acceptable.
# USER nextjs

# Expose port 3021 (reserved for nself-admin, distinct from Loki on 3100)
EXPOSE 3021

# Use STOPSIGNAL for proper graceful shutdown
STOPSIGNAL SIGTERM

# Start the application using the entrypoint wrapper for graceful shutdown
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
