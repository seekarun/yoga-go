import mongoose, { Schema } from 'mongoose';
import type {
  User,
  UserRole,
  UserProfile,
  Membership,
  UserStatistics,
  Achievement,
  EnrolledCourse,
  UserPreferences,
  Billing,
  SavedItem,
  UserSocial,
} from '@/types';

export interface UserDocument extends Omit<User, 'id'> {
  _id: string;
  auth0Id: string; // Link to Auth0 user
}

const UserProfileSchema = new Schema<UserProfile>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    avatar: String,
    bio: String,
    joinedAt: { type: String, required: true },
    location: String,
    timezone: String,
    phoneNumber: String,
  },
  { _id: false }
);

const MembershipSchema = new Schema<Membership>(
  {
    type: {
      type: String,
      enum: ['free', 'curious', 'committed', 'lifetime'],
      default: 'free',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'paused'],
      default: 'active',
      required: true,
    },
    startDate: { type: String, required: true },
    renewalDate: String,
    cancelledAt: String,
    benefits: [{ type: String }],

    // Subscription-specific fields
    subscriptionId: { type: String, index: true }, // Reference to Subscription document
    billingInterval: {
      type: String,
      enum: ['monthly', 'yearly'],
    },
    currentPeriodEnd: String, // When current billing period ends
    cancelAtPeriodEnd: { type: Boolean, default: false }, // True if user has cancelled but still has access
    paymentGateway: {
      type: String,
      enum: ['stripe', 'razorpay'],
    },
  },
  { _id: false }
);

const UserStatisticsSchema = new Schema<UserStatistics>(
  {
    totalCourses: { type: Number, default: 0 },
    completedCourses: { type: Number, default: 0 },
    totalLessons: { type: Number, default: 0 },
    completedLessons: { type: Number, default: 0 },
    totalPracticeTime: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastPractice: String,
    averageSessionTime: { type: Number, default: 0 },
    favoriteCategory: String,
    level: String,
  },
  { _id: false }
);

const AchievementSchema = new Schema<Achievement>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    unlockedAt: { type: String, required: true },
    points: Number,
  },
  { _id: false }
);

const EnrolledCourseSchema = new Schema<EnrolledCourse>(
  {
    courseId: { type: String, required: true },
    title: { type: String, required: true },
    instructor: { type: String, required: true },
    progress: { type: Number, required: true },
    lastAccessed: { type: String, required: true },
    enrolledAt: String,
    completedAt: String,
    certificateUrl: String,
  },
  { _id: false }
);

const UserPreferencesSchema = new Schema<UserPreferences>(
  {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: false },
    reminderTime: String,
    reminderDays: [{ type: String }],
    preferredDuration: String,
    focusAreas: [{ type: String }],
    difficultyLevel: String,
    language: { type: String, default: 'en' },
    videoQuality: {
      type: String,
      enum: ['sd', 'hd', '4k'],
      default: 'hd',
    },
    autoPlayEnabled: { type: Boolean, default: false },
  },
  { _id: false }
);

const PaymentSchema = new Schema(
  {
    date: { type: String, required: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    status: {
      type: String,
      enum: ['paid', 'pending', 'failed', 'refunded', 'scheduled'],
      required: true,
    },
    description: String,
    invoice: String,
  },
  { _id: false }
);

const BillingSchema = new Schema<Billing>(
  {
    lastPayment: PaymentSchema,
    nextPayment: PaymentSchema,
    paymentHistory: [PaymentSchema],
    stripeCustomerId: String,
    razorpayCustomerId: String,
  },
  { _id: false }
);

const SavedItemSchema = new Schema<SavedItem>(
  {
    favoriteCourses: [{ type: String }],
    watchlist: [{ type: String }],
    bookmarkedLessons: [
      {
        courseId: { type: String },
        lessonId: { type: String },
        title: { type: String },
        timestamp: { type: String },
      },
    ],
  },
  { _id: false }
);

const UserSocialSchema = new Schema<UserSocial>(
  {
    following: [{ type: String }],
    followers: { type: Number, default: 0 },
    friends: { type: Number, default: 0 },
    sharedAchievements: { type: Boolean, default: false },
    publicProfile: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema<UserDocument>(
  {
    _id: { type: String, required: true },
    auth0Id: { type: String, required: true, unique: true, index: true },
    role: {
      type: String,
      enum: ['learner', 'expert'],
      default: 'learner',
      required: true,
    },
    expertProfile: { type: String, index: true }, // Expert ID if user is an expert
    profile: { type: UserProfileSchema, required: true },
    membership: { type: MembershipSchema, required: true },
    statistics: { type: UserStatisticsSchema, required: true },
    achievements: [AchievementSchema],
    enrolledCourses: [EnrolledCourseSchema],
    preferences: { type: UserPreferencesSchema, required: true },
    billing: BillingSchema,
    savedItems: SavedItemSchema,
    social: UserSocialSchema,

    // Expert meeting settings (for live sessions)
    defaultMeetingLink: String,
    defaultMeetingPlatform: {
      type: String,
      enum: ['zoom', 'google-meet', 'other'],
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Indexes for common queries
UserSchema.index({ 'profile.email': 1 });
UserSchema.index({ 'membership.type': 1 });
UserSchema.index({ 'membership.status': 1 });
UserSchema.index({ role: 1 });

// Prevent model recompilation in development
export default mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);
