x sanitize emails in appointments
x record 100ms call and provide summary in /user page for tenants
x fetch user info like country/timezone etc.
x spam check

x if user signed up, skip email/name fields in forms
x if user signed up, show profile icon
x collect feedback/testimonials from users after appointment
x sync calendar events to google calendar
x zoom integration for video calls
x email reply
x products and services
x recurring events in calendar
x user favicon and meta data for SEO
x SEO help
x user preferences (password, email)
x accept payments for calendar events
x tenant subscription
x more templates
x feat: add images for products

- super admin console
- booking wait list
-
- AI chat to look up user's past interactions
- video call recording and AI feed

- review DB structure for scaling
- tech: backups
- chat for video calls 100ms
- add phone number + whatsapp support for booking
- tech: alerts
- AI security review
- use existing domain host - set records only
- clean up all templates - spacings, colours, defaults etc.

- production deployment.

- invite
  - CHarles
  - Denise
  - The accountant on FB
  - Anusha?
  - Ramya
  - the real estate guy?

- search for cally.live and replace with domain everywehre
- facebook login
- buy domain option
- AI token usage for user - track and report
- workflow builder - "after appointment, send follow-up email with feedback and next steps"
- task manager
- multiple emails (aliases?)
- xero integration for invoicing
- intuit quickbooks integration
- products. appointment booking based on product, eg. 30 mins for haircut
- mobile app to go with webapp
- voice assistant - talk to AI bot on page,
  - "what was the feedback from my last meeting"
  - "Is this visitor likely to convert?"
- Shopify?
- book via call
- book via whatsapp
- workflows - "after appointment, send follow-up email with feedback and next steps"
- i18n
- app/play store ratings in testimonials
- sync calendar events with apple calendar
- sync calendar events with outlook calendar
- can zoom calls be recorded and transcribed?
- remove account and move out all data.
- set up people for multi-user support in tenants

  Sections That Could Be Added
  ┌──────────────────────┬───────────────────────────────────────────────────────────────────┐
  │ Section │ Description │
  ├──────────────────────┼───────────────────────────────────────────────────────────────────┤
  │ Testimonials │ Client reviews/quotes with name, photo, rating │
  ├──────────────────────┼───────────────────────────────────────────────────────────────────┤
  │ Pricing / Packages │ Service tiers with price, features list, CTA per tier │
  ├──────────────────────┼───────────────────────────────────────────────────────────────────┤
  │ FAQ │ Accordion-style questions & answers │
  ├──────────────────────┼───────────────────────────────────────────────────────────────────┤
  │ Gallery │ Photo grid/masonry showcasing work │
  ├──────────────────────┼───────────────────────────────────────────────────────────────────┤
  │ Contact / Location │ Address, map embed, phone, email, social links │
  ├──────────────────────┼───────────────────────────────────────────────────────────────────┤
  │ Team / Instructors │ Profiles of additional staff (photo, name, bio) │
  ├──────────────────────┼───────────────────────────────────────────────────────────────────┤
  │ Schedule / Timetable │ Weekly class schedule or upcoming events │
  ├──────────────────────┼───────────────────────────────────────────────────────────────────┤
  │ CTA Banner │ Full-width call-to-action strip (e.g. "Start your journey today") │
  ├──────────────────────┼───────────────────────────────────────────────────────────────────┤
  │ Stats / Numbers │ Key metrics (e.g. "500+ students", "10 years experience") │
  ├──────────────────────┼───────────────────────────────────────────────────────────────────┤
  │ Video │ Hero or standalone video embed (YouTube/Vimeo) │
  ├──────────────────────┼───────────────────────────────────────────────────────────────────┤
  │ Social Proof / Logos │ "As seen in" or partner logos │
  ├──────────────────────┼───────────────────────────────────────────────────────────────────┤
  │ Newsletter Signup │ Email capture form (ties into subscriber system) │
  └──────────────────────┴───────────────────────────────────────────────────────────────────┘

At 50 tenants (shared costs drop to ~$0.50/tenant):
┌───────┬───────┬──────────┬───────┐
│ │ Light │ Moderate │ Heavy │
├───────┼───────┼──────────┼───────┤
│ Total │ $0.92 │ $1.87 │ $4.10 │
└───────┴───────┴──────────┴───────┘
Key Observations

1. TTS dominates AI cost — phone briefing audio ($0.03/call) costs ~100x more than a chat message ($0.0003). If a
   tenant uses daily briefings, that's ~$0.66/mo just for TTS.
2. Chat is extremely cheap — gpt-4o-mini at $0.15/$0.60 per million tokens makes the chat widget nearly free, even at
   high volume.
