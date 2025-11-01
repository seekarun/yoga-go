# Analytics Platform Comparison for Yoga-Go

**Date:** January 2025
**Purpose:** Evaluate and select the best analytics solution for yoga-go subscription platform

---

## App Context

### Business Model

- Subscription-based SaaS (monthly/yearly plans)
- Two tiers: Curious Plan ($35/mo, $299/yr) and Committed Plan ($69/mo, $599/yr)
- Course enrollment and video consumption platform
- Payment gateways: Stripe (international) + Razorpay (India)

### Key Metrics We Need to Track

**Conversion Funnels:**

- Pricing page → Plan selection → Payment → Subscription active
- Free user → Paid subscriber conversion
- Monthly → Yearly upgrade path

**User Engagement:**

- Course enrollments by plan type
- Video watch time and completion rates
- Lesson progression patterns
- Feature usage (which courses are most popular)
- Session duration and frequency

**Subscription Health:**

- Monthly Recurring Revenue (MRR)
- Churn rate and cancellation reasons
- Failed payment recovery
- Reactivation success rate
- Customer Lifetime Value (LTV)
- Upgrade/downgrade patterns

**Payment Analytics:**

- Payment success/failure rates by gateway
- Cart abandonment in payment flow
- 3D Secure authentication completion
- Currency and regional preferences

### Technical Context

- **Stack:** Next.js 15, MongoDB, Stripe, Razorpay, Auth0
- **Stage:** MVP with test credentials
- **Existing Analytics:** Custom endpoints at `/api/analytics/track`
- **Deployment:** Vercel (planned)

---

## Analytics Platform Comparison

### 1. PostHog ⭐ **RECOMMENDED**

#### Overview

Open-source product analytics platform built specifically for SaaS and subscription businesses. Combines analytics, session replay, feature flags, and A/B testing in one tool.

#### Pros

- ✅ **Generous free tier:** 1 million events/month + 5,000 session replays
- ✅ **All-in-one solution:** Analytics + Session Replay + Feature Flags + A/B Testing
- ✅ **Event autocapture:** Automatically tracks clicks, pageviews, form submissions
- ✅ **Session replay:** Watch recordings of user sessions (invaluable for debugging payment flows)
- ✅ **Funnel analysis:** Visual funnel builder for conversion tracking
- ✅ **Retention cohorts:** Understand user retention patterns
- ✅ **Stripe integration:** Native Stripe webhook support for subscription events
- ✅ **Next.js plugin:** Official Next.js integration (10-minute setup)
- ✅ **Privacy-focused:** GDPR compliant, can self-host
- ✅ **Startup-friendly:** Built for SaaS products, not enterprise bloat
- ✅ **Real-time:** Events appear instantly
- ✅ **User profiles:** Automatic user identification and journey tracking
- ✅ **SQL access:** Can query raw data directly

#### Cons

- ⚠️ **Relatively new:** Less mature than Mixpanel/GA (but actively developed)
- ⚠️ **Learning curve:** Many features to explore
- ⚠️ **Cloud vs self-hosted:** Need to decide hosting strategy

#### Best For

- Tracking pricing → payment → subscription conversion
- Watching session replays of failed payments
- Understanding why users cancel subscriptions
- A/B testing pricing strategies
- Monitoring course engagement patterns

#### Pricing

- **Free:** Up to 1M events/month + 5k session replays
- **Paid:** $0.00031 per event after free tier (~$310 for 1M additional events)
- **Self-hosted:** Free forever (but requires infrastructure)

#### Implementation Complexity

⭐⭐⭐⭐⭐ (5/5 - Very Easy)

**Setup Time:** ~30 minutes

```bash
npm install posthog-js
```

**Basic Integration:**

```typescript
// app/providers.tsx
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

posthog.init('YOUR_PROJECT_KEY', {
  api_host: 'https://app.posthog.com',
});
```

**Track Custom Events:**

```typescript
// One line of code
posthog.capture('subscription_created', { plan: 'curious', interval: 'yearly' });
```

#### Why PostHog for Yoga-Go?

**Subscription Flow Tracking:**

