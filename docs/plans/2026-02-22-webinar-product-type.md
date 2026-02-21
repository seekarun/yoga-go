# Webinar Product Type Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "webinar" product type to the Cally app that allows tenants to create fixed-schedule events that visitors sign up for.

**Architecture:** Extend the existing Product entity with a `productType` discriminator and webinar-specific fields. Webinar sessions are stored as CalendarEvents linked by `recurrenceGroupId`. A new WebinarSignup entity tracks enrollments. The visitor-facing flow uses a dedicated signup component instead of the BookingWidget.

**Tech Stack:** Next.js 15, TypeScript, DynamoDB (single-table), React, Tailwind CSS, Stripe

---

### Task 1: Types — Product extension and WebinarSignup

**Files:**
- Modify: `apps/cally/src/types/product.ts`
- Create: `apps/cally/src/types/webinar.ts`
- Modify: `apps/cally/src/types/index.ts` (add webinar re-export)
- Modify: `core/types/src/calendar.ts:10` (add "webinar" to CalendarEventType)

**Step 1: Add productType and webinar fields to Product type**

In `apps/cally/src/types/product.ts`, add after the imports:

```typescript
export type ProductType = "service" | "webinar";
```

Add to the `Product` interface (after `sortOrder`):

```typescript
  productType?: ProductType; // defaults to 'service' for backward compat
  maxParticipants?: number;  // webinar only — undefined = unlimited
  webinarSchedule?: WebinarSchedule;
```

**Step 2: Create webinar types file**

Create `apps/cally/src/types/webinar.ts`:

```typescript
/**
 * Webinar Types for CallyGo
 */

import type { RecurrenceRule } from "@core/types";

/**
 * Webinar schedule configuration — stored on the Product entity
 */
export interface WebinarSchedule {
  startDate: string;              // YYYY-MM-DD
  startTime: string;              // HH:mm (in tenant's timezone)
  endTime: string;                // HH:mm (in tenant's timezone)
  recurrenceRule?: RecurrenceRule; // reuse existing type
  sessionCount: number;           // total number of sessions
}

/**
 * Payment status for a webinar signup
 */
export type WebinarSignupPaymentStatus = "free" | "pending_payment" | "paid";

/**
 * Webinar signup entity — tracks a visitor enrolled in a webinar
 */
export interface WebinarSignup {
  productId: string;
  visitorName: string;
  visitorEmail: string;
  signedUpAt: string;             // ISO 8601
  paymentStatus: WebinarSignupPaymentStatus;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
}
```

**Step 3: Add "webinar" to CalendarEventType**

In `core/types/src/calendar.ts:10`, change:

```typescript
export type CalendarEventType = "general" | "live_session";
```

to:

```typescript
export type CalendarEventType = "general" | "live_session" | "webinar";
```

**Step 4: Add webinar re-export to types barrel**

In `apps/cally/src/types/index.ts`, add:

```typescript
export * from "./webinar";
```

**Step 5: Build to verify types compile**

Run: `npm run build:cally`
Expected: Clean build with no type errors.

**Step 6: Commit**

```bash
git add apps/cally/src/types/product.ts apps/cally/src/types/webinar.ts apps/cally/src/types/index.ts core/types/src/calendar.ts
git commit -m "feat(cally): add webinar product type and signup types"
```

---

### Task 2: DynamoDB — WebinarSignup PK/SK helpers

**Files:**
- Modify: `apps/cally/src/lib/dynamodb.ts`

**Step 1: Add WebinarSignup PK/SK helpers to TenantPK**

In `apps/cally/src/lib/dynamodb.ts`, add to the `TenantPK` object (after the WAITLIST entries, before the closing `} as const`):

```typescript
  // Webinar Signups: PK=TENANT#{tenantId}, SK=WEBINAR_SIGNUP#{productId}#EMAIL#{email}
  WEBINAR_SIGNUP: (productId: string, email: string) =>
    `WEBINAR_SIGNUP#${productId}#EMAIL#${email.toLowerCase().trim()}`,
  WEBINAR_SIGNUP_PRODUCT_PREFIX: (productId: string) =>
    `WEBINAR_SIGNUP#${productId}#`,
  WEBINAR_SIGNUP_PREFIX: "WEBINAR_SIGNUP#",
```

**Step 2: Add EntityType for WEBINAR_SIGNUP**

In the `EntityType` object, add:

```typescript
  WEBINAR_SIGNUP: "WEBINAR_SIGNUP",
```

**Step 3: Commit**

```bash
git add apps/cally/src/lib/dynamodb.ts
git commit -m "feat(cally): add DynamoDB key helpers for webinar signups"
```

---

### Task 3: Repository — webinarSignupRepository.ts

**Files:**
- Create: `apps/cally/src/lib/repositories/webinarSignupRepository.ts`

**Step 1: Create the repository**

Create `apps/cally/src/lib/repositories/webinarSignupRepository.ts`:

```typescript
/**
 * Webinar Signup Repository — DynamoDB Operations
 *
 * Storage pattern:
 * - PK="TENANT#{tenantId}", SK="WEBINAR_SIGNUP#{productId}#EMAIL#{email}"
 *
 * Queries:
 * - List signups for a webinar: Query PK, SK begins_with "WEBINAR_SIGNUP#{productId}#"
 * - Get signup by email: GetItem PK + SK
 * - Count signups: Query with Select=COUNT
 */

import {
  GetCommand,
  PutCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, TenantPK, EntityType } from "../dynamodb";
import type { WebinarSignup } from "@/types";

interface DynamoDBWebinarSignupItem extends WebinarSignup {
  PK: string;
  SK: string;
  entityType: string;
}

