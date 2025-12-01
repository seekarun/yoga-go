/**
 * Instagram Graph API Service
 *
 * Handles OAuth flow, token management, and content publishing
 * for Instagram Business/Creator accounts via Facebook Graph API.
 */

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// OAuth scopes needed for Instagram content publishing
const INSTAGRAM_SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'pages_show_list',
  'pages_read_engagement',
  'business_management',
].join(',');

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
  };
}

export interface InstagramAccount {
  id: string;
  username: string;
  profile_picture_url?: string;
  followers_count?: number;
}

export interface MediaContainerResponse {
  id: string;
}

export interface PublishResponse {
  id: string;
}

export interface MediaResponse {
  id: string;
  permalink?: string;
}

/**
 * Generate the OAuth authorization URL for connecting Instagram
 */
export function getOAuthUrl(redirectUri: string, state?: string): string {
  if (!META_APP_ID) {
    throw new Error('META_APP_ID is not configured');
  }

  const params = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: redirectUri,
    scope: INSTAGRAM_SCOPES,
    response_type: 'code',
    ...(state && { state }),
  });

  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
}

/**
 * Exchange authorization code for short-lived access token
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  if (!META_APP_ID || !META_APP_SECRET) {
    throw new Error('META_APP_ID or META_APP_SECRET is not configured');
  }

  const params = new URLSearchParams({
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    console.error('[DBG][instagram] Token exchange error:', error);
    throw new Error(error.error?.message || 'Failed to exchange code for token');
  }

  return response.json();
}

/**
 * Exchange short-lived token for long-lived token (valid for 60 days)
 */
export async function getLongLivedToken(shortLivedToken: string): Promise<TokenResponse> {
  if (!META_APP_ID || !META_APP_SECRET) {
    throw new Error('META_APP_ID or META_APP_SECRET is not configured');
  }

  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    console.error('[DBG][instagram] Long-lived token error:', error);
    throw new Error(error.error?.message || 'Failed to get long-lived token');
  }

  return response.json();
}

/**
 * Refresh a long-lived token before it expires
 */
export async function refreshLongLivedToken(token: string): Promise<TokenResponse> {
  if (!META_APP_ID || !META_APP_SECRET) {
    throw new Error('META_APP_ID or META_APP_SECRET is not configured');
  }

  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    fb_exchange_token: token,
  });

  const response = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    console.error('[DBG][instagram] Token refresh error:', error);
    throw new Error(error.error?.message || 'Failed to refresh token');
  }

  return response.json();
}

/**
 * Get Facebook Pages that the user manages
 */
export async function getFacebookPages(userToken: string): Promise<FacebookPage[]> {
  const params = new URLSearchParams({
    access_token: userToken,
    fields: 'id,name,access_token,instagram_business_account',
  });

  const response = await fetch(`${GRAPH_API_BASE}/me/accounts?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    console.error('[DBG][instagram] Get pages error:', error);
    throw new Error(error.error?.message || 'Failed to get Facebook pages');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Get Instagram Business Account info from a Facebook Page
 */
export async function getInstagramAccount(
  instagramUserId: string,
  accessToken: string
): Promise<InstagramAccount> {
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: 'id,username,profile_picture_url,followers_count',
  });

  const response = await fetch(`${GRAPH_API_BASE}/${instagramUserId}?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    console.error('[DBG][instagram] Get Instagram account error:', error);
    throw new Error(error.error?.message || 'Failed to get Instagram account');
  }

  return response.json();
}

/**
 * Create a media container for an image post
 * The image URL must be publicly accessible
 */
