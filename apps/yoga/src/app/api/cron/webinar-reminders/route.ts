/**
 * Webinar Reminders Cron Job
 * GET /api/cron/webinar-reminders
 *
 * Sends reminder emails to registered users:
 * - 24 hours before: "Day before" reminder
 * - 1 hour before: "Starting soon" reminder
 *
 * Runs every 15 minutes via Vercel Cron.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import * as webinarRegistrationRepository from '@/lib/repositories/webinarRegistrationRepository';
import { getTenantById, getAllTenants } from '@/lib/repositories/tenantRepository';
import {
  sendWebinarReminderEmail,
  getFromEmailForExpert,
  sendExpertNotificationEmail,
} from '@/lib/email';
import type { Webinar } from '@/types';

/**
 * Cross-tenant helper to get all webinars with sessions in a time range
 * Used by cron jobs that need to process reminders across all tenants
 */
async function getAllWebinarsWithSessionsInRange(
  startFrom: string,
  startTo: string
): Promise<Webinar[]> {
  console.log('[DBG][cron-webinar-reminders] Getting webinars across all tenants');
  const tenants = await getAllTenants();
  const allWebinars: Webinar[] = [];

  for (const tenant of tenants) {
    const webinars = await webinarRepository.getWebinarsWithSessionsInRange(
      tenant.id,
      startFrom,
      startTo
    );
    allWebinars.push(...webinars);
  }

  console.log(
    '[DBG][cron-webinar-reminders] Found',
    allWebinars.length,
    'webinars across all tenants'
  );
  return allWebinars;
}

interface ReminderResult {
  webinarId: string;
  sessionId: string;
  reminderType: 'dayBefore' | 'hourBefore';
  sent: number;
  failed: number;
}