function toSignup(item: DynamoDBWebinarSignupItem): WebinarSignup {
  const { PK: _PK, SK: _SK, entityType: _entityType, ...signup } = item;
  return signup;
}

/**
 * Create a webinar signup. Uses condition expression to prevent duplicates.
 */
export async function createWebinarSignup(
  tenantId: string,
  signup: WebinarSignup,
): Promise<WebinarSignup> {
  console.log(
    `[DBG][webinarSignupRepo] Creating signup for ${signup.visitorEmail} on product ${signup.productId}`,
  );

  const item: DynamoDBWebinarSignupItem = {
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.WEBINAR_SIGNUP(signup.productId, signup.visitorEmail),
    entityType: EntityType.WEBINAR_SIGNUP,
    ...signup,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: Tables.CORE,
        Item: item,
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
    return signup;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name: string }).name === "ConditionalCheckFailedException"
    ) {
      console.log(
        `[DBG][webinarSignupRepo] Signup already exists for ${signup.visitorEmail}`,
      );
      throw new Error("ALREADY_SIGNED_UP");
    }
    throw error;
  }
}

/**
 * Get a signup by email for a specific webinar product
 */
export async function getWebinarSignup(
  tenantId: string,
  productId: string,
  email: string,
): Promise<WebinarSignup | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.WEBINAR_SIGNUP(productId, email),
      },
    }),
  );

  if (!result.Item) return null;
  return toSignup(result.Item as DynamoDBWebinarSignupItem);
}

/**
 * Get all signups for a webinar product, sorted by signedUpAt desc
 */
export async function getWebinarSignups(
  tenantId: string,
  productId: string,
): Promise<WebinarSignup[]> {
  console.log(
    `[DBG][webinarSignupRepo] Getting signups for product ${productId}`,
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skPrefix": TenantPK.WEBINAR_SIGNUP_PRODUCT_PREFIX(productId),
      },
    }),
  );

  const signups = (result.Items || []).map((item) =>
    toSignup(item as DynamoDBWebinarSignupItem),
  );

  signups.sort(
    (a, b) =>
      new Date(b.signedUpAt).getTime() - new Date(a.signedUpAt).getTime(),
  );

  console.log(
    `[DBG][webinarSignupRepo] Found ${signups.length} signups for product ${productId}`,
  );
  return signups;
}

/**
 * Count signups for a webinar product (efficient — no data transfer)
 */
export async function countWebinarSignups(
  tenantId: string,
  productId: string,
): Promise<number> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skPrefix": TenantPK.WEBINAR_SIGNUP_PRODUCT_PREFIX(productId),
      },
      Select: "COUNT",
    }),
  );

  return result.Count || 0;
}

/**
 * Update a signup's payment status
 */
export async function updateWebinarSignupPayment(
  tenantId: string,
  productId: string,
  email: string,
  paymentStatus: WebinarSignup["paymentStatus"],
  stripePaymentIntentId?: string,
): Promise<void> {
  const existing = await getWebinarSignup(tenantId, productId, email);
  if (!existing) return;

  const updated: WebinarSignup = {
    ...existing,
    paymentStatus,
    stripePaymentIntentId: stripePaymentIntentId ?? existing.stripePaymentIntentId,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.WEBINAR_SIGNUP(productId, email),
        entityType: EntityType.WEBINAR_SIGNUP,
        ...updated,
      },
    }),
  );
}

/**
 * Delete a webinar signup
 */
export async function deleteWebinarSignup(
  tenantId: string,
  productId: string,
  email: string,
): Promise<void> {
  console.log(
    `[DBG][webinarSignupRepo] Deleting signup ${email} for product ${productId}`,
  );

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.WEBINAR_SIGNUP(productId, email),
      },
    }),
  );
}

/**
 * Delete all signups for a webinar product (used when deleting the product)
 */
export async function deleteAllWebinarSignups(
  tenantId: string,
  productId: string,
): Promise<number> {
  const signups = await getWebinarSignups(tenantId, productId);

  for (const signup of signups) {
    await deleteWebinarSignup(tenantId, productId, signup.visitorEmail);
  }

  console.log(
    `[DBG][webinarSignupRepo] Deleted ${signups.length} signups for product ${productId}`,
  );
  return signups.length;
}
```

**Step 2: Lint and format**

Run: `npm run lint:fix:cally && npm run format:cally`

**Step 3: Commit**

```bash
git add apps/cally/src/lib/repositories/webinarSignupRepository.ts
git commit -m "feat(cally): add webinar signup repository"
```

---

### Task 4: Schedule expansion — pure function to generate session dates

**Files:**
- Create: `apps/cally/src/lib/webinar/schedule.ts`

**Step 1: Create the schedule expansion utility**

Create `apps/cally/src/lib/webinar/schedule.ts`:

```typescript
/**
 * Webinar Schedule Utilities
 *
 * Pure functions to expand a WebinarSchedule + RecurrenceRule
 * into concrete session date/time pairs.
 */

import type { WebinarSchedule } from "@/types";
import type { RecurrenceRule } from "@core/types";

export interface WebinarSession {
  date: string;      // YYYY-MM-DD
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
}

/**
 * Expand a webinar schedule into concrete session dates.
 * Returns an array of sessions with full ISO timestamps.
 *
 * @param schedule - The webinar schedule config
 * @param timezone - Tenant's timezone (e.g. "Australia/Sydney")
 */
export function expandWebinarSessions(
  schedule: WebinarSchedule,
  timezone: string,
): WebinarSession[] {
  const { startDate, startTime, endTime, recurrenceRule } = schedule;

  // Single session (no recurrence)
  if (!recurrenceRule) {
    const session = buildSession(startDate, startTime, endTime, timezone);
    return [session];
  }

  const dates = expandRecurrence(startDate, recurrenceRule);
  return dates.map((date) => buildSession(date, startTime, endTime, timezone));
}

