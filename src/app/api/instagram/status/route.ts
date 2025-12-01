import { NextResponse } from 'next/server';
import InstagramConnection from '@/models/InstagramConnection';
import { connectToDatabase } from '@/lib/mongodb';
import { isTokenExpiringSoon, refreshLongLivedToken, calculateTokenExpiry } from '@/lib/instagram';

/**
 * GET /api/instagram/status
 *
 * Returns the current Instagram connection status.
 * If a connection exists and token is expiring soon, refreshes it.
 */
export async function GET() {
  try {
    await connectToDatabase();

    // Get the most recent active connection
    // In a real app with auth, you'd filter by expertId
    const connection = await InstagramConnection.findOne({ isActive: true }).sort({
      connectedAt: -1,
    });

    if (!connection) {
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
        },
      });
    }

    // Check if token needs refresh
    if (isTokenExpiringSoon(connection.tokenExpiresAt)) {
      console.log('[DBG][instagram/status] Token expiring soon, refreshing...');
      try {
        const newToken = await refreshLongLivedToken(connection.accessToken);
        connection.accessToken = newToken.access_token;
        connection.tokenExpiresAt = calculateTokenExpiry(newToken.expires_in);
        await connection.save();
        console.log('[DBG][instagram/status] Token refreshed');
      } catch (refreshError) {
        console.error('[DBG][instagram/status] Failed to refresh token:', refreshError);
        // Token might be invalid, mark connection as inactive
        connection.isActive = false;
        await connection.save();
        return NextResponse.json({
          success: true,
          data: {
            connected: false,
            error: 'Token expired, please reconnect',
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        instagramUsername: connection.instagramUsername,
        instagramUserId: connection.instagramUserId,
        facebookPageName: connection.facebookPageName,
        profilePictureUrl: connection.profilePictureUrl,
        followersCount: connection.followersCount,
        connectedAt: connection.connectedAt,
        tokenExpiresAt: connection.tokenExpiresAt,
      },
    });
  } catch (error) {
    console.error('[DBG][instagram/status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get status',
      },
      { status: 500 }
    );
  }
}