3. No usage caps exist — there's no rate limiting or token tracking in the code. A popular landing page with heavy
   visitor chat could spike costs unexpectedly.
4. Unbounded conversation history — full history is sent with each message, so long conversations get progressively
   more expensive. Consider adding a sliding window.
5. Morning briefings are the biggest AI line item — and it's purely TTS, not LLM. Switching to a cheaper TTS provider
   (e.g., AWS Polly at ~$4/1M chars vs $15/1M) could cut TTS cost by ~70%.

Zoom actually has two different SDKs with very different licensing models:

Option 1: Zoom Meeting SDK (embed Zoom's full UI)

- Each tenant (host) needs a paid Zoom account (Pro at ~$13/mo)
- OR you go through the Zoom ISV Partner Program where Cally holds a master license
- ISV minimum commitment: $2,000/month for 50,000 minutes
- Tenants don't need their own Zoom accounts under ISV — Cally provisions meetings on their behalf
  ┌───────────────────────────┬──────────────────────────────┬──────────┐
  │ Approach │ Cost │ Who pays │
  ├───────────────────────────┼──────────────────────────────┼──────────┤
  │ Tenants bring own Zoom │ $0 to you, ~$13/mo to tenant │ Tenant │
  ├───────────────────────────┼──────────────────────────────┼──────────┤
  │ ISV Program (Cally hosts) │ $2,000/mo minimum │ You │
  ├───────────────────────────┼──────────────────────────────┼──────────┤
  │ ISV break-even │ ~45-65 tenants │ You │
  └───────────────────────────┴──────────────────────────────┴──────────┘
  Option 2: Zoom Video SDK (build your own UI, like 100ms)

- Pay-per-minute, no per-user license needed
- Cally holds one account, all tenants use it
- 20 free credits/month for development
- Usage-based pricing (contact Zoom for rates, but roughly comparable to 100ms)

So to directly answer your question:

Meeting SDK without ISV → Yes, each tenant needs their own paid Zoom Pro account ($13/mo). Cally just embeds the
meeting experience.

Meeting SDK with ISV → No, Cally holds the license and provisions meetings. But the $2,000/mo minimum means you need
~45+ tenants just to break even vs tenants paying $13 each.

For a small platform like Cally, the realistic options are:
┌─────────────────────────────────────┬─────────────────────────────────┬────────────────────────┐
│ Option │ Best when │ Per-tenant cost │
├─────────────────────────────────────┼─────────────────────────────────┼────────────────────────┤
│ 100ms, recording off │ < 50 tenants, you control UX │ ~$2-8/mo │
├─────────────────────────────────────┼─────────────────────────────────┼────────────────────────┤
│ Tenants use own Zoom │ You don't want video costs │ $0 (tenant pays $13) │
├─────────────────────────────────────┼─────────────────────────────────┼────────────────────────┤
│ Generate Zoom/Meet links (no embed) │ Simplest approach │ $0 │
├─────────────────────────────────────┼─────────────────────────────────┼────────────────────────┤
│ LiveKit self-hosted │ 50+ tenants, you want control │ ~$2-5/mo (EC2) │
├─────────────────────────────────────┼─────────────────────────────────┼────────────────────────┤
│ Zoom ISV │ 100+ tenants, want Zoom quality │ ~$20-40/mo (amortized) │
└─────────────────────────────────────┴─────────────────────────────────┴────────────────────────┘
The current 100ms setup with auto-recording is the most expensive path. The cheapest zero-effort change would be
disabling auto-recording — that alone drops 100ms costs from ~$43 to ~$8/mo per moderate tenant.

biz kit
launchd

bizcally.com

callygo.com
callyon.com

askleadz.com
askinterest.com
askthemleads.com
leadsetti.com
leadssay.com
launchaperone.com
launcharge.com
launchant
tradiezy.com

🟢 Starter – $29/month

For solo operators starting out

Includes:
• Branded landing page
• Appointment booking
• Basic CRM
• Automated reminders
• Email notifications
• AI chat (limited)

This should feel like:

“Less than one appointment per month”

===============================

Growth – $49/month

For busy operators

Includes everything in Starter plus:
• SMS reminders
• Email marketing campaigns
• Advanced CRM (tags, notes)
• AI auto-replies
• Basic analytics
• Remove platform branding

This is likely your sweet spot.

===============================

🟣 Pro – $79/month

For small salons (2–5 staff)

Includes:
• Multiple staff calendars
• Team scheduling
• Commission tracking
• Advanced automation
• Priority support
• Custom domain included

how do you handle cancellations?
