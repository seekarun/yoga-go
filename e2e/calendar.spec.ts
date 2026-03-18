import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "http://localhost:3113";
const EMAIL = "me.arun@gmail.com";
const PASSWORD = "MyYoga1!";

// Unique prefix so afterAll can sweep up any leftovers
const TEST_PREFIX = `E2E-${Date.now()}`;

// ── Helpers ───────────────────────────────────────────────────────────

const formatDateTime = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDateStr = (d: Date) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Log in and return the expertId extracted from the URL. */
const loginAndGetExpertId = async (page: Page): Promise<string> => {
  console.log("[TEST] Navigating to /srv...");
  await page.goto(`${BASE_URL}/srv`);
  await page.waitForURL(/\/auth\/signin/, { timeout: 15000 });

  console.log("[TEST] Logging in...");
  await page.fill("input#email", EMAIL);
  await page.fill("input#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/srv\//, { timeout: 30000 });

  const url = page.url();
  const match = url.match(/\/srv\/([^/]+)/);
  const expertId = match ? match[1] : "";
  expect(expertId).toBeTruthy();
  console.log("[TEST] Logged in, expertId:", expertId);
  return expertId;
};

/** Navigate to the calendar page and wait for FullCalendar to render. */
const goToCalendar = async (page: Page, expertId: string) => {
  await page.goto(`${BASE_URL}/srv/${expertId}/calendar`);
  await page.waitForURL(/\/calendar/, { timeout: 15000 });
  await page.waitForSelector(".fc", { timeout: 15000 });
  console.log("[TEST] Calendar loaded");
};

/** Open the create-event modal and fill in the title + times. */
const openCreateModal = async (page: Page) => {
  const createBtn = page.locator("button", { hasText: "Create Event" });
  await createBtn.click();
  await page.waitForSelector('input[type="text"]', { timeout: 10000 });
  console.log("[TEST] Create Event modal opened");
};

/** Fill the datetime-local input using the native setter to trigger React state. */
const fillDateTimeInput = async (
  page: Page,
  locator: ReturnType<Page["locator"]>,
  value: string,
) => {
  await locator.evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!;
    setter.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
  await page.waitForTimeout(300);
};

/** Create a simple event via the UI and return its id. */
const createEvent = async (
  page: Page,
  title: string,
  start: Date,
  end: Date,
): Promise<string> => {
  await openCreateModal(page);

  // Title
  await page.locator('input[type="text"]').first().fill(title);

  // Start / End
  const startInput = page.locator('input[type="datetime-local"]').first();
  const endInput = page.locator('input[type="datetime-local"]').last();
  await startInput.fill(formatDateTime(start));
  await endInput.fill(formatDateTime(end));

  console.log(
    "[TEST] Filled event:",
    title,
    formatDateTime(start),
    "→",
    formatDateTime(end),
  );

  // Submit
  const submitBtn = page
    .getByRole("dialog")
    .getByRole("button", { name: /Create Event|Create Recurring Event/ });
  await submitBtn.click();

  // Wait for modal close
  await page.waitForSelector('input[type="text"]', {
    state: "hidden",
    timeout: 15000,
  });
  console.log("[TEST] Event created");

  // Verify via API and return the event id
  const apiResp = await page.evaluate(
    async ({ s, e }) => {
      const res = await fetch(`/api/data/app/calendar?start=${s}&end=${e}`);
      return res.json();
    },
    {
      s: new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate(),
      ).toISOString(),
      e: new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + 1,
      ).toISOString(),
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const created = apiResp?.data?.find((ev: any) => ev.title === title);
  expect(created).toBeTruthy();
  const eventId = created?.id || created?.eventId;
  console.log("[TEST] API verified, eventId:", eventId);
  return eventId;
};

/** Navigate FullCalendar to day-view for a given date. */
const navigateToDayView = async (page: Page, target: Date) => {
  // Switch to day view first
  const dayBtn = page.locator("button.fc-timeGridDay-button");
  if (await dayBtn.isVisible()) {
    await dayBtn.click();
    await page.waitForTimeout(500);
  }

  // Read the current date from the toolbar title and navigate to target
  const targetStr = formatDateStr(target);

  // Navigate: click today first, then step forward/backward
  const todayBtn = page.locator("button.fc-today-button");
  if (await todayBtn.isEnabled().catch(() => false)) {
    await todayBtn.click();
    await page.waitForTimeout(300);
  }

  // Calculate diff from today's midnight to target's midnight
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const targetMidnight = new Date(target);
  targetMidnight.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (targetMidnight.getTime() - todayMidnight.getTime()) / 86400000,
  );

  if (diffDays === 0) return;

  const navBtn =
    diffDays > 0 ? "button.fc-next-button" : "button.fc-prev-button";
  for (let i = 0; i < Math.abs(diffDays); i++) {
    await page.locator(navBtn).click();
    await page.waitForTimeout(300);
  }

  // Verify we landed on the right date
  const titleText = await page.locator(".fc-toolbar-title").textContent();
  console.log(
    "[TEST] Navigated to day view:",
    titleText,
    "| target:",
    targetStr,
  );
};

/** Click on a visible event in the calendar by title. */
const clickEventOnCalendar = async (page: Page, title: string) => {
  const ev = page.locator(".fc-event", { hasText: title });
  await ev.first().click();
  await page.waitForTimeout(1000);
};

/** Delete a single event via API (silently ignores failures). */
const deleteEventViaAPI = async (page: Page, eventId: string) => {
  try {
    await page.evaluate(async (id) => {
      await fetch(`/api/data/app/calendar/events/${id}`, { method: "DELETE" });
    }, eventId);
    console.log("[CLEANUP] Deleted event:", eventId);
  } catch {
    console.log("[CLEANUP] Failed to delete event (may already be gone):", eventId);
  }
};

/** Delete a recurring series via API (silently ignores failures). */
const deleteSeriesViaAPI = async (page: Page, eventId: string) => {
  try {
    await page.evaluate(async (id) => {
      await fetch(`/api/data/app/calendar/events/${id}?deleteAll=true`, {
        method: "DELETE",
      });
    }, eventId);
    console.log("[CLEANUP] Deleted series from event:", eventId);
  } catch {
    console.log("[CLEANUP] Failed to delete series (may already be gone):", eventId);
  }
};

