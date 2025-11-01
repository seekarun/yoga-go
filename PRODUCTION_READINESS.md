# Yoga-GO Production Readiness Plan

**Version:** 1.0
**Last Updated:** 2025-10-11
**Status:** Planning Phase

---

## Executive Summary

This document outlines the comprehensive plan to take Yoga-GO from its current MVP state to a production-ready SaaS platform. The application currently has a solid foundation with Next.js 15, payment UI integration, and core features. However, it requires database implementation, authentication, video infrastructure, and production hardening to launch successfully.

**Timeline:** 6-10 weeks
**Estimated Monthly Operating Cost:** $66-316 (scales with usage)
**Team Size Recommended:** 1-2 developers

---

## Current State Analysis

### ✅ What's Working

- **Framework:** Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Code Quality:** ESLint, Prettier, Husky pre-commit hooks
- **Data Structure:** Well-designed mock data (experts, courses, lessons)
- **Payment UI:** Razorpay/Stripe integration with geolocation-based routing
- **UI Routes:** Guest, authenticated, and expert portal pages implemented
- **API Structure:** RESTful API routes defined

### ❌ Critical Gaps

- **Database:** All data is in-memory mock data (src/data/mockData.ts)
- **Authentication:** Mock localStorage-based auth (src/contexts/AuthContext.tsx:23)
- **Payment Persistence:** Payment API routes have TODO placeholders (src/app/api/payment/razorpay/create-order/route.ts:45)
- **Video Infrastructure:** No video hosting/streaming solution
- **Email System:** No email notifications
- **Error Monitoring:** No error tracking or logging
- **Security:** Missing rate limiting, CSRF protection, input validation
- **Testing:** No automated tests
- **Deployment:** No CI/CD or production deployment configuration

---

## Phase 1: Critical Foundation (Week 1-2)

### Priority: 🔴 CRITICAL

### 1.1 Database Setup

**Objective:** Replace mock data with persistent database storage

**Tasks:**

1. Choose database system:
   - **Recommended:** PostgreSQL (best for relational data, ACID compliance)
   - **Alternative:** MongoDB (if flexible schema needed)
   - **Managed Options:** Supabase (PostgreSQL), PlanetScale (MySQL), MongoDB Atlas

2. Design and implement schema:

   ```
   - users (id, email, password_hash, name, membership_type, membership_status, membership_start, membership_end, tokens_remaining, created_at, updated_at)
   - experts (id, name, title, bio, avatar_url, rating, total_students, certifications, experience, social_links, created_at)
   - courses (id, expert_id, title, description, long_description, thumbnail_url, promo_video_url, level, duration, price, category, tags, rating, total_ratings, total_students, featured, is_new, created_at)
   - lessons (id, course_id, title, description, duration, video_url, order, is_free, created_at)
   - enrollments (id, user_id, course_id, payment_id, enrolled_at, access_expires_at)
   - course_progress (id, user_id, course_id, lesson_id, completed, watch_time_seconds, last_position_seconds, last_watched_at)
   - payments (id, user_id, amount, currency, gateway, type, item_id, order_id, payment_id, status, created_at, verified_at)
   - subscriptions (id, user_id, plan_type, status, start_date, end_date, auto_renew, payment_id, created_at)
   - course_reviews (id, user_id, course_id, rating, comment, verified, created_at)
   ```

3. Set up ORM:
   - **Recommended:** Prisma (best TypeScript support, great DX)
   - **Alternative:** Drizzle ORM (lightweight, fast)

4. Create migration scripts
5. Seed database with initial data (migrate from mockData.ts)

**Files to Update:**

- Create `prisma/schema.prisma` or equivalent
- Update all API routes to use database instead of mock data
- Update `src/contexts/AuthContext.tsx` to fetch from database
- Create database connection utility `src/lib/db.ts`

**Deliverables:**

- [ ] Database schema designed and documented
- [ ] ORM configured and connected
- [ ] Initial migrations created
- [ ] Data seeding scripts
- [ ] All mock data migrated
- [ ] Database connection pooling configured

---

### 1.2 Authentication System

**Objective:** Implement secure, production-ready authentication

**Tasks:**

1. Choose authentication solution:
   - **Option A:** Clerk (fastest, managed, $0-25/mo)
   - **Option B:** NextAuth.js / Auth.js (free, self-hosted, more control)
   - **Option C:** Supabase Auth (integrated with Supabase database)

2. Implement authentication flows:
   - Email/password registration with bcrypt hashing
   - Email verification
   - Login with JWT tokens
   - Password reset flow
   - Session management
   - Logout

3. Add OAuth providers:
   - Google (high priority)
   - Facebook (optional)
   - Apple (optional)

4. Implement role-based access control:
   - Student role (default)
   - Expert role (content creators)
   - Admin role (platform management)

5. Protect routes and API endpoints:
   - Add authentication middleware
   - Protect `/app/*` routes
   - Protect `/srv/*` routes (expert portal)
   - Add API route protection
   - Implement authorization checks

**Files to Update:**

- Replace `src/contexts/AuthContext.tsx` with real auth
- Create `src/middleware.ts` for route protection
- Update all `/data/app/*` API routes with auth checks
- Add `src/lib/auth.ts` utility functions

**Deliverables:**

- [ ] Authentication system configured
- [ ] User registration working
- [ ] Email verification implemented
- [ ] Login/logout functional
- [ ] Password reset working
- [ ] OAuth providers connected
- [ ] Route protection middleware active
- [ ] API authentication enforced

---

### 1.3 Environment & Security

**Objective:** Secure the application and manage configuration properly

**Tasks:**

1. Environment variable management:
   - Validate environment variables at startup (use zod)
   - Document all required environment variables
   - Set up environment-specific configs (dev, staging, prod)

2. Implement security measures:
   - Rate limiting on API routes (especially payment endpoints)
   - CSRF protection
   - Security headers (CSP, HSTS, X-Frame-Options)
   - CORS configuration
   - Input validation on all endpoints (use zod or yup)
   - SQL injection prevention (use parameterized queries)
   - XSS prevention (sanitize user inputs)

3. Set up secrets management:
   - Use environment variables for all secrets
   - Never commit secrets to git
   - Rotate API keys regularly

**Files to Create:**