export async function GET(request: NextRequest) {
  console.log('[DBG][cron-webinar-reminders] Cron job started');

  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In production, require authorization
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[DBG][cron-webinar-reminders] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const results: ReminderResult[] = [];

    // Check for day-before reminders (sessions starting in 23-25 hours)
    const dayBeforeStart = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
    const dayBeforeEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

    console.log(
      '[DBG][cron-webinar-reminders] Checking day-before reminders for sessions between:',
      dayBeforeStart,
      'and',
      dayBeforeEnd
    );

    const dayBeforeWebinars = await getAllWebinarsWithSessionsInRange(dayBeforeStart, dayBeforeEnd);

    for (const webinar of dayBeforeWebinars) {
      const sessionsInRange =
        webinar.sessions?.filter(
          s => s.startTime >= dayBeforeStart && s.startTime <= dayBeforeEnd
        ) || [];

      for (const session of sessionsInRange) {
        const result = await sendRemindersForSession(
          webinar.id,
          webinar.expertId,
          webinar.title,
          session,
          'dayBefore'
        );
        results.push(result);
      }
    }

    // Check for hour-before reminders (sessions starting in 45-75 minutes)
    const hourBeforeStart = new Date(now.getTime() + 45 * 60 * 1000).toISOString();
    const hourBeforeEnd = new Date(now.getTime() + 75 * 60 * 1000).toISOString();

    console.log(
      '[DBG][cron-webinar-reminders] Checking hour-before reminders for sessions between:',
      hourBeforeStart,
      'and',
      hourBeforeEnd
    );

    const hourBeforeWebinars = await getAllWebinarsWithSessionsInRange(
      hourBeforeStart,
      hourBeforeEnd
    );

    for (const webinar of hourBeforeWebinars) {
      const sessionsInRange =
        webinar.sessions?.filter(
          s => s.startTime >= hourBeforeStart && s.startTime <= hourBeforeEnd
        ) || [];

      for (const session of sessionsInRange) {
        const result = await sendRemindersForSession(
          webinar.id,
          webinar.expertId,
          webinar.title,
          session,
          'hourBefore'
        );
        results.push(result);
      }
    }

    // Summarize results
    const totalSent = results.reduce((sum, r) => sum + r.sent, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

    console.log(
      '[DBG][cron-webinar-reminders] Completed. Sent:',
      totalSent,
      'Failed:',
      totalFailed
    );

    return NextResponse.json({
      success: true,
      message: `Sent ${totalSent} reminders, ${totalFailed} failed`,
      results,
      summary: {
        totalSent,
        totalFailed,
        sessionsProcessed: results.length,
      },
    });
  } catch (error) {
    console.error('[DBG][cron-webinar-reminders] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

interface SessionInfo {
  id: string;
  title: string;
  startTime: string;
  duration: number;
  googleMeetLink?: string;
  zoomMeetingLink?: string;
}

async function sendRemindersForSession(
  webinarId: string,
  expertId: string,
  webinarTitle: string,
  session: SessionInfo,
  reminderType: 'dayBefore' | 'hourBefore'
): Promise<ReminderResult> {
  console.log(
    '[DBG][cron-webinar-reminders] Sending',
    reminderType,
    'reminders for session:',
    session.id
  );

  const result: ReminderResult = {
    webinarId,
    sessionId: session.id,
    reminderType,
    sent: 0,
    failed: 0,
  };

  try {
    // Get registrations that need this reminder (expertId is tenantId)
    const registrations = await webinarRegistrationRepository.getRegistrationsNeedingReminder(
      expertId,
      webinarId,
      reminderType
    );

    console.log(
      '[DBG][cron-webinar-reminders] Found',
      registrations.length,
      'registrations needing',
      reminderType,
      'reminder'
    );

    if (registrations.length === 0) {
      return result;
    }

    // Get the from email for the expert (now includes expert name)
    const fromEmail = await getFromEmailForExpert(expertId);

    // Fetch tenant for branding
    const tenant = await getTenantById(expertId);

    // Send reminders to each participant individually
    for (const registration of registrations) {
      if (!registration.userEmail) {
        console.warn('[DBG][cron-webinar-reminders] No email for registration:', registration.id);
        result.failed++;
        continue;
      }

      try {
        await sendWebinarReminderEmail({
          to: registration.userEmail,
          from: fromEmail,
          customerName: registration.userName || 'Yoga Enthusiast',
          webinarTitle,
          webinarId,
          sessionTitle: session.title,
          startTime: session.startTime,
          duration: session.duration,
          meetLink: session.googleMeetLink,
          zoomLink: session.zoomMeetingLink,
          reminderType,
          expert: tenant
            ? {
                id: tenant.id,
                name: tenant.name,
                logo: tenant.customLandingPage?.branding?.logo,
                avatar: tenant.avatar,
                primaryColor: tenant.customLandingPage?.theme?.primaryColor,
                palette: tenant.customLandingPage?.theme?.palette,
              }
            : undefined,
        });

        // Mark reminder as sent (expertId is tenantId)
        await webinarRegistrationRepository.markReminderSent(
          expertId,
          webinarId,
          registration.userId,
          registration.id,
          reminderType
        );

        result.sent++;
      } catch (sendError) {
        console.error(
          '[DBG][cron-webinar-reminders] Failed to send reminder to:',
          registration.userEmail,
          sendError
        );
        result.failed++;
      }
    }

    // Send notification email to expert
    const expertNotificationEmail = tenant?.platformPreferences?.defaultEmail;
    if (expertNotificationEmail && result.sent > 0) {
      await sendExpertNotificationEmail({
        to: expertNotificationEmail,
        from: fromEmail,
        notificationType: 'reminder_sent',
        webinarTitle,
        webinarId,
        recipientCount: result.sent,
        failedCount: result.failed,
        sessionTitle: session.title,
        reminderType,
        expert: tenant
          ? {
              id: tenant.id,
              name: tenant.name,
              logo: tenant.customLandingPage?.branding?.logo,
              avatar: tenant.avatar,
              primaryColor: tenant.customLandingPage?.theme?.primaryColor,
              palette: tenant.customLandingPage?.theme?.palette,
            }
          : undefined,
      });
    }
  } catch (error) {
    console.error('[DBG][cron-webinar-reminders] Error processing session:', session.id, error);
    result.failed++;
  }

  return result;
}
