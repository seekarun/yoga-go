- sanitize emails in appointments
- record 100ms call and provide summary in /user page for tenants
- sync calendar events to google calendar (and others)
- video call recording and AI feed
- AI chat to look up user's past interactions
- if user signed up, skip email/name fields in forms
- if user signed up, show profile icon
- fetch user info like country/timezone etc.
- spam check
- buy domain option
- multiple emails
- collect feedback from users after appointment
- accept payments for calendar events
- products. appointment booking based on product, eg. 30 mins for haircut
- book via call
- book via whatsapp
- voice assistant - talk to AI bot on page,
  - "what was the feedback from my last meeting"
  - "Is this visitor likely to convert?"
- mobile app to go with webapp
- SEO help
- review DB structure for scaling

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