- `src/lib/env.ts` - Environment validation
- `src/middleware.ts` - Security headers and rate limiting
- `src/lib/validation.ts` - Input validation schemas

**Deliverables:**

- [ ] Environment validation implemented
- [ ] Rate limiting active
- [ ] Security headers configured
- [ ] CSRF protection enabled
- [ ] Input validation on all endpoints
- [ ] Security audit completed

---

## Phase 2: Payment System Completion (Week 2-3)

### Priority: 🔴 CRITICAL

### 2.1 Complete Payment Integration

**Objective:** Fully functional payment processing with database persistence

**Tasks:**

1. Implement database persistence in payment routes:
   - Update `src/app/api/payment/razorpay/create-order/route.ts:45` (remove TODO)
   - Update `src/app/api/payment/razorpay/verify/route.ts:32` (remove TODO)
   - Store payment records in database
   - Create enrollment records on successful payment
   - Update user subscription status

2. Complete Stripe integration:
   - Implement `src/components/payment/StripeCheckout.tsx:6`
   - Create Stripe API routes:
     - `POST /api/payment/stripe/create-payment-intent`
     - `POST /api/payment/stripe/verify`
   - Handle 3D Secure authentication
   - Test with Stripe test cards

3. Webhook implementation:
   - Razorpay webhook handler (`/api/webhooks/razorpay`)
   - Stripe webhook handler (`/api/webhooks/stripe`)
   - Webhook signature verification
   - Idempotency handling (prevent duplicate processing)
   - Automatic retry mechanism
   - Webhook logging and monitoring

4. Payment reconciliation:
   - Daily payment reconciliation script
   - Handle failed payments
   - Implement refund logic
   - Subscription renewal handling

5. Subscription management:
   - Auto-renewal for subscriptions
   - Grace period for failed renewals (3-7 days)
   - Cancellation flow
   - Downgrade/upgrade handling
   - Course token allocation for "Curious" plan (1 token/month)
   - Token expiration logic (tokens expire with subscription)

**Files to Update:**

- `src/app/api/payment/razorpay/create-order/route.ts`
- `src/app/api/payment/razorpay/verify/route.ts`
- `src/app/api/webhooks/razorpay/route.ts`
- `src/components/payment/StripeCheckout.tsx`
- Create `src/app/api/payment/stripe/*` routes

**Deliverables:**

- [ ] Razorpay payments persisted to database
- [ ] Stripe integration complete
- [ ] Webhooks implemented and tested
- [ ] Refund system working
- [ ] Subscription auto-renewal active
- [ ] Token system for "Curious" plan
- [ ] Payment reconciliation script

---

### 2.2 Enrollment & Access Control

**Objective:** Grant course access based on payment/subscription

**Tasks:**

1. Implement enrollment system:
   - Create enrollment record on payment success
   - Handle lifetime course access (pay-as-you-go)
   - Handle subscription-based access (Curious/Committed)
   - Implement course token redemption for "Curious" plan

2. Access control for course content:
   - Check enrollment before allowing course access
   - Verify subscription status for gated content
   - Allow free preview lessons (is_free flag)
   - Handle subscription expiration gracefully
   - Show upgrade prompts for expired/no access

3. Progress tracking:
   - Save video playback position in database
   - Track lesson completion
   - Calculate course completion percentage
   - Show progress bars in UI

**Files to Update:**

- `src/app/api/data/app/courses/[courseId]/route.ts`
- `src/app/api/data/app/courses/[courseId]/progress/[savePoint]/route.ts`
- `src/app/app/courses/[id]/page.tsx`

**Deliverables:**

- [ ] Enrollment creation on payment
- [ ] Access control implemented
- [ ] Course token system working
- [ ] Progress tracking functional
- [ ] Subscription status checks
- [ ] Graceful access denial messages

---

## Phase 3: Video Infrastructure (Week 3-4)

### Priority: 🔴 CRITICAL

### 3.1 Video Hosting & Delivery

**Objective:** Scalable, secure video hosting and streaming

**Tasks:**

1. Choose video hosting solution:
   - **Option A: Mux** (~$1-5 per 1000 mins viewed)
     - Pros: Purpose-built for video, HLS/DASH out of box, great DX
     - Cons: More expensive at scale
   - **Option B: AWS S3 + CloudFront**
     - Pros: Cost-effective at scale, full control
     - Cons: More setup, need to handle encoding
   - **Option C: Vimeo API**
     - Pros: Middle ground, good features
     - Cons: Limited customization

2. Implement video upload:
   - Direct upload from expert portal
   - Progress bar during upload
   - File size validation (max 5GB recommended)
   - Format validation (MP4, MOV, AVI)
   - Automatic thumbnail generation

3. Video encoding and transcoding:
   - Multiple quality levels (360p, 480p, 720p, 1080p)
   - Adaptive bitrate streaming (HLS for iOS, DASH for others)
   - Audio normalization
   - Encoding queue with status updates

4. Video protection:
   - Signed URLs with expiration (24 hour validity)
   - Token-based authentication for video access
   - DRM protection (optional but recommended)
   - Watermarking (optional)
   - Prevent right-click download
   - Disable video inspector download

5. Video player:
   - Custom video player with controls
   - Quality selector
   - Playback speed control
   - Keyboard shortcuts
   - Picture-in-picture support
   - Resume from last position
   - Mobile-friendly player

6. Video analytics:
   - Track video views
   - Monitor completion rate
   - Average watch time
   - Most watched videos
   - Drop-off points

**Files to Create:**

- `src/lib/video.ts` - Video utility functions
- `src/app/api/video/upload/route.ts` - Video upload endpoint
- `src/app/api/video/signed-url/route.ts` - Generate signed URLs
- `src/components/VideoPlayer.tsx` - Custom video player

**Files to Update:**

- `src/app/srv/[expertId]/courses/[courseId]/page.tsx` - Add upload UI
- Update video URLs in database to use hosting service

**Deliverables:**

- [ ] Video hosting service configured
- [ ] Upload functionality working
- [ ] Transcoding pipeline active
- [ ] Signed URLs implemented
- [ ] Custom video player deployed
- [ ] Video analytics tracking
- [ ] DRM/protection enabled

---

### 3.2 Expert Portal Completion

**Objective:** Enable experts to manage content independently

**Tasks:**

1. Add authentication to expert portal:
   - Restrict access to verified experts only
   - Role-based permissions

