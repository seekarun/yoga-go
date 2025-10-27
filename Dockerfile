# Multi-stage Dockerfile for Next.js 15 Production Build
# Optimized for size and performance

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (ignore scripts to skip husky)
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install ALL dependencies (including dev) for build
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Dummy env vars for build (actual values will be provided at runtime)
ENV MONGODB_URI="mongodb://localhost:27017/yoga-go"
ENV AUTH0_SECRET="dummy-secret-for-build"
ENV AUTH0_BASE_URL="http://localhost:3000"
ENV AUTH0_ISSUER_BASE_URL="https://dummy.auth0.com"
ENV AUTH0_CLIENT_ID="dummy-client-id"
ENV AUTH0_CLIENT_SECRET="dummy-client-secret"

# Build application
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set ownership to nextjs user
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port 3000
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server.js"]