/**
 * Build a single session with ISO timestamps from date + HH:mm times
 */
function buildSession(
  date: string,
  startTimeHHMM: string,
  endTimeHHMM: string,
  timezone: string,
): WebinarSession {
  const startISO = localToISO(date, startTimeHHMM, timezone);
  const endISO = localToISO(date, endTimeHHMM, timezone);

  return {
    date,
    startTime: startISO,
    endTime: endISO,
  };
}

/**
 * Convert a local date + time to an ISO 8601 string in the given timezone.
 * Uses Intl.DateTimeFormat to find the correct UTC offset.
 */
function localToISO(date: string, timeHHMM: string, timezone: string): string {
  const [hours, minutes] = timeHHMM.split(":").map(Number);
  // Create a date object for the given date at the specified local time
  // We need to figure out the UTC offset for this timezone on this date
  const tempDate = new Date(`${date}T${timeHHMM}:00`);

  // Use Intl to find the offset
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Find UTC time that corresponds to the desired local time
  // Strategy: start with a guess, then adjust
  const guess = new Date(`${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00Z`);

  // Get what the local time would be at this UTC time
  const parts = formatter.formatToParts(guess);
  const localHour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const localMinute = Number(parts.find((p) => p.type === "minute")?.value || 0);

  // Calculate offset in minutes
  const guessLocalMinutes = localHour * 60 + localMinute;
  const targetMinutes = hours * 60 + minutes;
  const offsetMinutes = guessLocalMinutes - targetMinutes;

  // Adjust: subtract offset to get correct UTC
  const corrected = new Date(guess.getTime() - offsetMinutes * 60 * 1000);
  return corrected.toISOString();
}

/**
 * Expand a recurrence rule starting from a given date into an array of YYYY-MM-DD strings.
 */
function expandRecurrence(startDate: string, rule: RecurrenceRule): string[] {
  const dates: string[] = [];
  const maxOccurrences = rule.end.afterOccurrences || 52;
  const endDate = rule.end.onDate ? new Date(rule.end.onDate + "T23:59:59Z") : null;

  let current = new Date(startDate + "T00:00:00Z");
  let count = 0;

  while (count < maxOccurrences) {
    if (endDate && current > endDate) break;

    const dateStr = current.toISOString().substring(0, 10);

    if (shouldIncludeDate(current, rule)) {
      dates.push(dateStr);
      count++;
    }

    current = advanceDate(current, rule, count === 0);
  }

  return dates;
}

/**
 * Check if a date should be included based on the recurrence rule.
 */
function shouldIncludeDate(date: Date, rule: RecurrenceRule): boolean {
  const dayOfWeek = date.getUTCDay();

  switch (rule.frequency) {
    case "weekday":
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case "weekly":
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        return rule.daysOfWeek.includes(dayOfWeek);
      }
      return true;
    default:
      return true;
  }
}

/**
 * Advance the date to the next candidate based on frequency.
 */
function advanceDate(
  date: Date,
  rule: RecurrenceRule,
  isFirst: boolean,
): Date {
  const next = new Date(date);

  switch (rule.frequency) {
    case "daily":
      next.setUTCDate(next.getUTCDate() + (isFirst ? 0 : rule.interval));
      if (isFirst) next.setUTCDate(next.getUTCDate() + rule.interval);
      return next;
    case "weekly":
      // For weekly with specific days, advance one day at a time
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        next.setUTCDate(next.getUTCDate() + 1);
        return next;
      }
      next.setUTCDate(next.getUTCDate() + 7 * rule.interval);
      return next;
    case "weekday":
      next.setUTCDate(next.getUTCDate() + 1);
      return next;
    case "monthly":
      next.setUTCMonth(next.getUTCMonth() + rule.interval);
      return next;
    case "yearly":
      next.setUTCFullYear(next.getUTCFullYear() + rule.interval);
      return next;
    default:
      next.setUTCDate(next.getUTCDate() + 1);
      return next;
  }
}

/**
 * Compute the number of sessions from a schedule (for display purposes).
 */
export function computeSessionCount(schedule: WebinarSchedule, timezone: string): number {
  return expandWebinarSessions(schedule, timezone).length;
}
```

**Step 2: Lint and format**

Run: `npm run lint:fix:cally && npm run format:cally`

**Step 3: Build to verify**

Run: `npm run build:cally`

**Step 4: Commit**

```bash
git add apps/cally/src/lib/webinar/schedule.ts
git commit -m "feat(cally): add webinar schedule expansion utility"
```

---

### Task 5: Product repository — extend CreateProductInput for webinar fields

**Files:**
- Modify: `apps/cally/src/lib/repositories/productRepository.ts`

**Step 1: Update CreateProductInput**

In `apps/cally/src/lib/repositories/productRepository.ts`, add to the `CreateProductInput` interface:

```typescript
  productType?: ProductType;
  maxParticipants?: number;
  webinarSchedule?: WebinarSchedule;
```

Add imports at the top:

```typescript
import type { Product, ProductImage, ProductType, WebinarSchedule } from "@/types";
```

**Step 2: Update createProduct to include new fields**

In the `createProduct` function, add to the `product` object:

```typescript
    productType: input.productType,
    maxParticipants: input.maxParticipants,
    webinarSchedule: input.webinarSchedule,