2. Course management features:
   - Create new courses
   - Edit course metadata (title, description, price, thumbnail)
   - Upload course videos with metadata (title, description, duration)
   - Reorder lessons (drag-and-drop interface)
   - Set free preview lessons
   - Publish/unpublish courses
   - Delete courses (soft delete)

3. Analytics dashboard:
   - Replace mock data in `src/data/expertStatsData.ts`
   - Real-time student enrollment numbers
   - Revenue breakdown (daily, weekly, monthly)
   - Course engagement metrics (views, completion rate)
   - Student demographics
   - Top performing courses
   - Recent activity feed

4. Revenue management:
   - Earnings dashboard
   - Payout history
   - Revenue share calculation (e.g., 70% expert, 30% platform)
   - Generate invoices

**Files to Update:**

- `src/app/srv/[expertId]/page.tsx` - Real analytics
- `src/app/srv/[expertId]/courses/[courseId]/page.tsx` - Upload & management
- Create `src/app/api/srv/*` API routes for expert actions

**Deliverables:**

- [ ] Expert authentication working
- [ ] Course creation functional
- [ ] Video upload interface complete
- [ ] Lesson reordering working
- [ ] Real analytics dashboard
- [ ] Revenue reporting active

---

## Phase 4: Email & Notifications (Week 4)

### Priority: 🟡 HIGH

### 4.1 Email Service Setup

**Objective:** Transactional email system for user communications

**Tasks:**

1. Choose email service provider:
   - **Recommended:** Resend (developer-friendly, $0-20/mo)
   - **Alternative:** SendGrid (enterprise, $0-50/mo)
   - **Alternative:** AWS SES (cheapest at scale)

2. Create email templates:
   - Welcome email (on registration)
   - Email verification
   - Password reset
   - Payment confirmation
   - Enrollment confirmation
   - Subscription renewal reminder (3 days before)
   - Subscription cancelled
   - Course completion certificate
   - New course announcement (for subscribed users)
   - Weekly progress summary

3. Implement email sending:
   - Create email service utility (`src/lib/email.ts`)
   - Queue emails for reliability (use Bull/BullMQ with Redis)
   - Handle bounces and unsubscribes
   - Email delivery tracking
   - Retry failed emails

4. Email preferences:
   - User email notification settings
   - Unsubscribe from marketing emails
   - Frequency controls (daily digest vs immediate)

**Files to Create:**

- `src/lib/email.ts` - Email service
- `src/templates/email/*` - Email templates (React Email or MJML)
- `src/lib/email-queue.ts` - Email queue management

**Deliverables:**

- [ ] Email service configured
- [ ] All email templates created
- [ ] Email queue implemented
- [ ] Transactional emails sending
- [ ] Email preferences working
- [ ] Unsubscribe handling

---

### 4.2 In-App Notification System

**Objective:** Real-time notifications within the application

**Tasks:**

1. Notification types:
   - Payment confirmations
   - New course releases from followed experts
   - Course completion milestones (25%, 50%, 75%, 100%)
   - Subscription renewal reminders
   - New lessons added to enrolled courses
   - Expiring subscription warnings

2. Notification delivery:
   - In-app notification center (bell icon in header)
   - Mark as read/unread
   - Notification history
   - Real-time updates (optional: use websockets or polling)

3. Push notifications (optional):
   - Web push notifications (PWA)
   - Mobile push (if mobile app planned)

**Files to Create:**

- `src/components/NotificationCenter.tsx`
- `src/app/api/notifications/route.ts`
- Database table: `notifications`

**Deliverables:**

- [ ] Notification database schema
- [ ] In-app notification center
- [ ] Notification triggers implemented
- [ ] Mark as read functionality
- [ ] Push notifications (optional)

---

## Phase 5: Monitoring & DevOps (Week 5)

### Priority: 🟡 HIGH

### 5.1 Error Tracking & Monitoring

**Objective:** Proactive error detection and performance monitoring

**Tasks:**

1. Set up error tracking:
   - **Recommended:** Sentry (free tier available, $0-26/mo)
   - **Alternative:** LogRocket, Bugsnag
   - Track frontend errors (React error boundaries)
   - Track backend errors (API routes)
   - Source map upload for debugging
   - Error grouping and deduplication
   - Alert on new errors

2. Application monitoring:
   - APM (Application Performance Monitoring)
   - Track slow API routes
   - Database query performance
   - Memory usage and leaks
   - CPU usage

3. Logging infrastructure:
   - Structured logging (JSON format)
   - Log levels (debug, info, warn, error)
   - **Options:** Winston, Pino, or cloud logging (CloudWatch, Datadog)
   - Log aggregation for searching
   - Log retention policy

4. Uptime monitoring:
   - **Options:** UptimeRobot (free), Pingdom, Better Uptime
   - Check critical endpoints every 5 minutes
   - Alert on downtime (email, Slack)
   - Status page for users

5. Alerting:
   - Set up alert channels (email, Slack, PagerDuty)
   - Critical alerts: payment failures, database down, high error rate
   - Warning alerts: slow responses, high memory usage
   - Define on-call rotation (if team grows)

**Files to Create:**

- `src/lib/logger.ts` - Logging utility
- `src/lib/sentry.ts` - Error tracking configuration
- `sentry.client.config.ts` and `sentry.server.config.ts`

**Deliverables:**

- [ ] Error tracking configured
- [ ] APM monitoring active
- [ ] Logging infrastructure in place
- [ ] Uptime monitoring active
- [ ] Alerting configured
- [ ] Dashboards created

---

### 5.2 CI/CD Pipeline

**Objective:** Automated testing and deployment

**Tasks:**

1. Set up GitHub Actions (or GitLab CI, CircleCI):
   - Trigger on pull request and push to main
   - Run in parallel for speed

2. CI Pipeline stages:
   - Install dependencies (with caching)
   - Run linting checks (`npm run lint`)
   - Run format checks (`npm run format:check`)
   - Run type checking (`tsc --noEmit`)
   - Run unit tests (when added)
   - Run integration tests (when added)
   - Build application (`npm run build`)
   - Build Docker image (optional)

3. CD Pipeline stages:
   - **Development:** Auto-deploy to dev environment on push to `develop` branch
   - **Staging:** Auto-deploy to staging on push to `staging` branch
   - **Production:** Manual approval required for deployment to `main` branch
   - Run smoke tests after deployment
   - Automatic rollback on failure

