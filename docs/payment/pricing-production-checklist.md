# Pricing & Subscription - Production Readiness Checklist

This document outlines all tasks required to make the subscription pricing system production-ready.

---

## ✅ Completed

- [x] Payment configuration with monthly/yearly pricing
- [x] Subscription model for tracking lifecycle
- [x] User model with subscription fields
- [x] Pricing page UI with Monthly/Yearly toggle
- [x] Stripe subscription creation API
- [x] Stripe webhook handler for subscription events
- [x] Stripe subscription cancellation/reactivation API
- [x] Profile/membership page with subscription management UI
- [x] Access control utilities for subscription status
- [x] Cancel/Reactivate subscription UI connected to backend

---

## 🚨 Critical - Must Complete Before Launch

### 1. Payment Flow Integration

**Priority:** HIGH
**Effort:** 2-3 hours

- [ ] Wire `PaymentModal.tsx` to call subscription creation APIs
- [ ] Handle subscription creation response (client secret)
- [ ] Integrate Stripe Elements for payment method collection
- [ ] Handle payment confirmation and success/error states
- [ ] Redirect to profile page after successful subscription

**Files:**

- `src/components/payment/PaymentModal.tsx`
- `src/components/payment/StripeCheckout.tsx`

### 2. Environment Variables Setup

**Priority:** HIGH
**Effort:** 30 minutes

Add these to `.env.local` and production environment:

```bash
# Stripe Configuration
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_CURIOUS_MONTHLY_INR_PRICE_ID=price_xxx
STRIPE_CURIOUS_MONTHLY_USD_PRICE_ID=price_xxx
STRIPE_CURIOUS_YEARLY_INR_PRICE_ID=price_xxx
STRIPE_CURIOUS_YEARLY_USD_PRICE_ID=price_xxx
STRIPE_COMMITTED_MONTHLY_INR_PRICE_ID=price_xxx
STRIPE_COMMITTED_MONTHLY_USD_PRICE_ID=price_xxx
STRIPE_COMMITTED_YEARLY_INR_PRICE_ID=price_xxx
STRIPE_COMMITTED_YEARLY_USD_PRICE_ID=price_xxx

# Razorpay Configuration (if implementing)
RAZORPAY_WEBHOOK_SECRET=xxx
RAZORPAY_CURIOUS_MONTHLY_INR_PLAN_ID=plan_xxx
RAZORPAY_CURIOUS_YEARLY_INR_PLAN_ID=plan_xxx
RAZORPAY_COMMITTED_MONTHLY_INR_PLAN_ID=plan_xxx
RAZORPAY_COMMITTED_YEARLY_INR_PLAN_ID=plan_xxx
```

### 3. Stripe Dashboard Configuration

**Priority:** HIGH
**Effort:** 1-2 hours

#### Create Subscription Products:

1. **Curious Plan**
   - Name: "Curious Plan"
   - Description: "12 course tokens per year (1 per month)"
   - Create 4 prices:
     - Monthly INR: ₹299/month
     - Monthly USD: $35/month
     - Yearly INR: ₹2,499/year
     - Yearly USD: $299/year

2. **Committed Plan**
   - Name: "Committed Plan"
   - Description: "Unlimited access to all courses"
   - Create 4 prices:
     - Monthly INR: ₹699/month
     - Monthly USD: $69/month
     - Yearly INR: ₹4,999/year
     - Yearly USD: $599/year

#### Configure Webhooks:

- Production endpoint: `https://yourdomain.com/api/payment/stripe/webhook`
- Select events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `customer.subscription.trial_will_end`

### 4. Update Payment Method Feature

**Priority:** HIGH
**Effort:** 3-4 hours

- [ ] Add "Update Payment Method" button in profile
- [ ] Integrate Stripe Customer Portal OR
- [ ] Build custom payment method update flow
- [ ] Test card update flow
- [ ] Handle failed payment method updates

**Recommended:** Use Stripe Customer Portal (easiest)

```typescript
// Create portal session API endpoint
const session = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: 'https://yourdomain.com/app/profile',
});
// Redirect user to session.url
```

