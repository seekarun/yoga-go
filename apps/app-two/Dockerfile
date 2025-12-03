# ===========================================
# Multi-stage Dockerfile for app-two
# Build from monorepo root: docker build -f apps/app-two/Dockerfile .
# ===========================================

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy workspace package files
COPY package.json package-lock.json ./
COPY apps/app-two/package.json ./apps/app-two/

# Install ALL dependencies (including devDependencies for build)
RUN npm ci --ignore-scripts && npm cache clean --force

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy workspace configuration and app files
COPY package.json package-lock.json tsconfig.json ./
COPY apps/app-two ./apps/app-two

# Build the app
RUN npm run build -w app-two

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/apps/app-two/public ./apps/app-two/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/app-two/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/app-two/.next/static ./apps/app-two/.next/static

USER nextjs

EXPOSE 3001

CMD ["node", "apps/app-two/server.js"]