4. Environment management:
   - Separate environments: dev, staging, production
   - Environment-specific secrets
   - Database per environment
   - Use feature flags for gradual rollouts

**Files to Create:**

- `.github/workflows/ci.yml` - CI pipeline
- `.github/workflows/deploy-staging.yml` - Staging deployment
- `.github/workflows/deploy-production.yml` - Production deployment

**Deliverables:**

- [ ] CI pipeline configured
- [ ] CD pipeline for staging
- [ ] CD pipeline for production
- [ ] Manual approval for production
- [ ] Rollback mechanism
- [ ] Smoke tests after deployment

---

### 5.3 Deployment & Infrastructure

**Objective:** Production hosting with scalability and reliability

**Tasks:**

1. Choose hosting platform:
   - **Option A: Vercel** (Recommended for Next.js)
     - Pros: Zero-config, auto-scaling, edge functions, great DX
     - Cons: Vendor lock-in, higher cost at scale
     - Cost: ~$20-100/mo

   - **Option B: AWS (EC2/ECS/Lambda)**
     - Pros: Full control, scalable, cost-effective at scale
     - Cons: Complex setup, requires DevOps knowledge
     - Cost: Variable based on usage

   - **Option C: Railway / Render**
     - Pros: Middle ground, easier than AWS, more control than Vercel
     - Cons: Smaller ecosystem
     - Cost: ~$20-50/mo

2. Database hosting:
   - **Managed PostgreSQL:** Supabase, PlanetScale, AWS RDS, Railway
   - Set up automated backups (daily)
   - Point-in-time recovery
   - Read replicas for scaling (if needed)

3. Redis setup:
   - **Options:** Upstash Redis (serverless), Redis Cloud, AWS ElastiCache
   - Use for session storage
   - Use for caching API responses
   - Use for email/job queues

4. CDN configuration:
   - CloudFront (AWS), Cloudflare, or Vercel Edge
   - Cache static assets (images, videos, CSS, JS)
   - Custom domain with SSL certificate
   - Optimize images automatically

5. Backup and disaster recovery:
   - Automated database backups (keep 30 days)
   - Test restore process monthly
   - Document disaster recovery procedures
   - Off-site backup storage

6. Scaling strategy:
   - Horizontal scaling for web servers (auto-scaling groups)
   - Database connection pooling (use Prisma connection pool)
   - CDN for static assets
   - Caching strategy (Redis)
   - Load balancing (if needed)

**Deliverables:**

- [ ] Production hosting configured
- [ ] Database deployed and backed up
- [ ] Redis instance active
- [ ] CDN configured
- [ ] Custom domain with SSL
- [ ] Backup strategy implemented
- [ ] Scaling plan documented

---

## Phase 6: Testing & Quality (Week 5-6)

### Priority: 🟢 MEDIUM

### 6.1 Automated Testing

**Objective:** Ensure code quality and prevent regressions

**Tasks:**

1. Set up testing framework:
   - **Unit tests:** Vitest or Jest
   - **Integration tests:** Vitest or Jest with Supertest
   - **E2E tests:** Playwright (recommended) or Cypress

2. Unit tests:
   - Test utility functions (`src/lib/*`)
   - Test validation schemas
   - Test business logic
   - Aim for 70%+ code coverage

3. Integration tests:
   - Test API routes end-to-end
   - Mock external services (Razorpay, Stripe, email)
   - Test database operations
   - Test authentication flows

4. E2E tests (critical user flows):
   - User registration → email verification → login
   - Browse courses → enroll with payment → access course
   - Watch video → save progress → resume later
   - Expert upload video → publish course → student enrolls
   - Subscription purchase → access all courses → cancel

5. Test coverage reporting:
   - Generate coverage reports
   - Enforce minimum coverage in CI (e.g., 70%)
   - Track coverage trends over time

6. Test data management:
   - Create test database
   - Seed data for tests
   - Clean up after tests
   - Use factories for test data generation

**Files to Create:**

- `vitest.config.ts` or `jest.config.js`
- `playwright.config.ts` or `cypress.config.ts`
- `tests/` directory structure
- `tests/fixtures/` for test data

**Deliverables:**

- [ ] Testing framework configured
- [ ] Unit tests for critical functions
- [ ] Integration tests for API routes
- [ ] E2E tests for critical flows
- [ ] Test coverage reporting
- [ ] Tests running in CI

---

### 6.2 Performance Optimization

**Objective:** Fast, responsive application

**Tasks:**

1. Frontend optimization:
   - Image optimization (use Next.js Image component everywhere)
   - Code splitting and lazy loading
   - Remove unused dependencies (analyze bundle)
   - Implement virtualization for long lists
   - Optimize re-renders (React.memo, useMemo, useCallback)
   - Prefetch critical resources

2. Backend optimization:
   - Database query optimization:
     - Add indexes on frequently queried columns (user_id, course_id, email)
     - Use SELECT only needed columns (not SELECT \*)
     - Implement pagination for large datasets
     - Use database query explain plans

   - API response optimization:
     - Implement caching (Redis) for read-heavy endpoints
     - Use CDN for static assets
     - Compress responses (gzip/brotli)
     - Implement API rate limiting

   - Connection pooling:
     - Configure database connection pool (Prisma)
     - Reuse HTTP connections

3. Video performance:
   - Adaptive bitrate streaming
   - Preload video metadata
   - Thumbnail sprites for scrubbing
   - CDN for video delivery

4. Monitoring and metrics:
   - Core Web Vitals tracking
   - Largest Contentful Paint (LCP) < 2.5s
   - First Input Delay (FID) < 100ms
   - Cumulative Layout Shift (CLS) < 0.1
   - Time to First Byte (TTFB) < 600ms

5. Lighthouse audit:
   - Run Lighthouse on all pages
   - Aim for 90+ scores on Performance, Accessibility, Best Practices, SEO
   - Fix identified issues

**Deliverables:**

- [ ] Images optimized
- [ ] Bundle size reduced
- [ ] Database queries optimized with indexes
- [ ] Caching implemented
- [ ] Core Web Vitals meeting targets
- [ ] Lighthouse scores 90+

---