```
Pricing Page View (auto-captured)
  ↓
Monthly/Yearly Toggle (custom event)
  ↓
Plan Selected: Curious/Committed (custom event)
  ↓
Payment Modal Opened (auto-captured)
  ↓
Card Details Entered (funnel step)
  ↓
Payment Successful (Stripe webhook → PostHog)
  ↓
Subscription Active (auto-captured)
```

**Session Replay Value:**

- See exactly where users struggle in payment flow
- Watch users toggle between monthly/yearly pricing
- Understand why payment modal is closed without purchase
- Debug failed payments with visual context

**Retention Analysis:**

- Cohort users by signup week
- Track course completion by plan type
- Identify which features keep users subscribed
- Predict churn before it happens

---

### 2. Mixpanel (Close Second)

#### Overview

Product analytics platform focused on user behavior and retention. Industry standard for SaaS companies.

#### Pros

- ✅ **Excellent funnel visualization:** Best-in-class conversion tracking
- ✅ **Cohort analysis:** Powerful user segmentation
- ✅ **Retention reports:** Built specifically for subscription businesses
- ✅ **A/B testing:** Native experimentation framework
- ✅ **User profiles:** Detailed user property tracking
- ✅ **Real-time data:** Instant event visibility
- ✅ **Mobile SDKs:** Native iOS/Android support
- ✅ **Mature product:** Battle-tested by thousands of companies

#### Cons

- ❌ **No session replay:** Need separate tool (Hotjar, FullStory)
- ❌ **Limited free tier:** Only 100k events/month (fills up quickly)
- ❌ **Can get expensive:** Costs rise fast after free tier
- ❌ **No autocapture:** Must manually define all events
- ❌ **Steeper learning curve:** More complex interface

#### Best For

- Pure product analytics and user segmentation
- Advanced cohort analysis
- Established products with dedicated analytics team

#### Pricing

- **Free:** Up to 100k events/month
- **Growth:** Starting at $20/month (increases with usage)
- **Enterprise:** Custom pricing (very expensive)

#### Implementation Complexity

⭐⭐⭐ (3/5 - Moderate)

**Setup Time:** ~1 hour

**Why Not Mixpanel for Yoga-Go?**

- 100k events might not be enough (PostHog gives 1M free)
- No session replay means can't debug payment issues visually
- Higher cost as you scale
- More manual setup required

---

### 3. Google Analytics 4 (Budget Option)

#### Overview

Google's latest analytics platform. Industry standard for web traffic analysis.

#### Pros

- ✅ **Completely free:** No usage limits, forever
- ✅ **Google Ads integration:** If you plan to advertise
- ✅ **Industry standard:** Everyone knows how to use it
- ✅ **BigQuery export:** Advanced data analysis (paid)

#### Cons

- ❌ **Not built for SaaS:** Designed for content sites, not subscription products
- ❌ **Complex setup:** Custom events require extensive configuration
- ❌ **Poor UX:** Confusing interface, hard to find insights
- ❌ **No session replay:** Need separate tool
- ❌ **Privacy concerns:** GDPR compliance issues, user tracking
- ❌ **Slow real-time:** Events have delay
- ❌ **Limited user tracking:** Can't easily link events to users
- ❌ **Sampling:** Large datasets get sampled (inaccurate)

#### Best For

- Basic website traffic monitoring
- Google Ads campaign tracking
- Large enterprises already using Google ecosystem

#### Pricing

- **Free:** Unlimited events

#### Implementation Complexity

⭐ (1/5 - Painful)

**Setup Time:** 2-3 hours (frustrating)

**Why Not GA4 for Yoga-Go?**

- Subscription analytics are painful to set up
- Can't easily track user journeys
- No funnel visualization (need to build custom reports)
- Privacy issues with GDPR
- Better alternatives exist for free

---

### 4. Plausible Analytics (Privacy-Focused)

#### Overview

Privacy-first, lightweight, open-source web analytics. No cookies, GDPR compliant by default.

#### Pros