```

**Step 3: Lint, format, build**

Run: `npm run lint:fix:cally && npm run format:cally && npm run build:cally`

**Step 4: Commit**

```bash
git add apps/cally/src/lib/repositories/productRepository.ts
git commit -m "feat(cally): extend product repository for webinar fields"
```

---

### Task 6: Product API routes — handle webinar creation, update, and delete

**Files:**
- Modify: `apps/cally/src/app/api/data/app/products/route.ts`
- Modify: `apps/cally/src/app/api/data/app/products/[productId]/route.ts`

**Step 1: Update POST /api/data/app/products to generate session events for webinars**

In `apps/cally/src/app/api/data/app/products/route.ts`, add imports:

```typescript
import { createCalendarEvent } from "@/lib/repositories/calendarEventRepository";
import { expandWebinarSessions } from "@/lib/webinar/schedule";
import type { WebinarSchedule } from "@/types";
```

After the existing body destructuring, add webinar fields:

```typescript
    const { productType, maxParticipants, webinarSchedule } = body;
```

After the `CreateProductInput` construction, add webinar fields:

```typescript
    // Add webinar fields if applicable
    if (productType === "webinar") {
      input.productType = "webinar";
      input.maxParticipants = maxParticipants ? Number(maxParticipants) : undefined;
      input.webinarSchedule = webinarSchedule as WebinarSchedule;
    }
```

After `createProduct` call, add session event generation for webinars:

```typescript
    // Generate session calendar events for webinar products
    if (product.productType === "webinar" && product.webinarSchedule) {
      const timezone = tenant.bookingConfig?.timezone || "Australia/Sydney";
      const sessions = expandWebinarSessions(product.webinarSchedule, timezone);

      console.log(
        `[DBG][products] Generating ${sessions.length} webinar sessions for product ${product.id}`,
      );

      for (const session of sessions) {
        await createCalendarEvent(tenant.id, {
          title: `Webinar: ${product.name}`,
          description: product.description || "",
          startTime: session.startTime,
          endTime: session.endTime,
          date: session.date,
          type: "webinar",
          status: "scheduled",
          color: product.color,
          productId: product.id,
          recurrenceGroupId: product.id,
        });
      }
    }
```

**Step 2: Update PUT to handle schedule changes**

In `apps/cally/src/app/api/data/app/products/[productId]/route.ts`, add imports:

```typescript
import {
  getProductById,
  updateProduct,
  deleteProduct,
} from "@/lib/repositories/productRepository";
import {
  updateEventColorByProductId,
  deleteCalendarEventsByRecurrenceGroup,
  createCalendarEvent,
} from "@/lib/repositories/calendarEventRepository";
import { expandWebinarSessions } from "@/lib/webinar/schedule";
import type { WebinarSchedule } from "@/types";
```

In the PUT handler, add webinar field handling after the existing optional fields block:

```typescript
    // Webinar-specific fields
    if (body.maxParticipants !== undefined)
      updates.maxParticipants = body.maxParticipants ? Number(body.maxParticipants) : undefined;
    if (body.webinarSchedule !== undefined)
      updates.webinarSchedule = body.webinarSchedule as WebinarSchedule;
```

After `updateProduct` call, add schedule regeneration:

```typescript
    // If webinar schedule changed, regenerate session events
    if (product.productType === "webinar" && body.webinarSchedule) {
      const timezone = tenant.bookingConfig?.timezone || "Australia/Sydney";

      // Delete old sessions
      await deleteCalendarEventsByRecurrenceGroup(tenant.id, productId);

      // Generate new sessions
      const sessions = expandWebinarSessions(product.webinarSchedule!, timezone);
      for (const session of sessions) {
        await createCalendarEvent(tenant.id, {
          title: `Webinar: ${product.name}`,
          description: product.description || "",
          startTime: session.startTime,
          endTime: session.endTime,
          date: session.date,
          type: "webinar",
          status: "scheduled",
          color: product.color,
          productId: product.id,
          recurrenceGroupId: product.id,
        });
      }
    }
```

**Step 3: Update DELETE to cascade-delete sessions and signups**

In the DELETE handler, add imports and cascade logic. Before `deleteProduct` call:

```typescript
    // Check if this is a webinar — cascade delete sessions and signups
    const existingProduct = await getProductById(tenant.id, productId);
    if (existingProduct?.productType === "webinar") {
      // Delete session events
      await deleteCalendarEventsByRecurrenceGroup(tenant.id, productId);
      // Delete signups
      const { deleteAllWebinarSignups } = await import(
        "@/lib/repositories/webinarSignupRepository"
      );
      await deleteAllWebinarSignups(tenant.id, productId);
    }
```

**Step 4: Lint, format, build**

Run: `npm run lint:fix:cally && npm run format:cally && npm run build:cally`

**Step 5: Commit**

```bash
git add apps/cally/src/app/api/data/app/products/route.ts apps/cally/src/app/api/data/app/products/\[productId\]/route.ts
git commit -m "feat(cally): handle webinar session lifecycle in product API"
```

---

### Task 7: Public API — webinar details and signup endpoints

**Files:**
- Create: `apps/cally/src/app/api/data/tenants/[tenantId]/webinar/[productId]/route.ts`
- Create: `apps/cally/src/app/api/data/tenants/[tenantId]/webinar/[productId]/signup/route.ts`

**Step 1: Create GET /api/data/tenants/[tenantId]/webinar/[productId]**

This endpoint returns webinar details + schedule + spots remaining. Create the route file:

```typescript
/**
 * GET /api/data/tenants/[tenantId]/webinar/[productId]
 * Public endpoint — returns webinar details, session schedule, and signup count
 */
import { NextResponse } from "next/server";
import { getProductById } from "@/lib/repositories/productRepository";
import { countWebinarSignups } from "@/lib/repositories/webinarSignupRepository";
import { expandWebinarSessions } from "@/lib/webinar/schedule";
import { getTenantById } from "@/lib/repositories/tenantRepository";