### 5. Error Handling & User Feedback

**Priority:** MEDIUM
**Effort:** 2 hours

- [ ] Replace `alert()` with proper toast notifications
- [ ] Add loading spinners during API calls
- [ ] Show error messages inline (not just alerts)
- [ ] Add retry logic for failed API calls
- [ ] Handle network errors gracefully

**Suggested Library:** `react-hot-toast` or `sonner`

---

## 🔧 Important - Complete Before Public Launch

### 6. Testing Checklist

**Priority:** HIGH
**Effort:** 4-6 hours

#### Subscription Flow Testing:

- [ ] Test monthly subscription creation (INR & USD)
- [ ] Test yearly subscription creation (INR & USD)
- [ ] Verify webhook events fire correctly
- [ ] Test subscription cancellation
- [ ] Test subscription reactivation
- [ ] Verify access continues until period end after cancellation
- [ ] Test currency detection and switching

#### Payment Testing:

- [ ] Test successful payment
- [ ] Test declined card
- [ ] Test expired card
- [ ] Test insufficient funds
- [ ] Test 3D Secure authentication

#### Webhook Testing:

- [ ] Use Stripe CLI to forward webhooks: `stripe listen --forward-to localhost:3111/api/payment/stripe/webhook`
- [ ] Trigger test events: `stripe trigger customer.subscription.created`
- [ ] Verify database updates correctly
- [ ] Check user access updates

#### Edge Cases:

- [ ] User changes plan (upgrade/downgrade)
- [ ] User has multiple failed payments
- [ ] Subscription expires
- [ ] User tries to subscribe twice

### 7. Access Control Implementation

**Priority:** HIGH
**Effort:** 2-3 hours

- [ ] Protect course routes based on subscription status
- [ ] Use `hasSubscriptionAccess()` utility in course pages
- [ ] Block access when subscription expires
- [ ] Show upgrade prompts for free users
- [ ] Handle "Curious" plan token limits (12 courses/year)

**Files to update:**

- `src/app/app/courses/[id]/page.tsx`
- Course enrollment logic
- API endpoints

### 8. Monitoring & Logging

**Priority:** MEDIUM
**Effort:** 2 hours

- [ ] Add structured logging for subscription events
- [ ] Track failed payment rates
- [ ] Monitor webhook processing errors
- [ ] Set up alerts for:
  - High failed payment rate (>5%)
  - Webhook processing failures
  - Subscription creation errors
- [ ] Log subscription lifecycle events

**Recommended Tools:**

- Sentry for error tracking
- LogRocket for session replay
- Stripe Dashboard for payment monitoring

### 9. Email Notifications

**Priority:** MEDIUM
**Effort:** 4-6 hours

Implement automated emails for:

- [ ] Subscription confirmation (welcome email)
- [ ] Payment receipt
- [ ] Failed payment alert
- [ ] Upcoming renewal reminder (7 days before)
- [ ] Subscription cancelled confirmation
- [ ] Subscription reactivated confirmation
- [ ] Payment method expiring soon

**Integration Options:**

- Stripe's built-in email notifications (easiest)
- Custom emails via SendGrid/Resend/Postmark

### 10. Proration & Plan Changes

**Priority:** MEDIUM
**Effort:** 3-4 hours

- [ ] Implement upgrade flow (Curious → Committed)
- [ ] Implement downgrade flow (Committed → Curious)
- [ ] Handle proration calculations
- [ ] Update subscription immediately or at period end
- [ ] Show preview of charges before confirming change

---

## 🌟 Optional - Razorpay Subscriptions (India-specific)

### 11. Razorpay Subscription Implementation

**Priority:** LOW (Optional)
**Effort:** 6-8 hours

**Note:** Only implement if you want India-specific payment methods (UPI AutoPay, e-Mandate). Otherwise, Stripe handles INR well.

