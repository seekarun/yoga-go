# Contact Import Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow tenants to import contacts from CSV and vCard (.vcf) files via the /users page.

**Architecture:** Client-side file parsing (CSV and vCard) with preview table, then POST parsed contacts to a new API endpoint that batch-creates them as ContactSubmission records in DynamoDB via contactRepository.

**Tech Stack:** Next.js 15, React, DynamoDB (BatchWriteCommand), client-side CSV/vCard parsing (no external libraries)

---

### Task 1: Add `createContactsBatch` to contactRepository

**Files:**
- Modify: `apps/cally/src/lib/repositories/contactRepository.ts`

**Step 1: Add batch create function**

Add a `createContactsBatch` function that accepts an array of contact data and writes them in batches of 25 (DynamoDB limit). Follow the existing batch pattern from `calendarEventRepository.ts`.

```typescript
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { BatchWriteCommand } from "@aws-sdk/lib-dynamodb"; // add this import

export async function createContactsBatch(
  tenantId: string,
  contacts: {
    name: string;
    email: string;
    message: string;
  }[],
): Promise<{ created: number; skipped: number }> {
  console.log(
    `[DBG][contactRepository] Batch creating ${contacts.length} contacts for tenant ${tenantId}`,
  );

  const BATCH_SIZE = 25;
  let created = 0;

  // Get existing contact emails to skip duplicates
  const existing = await getContactsByTenant(tenantId);
  const existingEmails = new Set(
    existing.map((c) => c.email.toLowerCase().trim()),
  );

  const newContacts = contacts.filter(
    (c) => !existingEmails.has(c.email.toLowerCase().trim()),
  );
  const skipped = contacts.length - newContacts.length;

  for (let i = 0; i < newContacts.length; i += BATCH_SIZE) {
    const batch = newContacts.slice(i, i + BATCH_SIZE);
    const putRequests = batch.map((contact) => {
      const id = generateId();
      const submittedAt = new Date().toISOString();
      return {
        PutRequest: {
          Item: {
            PK: TenantPK.TENANT(tenantId),
            SK: TenantPK.CONTACT(submittedAt, id),
            entityType: EntityType.CONTACT,
            id,
            email: contact.email.toLowerCase().trim(),
            name: contact.name,
            message: contact.message,
            submittedAt,
          },
        },
      };
    });

    await docClient.send(
      new BatchWriteCommand({
        RequestItems: { [Tables.CORE]: putRequests },
      }),
    );
    created += batch.length;
  }

  console.log(
    `[DBG][contactRepository] Batch created ${created} contacts, skipped ${skipped} duplicates`,
  );
  return { created, skipped };
}
```

**Step 2: Verify no type errors**

Run: `npm run build:cally`

---

### Task 2: Create the import API endpoint

**Files:**
- Create: `apps/cally/src/app/api/data/app/contacts/import/route.ts`

**Step 1: Create the POST endpoint**

Follow the auth pattern from `apps/cally/src/app/api/data/app/subscribers/route.ts`. Accept `{ contacts: { name, email, message }[] }` in the body.

```typescript
import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { createContactsBatch } from "@/lib/repositories/contactRepository";

interface ImportResult {
  created: number;
  skipped: number;
}

export async function POST(request: Request) {
  console.log("[DBG][contacts-import] POST called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { contacts } = body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No contacts provided" },
        { status: 400 },
      );
    }

    // Validate each contact has email and name
    const valid = contacts.every(
      (c: { name?: string; email?: string }) =>
        c.email?.trim() && c.name?.trim(),
    );
    if (!valid) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Each contact must have a name and email" },
        { status: 400 },
      );
    }

    const result = await createContactsBatch(tenant.tenantId, contacts);

    console.log(
      `[DBG][contacts-import] Imported ${result.created}, skipped ${result.skipped}`,
    );

    return NextResponse.json<ApiResponse<ImportResult>>({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("[DBG][contacts-import] Error:", err);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to import contacts" },
      { status: 500 },
    );
  }
}
```

---

### Task 3: Create the ImportContactsModal component

**Files:**
- Create: `apps/cally/src/components/ImportContactsModal.tsx`

**Features:**
- File input accepting `.csv`, `.vcf`, `.vcard`
- Client-side parsing:
  - CSV: detect headers (name/first name/last name, email), parse rows
  - vCard: parse BEGIN:VCARD...END:VCARD blocks, extract FN and EMAIL
- Preview table showing parsed contacts (name, email) with count
- Error display for invalid files / no valid contacts found
- Import button that POSTs to `/api/data/app/contacts/import`
- Loading state during import
- Success callback with created/skipped counts

**CSV parsing logic:**
- Auto-detect delimiter (comma vs semicolon vs tab)
- Header detection: look for columns matching email, name, first_name, last_name (case-insensitive)
- If first_name + last_name found but no name, combine them
- Skip rows with invalid/missing email
- Basic email validation regex

**vCard parsing logic:**
- Split on BEGIN:VCARD
- For each block, extract FN (full name) and EMAIL
- Handle multi-line values and quoted-printable encoding

---

### Task 4: Add Import button to UsersPage

**Files:**
- Modify: `apps/cally/src/app/srv/[expertId]/users/page.tsx`

**Step 1: Add import button and modal state**

Add an "Import Contacts" button next to the user count badge in the header. Wire up the ImportContactsModal with state management. On successful import, call `fetchUsers()` to refresh the list and show a toast.

---

### Task 5: Lint, format, build

Run:
```bash
npm run lint:fix:cally && npm run format:cally && npm run build:cally
```