export async function createImageContainer(
  instagramUserId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
): Promise<string> {
  const params = new URLSearchParams({
    access_token: accessToken,
    image_url: imageUrl,
    caption,
  });

  const response = await fetch(`${GRAPH_API_BASE}/${instagramUserId}/media?${params.toString()}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[DBG][instagram] Create media container error:', error);
    throw new Error(error.error?.message || 'Failed to create media container');
  }

  const data: MediaContainerResponse = await response.json();
  return data.id;
}

/**
 * Create a carousel item container (for multi-image posts)
 */
export async function createCarouselItemContainer(
  instagramUserId: string,
  accessToken: string,
  imageUrl: string
): Promise<string> {
  const params = new URLSearchParams({
    access_token: accessToken,
    image_url: imageUrl,
    is_carousel_item: 'true',
  });

  const response = await fetch(`${GRAPH_API_BASE}/${instagramUserId}/media?${params.toString()}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[DBG][instagram] Create carousel item error:', error);
    throw new Error(error.error?.message || 'Failed to create carousel item');
  }

  const data: MediaContainerResponse = await response.json();
  return data.id;
}

/**
 * Create a carousel container from multiple item containers
 */
export async function createCarouselContainer(
  instagramUserId: string,
  accessToken: string,
  childrenIds: string[],
  caption: string
): Promise<string> {
  const params = new URLSearchParams({
    access_token: accessToken,
    media_type: 'CAROUSEL',
    children: childrenIds.join(','),
    caption,
  });

  const response = await fetch(`${GRAPH_API_BASE}/${instagramUserId}/media?${params.toString()}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[DBG][instagram] Create carousel container error:', error);
    throw new Error(error.error?.message || 'Failed to create carousel container');
  }

  const data: MediaContainerResponse = await response.json();
  return data.id;
}

/**
 * Publish a media container to Instagram
 */
export async function publishMedia(
  instagramUserId: string,
  accessToken: string,
  containerId: string
): Promise<MediaResponse> {
  const params = new URLSearchParams({
    access_token: accessToken,
    creation_id: containerId,
  });

  const response = await fetch(
    `${GRAPH_API_BASE}/${instagramUserId}/media_publish?${params.toString()}`,
    { method: 'POST' }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('[DBG][instagram] Publish media error:', error);
    throw new Error(error.error?.message || 'Failed to publish media');
  }

  const publishData: PublishResponse = await response.json();

  // Get the permalink for the published post
  const mediaResponse = await fetch(
    `${GRAPH_API_BASE}/${publishData.id}?access_token=${accessToken}&fields=id,permalink`
  );

  if (mediaResponse.ok) {
    return mediaResponse.json();
  }

  return { id: publishData.id };
}

/**
 * Check the status of a media container (for async processing)
 */
export async function checkContainerStatus(
  containerId: string,
  accessToken: string
): Promise<{ status: string; status_code?: string }> {
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: 'status,status_code',
  });

  const response = await fetch(`${GRAPH_API_BASE}/${containerId}?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    console.error('[DBG][instagram] Check container status error:', error);
    throw new Error(error.error?.message || 'Failed to check container status');
  }

  return response.json();
}

/**
 * High-level function to post a single image to Instagram
 */
export async function postImageToInstagram(
  instagramUserId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
): Promise<MediaResponse> {
  console.log('[DBG][instagram] Creating media container...');

  // Create the media container
  const containerId = await createImageContainer(instagramUserId, accessToken, imageUrl, caption);

  console.log('[DBG][instagram] Container created:', containerId);

  // Wait a moment for processing (Instagram recommends checking status)
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check status before publishing
  const status = await checkContainerStatus(containerId, accessToken);
  console.log('[DBG][instagram] Container status:', status);

  if (status.status_code && status.status_code !== 'FINISHED') {
    // Wait longer and check again
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Publish the media
  console.log('[DBG][instagram] Publishing media...');
  const result = await publishMedia(instagramUserId, accessToken, containerId);
  console.log('[DBG][instagram] Published:', result);

  return result;
}

/**
 * Calculate token expiry date (tokens are valid for ~60 days)
 */
export function calculateTokenExpiry(expiresIn?: number): string {
  // Default to 60 days if not specified
  const seconds = expiresIn || 60 * 24 * 60 * 60;
  const expiryDate = new Date(Date.now() + seconds * 1000);
  return expiryDate.toISOString();
}

/**
 * Check if a token is close to expiring (within 7 days)
 */
export function isTokenExpiringSoon(expiresAt: string): boolean {
  const expiryDate = new Date(expiresAt);
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return expiryDate < sevenDaysFromNow;
}
