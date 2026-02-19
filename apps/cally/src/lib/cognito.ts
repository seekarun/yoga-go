/**
 * AWS Cognito Configuration for CallyGo
 */
import { CognitoJwtVerifier } from "aws-jwt-verify";

export const cognitoConfig = {
  userPoolId: process.env.COGNITO_USER_POOL_ID || "",
  clientId: process.env.COGNITO_CLIENT_ID || "",
  clientSecret: process.env.COGNITO_CLIENT_SECRET || "",
  region: process.env.AWS_REGION || "ap-southeast-2",
  domain: process.env.COGNITO_DOMAIN || "",
};

// Build issuer URL from User Pool ID
export const getCognitoIssuer = () => {
  return `https://cognito-idp.${cognitoConfig.region}.amazonaws.com/${cognitoConfig.userPoolId}`;
};

// JWT Verifier for validating Cognito Access tokens (used for mobile Bearer auth)
let accessTokenVerifier: ReturnType<typeof CognitoJwtVerifier.create> | null =
  null;

export function getAccessTokenVerifier() {
  if (
    !accessTokenVerifier &&
    cognitoConfig.userPoolId &&
    cognitoConfig.clientId
  ) {
    accessTokenVerifier = CognitoJwtVerifier.create({
      userPoolId: cognitoConfig.userPoolId,
      tokenUse: "access",
      clientId: cognitoConfig.clientId,
    });
  }
  return accessTokenVerifier;
}

// Cognito Hosted UI URLs
export const getCognitoUrls = () => {
  const domain = cognitoConfig.domain;
  return {
    authorize: `https://${domain}/oauth2/authorize`,
    token: `https://${domain}/oauth2/token`,
    userInfo: `https://${domain}/oauth2/userInfo`,
    logout: `https://${domain}/logout`,
  };
};