/**
 * Find all events matching the test prefix in a date range and delete them.
 * Used as a sweep cleanup in afterAll to catch any leftovers from failed tests.
 */
const sweepCleanup = async (page: Page, prefix: string) => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 90); // sweep 90 days forward

  try {
    const events = await page.evaluate(
      async ({ s, e, pfx }) => {
        const res = await fetch(`/api/data/app/calendar?start=${s}&end=${e}`);
        const data = await res.json();
        if (!data?.data) return [];
        return data.data
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((ev: any) => ev.title?.startsWith(pfx))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((ev: any) => ({
            id: ev.id || ev.eventId,
            recurrenceGroupId: ev.recurrenceGroupId,
          }));
      },
      { s: start.toISOString(), e: end.toISOString(), pfx: prefix },
    );

    if (events.length === 0) {
      console.log("[CLEANUP] No leftover test events found");
      return;
    }

    console.log("[CLEANUP] Sweeping", events.length, "leftover test events");

    // Delete series first (deduped by recurrenceGroupId), then remaining singles
    const deletedGroups = new Set<string>();
    for (const ev of events) {
      if (ev.recurrenceGroupId && !deletedGroups.has(ev.recurrenceGroupId)) {
        await deleteSeriesViaAPI(page, ev.id);
        deletedGroups.add(ev.recurrenceGroupId);
      } else if (!ev.recurrenceGroupId) {
        await deleteEventViaAPI(page, ev.id);
      }
    }
  } catch {
    console.log("[CLEANUP] Sweep failed – some test events may remain");
  }
};

// ── Tests ─────────────────────────────────────────────────────────────

