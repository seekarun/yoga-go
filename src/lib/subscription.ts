import type { User } from '@/types';
import type { SubscriptionStatus } from '@/config/payment';

/**
 * Utility functions for subscription management
 */

export interface SubscriptionAccess {
  hasAccess: boolean;
  reason?: string;
  subscription?: {
    type: string;
    status: string;
    billingInterval?: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
  };
}

/**
 * Check if a user has active subscription access
 * Returns true if:
 * - User has an active subscription
 * - User has a cancelled subscription but period hasn't ended yet
 * - User has a lifetime membership
 */
export function hasSubscriptionAccess(user: User | null): SubscriptionAccess {
  if (!user) {
    return {
      hasAccess: false,
      reason: 'User not authenticated',
    };
  }

  const { membership } = user;

  // Lifetime members always have access
  if (membership.type === 'lifetime') {
    return {
      hasAccess: true,
      subscription: {
        type: 'lifetime',
        status: 'active',
      },
    };
  }

  // Free tier has limited access
  if (membership.type === 'free') {
    return {
      hasAccess: false,
      reason: 'Free tier - upgrade required',
      subscription: {
        type: 'free',
        status: membership.status,
      },
    };
  }

  // Check subscription status
  const isActive = membership.status === 'active';
  const isCancelled = membership.cancelAtPeriodEnd === true;
  const periodEnd = membership.currentPeriodEnd ? new Date(membership.currentPeriodEnd) : null;
  const now = new Date();

  // If subscription is active OR cancelled but still within period
  if (isActive && (!isCancelled || (periodEnd && periodEnd > now))) {
    return {
      hasAccess: true,
      subscription: {
        type: membership.type,
        status: membership.status,
        billingInterval: membership.billingInterval,
        currentPeriodEnd: membership.currentPeriodEnd,
        cancelAtPeriodEnd: membership.cancelAtPeriodEnd,
      },
    };
  }

  // Subscription expired or past due
  if (membership.status === 'expired' || membership.status === 'cancelled') {
    return {
      hasAccess: false,
      reason: 'Subscription expired',
      subscription: {
        type: membership.type,
        status: membership.status,
        currentPeriodEnd: membership.currentPeriodEnd,
      },
    };
  }

  // Subscription paused (payment failed)
  if (membership.status === 'paused') {
    return {
      hasAccess: false,
      reason: 'Subscription paused - payment failed',
      subscription: {
        type: membership.type,
        status: membership.status,
      },
    };
  }

  // Default: no access
  return {
    hasAccess: false,
    reason: 'No active subscription',
    subscription: {
      type: membership.type,
      status: membership.status,
    },
  };
}

/**
 * Check if user can access a specific plan's features
 */
export function canAccessPlanFeatures(
  user: User | null,
  requiredPlan: 'curious' | 'committed' | 'lifetime'
): boolean {
  const access = hasSubscriptionAccess(user);
  if (!access.hasAccess) return false;

  const planHierarchy = {
    curious: 1,
    committed: 2,
    lifetime: 3,
  };

  const userPlanLevel = planHierarchy[user!.membership.type as keyof typeof planHierarchy] || 0;
  const requiredPlanLevel = planHierarchy[requiredPlan];

  return userPlanLevel >= requiredPlanLevel;
}

/**
 * Get subscription status badge color
 */
export function getSubscriptionStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    active: '#48bb78',
    cancelled: '#f59e0b',
    expired: '#dc3545',
    paused: '#f59e0b',
    trialing: '#3b82f6',
    past_due: '#dc3545',
  };

  return statusColors[status] || '#6c757d';
}

/**
 * Format subscription type for display
 */
export function formatSubscriptionType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Calculate days remaining in subscription period
 */
export function getDaysRemaining(currentPeriodEnd: string | undefined): number {
  if (!currentPeriodEnd) return 0;

  const endDate = new Date(currentPeriodEnd);
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}
