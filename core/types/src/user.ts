// User Types - Generic user-related types

import type { BaseEntity } from "./base";

/**
 * User role types - generic for all verticals
 */
export type UserRole = "learner" | "expert" | "admin";

/**
 * Membership types - generic subscription tiers
 */
export type MembershipType = "free" | "curious" | "committed" | "lifetime";
export type MembershipStatus = "active" | "expired" | "cancelled" | "paused";
export type BillingInterval = "monthly" | "yearly";

/**
 * User profile information
 */
export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  joinedAt: string;
  location?: string;
  timezone?: string;
  phoneNumber?: string;
}

/**
 * User membership details
 */
export interface Membership {
  type: MembershipType;
  status: MembershipStatus;
  startDate: string;
  renewalDate?: string;
  cancelledAt?: string;
  benefits: string[];
  billingInterval?: BillingInterval;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  paymentGateway?: "stripe" | "razorpay";
}

/**
 * User statistics - generic learning statistics
 * TCategory is parameterized for vertical-specific categories
 */
export interface UserStatistics<TCategory extends string = string> {
  totalCourses: number;
  completedCourses: number;
  totalLessons: number;
  completedLessons: number;
  totalPracticeTime: number; // in minutes
  currentStreak: number;
  longestStreak: number;
  lastPractice: string;
  averageSessionTime: number; // in minutes
  favoriteCategory?: TCategory;
  level?: string;
}

/**
 * Achievement unlocked by user
 */
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
  points?: number;
}

/**
 * Enrolled course summary for user profile
 */
export interface EnrolledCourse {
  courseId: string;
  title: string;
  instructor: string;
  progress: number; // percentage
  lastAccessed: string;
  enrolledAt?: string;
  completedAt?: string;
  certificateUrl?: string;
}

/**
 * User preferences - generic settings
 * TCategory is parameterized for vertical-specific categories
 */
export interface UserPreferences<TCurrency extends string = string> {
  emailNotifications: boolean;
  pushNotifications: boolean;
  reminderTime?: string;
  reminderDays?: string[];
  preferredDuration?: string;
  focusAreas?: string[];
  difficultyLevel?: string;
  language?: string;
  videoQuality?: "sd" | "hd" | "4k";
  autoPlayEnabled?: boolean;
  preferredCurrency?: TCurrency;
  timezone?: string;
}

/**
 * Payment record
 */
export interface Payment {
  date: string;
  amount: number;
  method: string;
  status: "paid" | "pending" | "failed" | "refunded" | "scheduled";
  description?: string;
  invoice?: string;
}

/**
 * User billing information
 */
export interface Billing {
  lastPayment?: Payment;
  nextPayment?: Payment;
  paymentHistory?: Payment[];
  stripeCustomerId?: string;
  razorpayCustomerId?: string;
}

/**
 * Saved items (favorites, watchlist, bookmarks)
 */
export interface SavedItem {
  favoriteCourses: string[];
  watchlist: string[];
  bookmarkedLessons: Array<{
    courseId: string;
    lessonId: string;
    title: string;
    timestamp: string;
  }>;
}

/**
 * User social connections
 */
export interface UserSocial {
  following: string[];
  followers: number;
  friends?: number;
  sharedAchievements?: boolean;
  publicProfile?: boolean;
}

/**
 * Main User entity
 * TCategory is parameterized for vertical-specific categories
 */
export interface User<
  TCategory extends string = string,
  TCurrency extends string = string,
> extends BaseEntity {
  role: UserRole[];
  expertProfile?: string;
  signupSource?: string;
  signupExperts?: string[];
  profile: UserProfile;
  membership: Membership;
  statistics: UserStatistics<TCategory>;
  achievements: Achievement[];
  enrolledCourses: EnrolledCourse[];
  preferences: UserPreferences<TCurrency>;
  billing?: Billing;
  savedItems?: SavedItem;
  social?: UserSocial;
  defaultMeetingLink?: string;
  defaultMeetingPlatform?: "zoom" | "google-meet" | "other";
}

/**
 * TenantUser - User data within a specific tenant context
 * TCategory is parameterized for vertical-specific categories
 */
export interface TenantUser<
  TCategory extends string = string,
  TCurrency extends string = string,
> extends BaseEntity {
  cognitoSub: string;
  tenantId: string;
  email: string;
  name?: string;
  avatar?: string;
  bio?: string;
  phoneNumber?: string;
  role: UserRole[];
  membership: Membership;
  joinedTenantAt: string;
  lastActiveAt?: string;
  enrolledCourses: EnrolledCourse[];
  statistics: UserStatistics<TCategory>;
  achievements: Achievement[];
  preferences: UserPreferences<TCurrency>;
  billing?: Billing;
  savedItems?: SavedItem;
}

/**
 * Input type for creating a new TenantUser
 */
export interface CreateTenantUserInput {
  cognitoSub: string;
  tenantId: string;
  email: string;
  name?: string;
  avatar?: string;
  role?: UserRole[];
}