test.describe("Cally Calendar E2E", () => {
  let expertId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    expertId = await loginAndGetExpertId(page);
    await page.close();
  });

  // Sweep cleanup after all tests – catches any events left by failed tests
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await loginAndGetExpertId(page);
      await sweepCleanup(page, TEST_PREFIX);
    } finally {
      await page.close();
    }
  });

  // ─── 1. Basic CRUD (create, verify, edit, delete) ───────────────
  test("Create event, verify on calendar, edit date, delete", async ({
    page,
  }) => {
    const title = `${TEST_PREFIX} Basic`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(11, 0, 0, 0);

    await loginAndGetExpertId(page);
    await goToCalendar(page, expertId);

    const eventId = await createEvent(page, title, tomorrow, endTime);

    try {
      // Verify on calendar UI
      await navigateToDayView(page, tomorrow);
      const eventOnCalendar = page.locator(".fc-event", { hasText: title });
      await expect(eventOnCalendar.first()).toBeVisible({ timeout: 10000 });
      console.log("[TEST] Event visible on calendar");

      // Edit – move to next day
      await clickEventOnCalendar(page, title);
      const editBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: "Edit" });
      await editBtn.click();
      await page.waitForTimeout(500);

      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);
      dayAfter.setHours(10, 0, 0, 0);
      const newEnd = new Date(dayAfter);
      newEnd.setHours(11, 0, 0, 0);

      const editStart = page
        .getByRole("dialog")
        .locator('input[type="datetime-local"]')
        .first();
      const editEnd = page
        .getByRole("dialog")
        .locator('input[type="datetime-local"]')
        .last();

      await fillDateTimeInput(page, editStart, formatDateTime(dayAfter));
      await fillDateTimeInput(page, editEnd, formatDateTime(newEnd));

      const saveBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: /Save Changes|Save This Event/ });
      const [saveResp] = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes("/api/data/app/calendar/events/") &&
            r.request().method() === "PUT",
          { timeout: 15000 },
        ),
        saveBtn.click(),
      ]);

      expect(saveResp.status()).toBe(200);
      await page
        .getByRole("dialog")
        .waitFor({ state: "hidden", timeout: 10000 });
      console.log("[TEST] Event edited to", formatDateStr(dayAfter));

      // Verify edit via API
      const saveBody = await saveResp.json().catch(() => null);
      const savedLocal = new Date(saveBody?.data?.startTime);
      expect(formatDateStr(savedLocal)).toBe(formatDateStr(dayAfter));

      // Delete via UI
      await navigateToDayView(page, dayAfter);
      const evAfterEdit = page.locator(".fc-event", { hasText: title });
      if (await evAfterEdit.first().isVisible().catch(() => false)) {
        await evAfterEdit.first().click();
        await page.waitForTimeout(1000);
        const delBtn = page
          .getByRole("dialog")
          .getByRole("button", { name: "Delete" });
        await delBtn.click();
        await page.waitForTimeout(3000);
      } else {
        await deleteEventViaAPI(page, eventId);
      }

      // Verify deletion
      const verifyDel = await page.evaluate(async (id) => {
        const res = await fetch(`/api/data/app/calendar/events/${id}`);
        const data = await res.json();
        return { found: res.ok && data?.success, status: res.status };
      }, eventId);
      expect(verifyDel.found).toBeFalsy();
      console.log("[TEST] Basic CRUD test passed");
    } catch (err) {
      // Ensure cleanup on failure
      await deleteEventViaAPI(page, eventId);
      throw err;
    }
  });

  // ─── 2. Create event with description, location, color, notes ───
  test("Create event with full details (description, location, color, notes)", async ({
    page,
  }) => {
    const title = `${TEST_PREFIX} Details`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(15, 30, 0, 0);
    let eventId = "";

    await loginAndGetExpertId(page);
    await goToCalendar(page, expertId);

    try {
      await openCreateModal(page);

      // Fill title (use placeholder to target the right input, not the attendee search)
      const titleInput = page
        .getByRole("dialog")
        .locator('input[placeholder="e.g., Team Meeting"]');
      await titleInput.fill(title);

      // Fill description
      const descTextarea = page
        .getByRole("dialog")
        .locator('textarea[placeholder="Add details about this event..."]');
      await descTextarea.fill("Detailed event for E2E testing");

      // Fill start/end
      const startInput = page
        .getByRole("dialog")
        .locator('input[type="datetime-local"]')
        .first();
      const endInput = page
        .getByRole("dialog")
        .locator('input[type="datetime-local"]')
        .last();
      await startInput.fill(formatDateTime(tomorrow));
      await endInput.fill(formatDateTime(endTime));

      // Fill location
      const locInput = page
        .getByRole("dialog")
        .locator('input[placeholder="e.g., Zoom, Office, etc."]');
      await locInput.fill("Conference Room A");

      // Select a different color (Green)
      const colorBtns = page
        .getByRole("dialog")
        .locator('button[title="Green"]');
      if (await colorBtns.isVisible().catch(() => false)) {
        await colorBtns.click();
      }

      // Fill notes
      const notesTextarea = page
        .getByRole("dialog")
        .locator('textarea[placeholder="Private notes..."]');
      if (await notesTextarea.isVisible().catch(() => false)) {
        await notesTextarea.fill("Important: bring projector");
      }

      // Submit
      const submitBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: /Create Event/ });
      await submitBtn.click();
      await page
        .getByRole("dialog")
        .waitFor({ state: "hidden", timeout: 15000 });

      // Verify via API
      const apiResp = await page.evaluate(
        async ({ s, e }) => {
          const res = await fetch(
            `/api/data/app/calendar?start=${s}&end=${e}`,
          );
          return res.json();
        },
        {
          s: new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate(),
          ).toISOString(),
          e: new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate() + 1,
          ).toISOString(),
        },
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = apiResp?.data?.find((ev: any) => ev.title === title);
      expect(created).toBeTruthy();
      // description and location are in extendedProps in the API response
      const desc =
        created.description || created.extendedProps?.description;
      const loc = created.location || created.extendedProps?.location;
      expect(desc).toBe("Detailed event for E2E testing");
      expect(loc).toBe("Conference Room A");
      eventId = created?.id || created?.eventId;
      console.log("[TEST] Full details event created and verified");
    } finally {
      if (eventId) await deleteEventViaAPI(page, eventId);
    }
  });

  // ─── 3. Create event with attendees ─────────────────────────────
  test("Create event with attendees", async ({ page }) => {
    const title = `${TEST_PREFIX} Attendees`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(9, 30, 0, 0);
    let eventId = "";

    await loginAndGetExpertId(page);
    await goToCalendar(page, expertId);

    try {
      await openCreateModal(page);

      // Fill title and times
      await page.locator('input[type="text"]').first().fill(title);
      await page
        .locator('input[type="datetime-local"]')
        .first()
        .fill(formatDateTime(tomorrow));
      await page
        .locator('input[type="datetime-local"]')
        .last()
        .fill(formatDateTime(endTime));

      // Add attendees – click the search input and pick the first user
      const attendeeSearch = page
        .getByRole("dialog")
        .locator('input[placeholder="Search by name or email..."]');

      if (
        await attendeeSearch.isVisible({ timeout: 5000 }).catch(() => false)
      ) {
        await attendeeSearch.click();
        await page.waitForTimeout(1000);

        const userOption = page
          .getByRole("dialog")
          .locator("ul li button")
          .first();
        if (
          await userOption.isVisible({ timeout: 5000 }).catch(() => false)
        ) {
          const attendeeName = await userOption
            .locator("span")
            .first()
            .textContent();
          await userOption.click();
          await page.waitForTimeout(500);
          console.log("[TEST] Added attendee:", attendeeName);

          // Verify the attendee pill appeared
          const pill = page
            .getByRole("dialog")
            .locator(".bg-indigo-50.text-indigo-700");
          await expect(pill.first()).toBeVisible();
          console.log("[TEST] Attendee pill visible");
        } else {
          console.log(
            "[TEST] No users available for attendee selection, skipping attendee check",
          );
        }
      }

      // Submit
      const submitBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: /Create Event/ });
      await submitBtn.click();
      await page.waitForSelector('input[type="text"]', {
        state: "hidden",
        timeout: 15000,
      });

      // Verify via API
      const apiResp = await page.evaluate(
        async ({ s, e }) => {
          const res = await fetch(
            `/api/data/app/calendar?start=${s}&end=${e}`,
          );
          return res.json();
        },
        {
          s: new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate(),
          ).toISOString(),
          e: new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate() + 1,
          ).toISOString(),
        },
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = apiResp?.data?.find((ev: any) => ev.title === title);
      expect(created).toBeTruthy();
      eventId = created?.id || created?.eventId;
      console.log(
        "[TEST] Event with attendees created, attendees:",
        created.attendees?.length || 0,
      );
    } finally {
      if (eventId) await deleteEventViaAPI(page, eventId);
    }
  });

  // ─── 4. Edit event attendees ────────────────────────────────────
  test("Edit event to add/remove attendees", async ({ page }) => {
    const title = `${TEST_PREFIX} EditAttendees`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(12, 0, 0, 0);

    await loginAndGetExpertId(page);
    await goToCalendar(page, expertId);

    const eventId = await createEvent(page, title, tomorrow, endTime);

    try {
      // Open the event and enter edit mode
      await navigateToDayView(page, tomorrow);
      await clickEventOnCalendar(page, title);

      const editBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: "Edit" });
      await editBtn.click();
      await page.waitForTimeout(500);

      // Try to add an attendee in edit mode
      const attendeeSearch = page
        .getByRole("dialog")
        .locator('input[placeholder="Search by name or email..."]');

      if (
        await attendeeSearch.isVisible({ timeout: 5000 }).catch(() => false)
      ) {
        await attendeeSearch.click();
        await page.waitForTimeout(1000);

        const userOption = page
          .getByRole("dialog")
          .locator("ul li button")
          .first();
        if (
          await userOption.isVisible({ timeout: 5000 }).catch(() => false)
        ) {
          await userOption.click();
          await page.waitForTimeout(500);
          console.log("[TEST] Added attendee in edit mode");
        }
      }

      // Save changes
      const saveBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: /Save Changes|Save This Event/ });

      const [saveResp] = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes("/api/data/app/calendar/events/") &&
            r.request().method() === "PUT",
          { timeout: 15000 },
        ),
        saveBtn.click(),
      ]);

      expect(saveResp.status()).toBe(200);
      const saveBody = await saveResp.json().catch(() => null);
      console.log(
        "[TEST] Updated attendees count:",
        saveBody?.data?.attendees?.length || 0,
      );

      await page
        .getByRole("dialog")
        .waitFor({ state: "hidden", timeout: 10000 });
      console.log("[TEST] Edit attendees test passed");
    } finally {
      await deleteEventViaAPI(page, eventId);
    }
  });

  // ─── 5. Create daily recurring event ────────────────────────────
  test("Create daily recurring event and verify series", async ({ page }) => {
    const title = `${TEST_PREFIX} DailyRecur`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(8, 30, 0, 0);
    let firstEventId = "";

    await loginAndGetExpertId(page);
    await goToCalendar(page, expertId);

    try {
      await openCreateModal(page);

      await page.locator('input[type="text"]').first().fill(title);
      await page
        .locator('input[type="datetime-local"]')
        .first()
        .fill(formatDateTime(tomorrow));
      await page
        .locator('input[type="datetime-local"]')
        .last()
        .fill(formatDateTime(endTime));

      // Select "Daily" recurrence
      const repeatSelect = page.getByRole("dialog").locator("select");
      await repeatSelect.selectOption("daily");
      await page.waitForTimeout(500);
      console.log("[TEST] Selected Daily recurrence");

      // Submit
      const submitBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: "Create Recurring Event" });
      await expect(submitBtn).toBeVisible();
      await submitBtn.click();
      await page.waitForSelector('input[type="text"]', {
        state: "hidden",
        timeout: 15000,
      });
      console.log("[TEST] Daily recurring event created");

      // Verify multiple instances exist via API
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const apiResp = await page.evaluate(
        async ({ s, e }) => {
          const res = await fetch(
            `/api/data/app/calendar?start=${s}&end=${e}`,
          );
          return res.json();
        },
        {
          s: new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate(),
          ).toISOString(),
          e: new Date(
            dayAfter.getFullYear(),
            dayAfter.getMonth(),
            dayAfter.getDate() + 1,
          ).toISOString(),
        },
      );

      const recurringEvents = apiResp?.data?.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ev: any) => ev.title === title,
      );
      console.log(
        "[TEST] Found recurring instances:",
        recurringEvents?.length || 0,
      );
      expect(recurringEvents?.length).toBeGreaterThanOrEqual(2);
      firstEventId =
        recurringEvents[0]?.id || recurringEvents[0]?.eventId;
    } finally {
      if (firstEventId) await deleteSeriesViaAPI(page, firstEventId);
    }
  });

  // ─── 6. Create weekly recurring event ───────────────────────────
  test("Create weekly recurring event", async ({ page }) => {
    const title = `${TEST_PREFIX} WeeklyRecur`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(16, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(17, 0, 0, 0);
    let firstId = "";

    await loginAndGetExpertId(page);
    await goToCalendar(page, expertId);

    try {
      await openCreateModal(page);

      await page.locator('input[type="text"]').first().fill(title);
      await page
        .locator('input[type="datetime-local"]')
        .first()
        .fill(formatDateTime(tomorrow));
      await page
        .locator('input[type="datetime-local"]')
        .last()
        .fill(formatDateTime(endTime));

      const repeatSelect = page.getByRole("dialog").locator("select");
      await repeatSelect.selectOption("weekly");
      await page.waitForTimeout(500);
      console.log("[TEST] Selected Weekly recurrence");

      const submitBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: "Create Recurring Event" });
      await submitBtn.click();
      await page.waitForSelector('input[type="text"]', {
        state: "hidden",
        timeout: 15000,
      });

      // Verify over a 2-week range
      const twoWeeksLater = new Date(tomorrow);
      twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

      const apiResp = await page.evaluate(
        async ({ s, e }) => {
          const res = await fetch(
            `/api/data/app/calendar?start=${s}&end=${e}`,
          );
          return res.json();
        },
        {
          s: new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate(),
          ).toISOString(),
          e: twoWeeksLater.toISOString(),
        },
      );

      const weeklyEvents = apiResp?.data?.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ev: any) => ev.title === title,
      );
      console.log(
        "[TEST] Found weekly instances:",
        weeklyEvents?.length || 0,
      );
      expect(weeklyEvents?.length).toBeGreaterThanOrEqual(2);
      firstId = weeklyEvents[0]?.id || weeklyEvents[0]?.eventId;
    } finally {
      if (firstId) await deleteSeriesViaAPI(page, firstId);
    }
  });

  // ─── 7. Create custom recurring event ──────────────────────────
  test("Create custom recurring event (every 2 weeks, specific days)", async ({
    page,
  }) => {
    const title = `${TEST_PREFIX} CustomRecur`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(13, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(14, 0, 0, 0);
    let firstId = "";

    await loginAndGetExpertId(page);
    await goToCalendar(page, expertId);

    try {
      await openCreateModal(page);

      await page.locator('input[type="text"]').first().fill(title);
      await page
        .locator('input[type="datetime-local"]')
        .first()
        .fill(formatDateTime(tomorrow));
      await page
        .locator('input[type="datetime-local"]')
        .last()
        .fill(formatDateTime(endTime));

      // Select "Custom..." recurrence
      const repeatSelect = page.getByRole("dialog").locator("select");
      await repeatSelect.selectOption("custom");
      await page.waitForTimeout(500);
      console.log("[TEST] Custom recurrence form opened");

      // Set interval to 2
      const intervalInput = page
        .getByRole("dialog")
        .locator('input[type="number"]')
        .first();
      await intervalInput.fill("2");

      // Ensure frequency is "weekly"
      const freqSelect = page.getByRole("dialog").locator("select").last();
      await freqSelect.selectOption("weekly");
      await page.waitForTimeout(300);

      // Toggle Monday day button
      const dayButtons = page
        .getByRole("dialog")
        .locator("button.rounded-full.w-8.h-8");
      const mondayBtn = dayButtons.nth(1);
      if (await mondayBtn.isVisible().catch(() => false)) {
        await mondayBtn.click();
        console.log("[TEST] Toggled Monday");
      }

      // Set end after 5 occurrences
      const occInput = page
        .getByRole("dialog")
        .locator('input[type="number"]')
        .last();
      if (await occInput.isVisible().catch(() => false)) {
        await occInput.fill("5");
      }

      // Submit
      const submitBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: "Create Recurring Event" });
      await submitBtn.click();
      await page.waitForSelector('input[type="text"]', {
        state: "hidden",
        timeout: 15000,
      });

      // Verify via API
      const sixWeeksLater = new Date(tomorrow);
      sixWeeksLater.setDate(sixWeeksLater.getDate() + 42);

      const apiResp = await page.evaluate(
        async ({ s, e }) => {
          const res = await fetch(
            `/api/data/app/calendar?start=${s}&end=${e}`,
          );
          return res.json();
        },
        {
          s: new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate(),
          ).toISOString(),
          e: sixWeeksLater.toISOString(),
        },
      );

      const customEvents = apiResp?.data?.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ev: any) => ev.title === title,
      );
      console.log(
        "[TEST] Found custom recurring instances:",
        customEvents?.length || 0,
      );
      expect(customEvents?.length).toBeGreaterThanOrEqual(1);
      firstId = customEvents[0]?.id || customEvents[0]?.eventId;
    } finally {
      if (firstId) await deleteSeriesViaAPI(page, firstId);
    }
  });

  // ─── 8. Edit single instance of recurring event ─────────────────
  test("Edit single instance of recurring event", async ({ page }) => {
    const title = `${TEST_PREFIX} EditSingle`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(7, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(7, 30, 0, 0);
    let seriesEventId = "";
    let editedEventId = "";

    await loginAndGetExpertId(page);
    await goToCalendar(page, expertId);

    try {
      await openCreateModal(page);

      // Create daily recurring event
      await page.locator('input[type="text"]').first().fill(title);
      await page
        .locator('input[type="datetime-local"]')
        .first()
        .fill(formatDateTime(tomorrow));
      await page
        .locator('input[type="datetime-local"]')
        .last()
        .fill(formatDateTime(endTime));

      const repeatSelect = page.getByRole("dialog").locator("select");
      await repeatSelect.selectOption("daily");
      await page.waitForTimeout(500);

      const submitBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: "Create Recurring Event" });
      await submitBtn.click();
      await page.waitForSelector('input[type="text"]', {
        state: "hidden",
        timeout: 15000,
      });
      console.log("[TEST] Daily recurring event created for edit-single test");

      // Navigate to tomorrow and open the first instance
      await navigateToDayView(page, tomorrow);
      await page.waitForTimeout(1000);
      await clickEventOnCalendar(page, title);

      // Edit
      const editBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: "Edit" });
      await editBtn.click();
      await page.waitForTimeout(500);

      // Change the title for this instance
      const titleInput = page
        .getByRole("dialog")
        .locator('input[type="text"]')
        .first();
      const editedTitle = `${title} (edited)`;
      await titleInput.fill(editedTitle);

      // Click "Save This Event" (single instance edit)
      const saveThisBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: "Save This Event" });
      await expect(saveThisBtn).toBeVisible();

      const [saveResp] = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes("/api/data/app/calendar/events/") &&
            r.request().method() === "PUT" &&
            !r.url().includes("updateFuture"),
          { timeout: 15000 },
        ),
        saveThisBtn.click(),
      ]);

      expect(saveResp.status()).toBe(200);
      await page
        .getByRole("dialog")
        .waitFor({ state: "hidden", timeout: 10000 });
      console.log("[TEST] Single instance edited");

      // Verify the next day still has the original title
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const apiResp = await page.evaluate(
        async ({ s, e }) => {
          const res = await fetch(
            `/api/data/app/calendar?start=${s}&end=${e}`,
          );
          return res.json();
        },
        {
          s: new Date(
            dayAfter.getFullYear(),
            dayAfter.getMonth(),
            dayAfter.getDate(),
          ).toISOString(),
          e: new Date(
            dayAfter.getFullYear(),
            dayAfter.getMonth(),
            dayAfter.getDate() + 1,
          ).toISOString(),
        },
      );

      const nextDayEvent = apiResp?.data?.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ev: any) => ev.title === title,
      );
      expect(nextDayEvent).toBeTruthy();
      seriesEventId = nextDayEvent?.id || nextDayEvent?.eventId;
      console.log(
        "[TEST] Next day still has original title – single edit confirmed",
      );

      // Find the edited instance id for cleanup
      const editedResp = await page.evaluate(
        async ({ s, e, t }) => {
          const res = await fetch(
            `/api/data/app/calendar?start=${s}&end=${e}`,
          );
          const data = await res.json();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return data?.data?.find((ev: any) => ev.title === t);
        },
        {
          s: new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate(),
          ).toISOString(),
          e: new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate() + 1,
          ).toISOString(),
          t: editedTitle,
        },
      );
      if (editedResp) {
        editedEventId = editedResp.id || editedResp.eventId;
      }
    } finally {
      if (seriesEventId) await deleteSeriesViaAPI(page, seriesEventId);
      if (editedEventId) await deleteEventViaAPI(page, editedEventId);
    }
  });

  // ─── 9. Edit future events of recurring series ──────────────────
  test("Edit future events of recurring series", async ({ page }) => {
    const title = `${TEST_PREFIX} EditFuture`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(15, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(15, 30, 0, 0);
    let cleanupId = "";

    await loginAndGetExpertId(page);
    await goToCalendar(page, expertId);

    try {
      await openCreateModal(page);

      // Create daily recurring
      await page.locator('input[type="text"]').first().fill(title);
      await page
        .locator('input[type="datetime-local"]')
        .first()
        .fill(formatDateTime(tomorrow));
      await page
        .locator('input[type="datetime-local"]')
        .last()
        .fill(formatDateTime(endTime));

      const repeatSelect = page.getByRole("dialog").locator("select");
      await repeatSelect.selectOption("daily");
      await page.waitForTimeout(500);

      const submitBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: "Create Recurring Event" });
      await submitBtn.click();
      await page.waitForSelector('input[type="text"]', {
        state: "hidden",
        timeout: 15000,
      });

      // Get an event id for cleanup
      const initialResp = await page.evaluate(
        async ({ s, e }) => {
          const res = await fetch(
            `/api/data/app/calendar?start=${s}&end=${e}`,
          );
          return res.json();
        },
        {
          s: new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate(),
          ).toISOString(),
          e: new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate() + 1,
          ).toISOString(),
        },
      );
      const initialEvent = initialResp?.data?.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ev: any) => ev.title === title,
      );
      cleanupId = initialEvent?.id || initialEvent?.eventId || "";

      // Navigate to day after tomorrow (2nd instance) and edit
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      await navigateToDayView(page, dayAfter);
      await page.waitForTimeout(1000);
      await clickEventOnCalendar(page, title);

      const editBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: "Edit" });
      await editBtn.click();
      await page.waitForTimeout(500);

      // Change description
      const descTextarea = page
        .getByRole("dialog")
        .locator("textarea")
        .first();
      await descTextarea.fill("Updated for future events");

      // Click "Save Future Events"
      const saveFutureBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: "Save Future Events" });
      await expect(saveFutureBtn).toBeVisible();

      const [saveResp] = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes("/api/data/app/calendar/events/") &&
            r.request().method() === "PUT",
          { timeout: 15000 },
        ),
        saveFutureBtn.click(),
      ]);

      expect(saveResp.status()).toBe(200);
      await page
        .getByRole("dialog")
        .waitFor({ state: "hidden", timeout: 10000 });
      console.log("[TEST] Future events edited");
    } finally {
      if (cleanupId) await deleteSeriesViaAPI(page, cleanupId);
    }
  });

  // ─── 10. Delete single instance of recurring event ──────────────
  test("Delete single instance of recurring event", async ({ page }) => {
    const title = `${TEST_PREFIX} DelSingle`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(6, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(6, 30, 0, 0);
    let cleanupId = "";

    await loginAndGetExpertId(page);
    await goToCalendar(page, expertId);

    try {
      await openCreateModal(page);

      // Create daily recurring
      await page.locator('input[type="text"]').first().fill(title);
      await page
        .locator('input[type="datetime-local"]')
        .first()
        .fill(formatDateTime(tomorrow));
      await page
        .locator('input[type="datetime-local"]')
        .last()
        .fill(formatDateTime(endTime));

      const repeatSelect = page.getByRole("dialog").locator("select");
      await repeatSelect.selectOption("daily");
      await page.waitForTimeout(500);

      const submitBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: "Create Recurring Event" });
      await submitBtn.click();
      await page.waitForSelector('input[type="text"]', {
        state: "hidden",
        timeout: 15000,
      });

      // Navigate to tomorrow and delete the first instance only
      await navigateToDayView(page, tomorrow);
      await page.waitForTimeout(1000);
      await clickEventOnCalendar(page, title);

      // Verify both buttons exist for recurring events
      const deleteBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: "Delete" })
        .first();
      const deleteSeriesBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: "Delete Series" });

      await expect(deleteBtn).toBeVisible();
      await expect(deleteSeriesBtn).toBeVisible();
      console.log("[TEST] Both Delete and Delete Series buttons visible");

      await deleteBtn.click();
      await page.waitForTimeout(3000);

      // Verify the next day still has the event
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const apiResp = await page.evaluate(
        async ({ s, e, t }) => {
          const res = await fetch(
            `/api/data/app/calendar?start=${s}&end=${e}`,
          );
          const data = await res.json();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return data?.data?.find((ev: any) => ev.title === t);
        },
        {
          s: new Date(
            dayAfter.getFullYear(),
            dayAfter.getMonth(),
            dayAfter.getDate(),
          ).toISOString(),
          e: new Date(
            dayAfter.getFullYear(),
            dayAfter.getMonth(),
            dayAfter.getDate() + 1,
          ).toISOString(),
          t: title,
        },
      );
      expect(apiResp).toBeTruthy();
      cleanupId = apiResp.id || apiResp.eventId;
      console.log("[TEST] Next day event still exists after single delete");
    } finally {
      if (cleanupId) await deleteSeriesViaAPI(page, cleanupId);
    }
  });

  // ─── 11. Delete entire recurring series ─────────────────────────
  test("Delete entire recurring series", async ({ page }) => {
    const title = `${TEST_PREFIX} DelSeries`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(18, 30, 0, 0);
    let cleanupId = "";

    await loginAndGetExpertId(page);
    await goToCalendar(page, expertId);

    try {
      await openCreateModal(page);

      // Create daily recurring
      await page.locator('input[type="text"]').first().fill(title);
      await page
        .locator('input[type="datetime-local"]')
        .first()
        .fill(formatDateTime(tomorrow));
      await page
        .locator('input[type="datetime-local"]')
        .last()
        .fill(formatDateTime(endTime));

      const repeatSelect = page.getByRole("dialog").locator("select");
      await repeatSelect.selectOption("daily");
      await page.waitForTimeout(500);

      const submitBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: "Create Recurring Event" });
      await submitBtn.click();
      await page.waitForSelector('input[type="text"]', {
        state: "hidden",
        timeout: 15000,
      });

      // Get an event id for cleanup fallback
      const initialResp = await page.evaluate(
        async ({ s, e }) => {
          const res = await fetch(
            `/api/data/app/calendar?start=${s}&end=${e}`,
          );
          return res.json();
        },
        {
          s: new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate(),
          ).toISOString(),
          e: new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate() + 1,
          ).toISOString(),
        },
      );
      const firstEvent = initialResp?.data?.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ev: any) => ev.title === title,
      );
      cleanupId = firstEvent?.id || firstEvent?.eventId || "";

      // Navigate to tomorrow and delete the entire series via UI
      await navigateToDayView(page, tomorrow);
      await page.waitForTimeout(1000);
      await clickEventOnCalendar(page, title);

      const deleteSeriesBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: "Delete Series" });
      await expect(deleteSeriesBtn).toBeVisible();
      await deleteSeriesBtn.click();
      await page.waitForTimeout(3000);

      // Verify all instances are gone
      const weekLater = new Date(tomorrow);
      weekLater.setDate(weekLater.getDate() + 7);

      const apiResp = await page.evaluate(
        async ({ s, e, t }) => {
          const res = await fetch(
            `/api/data/app/calendar?start=${s}&end=${e}`,
          );
          const data = await res.json();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return data?.data?.filter((ev: any) => ev.title === t);
        },
        {
          s: new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate(),
          ).toISOString(),
          e: weekLater.toISOString(),
          t: title,
        },
      );

      expect(apiResp?.length || 0).toBe(0);
      cleanupId = ""; // Already deleted via UI
      console.log(
        "[TEST] Delete entire series test passed – all instances removed",
      );
    } finally {
      if (cleanupId) await deleteSeriesViaAPI(page, cleanupId);
    }
  });

  // ─── 12. All-day event ──────────────────────────────────────────
  test("Create all-day event", async ({ page }) => {
    const title = `${TEST_PREFIX} AllDay`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(10, 0, 0, 0);
    let eventId = "";

    await loginAndGetExpertId(page);
    await goToCalendar(page, expertId);

    try {
      await openCreateModal(page);

      await page.locator('input[type="text"]').first().fill(title);
      await page
        .locator('input[type="datetime-local"]')
        .first()
        .fill(formatDateTime(tomorrow));
      await page
        .locator('input[type="datetime-local"]')
        .last()
        .fill(formatDateTime(endTime));

      // Check "All day event" checkbox
      const allDayCheckbox = page.getByRole("dialog").locator("#isAllDay");
      await allDayCheckbox.check();
      expect(await allDayCheckbox.isChecked()).toBe(true);
      console.log("[TEST] All-day checkbox checked");

      const submitBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: /Create Event/ });
      await submitBtn.click();
      await page.waitForSelector('input[type="text"]', {
        state: "hidden",
        timeout: 15000,
      });

      // Verify via API
      const apiResp = await page.evaluate(
        async ({ s, e }) => {
          const res = await fetch(
            `/api/data/app/calendar?start=${s}&end=${e}`,
          );
          return res.json();
        },
        {
          s: new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate(),
          ).toISOString(),
          e: new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate() + 1,
          ).toISOString(),
        },
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allDayEvent = apiResp?.data?.find(
        (ev: any) => ev.title === title,
      );
      expect(allDayEvent).toBeTruthy();
      // API response uses "allDay" (FullCalendar format), not "isAllDay"
      expect(allDayEvent.allDay).toBe(true);
      eventId = allDayEvent.id || allDayEvent.eventId;
      console.log("[TEST] All-day event verified via API");
    } finally {
      if (eventId) await deleteEventViaAPI(page, eventId);
    }
  });

  // ─── 13. Video conferencing toggle disabled for recurring ───────
  test("Video conferencing is disabled when recurrence is selected", async ({
    page,
  }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    await loginAndGetExpertId(page);
    await goToCalendar(page, expertId);
    await openCreateModal(page);

    await page.locator('input[type="text"]').first().fill("temp");
    await page
      .locator('input[type="datetime-local"]')
      .first()
      .fill(formatDateTime(tomorrow));

    // Video conferencing checkbox should be enabled initially
    const videoCheckbox = page
      .getByRole("dialog")
      .locator("#hasVideoConference");
    await expect(videoCheckbox).toBeEnabled();
    console.log("[TEST] Video checkbox enabled by default");

    // Select Daily recurrence
    const repeatSelect = page.getByRole("dialog").locator("select");
    await repeatSelect.selectOption("daily");
    await page.waitForTimeout(500);

    // Video conferencing checkbox should now be disabled
    await expect(videoCheckbox).toBeDisabled();
    console.log("[TEST] Video checkbox disabled after selecting recurrence");

    // Text hint should be visible
    const hint = page.getByText("Not available for recurring events");
    await expect(hint).toBeVisible();

    // Switch back to "Does not repeat" – video checkbox should re-enable
    await repeatSelect.selectOption("none");
    await page.waitForTimeout(500);
    await expect(videoCheckbox).toBeEnabled();
    console.log(
      "[TEST] Video checkbox re-enabled after removing recurrence – test passed",
    );

    // Close modal without creating (no cleanup needed)
    const cancelBtn = page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel" });
    await cancelBtn.click();
  });

  // ─── 14. Edit event title and description ───────────────────────
  test("Edit event title and description", async ({ page }) => {
    const title = `${TEST_PREFIX} EditFields`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(13, 0, 0, 0);

    await loginAndGetExpertId(page);
    await goToCalendar(page, expertId);
    const eventId = await createEvent(page, title, tomorrow, endTime);

    try {
      // Open event and edit
      await navigateToDayView(page, tomorrow);
      await clickEventOnCalendar(page, title);

      const editBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: "Edit" });
      await editBtn.click();
      await page.waitForTimeout(500);

      // Change title
      const titleInput = page
        .getByRole("dialog")
        .locator('input[type="text"]')
        .first();
      const newTitle = `${title} Updated`;
      await titleInput.fill(newTitle);

      // Add description
      const descTextarea = page
        .getByRole("dialog")
        .locator("textarea")
        .first();
      await descTextarea.fill("Updated description via E2E test");

      // Add location
      const locInput = page
        .getByRole("dialog")
        .locator('input[type="text"]')
        .nth(1);
      await locInput.fill("Virtual Office");

      // Save
      const saveBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: /Save Changes/ });

      const [saveResp] = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes("/api/data/app/calendar/events/") &&
            r.request().method() === "PUT",
          { timeout: 15000 },
        ),
        saveBtn.click(),
      ]);

      expect(saveResp.status()).toBe(200);
      const body = await saveResp.json().catch(() => null);
      expect(body?.data?.title).toBe(newTitle);
      expect(body?.data?.description).toBe(
        "Updated description via E2E test",
      );
      console.log("[TEST] Title and description update verified");

      await page
        .getByRole("dialog")
        .waitFor({ state: "hidden", timeout: 10000 });
    } finally {
      await deleteEventViaAPI(page, eventId);
    }
  });

  // ─── 15. Monthly recurring event ────────────────────────────────
  test("Create monthly recurring event (day of month)", async ({ page }) => {
    const title = `${TEST_PREFIX} Monthly`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(11, 0, 0, 0);
    let firstId = "";

    await loginAndGetExpertId(page);
    await goToCalendar(page, expertId);

    try {
      await openCreateModal(page);

      await page.locator('input[type="text"]').first().fill(title);
      await page
        .locator('input[type="datetime-local"]')
        .first()
        .fill(formatDateTime(tomorrow));
      await page
        .locator('input[type="datetime-local"]')
        .last()
        .fill(formatDateTime(endTime));

      const repeatSelect = page.getByRole("dialog").locator("select");
      await repeatSelect.selectOption("monthly_day");
      await page.waitForTimeout(500);
      console.log("[TEST] Selected monthly (day of month) recurrence");

      const submitBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: "Create Recurring Event" });
      await submitBtn.click();
      await page.waitForSelector('input[type="text"]', {
        state: "hidden",
        timeout: 15000,
      });

      // Verify at least one instance was created
      const apiResp = await page.evaluate(
        async ({ s, e }) => {
          const res = await fetch(
            `/api/data/app/calendar?start=${s}&end=${e}`,
          );
          return res.json();
        },
        {
          s: new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate(),
          ).toISOString(),
          e: new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate() + 1,
          ).toISOString(),
        },
      );

      const monthlyEvent = apiResp?.data?.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ev: any) => ev.title === title,
      );
      expect(monthlyEvent).toBeTruthy();
      firstId = monthlyEvent.id || monthlyEvent.eventId;
      console.log("[TEST] Monthly recurring event created");
    } finally {
      if (firstId) await deleteSeriesViaAPI(page, firstId);
    }
  });

  // ─── 16. Validation: end time before start time ─────────────────
  test("Validation: end time must be after start time", async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    const badEnd = new Date(tomorrow);
    badEnd.setHours(13, 0, 0, 0); // End BEFORE start

    await loginAndGetExpertId(page);
    await goToCalendar(page, expertId);
    await openCreateModal(page);

    await page.locator('input[type="text"]').first().fill("Bad Event");
    await page
      .locator('input[type="datetime-local"]')
      .first()
      .fill(formatDateTime(tomorrow));
    await page
      .locator('input[type="datetime-local"]')
      .last()
      .fill(formatDateTime(badEnd));

    const submitBtn = page
      .getByRole("dialog")
      .getByRole("button", { name: /Create Event/ });
    await submitBtn.click();

    // Error message should appear
    const errorMsg = page.getByText("End time must be after start time");
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
    console.log("[TEST] Validation error displayed correctly");

    // Close modal – no event was created, no cleanup needed
    const cancelBtn = page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel" });
    await cancelBtn.click();
  });

  // ─── 17. Validation: empty title ────────────────────────────────
  test("Validation: title is required", async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(11, 0, 0, 0);

    await loginAndGetExpertId(page);
    await goToCalendar(page, expertId);
    await openCreateModal(page);

    // Leave title empty, fill times
    await page
      .locator('input[type="datetime-local"]')
      .first()
      .fill(formatDateTime(tomorrow));
    await page
      .locator('input[type="datetime-local"]')
      .last()
      .fill(formatDateTime(endTime));

    const submitBtn = page
      .getByRole("dialog")
      .getByRole("button", { name: /Create Event/ });
    await submitBtn.click();

    // The title input has required attribute – browser validation or custom error
    const errorMsg = page.getByText("Title is required");
    const hasCustomError = await errorMsg
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (hasCustomError) {
      console.log("[TEST] Custom title required error shown");
    } else {
      // Browser native validation – the modal should still be open
      const modalStillOpen = await page
        .locator('input[type="text"]')
        .first()
        .isVisible();
      expect(modalStillOpen).toBe(true);
      console.log("[TEST] Browser validation prevented submission");
    }

    // Close modal – no event was created, no cleanup needed
    const cancelBtn = page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel" });
    await cancelBtn.click();
  });

  // ─── 18. Calendar view switching ────────────────────────────────
  test("Switch between month, week, and day views", async ({ page }) => {
    await loginAndGetExpertId(page);
    await goToCalendar(page, expertId);

    // Month view
    const monthBtn = page.locator("button.fc-dayGridMonth-button");
    if (await monthBtn.isVisible()) {
      await monthBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator(".fc-dayGridMonth-view")).toBeVisible();
      console.log("[TEST] Month view active");
    }

    // Week view
    const weekBtn = page.locator("button.fc-timeGridWeek-button");
    if (await weekBtn.isVisible()) {
      await weekBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator(".fc-timeGridWeek-view")).toBeVisible();
      console.log("[TEST] Week view active");
    }

    // Day view
    const dayBtn = page.locator("button.fc-timeGridDay-button");
    if (await dayBtn.isVisible()) {
      await dayBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator(".fc-timeGridDay-view")).toBeVisible();
      console.log("[TEST] Day view active");
    }

    console.log("[TEST] View switching test passed");
  });

  // ─── 19. Calendar navigation (prev/next/today) ─────────────────
  test("Navigate calendar with prev, next, and today buttons", async ({
    page,
  }) => {
    await loginAndGetExpertId(page);
    await goToCalendar(page, expertId);

    // Get initial title
    const titleEl = page.locator(".fc-toolbar-title");
    const initialTitle = await titleEl.textContent();
    console.log("[TEST] Initial calendar title:", initialTitle);

    // Click next
    await page.locator("button.fc-next-button").click();
    await page.waitForTimeout(500);
    const nextTitle = await titleEl.textContent();
    expect(nextTitle).not.toBe(initialTitle);
    console.log("[TEST] After next:", nextTitle);

    // Click prev
    await page.locator("button.fc-prev-button").click();
    await page.waitForTimeout(500);
    const prevTitle = await titleEl.textContent();
    expect(prevTitle).toBe(initialTitle);
    console.log("[TEST] After prev (back to original):", prevTitle);

    // Click next twice then today
    await page.locator("button.fc-next-button").click();
    await page.locator("button.fc-next-button").click();
    await page.waitForTimeout(500);

    const todayBtn = page.locator("button.fc-today-button");
    if (await todayBtn.isEnabled()) {
      await todayBtn.click();
      await page.waitForTimeout(500);
      const todayTitle = await titleEl.textContent();
      expect(todayTitle).toBe(initialTitle);
      console.log("[TEST] Today button returned to:", todayTitle);
    }

    console.log("[TEST] Calendar navigation test passed");
  });
});
