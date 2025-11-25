import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PendingAuth } from '@/models/PendingAuth';

/**
 * GET /api/auth/pending-auth/[token]
 *
 * Called by Auth0 Post-Login Action to validate auth_token and retrieve role.
 * This endpoint is secured by checking the Auth0 Action secret.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: authToken } = await params;

    // Security: Verify request is from Auth0 Action
    const actionSecret = request.headers.get('x-action-secret');
    if (actionSecret !== process.env.AUTH0_ACTION_SECRET) {
      console.error('[pending-auth-api] Unauthorized request - invalid action secret');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!authToken) {
      return NextResponse.json({ success: false, error: 'Token required' }, { status: 400 });
    }

    await connectToDatabase();

    const pendingAuth = await PendingAuth.findById(authToken);

    if (!pendingAuth) {
      return NextResponse.json(
        { success: false, error: 'Token not found or expired' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        role: pendingAuth.role,
      },
    });
  } catch (error) {
    console.error('[pending-auth-api] Error validating token:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
