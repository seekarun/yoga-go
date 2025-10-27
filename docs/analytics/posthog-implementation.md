# PostHog Analytics - Implementation Guide

**Status:** Partially Implemented (Client-Side Complete)
**Date:** January 2025

---

## ✅ What's Already Implemented

### 1. Core Setup (Complete)

**Files Created:**

- ✅ `src/providers/PostHogProvider.tsx` - Analytics provider with user identification
- ✅ `.env.local` - Placeholder PostHog keys added
- ✅ `.env.example` - PostHog configuration documented

**Integration:**

- ✅ PostHogProvider added to app layout (`src/app/layout.tsx:37`)
- ✅ Automatic pageview tracking on route changes
- ✅ User identification on login (automatically syncs user profile to PostHog)
- ✅ Session replay enabled (masks password fields)

### 2. Events Tracked (Client-Side)

#### Pricing Page Events (`src/app/pricing/page.tsx`)

- ✅ `pricing_page_viewed` - User lands on pricing page
- ✅ `billing_interval_toggled` - User switches between Monthly/Yearly
- ✅ `plan_selected` - User clicks "Get Started" on a plan

#### Payment Flow Events (`src/components/payment/PaymentModal.tsx`)

- ✅ `payment_modal_opened` - Payment modal displayed
- ✅ `payment_success` - Payment completed successfully
- ✅ `payment_failed` - Payment failed with error details

#### Subscription Management Events (`src/app/app/profile/page.tsx`)

- ✅ `subscription_cancelled` - User cancels their subscription
- ✅ `subscription_reactivated` - User reactivates cancelled subscription

### 3. User Properties Tracked

**Automatically set when user logs in:**

```javascript
{
  email: user.profile.email,
  name: user.profile.name,
  membershipType: 'curious' | 'committed' | 'free',
  membershipStatus: 'active' | 'cancelled' | 'expired',
  membershipStartDate: '2025-01-26',
  totalEnrollments: 5,
  totalAchievements: 12
}
```

---

## 🚧 What's Remaining (Server-Side Events)

### Priority: Medium (Post-MVP)

Server-side events require installing `posthog-node` package. These events happen automatically (webhooks, background jobs) without direct user action, so they're less critical for initial analytics.

#### Webhook Events (Stripe)

**File:** `src/app/api/payment/stripe/webhook/route.ts`

**Events to Add:**

- `subscription_created` - New subscription from Stripe
- `subscription_updated` - Subscription status changed
- `subscription_renewed` - Successful renewal payment
- `invoice_payment_succeeded` - Payment processed successfully
- `invoice_payment_failed` - Payment failed (dunning)

**Implementation:**

```javascript
// Install: npm install posthog-node
import { PostHog } from 'posthog-node';

const posthog = new PostHog(
  process.env.POSTHOG_API_KEY!,
  { host: 'https://app.posthog.com' }
);

// In webhook handlers
posthog.capture({
  distinctId: userId,
  event: 'subscription_renewed',
  properties: {
    subscriptionId,
    planType,
    billingInterval,
    amount,
    currency
  }
});
```

#### Course Enrollment Events

**Files:**

- `src/app/api/enrollment/enroll/route.ts` - Course enrollment
- `src/app/api/enrollment/progress/route.ts` - Lesson completion

**Events to Add:**

- `course_enrolled` - User enrolls in course (currently tracked via payment_success)
- `lesson_completed` - User completes a lesson
- `lesson_started` - User starts a lesson
- `course_completed` - User finishes entire course

**Note:** These can also be tracked client-side when the user takes these actions in the UI.

---

## 📋 Setup Instructions

### Step 1: Create PostHog Account (2 minutes)

1. Go to https://app.posthog.com/signup
2. Sign up (can use GitHub/Google)
3. Create a new project
4. Copy your **Project API Key** (starts with `phc_`)

### Step 2: Add API Key to Environment

Update `.env.local`:

```bash
# Replace the placeholder key
NEXT_PUBLIC_POSTHOG_KEY=phc_your_actual_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Step 3: Restart Dev Server

```bash
npm run dev
```

### Step 4: Verify Events Are Tracked

1. **Go to PostHog Dashboard:** https://app.posthog.com/events
2. **Test the flow:**
   - Visit http://localhost:3111/pricing → Should see `pricing_page_viewed`
   - Toggle Monthly/Yearly → Should see `billing_interval_toggled`
   - Click "Get Started" → Should see `plan_selected`
   - Enter payment details → Should see `payment_modal_opened`

3. **Check real-time feed:** Events appear within 1-2 seconds

---

## 🎯 Recommended Funnels to Create

### 1. Subscription Conversion Funnel

**Purpose:** Track how many users complete the subscription flow

**Steps:**

1. `pricing_page_viewed`
2. `plan_selected`
3. `payment_modal_opened`
4. `payment_success`

**How to Create:**

1. Go to PostHog → Insights → New Insight
2. Select "Funnel"
3. Add the 4 events above in order
4. Save as "Subscription Conversion"

**Expected Results:**

- **Step 1→2:** ~30-40% (users who select a plan)
- **Step 2→3:** ~90% (users who open payment modal)
- **Step 3→4:** ~50-70% (successful payments)

### 2. Billing Interval Preference

**Purpose:** Understand if users prefer monthly vs yearly

**Steps:**

1. `billing_interval_toggled`
2. `plan_selected`

**Filter:** Group by `billingInterval` property

### 3. Payment Success Rate

**Purpose:** Monitor payment gateway health

**Steps:**

1. `payment_modal_opened`
2. `payment_success` OR `payment_failed`

**Breakdown:** By `gateway` property (Stripe/Razorpay)

### 4. Subscription Retention

**Purpose:** Track cancellation rates

**Cohorts:**

- Users who triggered `payment_success`
- Group by signup week
- Track `subscription_cancelled` event over time

---

## 🎥 Session Replay Setup

**Already Enabled!** Session recordings are automatically captured.

### How to Use:

1. Go to PostHog → Session Recordings
2. Filter by:
   - Pages: `/pricing`, `/app/profile`
   - Events: `payment_failed`, `payment_modal_opened`
3. Watch recordings of users who:
   - Failed payment (to debug issues)
   - Cancelled subscription (to understand why)
   - Toggled billing intervals (to see hesitation)

### Privacy Settings:

**Current Configuration** (in PostHogProvider.tsx):

- ✅ Password fields are masked
- ✅ Other inputs are visible (can be changed to masked)
- ✅ Respects "Do Not Track" browser setting

**To Mask All Inputs:**

```javascript
maskAllInputs: true, // Change this in PostHogProvider.tsx:26
```

---

## 📊 Key Metrics Dashboard

### Metrics to Track:

**Conversion Metrics:**

- Pricing page → Plan selection rate
- Plan selection → Payment modal open rate
- Payment modal → Payment success rate
- Overall conversion rate (pricing → payment success)

**Revenue Metrics:**

- Monthly vs Yearly plan distribution
- Average subscription value
- Currency distribution (INR vs USD)
- Gateway distribution (Stripe vs Razorpay)

**Retention Metrics:**

- Cancellation rate (% of active subscriptions)
- Time to cancellation (days from subscription start)
- Reactivation rate (% of cancelled users who reactivate)

**Engagement Metrics:**

- Pricing page bounce rate
- Billing toggle frequency
- Payment retry rate

---

## 🐛 Debugging & Troubleshooting

### Issue: Events not showing in PostHog

**Check:**

1. Is `NEXT_PUBLIC_POSTHOG_KEY` set correctly in `.env.local`?
2. Did you restart the dev server after adding the key?
3. Check browser console for PostHog errors
4. Verify key is not `phc_placeholder_key`

**Test:**

```javascript
// In browser console
console.log(posthog.get_distinct_id()); // Should show user ID or anonymous ID
posthog.capture('test_event'); // Should appear in PostHog
```

### Issue: User identification not working

**Check:**

1. User is logged in via Auth0
2. User object has `id` property
3. Check browser console for `[DBG][posthog] User identified: xxx`

### Issue: Build warnings about PostHog

**Common Warnings:**

- `useSearchParams() should be wrapped in a suspense boundary` → Already fixed with Suspense wrapper
- PostHog not initialized → Key not set, using placeholder

---

## 🚀 Next Steps

### Immediate (If Needed)

- [ ] Replace `phc_placeholder_key` with real PostHog key
- [ ] Create subscription conversion funnel
- [ ] Set up session replay filters
- [ ] Create revenue dashboard

### Short-term (Week 1-2)

- [ ] Watch 10+ session replays of payment flows
- [ ] Identify and fix drop-off points in funnel
- [ ] Set up alerts for payment failure rate > 10%
- [ ] A/B test pricing page variants

### Medium-term (Month 1)

- [ ] Install `posthog-node` for server-side tracking
- [ ] Add webhook events (subscription_renewed, etc.)
- [ ] Create cohort analysis for retention
- [ ] Set up automated weekly reports

### Long-term (Quarter 1)

- [ ] Implement feature flags for gradual rollouts
- [ ] A/B test pricing amounts
- [ ] Build custom dashboards for team
- [ ] Integrate with Stripe analytics

---

## 💡 Quick Wins

### 1. Identify Payment Drop-offs

Use session replay to watch users who opened payment modal but didn't complete:

```
Filter: payment_modal_opened AND NOT payment_success
```

Common issues to look for:

- Card declined errors
- Confusion about billing interval
- Hesitation at price
- Gateway errors

### 2. Optimize Billing Interval Toggle

Track how many times users toggle before selecting:

```
Count: billing_interval_toggled per user session
```

If users toggle multiple times, they might be confused about pricing.

### 3. Gateway Performance Comparison

Compare Stripe vs Razorpay success rates:

```
Funnel: payment_modal_opened → payment_success
Breakdown by: gateway property
```

### 4. Cancellation Reasons

Add cancellation reason tracking (already in code):

```javascript
// When user cancels
posthog.capture('subscription_cancelled', {
  reason: 'too_expensive' | 'not_using' | 'other',
});
```

---

## 📚 Resources

### PostHog Documentation

- Events: https://posthog.com/docs/data/events
- Funnels: https://posthog.com/docs/user-guides/funnels
- Session Replay: https://posthog.com/docs/session-replay
- User Properties: https://posthog.com/docs/data/user-properties

### PostHog Dashboard

- Project: https://app.posthog.com/project/settings
- Events: https://app.posthog.com/events
- Insights: https://posthog.com/docs/user-guides/insights
- Recordings: https://app.posthog.com/replay

### Support

- PostHog Community: https://posthog.com/questions
- Docs: https://posthog.com/docs

---

## 📈 Success Criteria

**PostHog implementation is successful when:**

✅ All critical events are tracked (pricing, payment, subscription)
✅ Subscription conversion funnel is visible
✅ Session replays help identify and fix payment issues
✅ User properties enable cohort analysis
✅ Dashboard shows key metrics (conversion, revenue, retention)
✅ Team uses PostHog weekly to make data-driven decisions

**Current Status:** ✅ **MVP Complete** - Client-side tracking functional, ready for production use

---

**Last Updated:** January 2025
**Implementation Status:** Client-Side Complete, Server-Side Optional
