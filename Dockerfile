# syntax=docker/dockerfile:1

# ╔══════════════════════════════════════════════════════════════════════════╗
# ║                    EnergyGuard - Production Dockerfile                    ║
# ╚══════════════════════════════════════════════════════════════════════════╝

# ═══════════════════════════════════════════════════════════════
# BUILD STAGE
# ═══════════════════════════════════════════════════════════════
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Some refs/contexts may not include optional runtime folders (e.g. `scripts/`).
# Ensure they exist so later multi-stage COPY instructions don't fail.
RUN mkdir -p /app/scripts

# Set production environment for build
ENV NODE_ENV=production

# Build the application
RUN bun run build

# ═══════════════════════════════════════════════════════════════
# PRODUCTION STAGE
# ═══════════════════════════════════════════════════════════════
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 sveltekit

# Install wget for health check
RUN apk add --no-cache wget

# Copy built application
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./

# Copy scripts, migrations, and configs for seed/migrate commands
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src/lib/server ./src/lib/server
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Install production dependencies only
RUN bun install --frozen-lockfile --production

# Set ownership
RUN chown -R sveltekit:nodejs /app

# Switch to non-root user
USER sveltekit

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["bun", "run", "build/index.js"]
