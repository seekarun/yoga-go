import { NextResponse } from 'next/server';
import type { ApiResponse, SurveyResponseMetadata } from '@/types';
import * as surveyRepository from '@/lib/repositories/surveyRepository';
import * as surveyResponseRepository from '@/lib/repositories/surveyResponseRepository';
import { getSession } from '@/lib/auth';

type Params = { expertId: string; surveyId: string };

/**
 * Extract metadata from request headers (Vercel geolocation + browser info)
 */
function extractMetadata(request: Request): SurveyResponseMetadata {
  const headers = request.headers;

  // Get Vercel geolocation headers
  const country = headers.get('x-vercel-ip-country') || undefined;
  const countryRegion = headers.get('x-vercel-ip-country-region') || undefined;
  const city = headers.get('x-vercel-ip-city') || undefined;
  const timezone = headers.get('x-vercel-ip-timezone') || undefined;

  // Get IP and anonymize it (remove last octet for privacy)
  const forwardedFor = headers.get('x-forwarded-for');
  let ip: string | undefined;
  if (forwardedFor) {
    const fullIp = forwardedFor.split(',')[0].trim();
    // Anonymize IPv4: replace last octet with 0
    if (fullIp.includes('.')) {
      ip = fullIp.replace(/\.\d+$/, '.0');
    } else {
      // IPv6: truncate last segment
      ip = fullIp.replace(/:[^:]+$/, ':0');
    }
  }

  // Get user agent and parse it
  const userAgent = headers.get('user-agent') || undefined;
  let deviceType: SurveyResponseMetadata['deviceType'] = 'unknown';
  let browser: string | undefined;
  let os: string | undefined;

  if (userAgent) {
    // Detect device type
    if (/Mobile|Android.*Mobile|iPhone|iPod/.test(userAgent)) {
      deviceType = 'mobile';
    } else if (/iPad|Android(?!.*Mobile)|Tablet/.test(userAgent)) {
      deviceType = 'tablet';
    } else if (/Windows|Macintosh|Linux/.test(userAgent)) {
      deviceType = 'desktop';
    }

    // Detect browser
    if (userAgent.includes('Firefox/')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Edg/')) {
      browser = 'Edge';
    } else if (userAgent.includes('Chrome/')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
    } else if (userAgent.includes('Opera') || userAgent.includes('OPR/')) {
      browser = 'Opera';
    }

    // Detect OS
    if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac OS X') || userAgent.includes('Macintosh')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      os = 'iOS';
    }
  }

  // Get language preference
  const acceptLanguage = headers.get('accept-language');
  const language = acceptLanguage ? acceptLanguage.split(',')[0].trim() : undefined;

  // Get referrer
  const referrer = headers.get('referer') || undefined;

  return {
    country,
    countryRegion,
    city,
    timezone,
    ip,
    userAgent,
    deviceType,
    browser,
    os,
    language,
    referrer,
  };
}

/**
 * POST /data/experts/[expertId]/survey/[surveyId]/response
 * Submit a response to a specific survey (public endpoint)
 */
export async function POST(request: Request, { params }: { params: Promise<Params> }) {
  const { expertId, surveyId } = await params;
  console.log(
    `[DBG][survey/response/route.ts] POST /data/experts/${expertId}/survey/${surveyId}/response called`
  );

  try {
    // Verify the survey exists and is active
    const survey = await surveyRepository.getSurveyById(expertId, surveyId);

    if (!survey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Survey not found',
        },
        { status: 404 }
      );
    }

    if (survey.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: 'Survey is not accepting responses',
        },
        { status: 400 }
      );
    }

    // Get user session (if authenticated)
    const session = await getSession();
    const userId = session?.user?.cognitoSub;

    // Parse request body
    const body = await request.json();
    const { contactInfo, answers } = body;

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. answers array is required.',
        },
        { status: 400 }
      );
    }

    // Extract metadata from request headers (geolocation, device info, etc.)
    const metadata = extractMetadata(request);
    console.log(`[DBG][survey/response/route.ts] Extracted metadata:`, metadata);

    // Create survey response using repository
    const surveyResponse = await surveyResponseRepository.createSurveyResponse(expertId, {
      surveyId,
      userId,
      contactInfo,
      answers,
      metadata,
      submittedAt: new Date().toISOString(),
    });

    // Increment response count on the survey
    await surveyRepository.incrementResponseCount(expertId, surveyId);

    console.log(`[DBG][survey/response/route.ts] Created survey response: ${surveyResponse.id}`);

    const response: ApiResponse<{ responseId: string }> = {
      success: true,
      data: { responseId: surveyResponse.id },
      message: 'Survey response submitted successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[DBG][survey/response/route.ts] Error submitting survey response:`, error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to submit survey response',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