## Phase 7: Legal & Compliance (Week 6)

### Priority: 🟡 HIGH

### 7.1 Legal Pages

**Objective:** Protect the business and comply with regulations

**Tasks:**

1. Create legal pages:
   - **Terms of Service**
     - User agreement
     - Prohibited activities
     - Account termination policy
     - Limitation of liability
     - Dispute resolution

   - **Privacy Policy** (GDPR/CCPA compliant)
     - Data collection practices
     - Data usage and sharing
     - User rights (access, deletion, portability)
     - Cookie usage
     - Third-party services
     - Data retention policy
     - Contact information for privacy inquiries

   - **Refund Policy**
     - 30-day money-back guarantee details
     - Refund eligibility criteria
     - Refund process and timeline
     - Exceptions (non-refundable items)

   - **Cookie Policy**
     - Types of cookies used
     - Purpose of each cookie
     - How to disable cookies

   - **Acceptable Use Policy**
     - Guidelines for course creators
     - Content restrictions
     - Copyright and intellectual property
     - User-generated content rules

   - **Content License Agreement** (for experts)
     - License terms for uploaded content
     - Revenue sharing terms
     - Rights and responsibilities
     - Content ownership

2. Legal review:
   - Have policies reviewed by lawyer (recommended)
   - Ensure GDPR compliance (EU users)
   - Ensure CCPA compliance (California users)
   - Ensure PCI DSS compliance (payment handling)

**Files to Create:**

- `src/app/legal/terms/page.tsx`
- `src/app/legal/privacy/page.tsx`
- `src/app/legal/refund/page.tsx`
- `src/app/legal/cookies/page.tsx`
- `src/app/legal/acceptable-use/page.tsx`
- `src/app/legal/content-license/page.tsx`

**Deliverables:**

- [ ] All legal pages created
- [ ] Legal pages linked in footer
- [ ] Policies reviewed by lawyer
- [ ] Acceptance checkboxes in signup flow

---

### 7.2 Compliance Implementation

**Objective:** Implement GDPR/CCPA compliance mechanisms

**Tasks:**

1. GDPR compliance:
   - **Right to access:** Users can download their data (JSON export)
   - **Right to deletion:** Users can request account deletion
   - **Right to rectification:** Users can edit their data
   - **Right to portability:** Export data in machine-readable format
   - **Right to object:** Opt-out of marketing communications
   - **Consent management:** Explicit consent for data processing
   - **Data breach notification:** 72-hour notification process

2. Cookie consent:
   - Cookie consent banner on first visit
   - Categorize cookies (necessary, functional, analytics, marketing)
   - Allow granular cookie preferences
   - Remember user preferences
   - **Tools:** CookieYes, Osano, or custom implementation

3. Data protection:
   - Encrypt sensitive data at rest
   - Encrypt data in transit (HTTPS/TLS)
   - Implement data retention policy (delete old data)
   - Anonymize analytics data
   - Minimize data collection (only collect what's needed)

4. Analytics compliance:
   - Use privacy-friendly analytics (Plausible, Fathom) or
   - Configure Google Analytics for GDPR compliance
   - Allow users to opt-out of tracking
   - Anonymize IP addresses

**Files to Create:**

- `src/components/CookieConsent.tsx`
- `src/app/api/user/export-data/route.ts`
- `src/app/api/user/delete-account/route.ts`
- `src/app/settings/privacy/page.tsx`

**Deliverables:**

- [ ] GDPR rights implemented
- [ ] Cookie consent banner
- [ ] Data export functionality
- [ ] Account deletion process
- [ ] Privacy settings page
- [ ] Analytics compliance

---

## Phase 8: Production Launch Prep (Week 6-7)

### Priority: 🔴 CRITICAL

### 8.1 Content Migration

**Objective:** Populate production database with real content

**Tasks:**

1. Data migration:
   - Migrate expert profiles from mock data
   - Migrate course data
   - Upload real course videos (coordinate with experts)
   - Generate thumbnails for courses
   - Set up promotional videos

2. Content moderation:
   - Review system for expert-uploaded content
   - Automated checks (file size, format, inappropriate content)
   - Manual approval workflow (optional)
   - Report system for user complaints

3. Backup strategy:
   - Create backup before migration
   - Test restore process
   - Document rollback procedure

**Deliverables:**

- [ ] All experts migrated
- [ ] All courses migrated
- [ ] Videos uploaded and working
- [ ] Content moderation active
- [ ] Backup created

---

### 8.2 Final Testing

**Objective:** Ensure production readiness through comprehensive testing

**Tasks:**

1. Load testing:
   - **Tools:** k6, Artillery, or JMeter
   - Test scenarios:
     - 100 concurrent users browsing courses
     - 50 concurrent video streams
     - 20 concurrent payment transactions
   - Identify bottlenecks
   - Test auto-scaling behavior
   - Ensure response times under load (<500ms for API, <3s for pages)

2. Security audit:
   - **Tools:** OWASP ZAP, Burp Suite
   - SQL injection testing
   - XSS vulnerability testing
   - CSRF testing
   - Authentication/authorization testing
   - Rate limiting verification
   - Penetration testing (consider hiring professional)

3. Payment testing:
   - Test Razorpay with real small amounts (₹1, ₹10)
   - Test Stripe with real small amounts ($0.50, $1)
   - Test webhooks in production
   - Verify payment receipts
   - Test refund process
   - Test subscription auto-renewal
   - Test payment failure handling

4. Cross-browser testing:
   - Chrome (desktop & mobile)
   - Safari (desktop & mobile)
   - Firefox
   - Edge
   - Test on iOS Safari specifically (video player issues common)

5. Accessibility audit:
   - **Tools:** axe DevTools, WAVE
   - WCAG 2.1 Level AA compliance
   - Screen reader testing
   - Keyboard navigation
   - Color contrast checks
   - Alt text for images
   - ARIA labels

6. Mobile testing:
   - Test on real devices (iOS, Android)
   - Responsive design verification
   - Touch interactions
   - Performance on slow networks (3G)
   - Video playback on mobile

**Deliverables:**

- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Payment testing successful
- [ ] Cross-browser compatibility verified
- [ ] Accessibility compliant
- [ ] Mobile experience optimized

---

### 8.3 Launch Checklist

**Objective:** Final verification before going live

**Pre-Launch Checklist:**

#### Infrastructure

- [ ] Production database configured and seeded
- [ ] Database backups configured (automated daily)
- [ ] Redis instance configured and tested
- [ ] CDN configured for static assets
- [ ] SSL certificates installed and auto-renewal configured
- [ ] Custom domain configured (yoga-go.com)
- [ ] Email service configured (with verified domain)

#### Security

- [ ] All environment variables set in production (use secrets manager)
- [ ] API keys rotated (use production keys, not test keys)
- [ ] Rate limiting active on all API endpoints
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] CORS configured properly
- [ ] Input validation on all endpoints
- [ ] Authentication middleware protecting routes

