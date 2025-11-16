# Yoga-Go Documentation

Welcome to the Yoga-Go project documentation! This directory contains all guides, checklists, and implementation details organized by topic.

---

## 📁 Documentation Structure

```
docs/
├── README.md (you are here)
├── analytics/
│   ├── analytics-comparison.md
│   └── posthog-implementation.md
├── payment/
│   ├── pricing-production-checklist.md
│   └── subscription-testing-guide.md
└── development/
    └── (future development guides)
```

---

## 📊 Analytics

### [Analytics Platform Comparison](./analytics/analytics-comparison.md)

**Purpose:** Evaluate and select the best analytics solution for Yoga-Go
**Status:** Decision Made (PostHog Selected)

**What's Inside:**

- Comparison of 5 analytics platforms (PostHog, Mixpanel, GA4, Plausible, Amplitude)
- Feature comparison matrix
- Cost analysis at different scales
- Final recommendation with reasoning

**When to Use:**

- Understanding why PostHog was chosen
- Revisiting analytics decision in the future
- Comparing costs as you scale

---

### [PostHog Implementation Guide](./analytics/posthog-implementation.md)

**Purpose:** Step-by-step guide to set up and use PostHog analytics
**Status:** Client-Side Complete, Server-Side Optional

**What's Inside:**

- ✅ What's already implemented (events, tracking)
- 🚧 What's remaining (server-side events)
- 📋 Setup instructions (get API key, test events)
- 🎯 Recommended funnels to create
- 🎥 Session replay setup
- 🐛 Debugging guide

**When to Use:**

- Setting up PostHog for the first time (requires API key)
- Understanding what events are tracked
- Creating funnels and dashboards
- Debugging analytics issues
- Planning future analytics work

**Quick Start:**

1. Sign up at https://app.posthog.com/signup
2. Get your project API key
3. Add to `.env.local`: `NEXT_PUBLIC_POSTHOG_KEY=phc_your_key`
4. Restart dev server: `npm run dev`

---

## 💳 Payment & Subscriptions

### [Subscription Testing Guide](./payment/subscription-testing-guide.md)

**Purpose:** Test the complete subscription payment flow
**Status:** Implementation Complete

**What's Inside:**

- Complete subscription flow explanation
- Stripe Dashboard setup instructions
- Test card numbers for different scenarios
- Step-by-step testing checklist
- Webhook setup with Stripe CLI
- Troubleshooting common issues

**When to Use:**

- Testing subscription flow for the first time
- Verifying payment integration works
- Setting up Stripe test products/prices
- Debugging subscription issues
- Before going to production

**Quick Test:**

1. Create Stripe price IDs (8 prices: curious/committed × monthly/yearly × INR/USD)
2. Add to `.env.local`
3. Go to `/pricing` → Select plan → Enter test card `4242 4242 4242 4242`
4. Verify subscription in Stripe Dashboard

---

### [Pricing Production Checklist](./payment/pricing-production-checklist.md)

**Purpose:** Complete checklist of all tasks before launching subscriptions
**Status:** Ongoing (Reference Document)

**What's Inside:**

- ✅ Completed features (subscription creation, webhooks, cancel/reactivate)
- 🚨 Critical tasks (payment flow, environment variables, Stripe setup)
- 🔧 Important tasks (testing, access control, monitoring)
- 🌟 Optional tasks (Razorpay subscriptions, advanced features)
- 📋 Launch day checklist

**When to Use:**

- Planning production launch
- Tracking implementation progress
- Understanding remaining work
- Prioritizing tasks by importance

**Priority Levels:**

- 🚨 HIGH = Must complete before launch (~20-25 hours)
- 🔧 MEDIUM = Should complete before public launch
- 🌟 LOW = Nice to have, defer to post-launch

---

## 🚀 Quick Start Guides

### For New Team Members

**Day 1: Setup Development Environment**

1. Clone repository
2. Copy `.env.example` to `.env.local`
3. Fill in required environment variables:
   - MongoDB URI
   - Auth0 credentials
   - Stripe test keys
   - Razorpay test keys
4. Install dependencies: `npm install`
5. Run dev server: `npm run dev`

**Day 2: Understanding the Codebase**

