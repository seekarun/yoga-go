import { NextResponse } from 'next/server';

/**
 * GET /api/meta-ads/test
 * Test Meta Ads API credentials without creating any ads
 */
export async function GET() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;
  const pageId = process.env.META_PAGE_ID;

  console.log('[DBG][meta-ads/test] Testing credentials...');

  // Check env vars are set
  const envStatus = {
    META_APP_ID: appId ? 'Set' : 'Missing',
    META_APP_SECRET: appSecret ? 'Set' : 'Missing',
    META_ACCESS_TOKEN: accessToken ? 'Set' : 'Missing',
    META_AD_ACCOUNT_ID: adAccountId ? `Set (${adAccountId})` : 'Missing',
    META_PAGE_ID: pageId ? `Set (${pageId})` : 'Missing',
  };

  if (!accessToken || !adAccountId) {
    return NextResponse.json({
      success: false,
      error: 'Missing required environment variables',
      details: envStatus,
    });
  }

  try {
    // Test 1: Verify access token
    console.log('[DBG][meta-ads/test] Verifying access token...');
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${appId}|${process.env.META_APP_SECRET}`
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid access token',
        details: tokenData.error,
      });
    }

    // Test 2: Get ad account info
    console.log('[DBG][meta-ads/test] Fetching ad account info...');
    const accountRes = await fetch(
      `https://graph.facebook.com/v21.0/${adAccountId}?fields=name,account_status,currency,timezone_name,amount_spent&access_token=${accessToken}`
    );
    const accountData = await accountRes.json();

    if (accountData.error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch ad account',
        details: accountData.error,
      });
    }

    // Test 3: Verify Page access (critical for creating ads)
    let pageData = null;
    let pageError = null;
    if (pageId) {
      console.log('[DBG][meta-ads/test] Verifying page access...');
      const pageRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}?fields=name,id,access_token&access_token=${accessToken}`
      );
      pageData = await pageRes.json();
      if (pageData.error) {
        pageError = pageData.error.message;
        pageData = null;
      }
    }

    // Test 4: List campaigns (won't create anything)
    console.log('[DBG][meta-ads/test] Listing campaigns...');
    const campaignsRes = await fetch(
      `https://graph.facebook.com/v21.0/${adAccountId}/campaigns?fields=name,status,objective&limit=5&access_token=${accessToken}`
    );
    const campaignsData = await campaignsRes.json();

    // Check for issues
    const issues: string[] = [];
    if (!pageId) issues.push('META_PAGE_ID not set - required for creating ads');
    if (pageError) issues.push(`Page error: ${pageError}`);
    if (!tokenData.data?.scopes?.includes('ads_management')) {
      issues.push('Token missing ads_management permission');
    }
    if (!tokenData.data?.scopes?.includes('pages_read_engagement')) {
      issues.push('Token missing pages_read_engagement permission (may need for page access)');
    }

    return NextResponse.json({
      success: issues.length === 0,
      message:
        issues.length === 0 ? 'Meta Ads API fully configured!' : 'Issues found - see details',
      issues: issues.length > 0 ? issues : undefined,
      envStatus,
      data: {
        token: {
          isValid: tokenData.data?.is_valid,
          expiresAt: tokenData.data?.expires_at
            ? new Date(tokenData.data.expires_at * 1000).toISOString()
            : 'Never',
          scopes: tokenData.data?.scopes,
        },
        adAccount: {
          id: accountData.id,
          name: accountData.name,
          status: accountData.account_status === 1 ? 'Active' : 'Inactive',
          currency: accountData.currency,
          timezone: accountData.timezone_name,
          totalSpent: accountData.amount_spent
            ? `${(parseInt(accountData.amount_spent) / 100).toFixed(2)} ${accountData.currency}`
            : '0',
        },
        page: pageData
          ? {
              id: pageData.id,
              name: pageData.name,
              hasPageAccessToken: !!pageData.access_token,
            }
          : { error: pageError || 'Not configured' },
        campaigns: campaignsData.data || [],
      },
    });
  } catch (error) {
    console.error('[DBG][meta-ads/test] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
