/**
 * Google Calendar Status Route
 * GET /api/auth/google-calendar/status - Get connection status
 * DELETE /api/auth/google-calendar/status - Disconnect Google account
 */

import { NextResponse } from 'next/server';
import { getSession, getUserByCognitoSub } from '@/lib/auth';
import { getGoogleAccountInfo, disconnectGoogle } from '@/lib/google-auth';

export async function GET() {
  console.log('[DBG][google-status] Getting Google connection status');

  try {
    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user to find their expert profile ID
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' },
        { status: 403 }
      );
    }

    const info = await getGoogleAccountInfo(user.expertProfile);

    return NextResponse.json({
      success: true,
      data: info,
    });
  } catch (error) {
    console.error('[DBG][google-status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get status',
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  console.log('[DBG][google-status] Disconnecting Google account');

  try {
    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user to find their expert profile ID
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' },
        { status: 403 }
      );
    }

    await disconnectGoogle(user.expertProfile);

    return NextResponse.json({
      success: true,
      message: 'Google account disconnected',
    });
  } catch (error) {
    console.error('[DBG][google-status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect',
      },
      { status: 500 }
    );
  }
}