- ✅ **Privacy-first:** No cookies, GDPR/CCPA compliant
- ✅ **Beautiful UI:** Simple, clean dashboard
- ✅ **Lightweight:** 1KB script (doesn't slow site)
- ✅ **Open source:** Can self-host
- ✅ **Email reports:** Automatic weekly summaries
- ✅ **No cookie banner needed:** Privacy-friendly

#### Cons

- ❌ **Paid only:** No free tier ($9/month minimum)
- ❌ **Basic features:** Just pageviews and referrers
- ❌ **No funnels:** Can't track conversion flows
- ❌ **No cohorts:** Can't analyze retention
- ❌ **No session replay:** No user recordings
- ❌ **No event tracking:** Limited custom events
- ❌ **Not for product analytics:** Built for content sites

#### Best For

- Simple web analytics
- Privacy-conscious brands
- Content/blog sites

#### Pricing

- **Starter:** $9/month (10k pageviews)
- **Growth:** $19/month (100k pageviews)

#### Implementation Complexity

⭐⭐⭐⭐ (4/5 - Easy)

**Setup Time:** 15 minutes

**Why Not Plausible for Yoga-Go?**

- No free tier (PostHog is free)
- Too basic for subscription analytics
- Can't track funnels or retention
- Not built for SaaS products

---

### 5. Amplitude (Enterprise-Grade)

#### Overview

Enterprise product analytics platform. Used by large tech companies.

#### Pros

- ✅ **Powerful behavioral analytics:** Advanced cohort analysis
- ✅ **Predictive analytics:** AI-powered insights
- ✅ **Enterprise features:** Advanced permissions, data governance
- ✅ **Scalable:** Handles billions of events

#### Cons

- ❌ **Overkill for MVP:** Complex, enterprise-focused
- ❌ **Steep learning curve:** Requires training
- ❌ **Expensive:** Pricing scales quickly
- ❌ **Slow setup:** Complex implementation

#### Best For

- Large enterprises with data teams
- Mature products with complex analytics needs

#### Pricing

- **Starter:** Free (limited features)
- **Growth:** Custom pricing (expensive)

#### Implementation Complexity

⭐⭐ (2/5 - Complex)

**Why Not Amplitude for Yoga-Go?**

- Too complex for MVP stage
- Better suited for mature products
- PostHog provides similar features with easier setup

---

## Feature Comparison Matrix

| Feature                | PostHog   | Mixpanel    | GA4          | Plausible | Amplitude  |
| ---------------------- | --------- | ----------- | ------------ | --------- | ---------- |
| **Free Tier**          | 1M events | 100k events | Unlimited    | None      | Limited    |
| **Session Replay**     | ✅ 5k/mo  | ❌          | ❌           | ❌        | ❌         |
| **Funnel Analysis**    | ✅        | ✅          | ⚠️ Limited   | ❌        | ✅         |
| **Retention Cohorts**  | ✅        | ✅          | ⚠️ Basic     | ❌        | ✅         |
| **Event Autocapture**  | ✅        | ❌          | ⚠️ Pageviews | ✅        | ❌         |
| **A/B Testing**        | ✅        | ✅          | ❌           | ❌        | ✅         |
| **Feature Flags**      | ✅        | ❌          | ❌           | ❌        | ❌         |
| **Stripe Integration** | ✅ Native | ⚠️ Zapier   | ⚠️ Manual    | ❌        | ⚠️ Segment |
| **User Profiles**      | ✅        | ✅          | ⚠️ Limited   | ❌        | ✅         |
| **Real-time Events**   | ✅        | ✅          | ⚠️ Delayed   | ✅        | ✅         |
| **Privacy-Friendly**   | ✅        | ⚠️          | ❌           | ✅        | ⚠️         |
| **Self-Hostable**      | ✅        | ❌          | ❌           | ✅        | ❌         |
| **Next.js Plugin**     | ✅        | ⚠️          | ✅           | ⚠️        | ⚠️         |
| **Setup Time**         | 30 min    | 1 hour      | 3 hours      | 15 min    | 2 hours    |
| **SaaS-Focused**       | ✅        | ✅          | ❌           | ❌        | ✅         |
| **Learning Curve**     | Moderate  | Steep       | Steep        | Easy      | Very Steep |

**Legend:**

- ✅ = Fully supported
- ⚠️ = Partially supported or requires workarounds
- ❌ = Not available

---

## Cost Analysis (Monthly)

### Projected Usage for Yoga-Go MVP

**Assumptions:**

- 1,000 monthly active users
- 50 events per user per month
- **Total events:** 50,000/month

| Platform      | Cost     | Notes                                        |
| ------------- | -------- | -------------------------------------------- |
| **PostHog**   | **$0**   | Well within 1M free tier                     |
| **Mixpanel**  | **$0**   | Within 100k free tier (but limited headroom) |
| **GA4**       | **$0**   | Free forever                                 |
| **Plausible** | **$9**   | No free tier                                 |
| **Amplitude** | **$0-?** | Free tier limited, likely need paid plan     |

### Projected Usage at 10,000 MAU

**Assumptions:**

- 10,000 monthly active users
- 50 events per user per month
- **Total events:** 500,000/month

| Platform      | Cost       | Notes                     |
| ------------- | ---------- | ------------------------- |
| **PostHog**   | **$0**     | Still within 1M free tier |
| **Mixpanel**  | **$200+**  | Far exceeds free tier     |
| **GA4**       | **$0**     | Free forever              |
| **Plausible** | **$19-39** | Based on pageviews        |
| **Amplitude** | **Custom** | Likely $500+/month        |

### Projected Usage at 100,000 MAU (Scale)

**Assumptions:**

- 100,000 monthly active users
- 50 events per user per month
- **Total events:** 5,000,000/month

| Platform      | Cost        | Notes                                     |
| ------------- | ----------- | ----------------------------------------- |
| **PostHog**   | **~$1,240** | 4M events over free tier @ $0.00031/event |
| **Mixpanel**  | **$2,000+** | Far exceeds free tier, enterprise pricing |
| **GA4**       | **$0**      | Free forever (but sampling may occur)     |
| **Plausible** | **$99+**    | Based on pageviews                        |
| **Amplitude** | **$5,000+** | Enterprise pricing                        |

**PostHog remains most cost-effective even at scale.**

---

## Implementation Recommendations

### Phase 1: MVP (Now) - PostHog

**Why:** Free tier covers all needs, session replay is invaluable for debugging payment flows.

**What to Track:**

```typescript
// Pricing page events
posthog.capture('pricing_page_viewed');
posthog.capture('billing_interval_toggled', { interval: 'yearly' });
posthog.capture('plan_selected', { plan: 'curious', interval: 'yearly' });

// Payment events
posthog.capture('payment_modal_opened', { plan: 'curious', amount: 29900 });
posthog.capture('payment_method_entered');
posthog.capture('payment_submitted');
posthog.capture('payment_success', { subscriptionId, plan, interval });
posthog.capture('payment_failed', { error });

// Subscription events (from Stripe webhooks)
posthog.capture('subscription_created', { plan, interval, amount });
posthog.capture('subscription_renewed', { plan });
posthog.capture('subscription_cancelled', { reason });
posthog.capture('subscription_reactivated');

// Course events
posthog.capture('course_enrolled', { courseId, planType });
posthog.capture('lesson_started', { lessonId, courseId });
posthog.capture('lesson_completed', { lessonId, timeSpent });
posthog.capture('course_completed', { courseId, totalTime });
```

**Key Funnels to Create:**

1. **Subscription Conversion:** Pricing View → Plan Select → Payment Open → Payment Success
2. **Payment Success Rate:** Payment Submit → Payment Success
3. **Course Engagement:** Course Enroll → First Lesson → Course Complete
4. **Subscription Retention:** Active → Month 2 → Month 3 → Month 6

### Phase 2: Growth (10k+ MAU)

**Continue with PostHog** if:

- Still within free tier (1M events)
- Session replay still valuable
- No need for advanced features

**Consider adding:**

- **Stripe Dashboard:** Native subscription analytics (MRR, churn)
- **Customer.io / Braze:** Marketing automation based on PostHog cohorts

### Phase 3: Scale (100k+ MAU)

**Evaluate:**

- Self-hosting PostHog (if cost becomes issue)
- Enterprise analytics (if need advanced features)
- Data warehouse integration (Snowflake, BigQuery)

---

## Alternative: Hybrid Approach

### PostHog + Stripe Dashboard

**Best of both worlds:**

- **PostHog:** User behavior, session replay, funnels, cohorts ($0)
- **Stripe Dashboard:** Subscription metrics (MRR, churn, LTV) (included with Stripe)

**Benefits:**

- $0 cost
- Stripe Dashboard has best-in-class subscription analytics
- PostHog covers all user behavior tracking
- No need to replicate Stripe metrics in PostHog

**Recommended for MVP.**

---

## Final Recommendation

### ⭐ Start with PostHog

**Reasons:**

1. ✅ **Free tier covers MVP stage completely** (1M events = plenty of headroom)
2. ✅ **All features in one tool:** Analytics + Session Replay + Feature Flags + A/B Testing
3. ✅ **Built for subscription products** like yoga-go
4. ✅ **Quick implementation:** Next.js plugin, 30-minute setup
5. ✅ **Session replay is invaluable:** Visually debug payment flows
6. ✅ **Stripe native integration:** Automatically track subscription events
7. ✅ **Scales with you:** Can self-host if costs become concern
8. ✅ **No commitment:** Free tier has no time limit

**Start Date:** Now (during MVP testing with test credentials)
**Initial Cost:** $0
**Expected Value:**

- Understand payment drop-off points
- Optimize pricing page conversion
- Debug subscription issues
- Track course engagement
- Measure retention and churn

### Quick Start Guide

1. **Sign up:** https://app.posthog.com/signup
2. **Install:** `npm install posthog-js`
3. **Initialize:** Add PostHog provider to app layout
4. **Track events:** Add key events in payment/subscription flows
5. **Create funnels:** Build subscription conversion funnel
6. **Watch replays:** Observe users going through checkout

**Setup time:** 30 minutes
**First insights:** Same day

---

## Integration with Existing Analytics

You already have custom analytics endpoints:

- `/api/analytics/track`
- `/api/srv/courses/[courseId]/analytics`
- `/api/srv/experts/[expertId]/analytics`

**PostHog will enhance (not replace) these:**

- Keep custom endpoints for internal tracking
- Use PostHog for visual analytics and session replay
- Link PostHog user IDs to your database users
- Use PostHog funnels instead of building custom ones

**Example:**

```typescript
// Your existing code
await fetch('/api/analytics/track', {
  method: 'POST',
  body: JSON.stringify({ event: 'payment_success', data }),
});

// Add PostHog (one additional line)
posthog.capture('payment_success', data);
```

**Benefits:**

- Keep raw data in your database (ownership)
- Get visual analytics from PostHog (insights)
- Session replay for debugging
- No vendor lock-in

---

## Next Steps

### Immediate (If Approved)

1. Create PostHog account
2. Install `posthog-js` package
3. Set up PostHog provider in Next.js layout
4. Add event tracking to key flows:
   - Pricing page interactions
   - Payment modal events
   - Subscription lifecycle
   - Course engagement
5. Create subscription conversion funnel
6. Enable session replay for payment flows

### Short-term (Week 1-2)

1. Review session replays to identify UX issues
2. Analyze subscription funnel drop-off points
3. Set up retention cohorts by signup week
4. Track course completion rates by plan type
5. Monitor payment success/failure rates

### Medium-term (Month 1-3)

1. A/B test pricing page variants
2. Use feature flags for gradual rollouts
3. Create user segments based on behavior
4. Set up alerts for key metric drops
5. Build custom dashboards for team

---

## Decision Date: January 2025

**Selected Platform:** PostHog
**Reasoning:** Best free tier, all-in-one solution, built for SaaS, easy implementation
**Cost at MVP:** $0/month
**Expected Scale:** Can handle up to 1M events/month before any costs

**Implementation Owner:** TBD
**Timeline:** 1-2 days for basic setup
**Success Metrics:** Subscription funnel visibility, payment issue identification, user retention tracking

---

## References

- PostHog: https://posthog.com
- PostHog Docs: https://posthog.com/docs
- PostHog Next.js: https://posthog.com/docs/integrate/client/next-js
- Mixpanel: https://mixpanel.com
- Plausible: https://plausible.io
- GA4: https://analytics.google.com

---

**Document Version:** 1.0
**Last Updated:** January 2025
**Status:** Recommendation Phase