1. Read `CLAUDE.md` (project structure and commands)
2. Review `docs/analytics/analytics-comparison.md` (why PostHog)
3. Review `docs/payment/pricing-production-checklist.md` (current status)

**Day 3: Testing Features**

1. Follow `docs/payment/subscription-testing-guide.md`
2. Create test subscription
3. Test cancel/reactivate flow
4. Verify events in PostHog

---

### For Product Testing

**Before Testing Session:**

- [ ] Read `docs/payment/subscription-testing-guide.md`
- [ ] Ensure test environment is set up (Stripe test mode)
- [ ] Have test card numbers ready (`4242 4242 4242 4242`)

**During Testing:**

- [ ] Test pricing page (monthly/yearly toggle)
- [ ] Test payment flow (success and failure scenarios)
- [ ] Test subscription management (cancel/reactivate)
- [ ] Verify events tracked in PostHog
- [ ] Document any bugs or issues

**After Testing:**

- [ ] Review session replays in PostHog
- [ ] Check subscription funnel drop-offs
- [ ] Report findings to team

---

### For Production Launch

**Pre-Launch Checklist:**

- [ ] Complete all 🚨 HIGH priority tasks in `pricing-production-checklist.md`
- [ ] Set up production Stripe account
- [ ] Create production Stripe price IDs
- [ ] Configure production webhook endpoint
- [ ] Update environment variables to production values
- [ ] Test with real credit card (small amounts)
- [ ] Verify PostHog is tracking in production

**Launch Day:**

- [ ] Monitor PostHog real-time events
- [ ] Watch for payment failures
- [ ] Check webhook processing
- [ ] Monitor server logs
- [ ] Be ready for customer support

**Post-Launch (First Week):**

- [ ] Review conversion funnel daily
- [ ] Watch session replays of failed payments
- [ ] Monitor churn rate
- [ ] Collect user feedback
- [ ] Iterate on pricing/UX issues

---

## 📚 Additional Resources

### External Documentation

- **Stripe:** https://stripe.com/docs/billing/subscriptions
- **Razorpay:** https://razorpay.com/docs/subscriptions
- **PostHog:** https://posthog.com/docs
- **Auth0:** https://auth0.com/docs
- **Next.js 15:** https://nextjs.org/docs

### Dashboards

- **Stripe Dashboard:** https://dashboard.stripe.com
- **PostHog Dashboard:** https://app.posthog.com
- **Razorpay Dashboard:** https://dashboard.razorpay.com
- **Auth0 Dashboard:** https://manage.auth0.com

---

## 🆘 Getting Help

### For Technical Issues

1. Check relevant documentation in this `/docs` folder
2. Review `CLAUDE.md` for project-specific commands
3. Check browser console for errors
4. Review server logs (`npm run dev` output)

### For Analytics Questions

- See `docs/analytics/posthog-implementation.md`
- Check PostHog dashboard: https://app.posthog.com
- PostHog community: https://posthog.com/questions

### For Payment Issues

- See `docs/payment/subscription-testing-guide.md`
- Check Stripe Dashboard logs
- Test with `stripe trigger` commands
- Review webhook event logs

---

## 📝 Document Maintenance

### When to Update Documentation

**After Major Features:**

- Add new guide in appropriate folder
- Update this README with links
- Update production checklist if needed

**After Configuration Changes:**

- Update `.env.example` if new variables added
- Update setup guides if setup process changes
- Update testing guides if test steps change

**Quarterly Reviews:**

- Verify all links still work
- Update screenshots if UI changed
- Remove deprecated information
- Add new best practices learned

---

## 🎯 Documentation Philosophy

**Goals:**

1. ✅ New team members can onboard quickly
2. ✅ Complex features are well-documented
3. ✅ Production readiness is trackable
4. ✅ Guides are actionable (step-by-step)
5. ✅ Documentation is easy to find

**Best Practices:**

- Keep guides focused on one topic
- Use checklists for processes
- Include examples and code snippets
- Update docs when code changes
- Add troubleshooting sections
- Include "when to use" guidance

---

**Last Updated:** January 2025
**Maintained By:** Development Team
**Questions?** Check the relevant guide or ask in team chat
