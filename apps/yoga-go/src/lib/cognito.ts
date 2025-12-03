/**
 * AWS Cognito Configuration
 * This provides Cognito-specific utilities and configuration
 */
import { CognitoJwtVerifier } from 'aws-jwt-verify';

export const cognitoConfig = {
  userPoolId: process.env.COGNITO_USER_POOL_ID || '',
  clientId: process.env.COGNITO_CLIENT_ID || '',
  clientSecret: process.env.COGNITO_CLIENT_SECRET || '',
  issuer:
    process.env.COGNITO_ISSUER ||
    `https://cognito-idp.${process.env.AWS_REGION || 'ap-southeast-2'}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
  region: process.env.AWS_REGION || 'ap-southeast-2',
};

// JWT Verifier for validating Cognito tokens (used for API routes if needed)
let jwtVerifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

export function getJwtVerifier() {
  if (!jwtVerifier && cognitoConfig.userPoolId && cognitoConfig.clientId) {
    jwtVerifier = CognitoJwtVerifier.create({
      userPoolId: cognitoConfig.userPoolId,
      tokenUse: 'id',
      clientId: cognitoConfig.clientId,
    });
  }
  return jwtVerifier;
}

// Cognito Hosted UI URLs
export function getCognitoUrls() {
  const domain = `yoga-go-auth.auth.${cognitoConfig.region}.amazoncognito.com`;
  return {
    authorize: `https://${domain}/oauth2/authorize`,
    token: `https://${domain}/oauth2/token`,
    userInfo: `https://${domain}/oauth2/userInfo`,
    logout: `https://${domain}/logout`,
  };
}
