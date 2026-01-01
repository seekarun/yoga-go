/**
 * Zoom Webhook Handler
 *
 * Receives Zoom webhook events and processes them:
 * - endpoint.url_validation: Validates the webhook URL (required by Zoom)
 * - recording.completed: Queues recording for import to Cloudflare Stream
 *
 * Docs: https://developers.zoom.us/docs/api/webhooks/
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import * as expertZoomAuthRepository from '@/lib/repositories/expertZoomAuthRepository';
import * as recordingRepository from '@/lib/repositories/recordingRepository';
import { v4 as uuidv4 } from 'uuid';

// SQS client
const sqs = new SQSClient({ region: 'ap-southeast-2' });

// Zoom webhook secret token (from Zoom App Marketplace)
const ZOOM_WEBHOOK_SECRET_TOKEN = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;

// SQS queue URL for async processing (to be added later)
const RECORDING_QUEUE_URL = process.env.RECORDING_QUEUE_URL;

// Types for Zoom webhook payloads
interface ZoomWebhookPayload {
  event: string;
  event_ts: number;
  payload: {
    plainToken?: string; // For URL validation
    account_id?: string;
    object?: ZoomRecordingObject;
  };
}

interface ZoomRecordingObject {
  id: string; // Meeting ID
  uuid: string;
  host_id: string;
  host_email: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone: string;
  total_size: number;
  recording_count: number;
  recording_files: ZoomRecordingFile[];
  password?: string;
  share_url?: string;
}

interface ZoomRecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string; // 'MP4', 'M4A', 'CHAT', 'TRANSCRIPT', etc.
  file_extension: string;
  file_size: number;
  play_url?: string;
  download_url: string;
  status: string;
  recording_type: string; // 'shared_screen_with_speaker_view', 'active_speaker', etc.
}

/**
 * Verify Zoom webhook signature
 * https://developers.zoom.us/docs/api/webhooks/#verify-webhook-events
 */
function verifyWebhookSignature(body: string, timestamp: string, signature: string): boolean {
  if (!ZOOM_WEBHOOK_SECRET_TOKEN) {
    console.error('[DBG][zoom-webhook] ZOOM_WEBHOOK_SECRET_TOKEN not configured');
    return false;
  }

  // Create the message to sign: v0:{timestamp}:{body}
  const message = `v0:${timestamp}:${body}`;

  // Calculate HMAC-SHA256
  const expectedSignature =
    'v0=' + crypto.createHmac('sha256', ZOOM_WEBHOOK_SECRET_TOKEN).update(message).digest('hex');

  // Constant-time comparison
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

/**
 * Handle URL validation challenge from Zoom
 * Required for webhook endpoint registration
 */
function handleUrlValidation(plainToken: string): NextResponse {
  console.log('[DBG][zoom-webhook] Handling URL validation challenge');

  if (!ZOOM_WEBHOOK_SECRET_TOKEN) {
    console.error('[DBG][zoom-webhook] ZOOM_WEBHOOK_SECRET_TOKEN not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // Hash the plain token with our secret
  const encryptedToken = crypto
    .createHmac('sha256', ZOOM_WEBHOOK_SECRET_TOKEN)
    .update(plainToken)
    .digest('hex');

  console.log('[DBG][zoom-webhook] URL validation successful');

  return NextResponse.json({
    plainToken,
    encryptedToken,
  });
}

/**
 * Handle recording.completed event
 * Creates a recording record and queues for processing
 */
async function handleRecordingCompleted(payload: ZoomRecordingObject): Promise<void> {
  console.log('[DBG][zoom-webhook] Processing recording.completed event');
  console.log('[DBG][zoom-webhook] Meeting ID:', payload.id);
  console.log('[DBG][zoom-webhook] Host email:', payload.host_email);
  console.log('[DBG][zoom-webhook] Topic:', payload.topic);
  console.log('[DBG][zoom-webhook] Recording files:', payload.recording_files?.length);

  // Find the expert by their Zoom email (uses ZOOM_EMAIL lookup)
  const zoomAuth = await expertZoomAuthRepository.getZoomAuthByEmail(payload.host_email);

  if (!zoomAuth) {
    console.log('[DBG][zoom-webhook] No expert found for Zoom email:', payload.host_email);
    // This might be a recording from a non-expert user, ignore it
    return;
  }

  console.log('[DBG][zoom-webhook] Found expert:', zoomAuth.expertId);

  // Find the best recording file (prefer shared_screen_with_speaker_view MP4)
  const recordingFile = findBestRecordingFile(payload.recording_files);

  if (!recordingFile) {
    console.log('[DBG][zoom-webhook] No suitable recording file found');
    return;
  }

  console.log(
    '[DBG][zoom-webhook] Selected recording:',
    recordingFile.recording_type,
    recordingFile.file_type
  );

  // Check if we already have this recording (by Zoom meeting ID)
  const existing = await recordingRepository.findRecordingBySourceId(
    zoomAuth.expertId,
    payload.uuid
  );

  if (existing) {
    console.log('[DBG][zoom-webhook] Recording already exists:', existing.id);
    return;
  }

  // Create recording record in DynamoDB
  const recordingId = uuidv4();
  const recording = await recordingRepository.createRecording({
    id: recordingId,
    expertId: zoomAuth.expertId,
    source: 'zoom',
    sourceId: payload.uuid,
    sourceMeetingTopic: payload.topic,
    title: payload.topic || 'Zoom Recording',
    duration: payload.duration * 60, // Convert minutes to seconds
    fileSize: recordingFile.file_size,
    downloadUrl: recordingFile.download_url,
    recordedAt: payload.start_time,
  });

  console.log('[DBG][zoom-webhook] Created recording record:', recording.id);

  // Queue for async processing
  if (RECORDING_QUEUE_URL) {
    await queueRecordingForProcessing({
      recordingId: recording.id,
      expertId: zoomAuth.expertId,
      downloadUrl: recordingFile.download_url,
      accessToken: zoomAuth.accessToken,
    });
    console.log('[DBG][zoom-webhook] Queued recording for processing');
  } else {
    console.log('[DBG][zoom-webhook] SQS queue not configured, skipping async processing');
    // For now, we'll implement direct processing later or use a cron job
  }
}

/**
 * Find the best recording file from available options
 * Prioritizes MP4 video with speaker view
 */
function findBestRecordingFile(files: ZoomRecordingFile[] | undefined): ZoomRecordingFile | null {
  if (!files || files.length === 0) {
    return null;
  }

  // Priority order for recording types
  const typePriority = [
    'shared_screen_with_speaker_view',
    'shared_screen_with_gallery_view',
    'speaker_view',
    'gallery_view',
    'shared_screen',
    'active_speaker',
  ];

  // Filter to MP4 files only
  const mp4Files = files.filter(f => f.file_type === 'MP4');

  if (mp4Files.length === 0) {
    return null;
  }

  // Sort by priority
  mp4Files.sort((a, b) => {
    const aPriority = typePriority.indexOf(a.recording_type);
    const bPriority = typePriority.indexOf(b.recording_type);
    // If not in priority list, put at end
    const aIndex = aPriority === -1 ? typePriority.length : aPriority;
    const bIndex = bPriority === -1 ? typePriority.length : bPriority;
    return aIndex - bIndex;
  });

  return mp4Files[0];
}

/**
 * Queue recording for async processing via SQS
 */
async function queueRecordingForProcessing(params: {
  recordingId: string;
  expertId: string;
  downloadUrl: string;
  accessToken: string;
}): Promise<void> {
  if (!RECORDING_QUEUE_URL) {
    console.log('[DBG][zoom-webhook] SQS queue URL not configured, skipping');
    return;
  }

  console.log('[DBG][zoom-webhook] Queueing recording for processing:', {
    recordingId: params.recordingId,
    expertId: params.expertId,
  });

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: RECORDING_QUEUE_URL,
      MessageBody: JSON.stringify(params),
      MessageAttributes: {
        recordingId: {
          DataType: 'String',
          StringValue: params.recordingId,
        },
        expertId: {
          DataType: 'String',
          StringValue: params.expertId,
        },
      },
    })
  );

  console.log('[DBG][zoom-webhook] Recording queued successfully');
}

