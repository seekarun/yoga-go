# Testing Expert Authorization Fixes

## Overview

This document explains how to diagnose and fix the issue where clicking "Manage Courses" or "View Analytics" redirects to the home page.

## What Was Fixed

### Authorization Security Improvements

All expert dashboard pages now properly validate:

1. **User is authenticated**
2. **User has "expert" role**
3. **NEW: User has completed expert profile setup** (expertProfile field exists)
4. **NEW: User owns the expert profile** (redirect to their own if accessing another's)

### Files Updated

- `src/app/srv/[expertId]/page.tsx` - Main expert dashboard
- `src/app/srv/[expertId]/analytics/page.tsx` - Analytics page
- `src/app/srv/[expertId]/live/page.tsx` - Live sessions page
- `src/app/srv/page.tsx` - Expert portal landing (improved error handling)

### New Tools Created

- `scripts/diagnose-user.js` - Diagnoses account issues
- `scripts/fix-expert-profile.js` - Auto-fixes broken expert profiles

---

## Step 1: Diagnose the Issue

Run the diagnostic script to check the state of your account:

```bash
node scripts/diagnose-user.js lotusyoga37@gmail.com
```

### Expected Output Examples

#### Case A: Missing Expert Profile (Most Likely)

```
🔍 DIAGNOSING USER ACCOUNT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: lotusyoga37@gmail.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  CHECKING USER DOCUMENT
✓ User found: abc123
  Role: expert
  Expert Profile: (not set)

⚠️  Expert profile NOT set (null/undefined)

DIAGNOSIS: Expert role assigned but profile not created
FIX: User needs to complete expert onboarding at /srv
```

**What this means:** Your account has the expert role but no expert profile was created.

**Fix:** Continue to Step 2A.

#### Case B: Broken Expert Link

```
2️⃣  CHECKING EXPERT PROFILE LINK
✓ Expert profile link set: lotus-yoga-old

3️⃣  CHECKING EXPERT DOCUMENT
❌ Expert document NOT found with _id: "lotus-yoga-old"
⚠️  Found orphaned expert document with different ID: "lotus-yoga"

DIAGNOSIS: Broken link - User points to wrong expert ID
FIX: Run fix script to update user.expertProfile to point to correct expert
```

**What this means:** Your user record points to an expert profile that doesn't exist, but another expert profile with a different ID exists.

**Fix:** Continue to Step 2B.

#### Case C: All Checks Passed

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ DIAGNOSIS: ALL CHECKS PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The user account is correctly configured.

If user is still experiencing issues:
1. Check browser console for JavaScript errors
2. Clear browser cache and cookies
3. Try logging out and logging back in
```

**What this means:** Database is correct, issue is likely browser-side.

**Fix:** Continue to Step 3.

---

## Step 2A: Fix Missing Expert Profile

If diagnostic shows **"Expert profile NOT set"**, run the auto-fix script.

### Dry Run First (Preview Changes)

```bash
node scripts/fix-expert-profile.js lotusyoga37@gmail.com --dry-run
```

This will show you what changes will be made without modifying the database.

### Apply the Fix

```bash
node scripts/fix-expert-profile.js lotusyoga37@gmail.com
```

You'll see output like:

```
🔧 EXPERT PROFILE FIX TOOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: lotusyoga37@gmail.com
Mode: LIVE (will modify database)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  ANALYZING USER ACCOUNT
✓ User found: abc123
  Role: expert
  Expert Profile: (not set)

2️⃣  ANALYZING EXPERT PROFILE
⚠️  No expert document found
📝 Expert profile will be created

3️⃣  PLANNED CHANGES

1. CREATE_EXPERT
   Collection: experts
   Document: lotus-yoga
   Action: Create new expert profile
   Name: Lotus Yoga
   Title: Yoga Expert

2. UPDATE_USER_EXPERT_LINK
   Collection: users
   Document: abc123
   Field: expertProfile
   From: (not set)
   To: lotus-yoga

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Apply these changes? (y/n):
```

Type `y` and press Enter.

### Expected Success Output

```
4️⃣  APPLYING CHANGES
✓ Created expert: lotus-yoga
✓ Updated user.expertProfile

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ALL CHANGES APPLIED SUCCESSFULLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next steps:
1. User should refresh the /srv page
2. Expert dashboard should now work correctly
3. Expert URL: /srv/lotus-yoga
```

---

## Step 2B: Fix Broken Expert Link

If diagnostic shows broken link or orphaned expert, run:

```bash
node scripts/fix-expert-profile.js lotusyoga37@gmail.com
```

The script will automatically detect and fix:

- Broken `user.expertProfile` links
- Mismatched `expert.userId` references
- Missing onboarding completion flags

---

## Step 3: Test in Browser

### 3.1 Clear Browser Cache

1. Open browser DevTools (F12 or Cmd+Option+I)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### 3.2 Test the Flow

1. **Navigate to Expert Portal:**

   ```
   http://localhost:3111/srv
   ```

2. **Expected Behavior:**
   - If profile exists: See dashboard with expert cards
   - If profile missing: See onboarding form

3. **Click "Manage Courses":**
   - Should navigate to `/srv/[your-expert-id]`
   - Should NOT redirect to home page

4. **Click "View Analytics":**
   - Should navigate to `/srv/[your-expert-id]/analytics`
   - Should NOT redirect to home page

5. **Click "Live Sessions" (new button in header):**
   - Should navigate to `/srv/[your-expert-id]/live`
   - Should see live sessions management page

### 3.3 Check Browser Console

If you still see redirects, check the browser console (F12 → Console tab) for log messages:

```
[DBG][expert-dashboard] Checking authorization for expertId: lotus-yoga
[DBG][expert-dashboard] User data: {role: 'expert', expertProfile: 'lotus-yoga'}
[DBG][expert-dashboard] Authorization check passed
```

Look for any error messages or unexpected redirects.

---

## Step 4: Verify Live Sessions Feature

Once the authorization is working:

### 4.1 Set Availability

1. Navigate to `/srv/[your-expert-id]/live`
2. Click "📅 Set Availability" button
3. Add weekly recurring slots (e.g., Monday 9:00-17:00)
4. Add one-time slots for specific dates
5. Save and verify they appear in the list

### 4.2 Test Student Booking

1. Open a new incognito window (or log out)
2. Navigate to `/app/live/book/[your-expert-id]`
3. You should see available time slots
4. Select a slot and complete booking (if logged in as student)

---

## Troubleshooting

### Issue: "Cannot read property 'expertProfile' of undefined"

**Cause:** Session expired or Auth0 token invalid

**Fix:**

```bash
# Log out and log back in
open http://localhost:3111/api/auth/logout
```

### Issue: Still redirecting to home page after fix

**Cause:** Browser cache not cleared

**Fix:**

1. Completely close and restart browser
2. Or use incognito/private window

### Issue: "Forbidden - You do not own this expert profile"

**Cause:** Trying to access another expert's dashboard

**Expected Behavior:** You'll be redirected to your own dashboard at `/srv/[your-expert-id]`

**Fix:** Check the URL - make sure you're using your own expert ID

### Issue: Diagnostic shows "User not found"

**Cause:** Email doesn't match any user in database or user never logged in

**Fix:**

1. Log in via Auth0 first: `http://localhost:3111/api/auth/login`
2. This will create the user record
3. Then run diagnostic again

---

## Summary of Changes

### Authorization Flow (All Expert Pages)

```
1. Check authentication → Not authenticated? → Redirect to /
2. Check role = 'expert' → Not expert? → Redirect to /
3. Check expertProfile exists → Missing? → Redirect to /srv (onboarding)
4. Check expertProfile === expertId → Mismatch? → Redirect to /srv/[own-id]
5. All checks passed → Show page
```

### Error Handling (/srv page)

- Shows clear error messages with retry/reset options
- Provides "Retry" button to refetch profile
- Provides "Reset & Re-onboard" button to clear state
- Provides "Back to App" link as escape hatch

### New Features

- "Live Sessions" button in expert dashboard header
- Availability management UI
- Time slot generation for 1:1 bookings
- Student booking interface

---

## Need Help?

If you're still experiencing issues after following these steps:

1. Share the output of the diagnostic script
2. Share any browser console errors
3. Check if you can access `/api/auth/me` and see your user data
4. Verify MongoDB connection is working

Contact support or check the logs for more details.
