import { NextResponse } from 'next/server';
import InstagramConnection from '@/models/InstagramConnection';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * POST /api/instagram/disconnect
 *
 * Disconnects the Instagram account by marking the connection as inactive.
 */
export async function POST() {
  try {
    await connectToDatabase();

    // Find and deactivate the active connection
    const connection = await InstagramConnection.findOne({ isActive: true }).sort({
      connectedAt: -1,
    });

    if (!connection) {
      return NextResponse.json({
        success: true,
        message: 'No active connection to disconnect',
      });
    }

    // Mark as inactive (soft delete)
    connection.isActive = false;
    await connection.save();

    console.log('[DBG][instagram/disconnect] Disconnected @' + connection.instagramUsername);

    return NextResponse.json({
      success: true,
      message: `Disconnected @${connection.instagramUsername}`,
    });
  } catch (error) {
    console.error('[DBG][instagram/disconnect] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect',
      },
      { status: 500 }
    );
  }
}