- [ ] Create Razorpay subscription plans in dashboard
- [ ] Implement `create-subscription` API
- [ ] Implement webhook handler
- [ ] Implement cancel-subscription API
- [ ] Handle e-Mandate/UPI AutoPay authorization
- [ ] Handle ₹5,000 UPI AutoPay limit
- [ ] Test with test mode plans
- [ ] Configure webhook endpoint

**Files to create:**

- `src/app/api/payment/razorpay/create-subscription/route.ts`
- `src/app/api/payment/razorpay/webhook/route.ts`
- `src/app/api/payment/razorpay/cancel-subscription/route.ts`

**Razorpay Webhook Events:**

- `subscription.activated`
- `subscription.charged`
- `subscription.pending`
- `subscription.halted`
- `subscription.cancelled`
- `subscription.completed`

---

## 💼 Production Setup

### 12. Production Stripe Account

**Priority:** HIGH
**Effort:** 1 hour

- [ ] Activate Stripe account
- [ ] Complete business verification
- [ ] Enable INR & USD currencies
- [ ] Set up bank account for payouts
- [ ] Configure tax settings
- [ ] Enable Stripe Radar (fraud detection)
- [ ] Set up 2FA for account security

### 13. Production Razorpay Account

**Priority:** MEDIUM (if implementing)
**Effort:** 1 hour

- [ ] Complete KYC verification
- [ ] Activate live API keys
- [ ] Configure settlement account
- [ ] Enable required payment methods
- [ ] Set up webhook signing secret

### 14. Database & Infrastructure

**Priority:** HIGH
**Effort:** 2-3 hours

- [ ] Set up production MongoDB cluster
- [ ] Configure database indexes for performance
- [ ] Set up automated backups
- [ ] Implement connection pooling
- [ ] Add database monitoring
- [ ] Test failover scenarios

**Indexes to add:**

```javascript
// Subscription collection
db.subscriptions.createIndex({ userId: 1, status: 1 });
db.subscriptions.createIndex({ gatewaySubscriptionId: 1 });
db.subscriptions.createIndex({ currentPeriodEnd: 1 });

// Payment collection
db.payments.createIndex({ userId: 1, status: 1, initiatedAt: -1 });
db.payments.createIndex({ paymentIntentId: 1 });
```

### 15. Security Hardening

**Priority:** HIGH
**Effort:** 2-3 hours

- [ ] Implement rate limiting on payment endpoints
- [ ] Add CORS restrictions
- [ ] Validate webhook signatures
- [ ] Sanitize user inputs
- [ ] Enable HTTPS only
- [ ] Set secure cookie flags
- [ ] Implement CSP headers
- [ ] Add request logging (without sensitive data)

**Rate Limits Suggested:**

- Subscription creation: 5 requests/hour per user
- Cancel/reactivate: 10 requests/hour per user
- Webhook: 1000 requests/hour (from Stripe/Razorpay IPs only)

### 16. Compliance & Legal

**Priority:** HIGH
**Effort:** 4-6 hours

- [ ] Add Terms of Service for subscriptions
- [ ] Add Refund Policy (30-day money-back guarantee)
- [ ] Add Cancellation Policy
- [ ] Update Privacy Policy for payment data
- [ ] GDPR compliance for EU users
- [ ] PCI DSS compliance verification
- [ ] Add billing address collection (for tax)
- [ ] Implement tax calculation (if required)

---

## 🎨 UI/UX Enhancements

### 17. Improved User Experience

**Priority:** MEDIUM
**Effort:** 3-4 hours

- [ ] Add loading skeletons during data fetch
- [ ] Show subscription status badges
- [ ] Add invoice download button
- [ ] Create payment history page
- [ ] Add usage tracking for "Curious" plan (course tokens)
- [ ] Show "X courses remaining" for Curious plan
- [ ] Add testimonials on pricing page
- [ ] A/B test pricing page variants

### 18. Mobile Responsiveness

**Priority:** MEDIUM
**Effort:** 2-3 hours

- [ ] Test pricing page on mobile devices
- [ ] Test payment flow on mobile
- [ ] Optimize profile page for mobile
- [ ] Test cancel/reactivate on mobile
- [ ] Ensure modals work on mobile

