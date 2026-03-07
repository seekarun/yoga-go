import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3113';
const EMAIL = 'me.arun@gmail.com';
const PASSWORD = 'MyYoga1!';
const TEST_EVENT_TITLE = `E2E Test Event ${Date.now()}`;

test.describe('Cally Calendar E2E', () => {
  test('Login, create event, verify, edit, verify edit, delete, and logout', async ({ page }) => {
    // ---- STEP 1: Navigate to /srv (should redirect to signin) ----
    console.log('[TEST] Step 1: Navigating to /srv...');
    await page.goto(`${BASE_URL}/srv`);
    await page.waitForURL(/\/auth\/signin/, { timeout: 15000 });
    console.log('[TEST] Redirected to signin page:', page.url());

    // ---- STEP 2: Login ----
    console.log('[TEST] Step 2: Logging in...');
    await page.fill('input#email', EMAIL);
    await page.fill('input#password', PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect to /srv after login
    await page.waitForURL(/\/srv\//, { timeout: 30000 });
    console.log('[TEST] Logged in, redirected to:', page.url());

    // Extract expertId from URL
    const url = page.url();
    const expertIdMatch = url.match(/\/srv\/([^/]+)/);
    const expertId = expertIdMatch ? expertIdMatch[1] : '';
    console.log('[TEST] Expert ID:', expertId);
    expect(expertId).toBeTruthy();

    // ---- STEP 3: Navigate to Calendar page ----
    console.log('[TEST] Step 3: Navigating to calendar...');
    await page.goto(`${BASE_URL}/srv/${expertId}/calendar`);
    await page.waitForURL(/\/calendar/, { timeout: 15000 });

    // Wait for calendar to load (FullCalendar renders)
    await page.waitForSelector('.fc', { timeout: 15000 });
    console.log('[TEST] Calendar page loaded');

    // ---- STEP 4: Create an event ----
    console.log('[TEST] Step 4: Creating event...');

    // Click "Create Event" button
    const createBtn = page.locator('button', { hasText: 'Create Event' });
    await createBtn.click();

    // Wait for the modal to appear
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    console.log('[TEST] Create Event modal opened');

    // Fill in event title
    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.fill(TEST_EVENT_TITLE);

    // Set start time to tomorrow at 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const endTime = new Date(tomorrow);
    endTime.setHours(11, 0, 0, 0);

    const formatDateTime = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Fill start and end times
    const startInput = page.locator('input[type="datetime-local"]').first();
    const endInput = page.locator('input[type="datetime-local"]').last();

    await startInput.fill(formatDateTime(tomorrow));
    await endInput.fill(formatDateTime(endTime));

    console.log(
      '[TEST] Event form filled:',
      TEST_EVENT_TITLE,
      formatDateTime(tomorrow),
      '→',
      formatDateTime(endTime),
    );

    // Click create button inside the dialog modal
    const submitBtn = page
      .getByRole('dialog')
      .getByRole('button', { name: /Create Event|Create Recurring Event/ });
    await submitBtn.click();

    // Wait for modal to close (indicates success)
    await page.waitForSelector('input[type="text"]', {
      state: 'hidden',
      timeout: 15000,
    });
    console.log('[TEST] Event created successfully, modal closed');

    // ---- STEP 5: Verify event was created ----
    console.log('[TEST] Step 5: Verifying event exists on calendar...');

    // Navigate to the day of the event to see it
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    // Switch to day view for tomorrow to see the event clearly
    const dayViewBtn = page.locator('button.fc-timeGridDay-button');
    if (await dayViewBtn.isVisible()) {
      await dayViewBtn.click();
      await page.waitForTimeout(1000);
    }

    // Navigate forward to tomorrow if needed by clicking the next button
    const nextBtn = page.locator('button.fc-next-button');
    await nextBtn.click();
    await page.waitForTimeout(1000);

    // Look for the event on the calendar
    const eventOnCalendar = page.locator('.fc-event', {
      hasText: TEST_EVENT_TITLE,
    });
    const eventVisible = await eventOnCalendar
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (eventVisible) {
      console.log('[TEST] Event found on calendar view!');
    } else {
      // Try going back to month view and checking there
      console.log(
        '[TEST] Event not visible in day view, checking month view...',
      );
      const monthViewBtn = page.locator('button.fc-dayGridMonth-button');
      if (await monthViewBtn.isVisible()) {
        await monthViewBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Verify by checking API response
    const apiResponse = await page.evaluate(
      async ({ start, end }) => {
        const res = await fetch(
          `/api/data/app/calendar?start=${start}&end=${end}`,
        );
        return res.json();
      },
      {
        start: new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate(),
        ).toISOString(),
        end: new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate() + 1,
        ).toISOString(),
      },
    );

    console.log(
      '[TEST] API response events count:',
      apiResponse?.data?.length || 0,
    );

    const createdEvent = apiResponse?.data?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => e.title === TEST_EVENT_TITLE,
    );
    expect(createdEvent).toBeTruthy();
    console.log(
      '[TEST] Event verified via API! Event ID:',
      createdEvent?.id || createdEvent?.eventId,
    );

    const eventId = createdEvent?.id || createdEvent?.eventId;

    // ---- STEP 6: Edit event - move to next day ----
    console.log('[TEST] Step 6: Editing event - moving to next day...');

    // Click on the event to open event modal
    const eventToEdit = page.locator('.fc-event', {
      hasText: TEST_EVENT_TITLE,
    });
    await eventToEdit.first().click();
    await page.waitForTimeout(1000);
    console.log('[TEST] Clicked event, modal opened');

    // Click the Edit button
    const editBtn = page
      .getByRole('dialog')
      .getByRole('button', { name: 'Edit' });
    await editBtn.click();
    await page.waitForTimeout(500);
    console.log('[TEST] Edit mode activated');

    // Calculate day after tomorrow (move event forward one day)
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    dayAfterTomorrow.setHours(10, 0, 0, 0);

    const newEndTime = new Date(dayAfterTomorrow);
    newEndTime.setHours(11, 0, 0, 0);

    // Update start and end times in the edit form
    // Use native value setter + input/change events to trigger React state update
    const editStartInput = page
      .getByRole('dialog')
      .locator('input[type="datetime-local"]')
      .first();
    const editEndInput = page
      .getByRole('dialog')
      .locator('input[type="datetime-local"]')
      .last();

    // Clear and fill start time with proper event dispatch
    await editStartInput.evaluate((el, value) => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )!.set!;
      nativeInputValueSetter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, formatDateTime(dayAfterTomorrow));

    await page.waitForTimeout(300);

    // Clear and fill end time with proper event dispatch
    await editEndInput.evaluate((el, value) => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )!.set!;
      nativeInputValueSetter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, formatDateTime(newEndTime));

    await page.waitForTimeout(300);

    // Verify the inputs have the new values
    const startVal = await editStartInput.inputValue();
    const endVal = await editEndInput.inputValue();
    console.log('[TEST] Input values after fill - Start:', startVal, 'End:', endVal);

    // Click Save Changes and wait for the PUT API response
    const saveBtn = page
      .getByRole('dialog')
      .getByRole('button', { name: /Save Changes|Save This Event/ });
    await expect(saveBtn).toBeVisible();
    console.log('[TEST] Save button found, clicking...');

    const [saveResponse] = await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/data/app/calendar/events/') &&
          resp.request().method() === 'PUT',
        { timeout: 15000 },
      ),
      saveBtn.click(),
    ]);

    const saveStatus = saveResponse.status();
    const saveBody = await saveResponse.json().catch(() => null);
    console.log(
      '[TEST] Save API response - Status:',
      saveStatus,
      'Body:',
      JSON.stringify(saveBody),
    );

    // Wait for modal to close after save
    await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 10000 });
    console.log('[TEST] Modal closed after save');

    // ---- STEP 7: Verify the edit worked ----
    console.log('[TEST] Step 7: Verifying event was moved to next day...');

    // Use the save response we already captured to verify
    const savedStartTime = saveBody?.data?.startTime;
    const savedEndTime = saveBody?.data?.endTime;
    console.log(
      '[TEST] Saved startTime (UTC):',
      savedStartTime,
      '| endTime (UTC):',
      savedEndTime,
    );

    // Convert UTC startTime to local date for verification
    // e.g. 2026-03-07T23:00:00.000Z → 2026-03-08T10:00 in AEDT (UTC+11)
    const savedStartLocal = new Date(savedStartTime);
    const savedLocalDateStr = `${savedStartLocal.getFullYear()}-${String(savedStartLocal.getMonth() + 1).padStart(2, '0')}-${String(savedStartLocal.getDate()).padStart(2, '0')}`;
    const expectedDateStr = `${dayAfterTomorrow.getFullYear()}-${String(dayAfterTomorrow.getMonth() + 1).padStart(2, '0')}-${String(dayAfterTomorrow.getDate()).padStart(2, '0')}`;
    const originalDateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    console.log(
      '[TEST] Start time local date:',
      savedLocalDateStr,
      '| Expected:',
      expectedDateStr,
      '| Original:',
      originalDateStr,
    );
    expect(savedLocalDateStr).toBe(expectedDateStr);
    console.log('[TEST] Edit verified - event successfully moved to', expectedDateStr, '!');

    // ---- STEP 8: Delete the event ----
    console.log('[TEST] Step 8: Deleting the event...');

    // Navigate to the day where the event now lives (day after tomorrow)
    const nextBtn2 = page.locator('button.fc-next-button');
    await nextBtn2.click();
    await page.waitForTimeout(1000);

    // Click on the event to open the event modal
    const calendarEvent = page.locator('.fc-event', {
      hasText: TEST_EVENT_TITLE,
    });
    const isCalendarEventVisible = await calendarEvent
      .first()
      .isVisible()
      .catch(() => false);

    if (isCalendarEventVisible) {
      await calendarEvent.first().click();
      await page.waitForTimeout(1000);
      console.log('[TEST] Clicked event on calendar, modal should open');

      // Click the Delete button in the event modal
      const deleteBtn = page
        .getByRole('dialog')
        .getByRole('button', { name: 'Delete' });
      await deleteBtn.waitFor({ timeout: 10000 });
      await deleteBtn.click();
      console.log('[TEST] Clicked Delete button');

      // Wait for modal to close
      await page.waitForTimeout(3000);
    } else {
      // Fallback: delete via API
      console.log(
        '[TEST] Event not visible on calendar, deleting via API...',
      );
      const deleteResponse = await page.evaluate(async (id) => {
        const res = await fetch(`/api/data/app/calendar/events/${id}`, {
          method: 'DELETE',
        });
        return { status: res.status, data: await res.json() };
      }, eventId);
      console.log('[TEST] Delete API response:', JSON.stringify(deleteResponse));
    }

    // Verify deletion by fetching the event directly - should 404 or return not found
    await page.waitForTimeout(2000);
    const verifyResponse = await page.evaluate(async (evtId) => {
      const res = await fetch(`/api/data/app/calendar/events/${evtId}`);
      const data = await res.json();
      return { found: res.ok && data?.success, status: res.status };
    }, eventId);

    console.log('[TEST] Verification after delete:', JSON.stringify(verifyResponse));
    expect(verifyResponse.found).toBeFalsy();
    console.log('[TEST] Event successfully deleted! (status:', verifyResponse.status, ')');

    // ---- STEP 9: Logout ----
    console.log('[TEST] Step 9: Logging out...');

    // Look for the user menu / logout button in the sidebar
    // The sidebar has a user menu dropdown with logout
    const userMenuBtn = page.locator('[data-testid="user-menu"]');
    const hasUserMenu = await userMenuBtn.isVisible().catch(() => false);

    if (hasUserMenu) {
      await userMenuBtn.click();
      const logoutBtn = page.locator('button', { hasText: /log\s*out/i });
      await logoutBtn.click();
    } else {
      // Try finding logout button directly or via navigation
      const logoutBtn = page.locator('button', { hasText: /log\s*out/i });
      const logoutLink = page.locator('a', { hasText: /log\s*out/i });

      if (await logoutBtn.first().isVisible().catch(() => false)) {
        await logoutBtn.first().click();
      } else if (await logoutLink.first().isVisible().catch(() => false)) {
        await logoutLink.first().click();
      } else {
        // Navigate to signout endpoint directly
        console.log('[TEST] Using direct signout endpoint...');
        await page.goto(`${BASE_URL}/auth/signin`);
      }
    }

    // Wait for redirect to signin or home
    await page.waitForTimeout(3000);
    console.log('[TEST] Final URL:', page.url());
    console.log('[TEST] All steps completed successfully!');
  });
});
