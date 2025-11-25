import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import User from '@/models/User';

export async function PATCH(request: NextRequest) {
  try {
    console.log('[DBG][api/user/preferences] PATCH request received');

    // Check authentication
    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      console.log('[DBG][api/user/preferences] Unauthorized - no session');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const cognitoSub = session.user.cognitoSub;
    console.log('[DBG][api/user/preferences] Cognito Sub:', cognitoSub);

    // Parse request body
    const body = await request.json();
    const { autoPlayEnabled } = body;

    console.log('[DBG][api/user/preferences] Update request:', { autoPlayEnabled });

    // Validate input
    if (typeof autoPlayEnabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Invalid autoPlayEnabled value' },
        { status: 400 }
      );
    }

    // Update user preferences
    const user = await User.findOneAndUpdate(
      { cognitoSub },
      { 'preferences.autoPlayEnabled': autoPlayEnabled },
      { new: true }
    );

    if (!user) {
      console.log('[DBG][api/user/preferences] User not found');
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    console.log('[DBG][api/user/preferences] Preferences updated successfully');

    return NextResponse.json({
      success: true,
      data: {
        autoPlayEnabled: user.preferences.autoPlayEnabled,
      },
    });
  } catch (error) {
    console.error('[DBG][api/user/preferences] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    console.log('[DBG][api/user/preferences] GET request received');

    // Check authentication
    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      console.log('[DBG][api/user/preferences] Unauthorized - no session');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const cognitoSub = session.user.cognitoSub;
    console.log('[DBG][api/user/preferences] Cognito Sub:', cognitoSub);

    // Get user preferences
    const user = await User.findOne({ cognitoSub }).select('preferences');

    if (!user) {
      console.log('[DBG][api/user/preferences] User not found');
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    console.log('[DBG][api/user/preferences] Preferences retrieved successfully');

    return NextResponse.json({
      success: true,
      data: {
        autoPlayEnabled: user.preferences?.autoPlayEnabled ?? false,
      },
    });
  } catch (error) {
    console.error('[DBG][api/user/preferences] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get preferences' },
      { status: 500 }
    );
  }
}