### 19. Analytics & Tracking

**Priority:** MEDIUM
**Effort:** 2 hours

- [ ] Track pricing page views
- [ ] Track plan selection events
- [ ] Track subscription conversions
- [ ] Track cancellation reasons
- [ ] Monitor churn rate
- [ ] Calculate Monthly Recurring Revenue (MRR)
- [ ] Track customer lifetime value (LTV)

**Integrate:**

- Google Analytics / Plausible
- Stripe Analytics Dashboard
- Custom analytics dashboard

---

## 🚀 Advanced Features (Future)

### 20. Subscription Upgrades/Downgrades

**Priority:** LOW
**Effort:** 4-6 hours

- [ ] Allow plan changes from profile
- [ ] Calculate prorated charges
- [ ] Preview new charges before confirming
- [ ] Update subscription immediately
- [ ] Send confirmation email

### 21. Referral Program

**Priority:** LOW
**Effort:** 8-12 hours

- [ ] Give referrer 1 month free or discount
- [ ] Give referee discount on first subscription
- [ ] Track referral conversions
- [ ] Create referral dashboard

### 22. Trial Period

**Priority:** LOW
**Effort:** 2-3 hours

- [ ] Add 7-day or 14-day free trial
- [ ] Require payment method upfront
- [ ] Auto-convert to paid after trial
- [ ] Send trial ending reminders

### 23. Annual Discount Campaigns

**Priority:** LOW
**Effort:** 3-4 hours

- [ ] Implement coupon code system
- [ ] Create time-limited offers
- [ ] Add discount banners on pricing page
- [ ] Track coupon usage

---

## 📋 Launch Checklist

Use this checklist before going live:

### Pre-Launch

- [ ] All critical tasks completed
- [ ] Payment flow tested end-to-end
- [ ] Webhooks configured and tested
- [ ] Environment variables set in production
- [ ] SSL certificate active
- [ ] Database backups configured
- [ ] Monitoring and alerts set up
- [ ] Legal pages updated
- [ ] Customer support process defined

### Launch Day

- [ ] Enable production Stripe/Razorpay keys
- [ ] Monitor webhook logs
- [ ] Monitor error rates
- [ ] Test with real credit card
- [ ] Verify emails send correctly
- [ ] Check database updates
- [ ] Monitor server resources

### Post-Launch (First Week)

- [ ] Monitor failed payment rate
- [ ] Track conversion rates
- [ ] Collect user feedback
- [ ] Monitor support tickets
- [ ] Check for errors in logs
- [ ] Verify all webhooks processed
- [ ] Review subscription analytics

---

## 📞 Support Resources

### Stripe

- Documentation: https://stripe.com/docs/billing/subscriptions
- Dashboard: https://dashboard.stripe.com
- Support: https://support.stripe.com
- API Reference: https://stripe.com/docs/api/subscriptions

### Razorpay

- Documentation: https://razorpay.com/docs/subscriptions
- Dashboard: https://dashboard.razorpay.com
- Support: support@razorpay.com
- API Reference: https://razorpay.com/docs/api/subscriptions

### Helpful Commands

**Test Stripe webhooks locally:**

```bash
stripe listen --forward-to localhost:3111/api/payment/stripe/webhook
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
```

**Check subscription status:**

```bash
stripe subscriptions list --limit 10
stripe subscriptions retrieve sub_xxx
```

**Test database connection:**

```bash
mongosh "mongodb+srv://your-connection-string"
db.subscriptions.find({status: "active"}).count()
```

---

## 📝 Notes

- **Estimated Total Effort:** 40-60 hours for full production readiness
- **Minimum Viable Product (MVP):** Complete sections 1-9 (20-25 hours)
- **Recommended Timeline:** 2-3 weeks for thorough implementation and testing

**Priority Guide:**

- 🚨 **HIGH** = Must complete before launch
- 🔧 **MEDIUM** = Should complete before public launch
- 🌟 **LOW** = Nice to have, can defer to post-launch

---

Last Updated: January 2025
