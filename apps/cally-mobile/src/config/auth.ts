/**
 * Cognito OAuth configuration for mobile Google Sign-In
 *
 * Uses Cognito's hosted UI with identity_provider=Google to
 * skip the Cognito login screen and go directly to Google.
 *
 * SETUP:
 * 1. Set COGNITO_CLIENT_ID to match your Cognito App Client ID
 *    (same as COGNITO_CLIENT_ID env var in Vercel / web app)
 * 2. Add the Expo redirect URI to Cognito's allowed callback URLs in CDK:
 *    - Expo Go: "exp://192.168.x.x:8081" (dev)
 *    - Dev build: "cally-mobile://auth/callback"
 */

// Cognito Hosted UI domain (from CDK: cally-auth prefix + region)
export const COGNITO_DOMAIN =
  "cally-auth.auth.ap-southeast-2.amazoncognito.com";

// Cognito App Client ID — same client as the web app
// Get this from: AWS Console → Cognito → cally-users → App client "cally-web"
export const COGNITO_CLIENT_ID = "u5bg5orca1cb1dg3vit7aclmk";

// Cognito OAuth endpoints
export const AUTHORIZE_ENDPOINT = `https://${COGNITO_DOMAIN}/oauth2/authorize`;

// Scopes requested from Cognito
export const SCOPES = ["email", "openid", "profile"];