interface RouteParams {
  params: Promise<{ tenantId: string; productId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { tenantId, productId } = await params;

  try {
    const product = await getProductById(tenantId, productId);
    if (!product || product.productType !== "webinar" || !product.isActive) {
      return NextResponse.json(
        { success: false, error: "Webinar not found" },
        { status: 404 },
      );
    }

    const tenant = await getTenantById(tenantId);
    const timezone = tenant?.bookingConfig?.timezone || "Australia/Sydney";

    const sessions = product.webinarSchedule
      ? expandWebinarSessions(product.webinarSchedule, timezone)
      : [];

    const signupCount = await countWebinarSignups(tenantId, productId);

    return NextResponse.json({
      success: true,
      data: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        color: product.color,
        images: product.images,
        image: product.image,
        imagePosition: product.imagePosition,
        maxParticipants: product.maxParticipants,
        signupCount,
        spotsRemaining: product.maxParticipants
          ? Math.max(0, product.maxParticipants - signupCount)
          : null,
        sessions,
        timezone,
      },
    });
  } catch (error) {
    console.error("[DBG][webinar] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch webinar" },
      { status: 500 },
    );
  }
}
```

**Step 2: Create POST /api/data/tenants/[tenantId]/webinar/[productId]/signup**

```typescript
/**
 * POST /api/data/tenants/[tenantId]/webinar/[productId]/signup
 * Public endpoint — visitor signs up for a webinar
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import { getProductById } from "@/lib/repositories/productRepository";
import {
  createWebinarSignup,
  countWebinarSignups,
} from "@/lib/repositories/webinarSignupRepository";
import {
  getCalendarEventsByRecurrenceGroup,
  updateCalendarEvent,
} from "@/lib/repositories/calendarEventRepository";
import { isValidEmail } from "@core/lib/email/validator";
import { checkSpamProtection } from "@core/lib";
import { Tables } from "@/lib/dynamodb";
import { createCheckoutSession } from "@/lib/stripe";
import { getLandingPageUrl } from "@/lib/email/bookingNotification";
import type { WebinarSignup, EventAttendee } from "@/types";

interface RouteParams {
  params: Promise<{ tenantId: string; productId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { tenantId, productId } = await params;

  try {
    console.log(
      `[DBG][webinarSignup] Signup attempt for webinar ${productId} tenant ${tenantId}`,
    );

    // Spam protection
    const body = await request.json();
    const spamCheck = await checkSpamProtection(
      request.headers,
      body as Record<string, unknown>,
      { tableName: Tables.CORE },
    );
    if (!spamCheck.passed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const { visitorName, visitorEmail, note } = body;

    // Validate required fields
    if (!visitorName || !visitorEmail) {
      return NextResponse.json(
        { success: false, error: "Name and email are required" },
        { status: 400 },
      );
    }

    // Validate email
    const emailValidation = await isValidEmail(visitorEmail);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address" },
        { status: 400 },
      );
    }

    // Get product and verify it's a webinar
    const product = await getProductById(tenantId, productId);
    if (!product || product.productType !== "webinar" || !product.isActive) {
      return NextResponse.json(
        { success: false, error: "Webinar not found" },
        { status: 404 },
      );
    }

    // Check capacity
    if (product.maxParticipants) {
      const currentCount = await countWebinarSignups(tenantId, productId);
      if (currentCount >= product.maxParticipants) {
        return NextResponse.json(
          { success: false, error: "This webinar is full" },
          { status: 409 },
        );
      }
    }

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Check if paid webinar
    const requiresPayment =
      product.price > 0 && tenant.stripeConfig?.chargesEnabled;

    // Create signup record
    const signup: WebinarSignup = {
      productId,
      visitorName: visitorName.trim(),
      visitorEmail: visitorEmail.toLowerCase().trim(),
      signedUpAt: new Date().toISOString(),
      paymentStatus: requiresPayment ? "pending_payment" : "free",
    };

    try {
      await createWebinarSignup(tenantId, signup);
    } catch (error) {
      if (error instanceof Error && error.message === "ALREADY_SIGNED_UP") {
        return NextResponse.json(
          { success: false, error: "You are already signed up for this webinar" },
          { status: 409 },
        );
      }
      throw error;
    }

    // For paid webinars, create Stripe checkout
    if (requiresPayment && tenant.stripeConfig) {
      const feePercent =
        Number(process.env.STRIPE_APPLICATION_FEE_PERCENT) || 0;
      const applicationFeeAmount = Math.round(
        (product.price * feePercent) / 100,
      );

      const baseUrl = getLandingPageUrl(tenant);
      const returnUrl = `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}&webinar=${productId}`;

      const checkoutSession = await createCheckoutSession({
        connectedAccountId: tenant.stripeConfig.accountId,
        currency: tenant.currency || "aud",
        unitAmount: product.price,
        productName: product.name,
        tenantName: tenant.name,
        applicationFeeAmount,
        customerEmail: visitorEmail,
        returnUrl,
        metadata: {
          tenantId,
          productId,
          visitorName,
          visitorEmail,
          type: "webinar_signup",
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          signedUp: true,
          requiresPayment: true,
          clientSecret: checkoutSession.client_secret,
          checkoutSessionId: checkoutSession.id,
        },
      });
    }

    // Free webinar — add attendee to all session events
    const sessionEvents = await getCalendarEventsByRecurrenceGroup(
      tenantId,
      productId,
    );

    const newAttendee: EventAttendee = {
      email: visitorEmail.toLowerCase().trim(),
      name: visitorName.trim(),
    };

    for (const event of sessionEvents) {
      const existingAttendees = event.attendees || [];
      await updateCalendarEvent(tenantId, event.date, event.id, {
        attendees: [...existingAttendees, newAttendee],
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        signedUp: true,
        requiresPayment: false,
        sessionCount: sessionEvents.length,
      },
    });
  } catch (error) {
    console.error("[DBG][webinarSignup] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process signup" },
      { status: 500 },
    );
  }
}
```

**Step 3: Lint, format, build**

Run: `npm run lint:fix:cally && npm run format:cally && npm run build:cally`

**Step 4: Commit**

```bash
git add apps/cally/src/app/api/data/tenants/\[tenantId\]/webinar/
git commit -m "feat(cally): add public webinar details and signup API routes"
```

---

### Task 8: Authenticated API — tenant signup management

**Files:**
- Create: `apps/cally/src/app/api/data/app/webinar/[productId]/signups/route.ts`

**Step 1: Create GET + DELETE for signup management**

```typescript
/**
 * Webinar Signup Management API Routes (Authenticated)
 * GET    /api/data/app/webinar/[productId]/signups - List signups
 * DELETE /api/data/app/webinar/[productId]/signups - Remove a signup by email
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ApiResponse, WebinarSignup } from "@/types";
import { auth } from "@/auth";
import { getMobileAuthResult } from "@/lib/mobile-auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  getWebinarSignups,
  deleteWebinarSignup,
} from "@/lib/repositories/webinarSignupRepository";
import {
  getCalendarEventsByRecurrenceGroup,
  updateCalendarEvent,
} from "@/lib/repositories/calendarEventRepository";

interface RouteParams {
  params: Promise<{ productId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<ApiResponse<WebinarSignup[]>>> {
  const { productId } = await params;

  try {
    const mobileAuth = await getMobileAuthResult(request);
    let cognitoSub: string | undefined;
    if (mobileAuth.session) {
      cognitoSub = mobileAuth.session.cognitoSub;
    } else if (mobileAuth.tokenExpired) {
      return NextResponse.json(
        { success: false, error: "Token expired" },
        { status: 401 },
      );
    } else {
      const session = await auth();
      cognitoSub = session?.user?.cognitoSub;
    }
    if (!cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const signups = await getWebinarSignups(tenant.id, productId);

    return NextResponse.json({
      success: true,
      data: signups,
    });
  } catch (error) {
    console.error("[DBG][webinarSignups] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch signups" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<ApiResponse<null>>> {
  const { productId } = await params;

  try {
    const mobileAuth = await getMobileAuthResult(request);
    let cognitoSub: string | undefined;
    if (mobileAuth.session) {
      cognitoSub = mobileAuth.session.cognitoSub;
    } else if (mobileAuth.tokenExpired) {
      return NextResponse.json(
        { success: false, error: "Token expired" },
        { status: 401 },
      );
    } else {
      const session = await auth();
      cognitoSub = session?.user?.cognitoSub;
    }
    if (!cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 },
      );
    }

    // Remove attendee from all session events
    const sessionEvents = await getCalendarEventsByRecurrenceGroup(
      tenant.id,
      productId,
    );

    const normalizedEmail = email.toLowerCase().trim();
    for (const event of sessionEvents) {
      if (event.attendees) {
        const filtered = event.attendees.filter(
          (a) => a.email.toLowerCase() !== normalizedEmail,
        );
        if (filtered.length !== event.attendees.length) {
          await updateCalendarEvent(tenant.id, event.date, event.id, {
            attendees: filtered,
          });
        }
      }
    }

    await deleteWebinarSignup(tenant.id, productId, email);

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error("[DBG][webinarSignups] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove signup" },
      { status: 500 },
    );
  }
}
```

**Step 2: Lint, format, build**

Run: `npm run lint:fix:cally && npm run format:cally && npm run build:cally`

**Step 3: Commit**

```bash
git add apps/cally/src/app/api/data/app/webinar/
git commit -m "feat(cally): add authenticated webinar signup management API"
```

---

### Task 9: UI — ProductFormModal webinar fields

**Files:**
- Modify: `apps/cally/src/components/products/ProductFormModal.tsx`
- Create: `apps/cally/src/components/webinar/WebinarSchedulePreview.tsx`

**Step 1: Create WebinarSchedulePreview component**

Create `apps/cally/src/components/webinar/WebinarSchedulePreview.tsx`:

A simple component that takes a `WebinarSchedule` + timezone and shows a list of session dates/times. Used in both the product form (preview before save) and the visitor signup page.

```typescript
"use client";

import type { WebinarSchedule } from "@/types";
import { expandWebinarSessions } from "@/lib/webinar/schedule";

interface WebinarSchedulePreviewProps {
  schedule: WebinarSchedule;
  timezone: string;
}

export default function WebinarSchedulePreview({
  schedule,
  timezone,
}: WebinarSchedulePreviewProps) {
  const sessions = expandWebinarSessions(schedule, timezone);

  if (sessions.length === 0) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (isoStr: string) => {
    const date = new Date(isoStr);
    return date.toLocaleTimeString("en-AU", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="mt-2">
      <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
        {sessions.length} session{sessions.length !== 1 ? "s" : ""}
      </p>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {sessions.map((session, i) => (
          <div
            key={session.date}
            className="flex items-center gap-2 text-xs text-[var(--text-main)] py-1 px-2 bg-gray-50 rounded"
          >
            <span className="font-medium text-[var(--text-muted)] w-5">
              {i + 1}.
            </span>
            <span>{formatDate(session.date)}</span>
            <span className="text-[var(--text-muted)]">
              {formatTime(session.startTime)} – {formatTime(session.endTime)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Extend ProductFormModal with webinar fields**

In `apps/cally/src/components/products/ProductFormModal.tsx`:

Add imports:

```typescript
import type { Product, ProductImage, ProductType, WebinarSchedule } from "@/types";
import RecurrenceSelector from "@/components/calendar/RecurrenceSelector";
import WebinarSchedulePreview from "@/components/webinar/WebinarSchedulePreview";
import type { RecurrenceRule } from "@core/types";
```

Add new state variables (after existing state):

```typescript
  const [productType, setProductType] = useState<ProductType>("service");
  const [maxParticipants, setMaxParticipants] = useState<string>("");
  const [webinarStartDate, setWebinarStartDate] = useState("");
  const [webinarStartTime, setWebinarStartTime] = useState("09:00");
  const [webinarEndTime, setWebinarEndTime] = useState("10:00");
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);
```

Update the `useEffect` that populates form on edit — add webinar field population:

```typescript
    // Webinar fields
    if (product?.productType === "webinar") {
      setProductType("webinar");
      setMaxParticipants(product.maxParticipants?.toString() || "");
      if (product.webinarSchedule) {
        setWebinarStartDate(product.webinarSchedule.startDate);
        setWebinarStartTime(product.webinarSchedule.startTime);
        setWebinarEndTime(product.webinarSchedule.endTime);
        setRecurrenceRule(product.webinarSchedule.recurrenceRule || null);
      }
    } else {
      setProductType("service");
      setMaxParticipants("");
      setWebinarStartDate("");
      setWebinarStartTime("09:00");
      setWebinarEndTime("10:00");
      setRecurrenceRule(null);
    }
```

Update `handleSubmit` — build webinar schedule and include in body:

```typescript
      // Build webinar schedule if applicable
      let webinarSchedule: WebinarSchedule | undefined;
      if (productType === "webinar") {
        if (!webinarStartDate || !webinarStartTime || !webinarEndTime) {
          setError("Webinar schedule is required");
          return;
        }
        webinarSchedule = {
          startDate: webinarStartDate,
          startTime: webinarStartTime,
          endTime: webinarEndTime,
          recurrenceRule: recurrenceRule || undefined,
          sessionCount: 1, // Will be computed server-side
        };
      }

      const body = {
        name: name.trim(),
        description: description.trim() || undefined,
        durationMinutes: productType === "webinar"
          ? computeDurationFromTimes(webinarStartTime, webinarEndTime)
          : duration,
        price: priceInCents,
        color,
        isActive,
        images,
        image: images.length > 0 ? images[0].url : undefined,
        imagePosition: images.length > 0 ? images[0].position : undefined,
        imageZoom: images.length > 0 ? images[0].zoom : undefined,
        productType,
        maxParticipants: maxParticipants ? Number(maxParticipants) : undefined,
        webinarSchedule,
      };
```

Add a helper function:

```typescript
function computeDurationFromTimes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}
```

Add JSX for the product type toggle and webinar fields in the form (after name field, before description):

```tsx
        {/* Product Type Toggle (only show when creating) */}
        {!isEditing && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
              Type
            </label>
            <div className="flex gap-2">
              {(["service", "webinar"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setProductType(type)}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                    productType === type
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "bg-white text-[var(--text-muted)] border-[var(--color-border)] hover:bg-gray-50"
                  }`}
                >
                  {type === "service" ? "Service" : "Webinar"}
                </button>
              ))}
            </div>
          </div>
        )}
```

Replace the Duration/Price grid section with conditional rendering:

```tsx
        {/* Duration and Price row — service only shows duration; webinar shows schedule */}
        {productType === "webinar" ? (
          <>
            {/* Max Participants */}
            <div>
              <label
                htmlFor="product-max-participants"
                className="block text-sm font-medium text-[var(--text-muted)] mb-1"
              >
                Max Participants
              </label>
              <input
                id="product-max-participants"
                type="number"
                min={1}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                placeholder="Unlimited"
                className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Leave empty for unlimited
              </p>
            </div>

            {/* Webinar Schedule */}
            <div>
              <label
                htmlFor="webinar-start-date"
                className="block text-sm font-medium text-[var(--text-muted)] mb-1"
              >
                Start Date *
              </label>
              <input
                id="webinar-start-date"
                type="date"
                value={webinarStartDate}
                onChange={(e) => setWebinarStartDate(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="webinar-start-time"
                  className="block text-sm font-medium text-[var(--text-muted)] mb-1"
                >
                  Start Time *
                </label>
                <input
                  id="webinar-start-time"
                  type="time"
                  value={webinarStartTime}
                  onChange={(e) => setWebinarStartTime(e.target.value)}
                  className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="webinar-end-time"
                  className="block text-sm font-medium text-[var(--text-muted)] mb-1"
                >
                  End Time *
                </label>
                <input
                  id="webinar-end-time"
                  type="time"
                  value={webinarEndTime}
                  onChange={(e) => setWebinarEndTime(e.target.value)}
                  className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  required
                />
              </div>
            </div>

            {/* Price */}
            <div>
              <label
                htmlFor="product-price"
                className="block text-sm font-medium text-[var(--text-muted)] mb-1"
              >
                Price ({currencySymbol}) *
              </label>
              <input
                id="product-price"
                type="number"
                min={0}
                step="0.01"
                value={displayPrice}
                onChange={(e) => setDisplayPrice(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                required
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Set to 0 for a free webinar
              </p>
            </div>

            {/* Recurrence */}
            <RecurrenceSelector
              startDate={webinarStartDate ? new Date(webinarStartDate + "T00:00:00") : null}
              value={recurrenceRule}
              onChange={setRecurrenceRule}
            />

            {/* Session Preview */}
            {webinarStartDate && webinarStartTime && webinarEndTime && (
              <WebinarSchedulePreview
                schedule={{
                  startDate: webinarStartDate,
                  startTime: webinarStartTime,
                  endTime: webinarEndTime,
                  recurrenceRule: recurrenceRule || undefined,
                  sessionCount: 0,
                }}
                timezone="Australia/Sydney"
              />
            )}
          </>
        ) : (
          /* Existing Duration and Price grid for services */
          <div className="grid grid-cols-2 gap-4">
            {/* ...existing duration + price fields... */}
          </div>
        )}
```

**Step 3: Lint, format, build**

Run: `npm run lint:fix:cally && npm run format:cally && npm run build:cally`

**Step 4: Commit**

```bash
git add apps/cally/src/components/products/ProductFormModal.tsx apps/cally/src/components/webinar/WebinarSchedulePreview.tsx
git commit -m "feat(cally): add webinar fields to product form modal"
```

---

### Task 10: UI — Visitor-facing WebinarSignup component

**Files:**
- Create: `apps/cally/src/components/webinar/WebinarSignup.tsx`

**Step 1: Create the WebinarSignup component**

A modal/page component that shows webinar details, schedule, spots remaining, and a signup form. Props: `tenantId`, `productId`, `isOpen`, `onClose`.

This component:
1. Fetches webinar details from GET `/api/data/tenants/{tenantId}/webinar/{productId}`
2. Renders: name, description, images, session list, price, spots
3. Shows signup form (name, email, note) or "Webinar Full" if maxed
4. On submit, POSTs to `/api/data/tenants/{tenantId}/webinar/{productId}/signup`
5. Handles free vs paid flows (Stripe for paid)

This is a substantial component — implement following the patterns from `BookingWidget.tsx` (modal, loading states, step flow).

**Step 2: Lint, format, build**

Run: `npm run lint:fix:cally && npm run format:cally && npm run build:cally`

**Step 3: Commit**

```bash
git add apps/cally/src/components/webinar/WebinarSignup.tsx
git commit -m "feat(cally): add visitor-facing webinar signup component"
```

---

### Task 11: Landing page integration — webinar products render differently

**Files:**
- Modify: `apps/cally/src/templates/hero/ProductsSection.tsx`
- Modify: `apps/cally/src/components/landing-page/LandingPageRenderer.tsx`

**Step 1: Update ProductsSection**

In `ProductsSection.tsx`, the "Book Now" button should show "Sign Up" for webinar products. The `onBookProduct` callback needs to distinguish between service and webinar.

Add a new callback prop:

```typescript
  onSignupWebinar?: (productId: string) => void;
```

In the product card render, conditionally render the button:

```tsx
{product.productType === "webinar" ? (
  <button onClick={() => onSignupWebinar?.(product.id)}>
    Sign Up
  </button>
) : (
  <button onClick={() => onBookProduct?.(product.id)}>
    Book Now
  </button>
)}
```

**Step 2: Update LandingPageRenderer**

Add state for the webinar signup modal and a handler:

```typescript
const [webinarProductId, setWebinarProductId] = useState<string | undefined>();
const [webinarOpen, setWebinarOpen] = useState(false);

const handleSignupWebinar = useCallback((productId: string) => {
  setWebinarProductId(productId);
  setWebinarOpen(true);
}, []);
```

Render the WebinarSignup component:

```tsx
<WebinarSignup
  tenantId={tenantId}
  productId={webinarProductId}
  isOpen={webinarOpen}
  onClose={() => {
    setWebinarOpen(false);
    setWebinarProductId(undefined);
  }}
/>
```

Pass the handler to ProductsSection:

```tsx
<ProductsSection onSignupWebinar={handleSignupWebinar} />
```

**Step 3: Lint, format, build**

Run: `npm run lint:fix:cally && npm run format:cally && npm run build:cally`

**Step 4: Commit**

```bash
git add apps/cally/src/templates/hero/ProductsSection.tsx apps/cally/src/components/landing-page/LandingPageRenderer.tsx
git commit -m "feat(cally): integrate webinar signup into landing page"
```

---

### Task 12: Update Postman collection

**Files:**
- Modify: Postman collection in project root (or `apps/cally/docs/api/`)

**Step 1: Add new endpoints to Postman collection**

Add these endpoints:
- `GET /api/data/tenants/:tenantId/webinar/:productId` (public)
- `POST /api/data/tenants/:tenantId/webinar/:productId/signup` (public)
- `GET /api/data/app/webinar/:productId/signups` (authenticated)
- `DELETE /api/data/app/webinar/:productId/signups` (authenticated)

Update existing product endpoints with notes about webinar fields.

**Step 2: Commit**

```bash
git add <postman-collection-path>
git commit -m "docs(cally): update Postman collection with webinar endpoints"
```

---

### Task 13: Final verification

**Step 1: Full build**

Run: `npm run build:cally`
Expected: Clean build, no errors.

**Step 2: Lint check**

Run: `npm run lint:cally`
Expected: No lint errors.

**Step 3: Manual testing checklist**

- [ ] Create a webinar product via the product form modal
- [ ] Verify session events appear on the tenant's calendar
- [ ] Visit the landing page, verify webinar shows "Sign Up" button
- [ ] Click Sign Up, verify webinar details and schedule display
- [ ] Submit signup form, verify signup record created
- [ ] Verify attendee added to all session events
- [ ] Check max participants enforcement
- [ ] Edit webinar schedule, verify events regenerated
- [ ] Delete webinar product, verify cascade cleanup