#### Monitoring & Logging

- [ ] Error tracking operational (Sentry configured)
- [ ] Application monitoring active (APM configured)
- [ ] Uptime monitoring configured
- [ ] Log aggregation working
- [ ] Alerts configured (email, Slack)
- [ ] Dashboards created for key metrics

#### Payments

- [ ] Razorpay production keys configured
- [ ] Stripe production keys configured
- [ ] Payment webhooks tested in production
- [ ] Refund process tested
- [ ] Payment receipt emails sending
- [ ] Subscription auto-renewal tested

#### Email & Notifications

- [ ] Email service configured with verified domain
- [ ] All transactional emails tested
- [ ] Email queue operational
- [ ] Bounce handling configured
- [ ] Unsubscribe links working

#### Content & SEO

- [ ] All course content uploaded
- [ ] Videos playing correctly
- [ ] Meta tags on all pages (title, description, OG tags)
- [ ] Sitemap.xml generated and submitted
- [ ] Robots.txt configured
- [ ] Google Analytics or alternative configured
- [ ] Google Search Console verified
- [ ] Favicon and app icons configured

#### Legal & Compliance

- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Refund Policy published
- [ ] Cookie consent banner active
- [ ] GDPR data export working
- [ ] Account deletion process tested

#### User Experience

- [ ] 404 page customized
- [ ] 500 error page customized
- [ ] Loading states on all async operations
- [ ] Error messages user-friendly
- [ ] Success messages for actions
- [ ] Mobile experience tested
- [ ] Accessibility checked

#### Performance

- [ ] Images optimized (WebP format)
- [ ] Bundle size optimized (<500KB initial)
- [ ] Lighthouse score 90+ on key pages
- [ ] Core Web Vitals passing
- [ ] Database queries optimized with indexes
- [ ] Caching configured (Redis)

#### Documentation

- [ ] User documentation (help center)
- [ ] Expert onboarding guide
- [ ] Admin runbook for common operations
- [ ] Incident response playbook
- [ ] Database backup/restore procedure documented
- [ ] Deployment procedure documented

#### Business Operations

- [ ] Payment gateway merchant accounts verified
- [ ] Bank accounts for payouts configured
- [ ] Support email configured (support@yoga-go.com)
- [ ] Customer support process defined
- [ ] Pricing finalized
- [ ] Launch announcement prepared (email, social media)

---

## Quick Wins (Parallel Implementation)

These features can be implemented in parallel with main phases:

### UI/UX Improvements

- [ ] Add skeleton loading states (instead of spinners)
- [ ] Add toast notifications for actions (success/error)
- [ ] Add breadcrumbs for navigation
- [ ] Add back to top button on long pages
- [ ] Improve mobile menu
- [ ] Add dark mode toggle (optional)

### SEO Enhancements

- [ ] Meta tags optimization on all pages
- [ ] Open Graph tags for social sharing
- [ ] Twitter Card tags
- [ ] Schema.org markup (Course, Person, Review, Offer)
- [ ] XML sitemap generation
- [ ] Robots.txt configuration
- [ ] Canonical URLs

### Analytics & Insights

- [ ] Google Analytics 4 or Plausible Analytics
- [ ] User behavior tracking (Mixpanel, Amplitude, PostHog)
- [ ] Conversion tracking (signups, purchases, completions)
- [ ] Funnel analysis
- [ ] Cohort analysis

### Admin Dashboard

- [ ] Create `/admin` portal for platform management
- [ ] User management (search, view, edit, delete)
- [ ] Payment management (view all payments, issue refunds)
- [ ] Course management (approve, feature, hide)
- [ ] Content moderation queue
- [ ] Analytics overview (revenue, users, growth)

### Additional Features

- [ ] Course search functionality (Algolia, Meilisearch, or database full-text search)
- [ ] Course filtering (by level, category, duration, price)
- [ ] Wishlist/favorites for courses
- [ ] Course reviews and ratings (enable after completing CRUD in Phase 1)
- [ ] Social sharing buttons
- [ ] Referral program (give 20% discount for referrals)
- [ ] Affiliate program for partners
- [ ] Gift cards/vouchers
- [ ] Course bundles and discounts
- [ ] Blog/content marketing section

---

## Recommended Technology Stack

### Core Infrastructure

- **Framework:** Next.js 15 (App Router) ✅ Already using
- **Language:** TypeScript ✅ Already using
- **Styling:** Tailwind CSS ✅ Already using
- **Database:** PostgreSQL (via Supabase or Railway)
- **ORM:** Prisma (best TypeScript support, migrations)
- **Hosting:** Vercel (optimal for Next.js)

### Authentication

- **Primary Choice:** Clerk ($0-25/mo, fastest implementation)
- **Alternative:** NextAuth.js (free, more customization)

### Payments

- **Razorpay** (India) ✅ Already integrated (UI only)
- **Stripe** (International) ✅ Already integrated (UI only, backend needed)

### Video

- **Primary Choice:** Mux (~$1-5 per 1000 minutes)
- **Budget Alternative:** AWS S3 + CloudFront + MediaConvert

### Email

- **Primary Choice:** Resend ($0-20/mo, great DX)
- **Alternative:** SendGrid (more features, $0-50/mo)

### Caching & Queues

- **Redis:** Upstash Redis (serverless, $0-10/mo)
- **Alternative:** Redis Cloud

### Monitoring & Error Tracking

- **Error Tracking:** Sentry ($0-26/mo)
- **Uptime:** UptimeRobot (free) or Better Uptime
- **Logs:** Vercel Logs or Datadog

### Analytics

- **Privacy-Friendly:** Plausible or Fathom
- **Full-Featured:** Google Analytics 4 (free)
- **Product Analytics:** PostHog or Mixpanel

