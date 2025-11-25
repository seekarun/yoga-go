/**
 * Auth0 Callback Handler
 *
 * Handles OAuth callback from Auth0 and:
 * 1. Extracts user role from namespaced token claims
 * 2. Creates/updates user in MongoDB
 * 3. Sends welcome email for new users
 * 4. Redirects to role-appropriate dashboard (experts → /srv, learners → /app)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { connectToDatabase } from '@/lib/mongodb';
import { PendingAuth } from '@/models/PendingAuth';
import { getOrCreateUser, isSocialLogin } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { getWelcomeEmail } from '@/lib/email-templates';
import { getBaseUrlFromRequest } from '@/lib/utils';
import type { UserRole } from '@/types';

// Role claim namespace - must match Auth0 Post-Login Action
const ROLE_CLAIM_NAMESPACE = 'https://myyoga.guru';

/**
 * Extract role from Auth0 token claims
 */
function extractRoleFromClaims(userClaims: Record<string, unknown>): UserRole | null {
  const namespacedRole = userClaims[`${ROLE_CLAIM_NAMESPACE}/role`];
  if (namespacedRole && typeof namespacedRole === 'string') {
    return namespacedRole as UserRole;
  }

  const plainRole = userClaims['role'];
  if (plainRole && typeof plainRole === 'string') {
    return plainRole as UserRole;
  }

  return null;
}

/**
 * Get role from PendingAuth cookie as fallback
 */
async function getRoleFromPendingAuth(authToken: string | undefined): Promise<UserRole | null> {
  if (!authToken) return null;

  try {
    await connectToDatabase();
    const pendingAuth = await PendingAuth.findById(authToken);
    return pendingAuth?.role as UserRole | null;
  } catch (error) {
    console.error('[auth/callback] Error reading PendingAuth:', error);
    return null;
  }
}

/**
 * Get role from existing MongoDB user as fallback
 */
async function getRoleFromExistingUser(auth0Id: string): Promise<UserRole | null> {
  try {
    await connectToDatabase();
    const User = (await import('@/models/User')).default;
    const user = await User.findOne({ auth0Id });
    return user?.role as UserRole | null;
  } catch (error) {
    console.error('[auth/callback] Error reading existing user:', error);
    return null;
  }
}

/**
 * Send welcome email to new users based on their role
 */
async function sendWelcomeEmailIfNew(
  isNew: boolean,
  email: string | undefined,
  name: string | undefined,
  role: UserRole
): Promise<void> {
  if (!isNew || !email) return;

  try {
    const userName = name || email.split('@')[0];
    const emailContent = getWelcomeEmail({
      userName,
      userEmail: email,
      role,
    });

    await sendEmail({
      to: email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });
  } catch (emailError) {
    console.error('[auth/callback] Failed to send welcome email:', emailError);
  }
}

/**
 * Get redirect URL based on user role
 */
function getRedirectUrl(role: UserRole, baseUrl: string): string {
  switch (role) {
    case 'expert':
      return `${baseUrl}/srv`;
    case 'admin':
      return `${baseUrl}/admin`;
    case 'learner':
    default:
      return `${baseUrl}/app`;
  }
}

export async function GET(request: NextRequest) {
  try {
    const callbackResponse = await auth0.middleware(request);
    const session = await auth0.getSession(request);

    if (session?.user) {
      const baseUrl = getBaseUrlFromRequest(request);

      // Check if email is verified (skip for social logins)
      if (!session.user.email_verified && !isSocialLogin(session.user.sub)) {
        return NextResponse.redirect(new URL('/auth/verify-email', baseUrl));
      }

      const userClaims = session.user as Record<string, unknown>;
      const authToken = request.cookies.get('pending_auth_token')?.value;

      // Determine role with priority: claims > existing user > PendingAuth > default
      let role = extractRoleFromClaims(userClaims);
      let existingUserRole: UserRole | null = null;

      if (!role) {
        existingUserRole = await getRoleFromExistingUser(session.user.sub);
        if (existingUserRole) {
          role = existingUserRole;
        }
      }

      if (!role && !existingUserRole && authToken) {
        role = await getRoleFromPendingAuth(authToken);
      }

      if (!role) {
        role = 'learner';
      }

      // Clean up PendingAuth if email verified or user exists
      if (authToken && (session.user.email_verified || existingUserRole)) {
        await connectToDatabase();
        await PendingAuth.findByIdAndDelete(authToken);
      }

      // Create or update user in MongoDB
      const { user, isNew } = await getOrCreateUser(
        {
          sub: session.user.sub,
          email: session.user.email!,
          name: session.user.name,
          username: (session.user as Record<string, unknown>).username as string | undefined,
          picture: session.user.picture,
        },
        role
      );

      // Send welcome email for new users
      await sendWelcomeEmailIfNew(isNew, session.user.email, session.user.name, role);

      const redirectUrl = getRedirectUrl(role, baseUrl);
      const redirectResponse = NextResponse.redirect(redirectUrl);

      // Copy Auth0 session cookies
      callbackResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
      });

      redirectResponse.cookies.delete('pending_auth_token');
      return redirectResponse;
    }

    return callbackResponse;
  } catch (error) {
    console.error('[auth/callback] Error:', error);
    throw error;
  }
}
