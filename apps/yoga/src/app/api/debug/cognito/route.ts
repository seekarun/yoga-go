/**
 * Debug endpoint to check Cognito configuration
 * DELETE THIS FILE after troubleshooting
 */

import { NextResponse } from 'next/server';
import { cognitoConfig, getCognitoUrls } from '@/lib/cognito';

export async function GET() {
  const cognitoUrls = getCognitoUrls();

  return NextResponse.json({
    env: {
      COGNITO_DOMAIN: process.env.COGNITO_DOMAIN || '(not set)',
      COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID ? 'set' : '(not set)',
      COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID ? 'set' : '(not set)',
      NODE_ENV: process.env.NODE_ENV,
    },
    config: {
      region: cognitoConfig.region,
      clientId: cognitoConfig.clientId ? '***set***' : '(not set)',
    },
    urls: cognitoUrls,
    timestamp: new Date().toISOString(),
  });
}