### Testing

- **Unit/Integration:** Vitest (faster, better DX than Jest)
- **E2E:** Playwright (faster, more reliable than Cypress)

---

## Cost Breakdown

### Monthly Operating Costs (1,000 active users)

| Service           | Provider           | Cost Range            |
| ----------------- | ------------------ | --------------------- |
| Hosting (Web App) | Vercel             | $20 - $100            |
| Database          | Supabase / Railway | $25 - $100            |
| Video Hosting     | Mux                | $1 - $5 per 1000 mins |
| Email Service     | Resend             | $0 - $50              |
| Authentication    | Clerk              | $0 - $25              |
| Redis Cache       | Upstash            | $0 - $10              |
| Error Tracking    | Sentry             | $0 - $26              |
| Uptime Monitoring | UptimeRobot        | $0 (free tier)        |
| Domain Name       | Namecheap          | $10/year              |
| SSL Certificate   | Let's Encrypt      | $0 (free)             |

**Total Monthly Cost:** $66 - $316
**Total Annual Cost:** $802 - $3,802

**Notes:**

- Video costs scale with usage (more views = higher cost)
- Most services have free tiers that cover early stage
- Costs increase gradually as user base grows
- Consider budgeting extra 20% buffer

---

## Success Metrics & KPIs

Track these metrics post-launch:

### User Metrics

- Monthly Active Users (MAU)
- Sign-up conversion rate (visitors → accounts)
- Free-to-paid conversion rate
- User retention (Day 1, Day 7, Day 30)
- Churn rate

### Revenue Metrics

- Monthly Recurring Revenue (MRR)
- Average Revenue Per User (ARPU)
- Customer Lifetime Value (LTV)
- Customer Acquisition Cost (CAC)
- LTV:CAC ratio (target 3:1)

### Engagement Metrics

- Course completion rate
- Average watch time per user
- Courses enrolled per user
- Daily/Weekly Active Users (DAU/WAU)
- Time to first course purchase

### Platform Health

- Payment success rate (target >95%)
- Payment decline rate
- Refund rate (target <5%)
- Support ticket volume
- Average response time
- Video loading time (target <3s)
- API response time (target <500ms)

---

## Timeline Summary

| Phase   | Focus                      | Duration  | Can Start             |
| ------- | -------------------------- | --------- | --------------------- |
| Phase 1 | Database + Auth + Security | 2 weeks   | Immediately           |
| Phase 2 | Payment Completion         | 1 week    | After Phase 1         |
| Phase 3 | Video Infrastructure       | 2 weeks   | After Phase 1         |
| Phase 4 | Email & Notifications      | 1 week    | After Phase 2         |
| Phase 5 | Monitoring & DevOps        | 1 week    | After Phase 3         |
| Phase 6 | Testing & Performance      | 1-2 weeks | After Phase 5         |
| Phase 7 | Legal & Compliance         | 1 week    | Parallel to Phase 5-6 |
| Phase 8 | Launch Prep                | 1 week    | After all phases      |

**Total Timeline:** 6-10 weeks with 1-2 developers

### Parallel Work Opportunities:

- Phase 3 (Video) can start after Phase 1 (Database)
- Phase 7 (Legal) can be done in parallel with Phase 5-6
- Quick wins can be tackled alongside main phases

---

## Risk Assessment & Mitigation

### High-Risk Items

1. **Video Infrastructure**
   - **Risk:** High bandwidth costs, slow loading
   - **Mitigation:** Use CDN, implement adaptive streaming, monitor costs closely
   - **Backup Plan:** Start with YouTube unlisted videos, migrate later

2. **Payment Processing**
   - **Risk:** Payment failures, webhook issues, fraud
   - **Mitigation:** Thorough testing, webhook retry logic, fraud detection
   - **Backup Plan:** Manual payment verification process

3. **Database Performance**
   - **Risk:** Slow queries, high load, downtime
   - **Mitigation:** Proper indexing, connection pooling, caching, regular monitoring
   - **Backup Plan:** Read replicas, vertical scaling option

4. **Content Delivery**
   - **Risk:** CDN costs, slow video loading, buffering
   - **Mitigation:** Multi-CDN strategy, adaptive bitrate, edge caching
   - **Backup Plan:** Multiple video quality options

### Medium-Risk Items

1. **Email Deliverability**
   - **Risk:** Emails going to spam
   - **Mitigation:** Domain verification, SPF/DKIM/DMARC setup, warm-up period
   - **Backup Plan:** Secondary email provider

2. **Authentication Issues**
   - **Risk:** Account lockouts, session issues, security breaches
   - **Mitigation:** MFA option, rate limiting, security monitoring
   - **Backup Plan:** Support process for account recovery

3. **Third-Party Dependencies**
   - **Risk:** Service outages (Stripe, Razorpay, Mux down)
   - **Mitigation:** Graceful degradation, status page, error messages
   - **Backup Plan:** Manual processes documented

---

## Next Steps

1. **Review this document with your team**
2. **Prioritize phases based on business needs**
3. **Assign team members to specific phases**
4. **Set up project management (Jira, Linear, or GitHub Projects)**
5. **Create detailed technical specifications for Phase 1**
6. **Begin Phase 1: Database Setup**

---

## Appendix

### Useful Resources

**Next.js:**

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js App Router Guide](https://nextjs.org/docs/app)

**Database & ORM:**

- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)

**Authentication:**

