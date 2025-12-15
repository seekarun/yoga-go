/**
 * Zoom Status Route
 * GET /api/auth/zoom/status - Get connection status
 * DELETE /api/auth/zoom/status - Disconnect Zoom account
 */

import { NextResponse } from 'next/server';
import { getSession, getUserByCognitoSub } from '@/lib/auth';
import { getZoomAccountInfo, disconnectZoom } from '@/lib/zoom-auth';

export async function GET() {
  console.log('[DBG][zoom-status] Getting Zoom connection status');

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

    const info = await getZoomAccountInfo(user.expertProfile);

    return NextResponse.json({
      success: true,
      data: info,
    });
  } catch (error) {
    console.error('[DBG][zoom-status] Error:', error);
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
  console.log('[DBG][zoom-status] Disconnecting Zoom account');

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

    await disconnectZoom(user.expertProfile);

    return NextResponse.json({
      success: true,
      message: 'Zoom account disconnected',
    });
  } catch (error) {
    console.error('[DBG][zoom-status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect',
      },
      { status: 500 }
    );
  }
}
