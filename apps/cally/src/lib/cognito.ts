/**
 * AWS Cognito Configuration for Cally
 */

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
