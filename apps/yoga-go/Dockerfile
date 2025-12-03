# Multi-stage Dockerfile optimized for Next.js 15 in a monorepo
# Build from monorepo root: docker build -f apps/yoga-go/Dockerfile .

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy workspace configuration files
COPY package.json package-lock.json ./
COPY apps/yoga-go/package.json ./apps/yoga-go/

# Install all dependencies for the workspace
RUN npm ci --ignore-scripts && \
    npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy workspace configuration
COPY package.json package-lock.json tsconfig.json ./

# Copy the yoga-go app source
COPY apps/yoga-go ./apps/yoga-go

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the yoga-go app using workspace command
RUN npm run build -w yoga-go

# Stage 3: Runner (Production)
FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
# The standalone output includes all necessary node_modules
COPY --from=builder /app/apps/yoga-go/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/yoga-go/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/yoga-go/.next/static ./apps/yoga-go/.next/static

# Switch to non-root user
USER nextjs

# Expose port 3000
EXPOSE 3000

# Health check using the /api/health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
# The standalone output creates server.js at apps/yoga-go/server.js
CMD ["node", "apps/yoga-go/server.js"]
