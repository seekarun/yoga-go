import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getFacebookPages,
  getInstagramAccount,
  calculateTokenExpiry,
} from '@/lib/instagram';
import InstagramConnection from '@/models/InstagramConnection';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * GET /api/instagram/callback
 *
 * Handles the OAuth callback from Facebook after user authorizes the app.
 * Exchanges the code for tokens and stores the Instagram connection.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('[DBG][instagram/callback] OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/social?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code) {
      console.error('[DBG][instagram/callback] No code provided');
      return NextResponse.redirect(
        new URL('/social?error=No authorization code received', request.url)
      );
    }

    // Build the redirect URI (must match exactly what was used in /connect)
    const baseUrl = process.env.AUTH0_BASE_URL || 'http://localhost:3111';
    const redirectUri = `${baseUrl}/api/instagram/callback`;

    console.log('[DBG][instagram/callback] Exchanging code for token...');

    // Step 1: Exchange code for short-lived token
    const shortLivedToken = await exchangeCodeForToken(code, redirectUri);
    console.log('[DBG][instagram/callback] Got short-lived token');

    // Step 2: Exchange for long-lived token (valid for 60 days)
    const longLivedToken = await getLongLivedToken(shortLivedToken.access_token);
    console.log('[DBG][instagram/callback] Got long-lived token');

    // Step 3: Get Facebook Pages with Instagram Business accounts
    const pages = await getFacebookPages(longLivedToken.access_token);
    console.log('[DBG][instagram/callback] Found pages:', pages.length);

    // Find a page with an Instagram Business account
    const pageWithInstagram = pages.find(page => page.instagram_business_account);

    if (!pageWithInstagram || !pageWithInstagram.instagram_business_account) {
      console.error('[DBG][instagram/callback] No Instagram Business account found');
      return NextResponse.redirect(
        new URL(
          '/social?error=No Instagram Business account found. Make sure your Instagram is connected to a Facebook Page.',
          request.url
        )
      );
    }

    // Step 4: Get Instagram account details
    const instagramUserId = pageWithInstagram.instagram_business_account.id;
    const instagramAccount = await getInstagramAccount(
      instagramUserId,
      pageWithInstagram.access_token
    );
    console.log('[DBG][instagram/callback] Instagram account:', instagramAccount.username);

    // Step 5: Store the connection in database
    await connectToDatabase();

    // Check if connection already exists
    const existingConnection = await InstagramConnection.findOne({
      instagramUserId,
    });

    const connectionData = {
      instagramUserId,
      instagramUsername: instagramAccount.username,
      facebookPageId: pageWithInstagram.id,
      facebookPageName: pageWithInstagram.name,
      accessToken: pageWithInstagram.access_token, // Use page token for publishing
      tokenExpiresAt: calculateTokenExpiry(longLivedToken.expires_in),
      connectedAt: new Date().toISOString(),
      isActive: true,
      profilePictureUrl: instagramAccount.profile_picture_url,
      followersCount: instagramAccount.followers_count,
    };

    if (existingConnection) {
      // Update existing connection
      await InstagramConnection.findByIdAndUpdate(existingConnection._id, connectionData);
      console.log('[DBG][instagram/callback] Updated existing connection');
    } else {
      // Create new connection
      await InstagramConnection.create({
        _id: uuidv4(),
        ...connectionData,
      });
      console.log('[DBG][instagram/callback] Created new connection');
    }

    // Redirect to social page with success
    return NextResponse.redirect(
      new URL(`/social?success=true&username=${instagramAccount.username}`, request.url)
    );
  } catch (error) {
    console.error('[DBG][instagram/callback] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.redirect(
      new URL(`/social?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