- [Clerk Documentation](https://clerk.com/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)

**Payments:**

- [Razorpay Documentation](https://razorpay.com/docs/)
- [Stripe Documentation](https://stripe.com/docs)

**Video:**

- [Mux Documentation](https://docs.mux.com/)
- [AWS MediaConvert](https://aws.amazon.com/mediaconvert/)

**Email:**

- [Resend Documentation](https://resend.com/docs)
- [SendGrid Documentation](https://docs.sendgrid.com/)

**Monitoring:**

- [Sentry Documentation](https://docs.sentry.io/)
- [Vercel Analytics](https://vercel.com/docs/analytics)

**Testing:**

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)

### Contact & Support

For questions about this roadmap or implementation guidance:

- Create issues in your project repository
- Schedule architecture review sessions with senior developers
- Join relevant Discord/Slack communities for tech stack

### Monthly Costs

1️⃣ Mobile App with 100ms - YES! ✅

100ms supports native mobile apps with dedicated SDKs:

Available SDKs:

- iOS (Swift/Objective-C) - Native iPhone/iPad apps
- Android (Kotlin/Java) - Native Android apps
- React Native - Cross-platform (iOS + Android)
- Flutter - Cross-platform (iOS + Android)

Mobile App is Actually BETTER than Web:

- ✅ Better performance (native code vs browser)
- ✅ Better battery optimization
- ✅ Background support (can minimize app and stay connected)
- ✅ Picture-in-Picture mode
- ✅ Push notifications when session starts
- ✅ Better camera/mic control
- ✅ No browser limitations

Example - React Native:

npm install @100mslive/react-native-hms
Same concepts, just native components instead of web.

So YES, if you build a yoga-go mobile app, 100ms will work even better!

---

2️⃣ Why AWS Account? - You DON'T Need It! ❌

Short answer: You don't need AWS anymore since we switched to 100ms.

What We Removed:

- ❌ Amazon IVS (live streaming) - Replaced with 100ms
- ❌ IVS Chat - Replaced with 100ms built-in chat

What You're Currently Using:

- ✅ 100ms - Video conferencing (NOT AWS)
- ✅ MongoDB Atlas - Database (NOT AWS, it's MongoDB's cloud)
- ✅ Auth0 - Authentication (NOT AWS, it's Auth0's cloud)
- ✅ Cloudflare Stream - Pre-recorded videos (NOT AWS, it's Cloudflare)

The Confusion:

Your CLAUDE.md file mentions "AWS infrastructure" and "Stick to AWS free-tier" - this is outdated.
That was written when you were planning to use AWS services. Now you're using:

- 100ms for live video
- Cloudflare for recorded videos
- MongoDB Atlas for database
- Auth0 for login

None of these are AWS!

When You WOULD Need AWS:

Only if you want to:

1. Deploy your Next.js app to AWS EC2/ECS (but you could use Vercel instead)
2. Store recordings in AWS S3 (but you could use Cloudflare R2 instead)
3. Use AWS Lambda for serverless functions (Next.js has its own API routes)

Bottom line: AWS is optional, not required.

---

3️⃣ Expected Costs

💰 100ms Pricing (What You're Using)

Free Tier:

- 10,000 minutes/month video conferencing
- 10,000 minutes/month live streaming
- 300 minutes/month recording
- 300 minutes/month transcription

What This Means:

- 10,000 participant-minutes = 166 hours of video
- If each session is 60 min with 5 students = 300 participant-minutes per session
- Free tier = ~33 yoga sessions per month

Paid Pricing (after free tier):
Video Conferencing: $0.004 per participant-minute
Audio Only: $0.001 per participant-minute (75% cheaper)
Recording: $0.0135 per minute
Live Streaming: $0.0012 per viewer-minute

Example Monthly Cost:
Scenario: 100 yoga sessions/month, avg 5 students, 60 min each
= 100 sessions × 5 students × 60 min
= 30,000 participant-minutes

Free tier covers: 10,000 minutes
You pay for: 20,000 minutes
Cost: 20,000 × $0.004 = $80/month

Scaling:
Light usage (10 sessions/month): FREE
Medium usage (50 sessions/month): $40/month
Heavy usage (100 sessions/month): $80/month
Very heavy (500 sessions/month): $480/month

💡 Cost Saving Tips:

1. Audio-only option for students (75% cheaper) - yoga doesn't always need student video
2. Limit session duration (charge per hour)
3. Use volume pricing: negotiate custom pricing at $5k+/month (up to 50% off)

---

💰 AWS Pricing (What You're NOT Using)

Since you removed AWS IVS and aren't using AWS infrastructure:

Current AWS costs: $0/month ✅

If you WERE using AWS IVS (old approach):
IVS Video Input (SD): $0.02 per stream-minute
IVS Video Delivery (SD): $0.015 per viewer-minute
IVS Chat: $0.0014 per message

Example:
60-min class with 5 students
Input: 60 min × $0.02 = $1.20
Delivery: 60 min × 5 students × $0.015 = $4.50
Total: $5.70 per session (vs $1.20 with 100ms)

100 sessions/month = $570 vs $80 with 100ms

AWS IVS is 7x more expensive than 100ms! That's why we switched.

---

💰 Other Services You're Using

MongoDB Atlas:
Free tier: 512MB storage (good for 1000s of users)
Paid: $9/month for 2GB (if you outgrow free tier)

Auth0:
Free tier: 7,500 active users/month
Paid: $35/month for 1,000 MAU (monthly active users)

Cloudflare Stream (pre-recorded videos):
$5/month + $1 per 1,000 minutes stored + $1 per 1,000 minutes watched
Very cheap for pre-recorded content

---

📊 Total Expected Monthly Costs

Startup Phase (0-100 users, 10-20 live sessions/month):

100ms: FREE (within free tier)
MongoDB: FREE (within free tier)
Auth0: FREE (within free tier)
Cloudflare: ~$10-20/month
Domain: ~$12/year
Hosting (Vercel): FREE

TOTAL: ~$10-20/month 🎉

Growth Phase (500 users, 100 live sessions/month):

100ms: $80/month
MongoDB: $9/month (if needed)
Auth0: FREE or $35/month (if >7,500 users)
Cloudflare: ~$30-50/month
Hosting: FREE (Vercel) or $20/month (if upgraded)

TOTAL: ~$120-200/month

Scale Phase (5,000 users, 500 live sessions/month):

100ms: $480/month
MongoDB: $57/month
Auth0: ~$175/month
Cloudflare: ~$100/month
Hosting: $20/month

TOTAL: ~$832/month

---

✅ Summary

1. Mobile App: YES, 100ms works great on mobile apps (even better than web)
2. AWS Account: NO, you don't need it anymore since you're using 100ms
3. Expected Costs:
   - Starting out: ~$10-20/month (almost free!)
   - Growing (100 sessions/month): ~$120-200/month
   - 100ms is 7x cheaper than AWS IVS

Your current stack is perfect and cost-effective! 🎉

Any other questions about scaling, costs, or mobile development?

---

**Document Version:** 1.0
**Last Updated:** 2025-10-11
**Next Review Date:** [Set based on team meeting]
