/**
 * POST /api/auth/mobile/login
 * Mobile-specific login endpoint that returns a JWT token in the response body
 * (instead of setting a cookie like the web version)
 */
import { NextResponse } from 'next/server';
import { signIn, getUserInfo, getCognitoErrorMessage, isCognitoError } from '@/lib/cognito-auth';
import { getOrCreateUser } from '@/lib/auth';
import { SignJWT } from 'jose';

interface LoginRequestBody {
  email: string;
  password: string;
}

// Mobile token expiry (7 days - shorter than web for security)
const MOBILE_TOKEN_EXPIRY = '7d';

export async function POST(request: Request) {
  console.log('[DBG][mobile/login] ========== MOBILE LOGIN ATTEMPT ==========');

  try {
    const body: LoginRequestBody = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('[DBG][mobile/login] Attempting login for:', normalizedEmail);

    // Authenticate with Cognito
    const signInResult = await signIn({
      email: normalizedEmail,
      password,
    });

    if (!signInResult.success || !signInResult.accessToken) {
      return NextResponse.json({ success: false, message: signInResult.message }, { status: 401 });
    }

    console.log('[DBG][mobile/login] Cognito authentication successful');

    // Get user info from Cognito
    const userInfo = await getUserInfo({
      accessToken: signInResult.accessToken,
    });

    console.log('[DBG][mobile/login] Got user info:', {
      sub: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
    });

    // Get or create DynamoDB user
    const user = await getOrCreateUser({
      sub: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name || '',
    });

    console.log('[DBG][mobile/login] User from DynamoDB:', user.id, 'role:', user.role);

    // Create a signed JWT token for mobile
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

    const token = await new SignJWT({
      sub: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      platform: 'mobile',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(MOBILE_TOKEN_EXPIRY)
      .setAudience('yoga-mobile')
      .sign(secret);

    console.log('[DBG][mobile/login] Mobile token created for user:', user.id);

    // Return token in response body (no cookie)
    return NextResponse.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.profile.email,
        name: user.profile.name,
        role: user.role,
        avatar: user.profile.avatar,
      },
    });
  } catch (error) {
    console.error('[DBG][mobile/login] Error:', error);

    if (isCognitoError(error, 'UserNotConfirmedException')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please verify your email before signing in.',
          code: 'USER_NOT_CONFIRMED',
        },
        { status: 403 }
      );
    }

    if (isCognitoError(error, 'NotAuthorizedException')) {
      return NextResponse.json(
        { success: false, message: 'Incorrect email or password.' },
        { status: 401 }
      );
    }

    if (isCognitoError(error, 'UserNotFoundException')) {
      return NextResponse.json(
        { success: false, message: 'No account found with this email.' },
        { status: 404 }
      );
    }

    const message = getCognitoErrorMessage(error);
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