/**
 * POST /api/webhooks/zoom
 * Receives all Zoom webhook events
 */
export async function POST(request: NextRequest) {
  console.log('[DBG][zoom-webhook] Received webhook request');

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const body: ZoomWebhookPayload = JSON.parse(rawBody);

    console.log('[DBG][zoom-webhook] Event type:', body.event);

    // Handle URL validation challenge (no signature verification needed)
    if (body.event === 'endpoint.url_validation') {
      const plainToken = body.payload?.plainToken;
      if (!plainToken) {
        return NextResponse.json({ error: 'Missing plainToken' }, { status: 400 });
      }
      return handleUrlValidation(plainToken);
    }

    // For all other events, verify the webhook signature
    const timestamp = request.headers.get('x-zm-request-timestamp');
    const signature = request.headers.get('x-zm-signature');

    if (!timestamp || !signature) {
      console.error('[DBG][zoom-webhook] Missing signature headers');
      return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 });
    }

    // Verify signature
    if (!verifyWebhookSignature(rawBody, timestamp, signature)) {
      console.error('[DBG][zoom-webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Check timestamp to prevent replay attacks (5 minute window)
    const eventTimestamp = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - eventTimestamp) > 300) {
      console.error('[DBG][zoom-webhook] Timestamp too old');
      return NextResponse.json({ error: 'Request expired' }, { status: 401 });
    }

    // Handle different event types
    switch (body.event) {
      case 'recording.completed':
        if (body.payload?.object) {
          await handleRecordingCompleted(body.payload.object);
        }
        break;

      case 'recording.transcript_completed':
        // Could handle transcripts in the future
        console.log('[DBG][zoom-webhook] Transcript completed (not handled)');
        break;

      default:
        console.log('[DBG][zoom-webhook] Unhandled event type:', body.event);
    }

    // Always return 200 OK to Zoom (even for unhandled events)
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DBG][zoom-webhook] Error processing webhook:', error);

    // Return 200 to prevent Zoom from retrying for parse errors
    // Log the error for investigation
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 200 });
  }
}

/**
 * GET /api/webhooks/zoom
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Zoom webhook endpoint is active',
    configured: !!ZOOM_WEBHOOK_SECRET_TOKEN,
  });
}
