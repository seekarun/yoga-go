# Webinar Product Type Design

Date: 2026-02-22

## Overview

Add a new product type "webinar" to the Cally app. Unlike regular service products where visitors pick any available time slot, webinars have fixed schedules set by the tenant. Visitors sign up for the entire webinar (all sessions). Webinars support max participant limits and can be free or paid.

## Data Model

### Product Extension

Add to `Product` type:

- `productType: 'service' | 'webinar'` — defaults to `'service'` for backward compatibility
- `maxParticipants?: number` — webinar only, null/undefined = unlimited
- `webinarSchedule?: WebinarSchedule` — webinar only

```typescript
interface WebinarSchedule {
  startDate: string;              // YYYY-MM-DD
  startTime: string;              // HH:mm (tenant timezone)
  endTime: string;                // HH:mm (tenant timezone)
  recurrenceRule?: RecurrenceRule; // reuse existing type
  sessionCount: number;           // total sessions
}
```

### Session Storage

Each webinar session is stored as a `CalendarEvent` with:

- `type: 'webinar'` (new enum value)
- `productId` pointing to the webinar product
- `recurrenceGroupId = productId` (links all sessions)
- `attendees` array populated as visitors sign up

### Webinar Signup Entity (DynamoDB)

```
PK: TENANT#{tenantId}
SK: WEBINAR_SIGNUP#{productId}#EMAIL#{normalizedEmail}
entityType: "WEBINAR_SIGNUP"
```

Fields: `visitorName`, `visitorEmail`, `productId`, `signedUpAt`, `paymentStatus` (`'free'|'pending_payment'|'paid'`), `stripeCheckoutSessionId?`, `stripePaymentIntentId?`

## Tenant-Side UX

### Product Form Modal

- Add `productType` toggle: "Service" (default) | "Webinar"
- When "Webinar" selected, show:
  - Max Participants (number input, optional)
  - Start date picker
  - Start time / end time (tenant timezone)
  - RecurrenceSelector (reuse existing component)
  - Session preview list (computed dates)
- Duration field replaced by start/end time for webinars
- Existing fields (name, description, price, color, images, active) unchanged

### On Save

1. Create product with `productType: 'webinar'` and `webinarSchedule`
2. Server generates all session CalendarEvents linked by `recurrenceGroupId = productId`
3. Sessions appear on tenant's calendar

### On Update

- Schedule change: delete old session events, regenerate new ones
- Deactivate: session events remain on calendar, signups disabled

## Visitor-Facing Signup

### Dedicated WebinarSignup Component

- Shows: webinar name, description, images, full session schedule, price, spots remaining
- Simple form: name, email, optional note
- Paid: Stripe checkout (existing pattern)
- Free: immediate confirmation
- Full: "Webinar Full" message, no form

### Landing Page Integration

- Webinar products show "Sign Up" instead of "Book Now"
- Clicking opens webinar signup page (not BookingWidget)
- Embed system: `CallyEmbed.open("webinar", { productId })`

### Signup Flow

1. Visitor submits name + email
2. Server validates: email, spam, participant count vs max
3. Creates WebinarSignup entity
4. Adds visitor as attendee on all session CalendarEvents
5. Sends confirmation email with schedule
6. Paid: Stripe checkout first, confirmed after payment

## API Routes

### New (Public)

- `GET /api/data/tenants/[tenantId]/webinar/[productId]` — webinar details + schedule + spots
- `POST /api/data/tenants/[tenantId]/webinar/[productId]/signup` — visitor signup

### New (Authenticated)

- `GET /api/data/app/webinar/[productId]/signups` — list signups
- `DELETE /api/data/app/webinar/[productId]/signups/[email]` — remove participant

### Modified

- `POST /api/data/app/products` — handle `productType: 'webinar'`, generate session events
- `PUT /api/data/app/products/[productId]` — handle schedule changes
- `DELETE /api/data/app/products/[productId]` — cascade delete sessions + signups

## New Files

- `src/types/webinar.ts` — WebinarSchedule, WebinarSignup, ProductType
- `src/lib/repositories/webinarSignupRepository.ts` — signup CRUD
- `src/lib/webinar/schedule.ts` — expand recurrence into session dates
- `src/app/api/data/tenants/[tenantId]/webinar/[productId]/route.ts`
- `src/app/api/data/tenants/[tenantId]/webinar/[productId]/signup/route.ts`
- `src/app/api/data/app/webinar/[productId]/signups/route.ts`
- `src/components/webinar/WebinarSignup.tsx`
- `src/components/webinar/WebinarSchedulePreview.tsx`

## Modified Files

- `src/types/product.ts` — add productType, maxParticipants, webinarSchedule
- `src/components/products/ProductFormModal.tsx` — webinar fields
- `src/app/api/data/app/products/route.ts` — webinar creation
- `src/app/api/data/app/products/[productId]/route.ts` — webinar update/delete
- `src/components/landing-page/` — detect webinar, render differently

## Out of Scope

- Waitlist when full
- Video conferencing integration
- Attendee reminders before sessions
- Analytics/reporting
- Editing individual sessions (only full reschedule)
- Visitor cancellation after signup
