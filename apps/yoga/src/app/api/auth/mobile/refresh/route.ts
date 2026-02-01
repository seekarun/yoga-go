/**
 * POST /api/auth/mobile/refresh
 * Refresh access token using Cognito refresh token
 */
import { NextResponse } from 'next/server';
import { refreshTokens, getCognitoErrorMessage, isCognitoError } from '@/lib/cognito-auth';
import { getAccessTokenVerifier } from '@/lib/cognito';

interface RefreshRequestBody {
  refreshToken: string;
}

export async function POST(request: Request) {
  console.log('[DBG][mobile/refresh] ========== TOKEN REFRESH ATTEMPT ==========');

  try {
    const body: RefreshRequestBody = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'Refresh token is required.' },
        { status: 400 }
      );
    }

    // Get the user's cognitoSub from the current access token (if provided)
    // or from a separate field in the request
    let cognitoSub: string | undefined;

    // Try to get cognitoSub from Authorization header (existing access token, even if expired)
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const accessToken = authHeader.substring(7);
      try {
        // Try to decode the token without verification (it might be expired)
        const parts = accessToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          cognitoSub = payload.sub;
          console.log('[DBG][mobile/refresh] Got cognitoSub from access token:', cognitoSub);
        }
      } catch {
        console.log('[DBG][mobile/refresh] Could not decode access token');
      }
    }

    // If no cognitoSub from header, try to verify and extract from a valid token
    if (!cognitoSub) {
      const verifier = getAccessTokenVerifier();
      if (verifier && authHeader?.startsWith('Bearer ')) {
        try {
          const payload = await verifier.verify(authHeader.substring(7));
          cognitoSub = payload.sub;
        } catch {
          // Token might be expired, that's okay for refresh
        }
      }
    }

    // If still no cognitoSub, check request body
    const bodyWithSub = body as RefreshRequestBody & { cognitoSub?: string };
    if (!cognitoSub && bodyWithSub.cognitoSub) {
      cognitoSub = bodyWithSub.cognitoSub;
    }

    if (!cognitoSub) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Unable to identify user. Please include cognitoSub in request body or Authorization header.',
        },
        { status: 400 }
      );
    }

    console.log('[DBG][mobile/refresh] Refreshing tokens for:', cognitoSub);

    const result = await refreshTokens({
      refreshToken,
      cognitoSub,
    });

    if (!result.success || !result.accessToken) {
      return NextResponse.json({ success: false, message: result.message }, { status: 401 });
    }

    console.log('[DBG][mobile/refresh] Token refresh successful');

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully.',
      accessToken: result.accessToken,
      expiresIn: result.expiresIn || 3600,
    });
  } catch (error) {
    console.error('[DBG][mobile/refresh] Error:', error);

    if (isCognitoError(error, 'NotAuthorizedException')) {
      return NextResponse.json(
        { success: false, message: 'Refresh token is invalid or expired. Please log in again.' },
        { status: 401 }
      );
    }

    const message = getCognitoErrorMessage(error);
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
