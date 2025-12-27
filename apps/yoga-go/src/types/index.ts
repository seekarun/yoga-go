// Base Types
export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

// User Role Types
export type UserRole = 'learner' | 'expert' | 'admin';

// Landing Page Template Types
export type LandingPageTemplate = 'classic' | 'modern';

// Color harmony types for palette generation
export type ColorHarmonyType = 'analogous' | 'triadic' | 'split-complementary';

// Brand Color Palette (11 shades from light to dark + harmony colors)
export interface ColorPalette {
  50: string; // Lightest - subtle backgrounds
  100: string; // Light backgrounds, badges
  200: string; // Light accents
  300: string; // Hover borders
  400: string; // Secondary elements
  500: string; // Base/Primary - buttons, main CTA
  600: string; // Hover state
  700: string; // Active state
  800: string; // Dark accents
  900: string; // Dark text
  950: string; // Darkest
  // Harmony-based colors
  secondary?: string; // Secondary color based on harmony
  highlight?: string; // Highlight/accent color based on harmony
  harmonyType?: ColorHarmonyType; // Which harmony was used
}

// Currency Types
export type SupportedCurrency = 'USD' | 'INR' | 'EUR' | 'GBP' | 'AUD' | 'CAD' | 'SGD' | 'AED';

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  decimalPlaces: number;
  locale: string;
}

// Exchange rate cache for DynamoDB storage
export interface ExchangeRateCache extends BaseEntity {
  baseCurrency: string;
  rates: Record<string, number>; // currency code -> rate relative to base
  fetchedAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp (24 hours from fetchedAt)
}

// Price display information for UI components
export interface PriceDisplayInfo {
  originalAmount: number;
  originalCurrency: SupportedCurrency;
  convertedAmount?: number;
  convertedCurrency?: SupportedCurrency;
  exchangeRate?: number;
  isApproximate: boolean;
  formattedOriginal: string;
  formattedConverted?: string;
}

// Expert Related Types
export interface SocialLinks {
  instagram?: string;
  youtube?: string;
  facebook?: string;
  twitter?: string;
  website?: string;
}

export interface ExpertCourse {
  id: string;
  title: string;
  level: string;
  duration: string;
  students: number;
}

export interface CustomLandingPageConfig {
  branding?: {
    logo?: string; // Custom logo URL for header on expert subdomain
  };
  hero?: {
    heroImage?: string; // Hero background image URL
    heroImageAttribution?: {
      // Photo attribution (for Pexels or other sources)
      photographerName: string;
      photographerUsername?: string; // Legacy - for Unsplash
      photographerUrl: string;
      unsplashUrl?: string; // Legacy - for Unsplash
      pexelsUrl?: string; // For Pexels images
    };
    headline?: string; // Custom headline (problem hook)
    description?: string; // Custom description (results hook)
    ctaText?: string; // Call to action button text
    ctaLink?: string;
    alignment?: 'center' | 'left' | 'right'; // Text alignment
  };
  valuePropositions?: {
    type?: 'paragraph' | 'cards'; // Display as paragraph or cards
    content?: string; // Paragraph text (when type is 'paragraph')
    items?: Array<{
      title: string;
      description: string;
      image?: string;
    }>; // Card items (when type is 'cards')
  };
  about?: {
    bio?: string;
    highlights?: string[];
    layoutType?: 'video' | 'image-text'; // Layout type for about section
    videoCloudflareId?: string; // Cloudflare Stream video UID for video layout
    videoStatus?: 'uploading' | 'processing' | 'ready' | 'error';
    imageUrl?: string; // Image URL for image-text layout
    text?: string; // Text content for image-text layout
  };
  act?: {
    imageUrl?: string; // Act section image URL
    imageAttribution?: {
      // Unsplash attribution for the image (if from Unsplash)
      photographerName: string;
      photographerUsername: string;
      photographerUrl: string;
      unsplashUrl: string;
    };
    title?: string; // Act section title
    text?: string; // Act section description text
    ctaText?: string; // CTA button text (defaults to hero CTA if not set)
    ctaLink?: string; // CTA button link (defaults to hero CTA link if not set)
  };
  blog?: {
    title?: string; // Section title (default: "From the Blog")
    description?: string; // Section description
  };
  courses?: {
    title?: string; // Section title (default: "Courses")
    description?: string; // Section description
  };
  webinars?: {
    title?: string; // Section title (default: "Live Sessions")
    description?: string; // Section description
  };
  photoGallery?: {
    title?: string; // Section title (default: "Gallery")
    description?: string; // Section description
    images?: Array<{
      id: string;
      url: string; // Image URL (Cloudflare or Unsplash)
      thumbUrl?: string; // Thumbnail URL for faster loading
      caption?: string; // Optional caption for the image
      attribution?: {
        // Unsplash attribution (required when using Unsplash images)
        photographerName: string;
        photographerUsername: string;
        photographerUrl: string;
        unsplashUrl: string;
      };
    }>;
  };
  footer?: {
    copyrightText?: string; // e.g., "© 2024 Yoga with Jane. All rights reserved."
    tagline?: string; // e.g., "Transform your practice, transform your life."
    showSocialLinks?: boolean;
    socialLinks?: {
      instagram?: string;
      youtube?: string;
      facebook?: string;
      twitter?: string;
      tiktok?: string;
    };
    showLegalLinks?: boolean;
    legalLinks?: {
      privacyPolicy?: string;
      termsOfService?: string;
      refundPolicy?: string;
    };
    showContactInfo?: boolean;
    contactEmail?: string;
  };
  featuredCourses?: string[]; // Array of course IDs
  testimonials?: Array<{
    id: string;
    name: string;
    avatar?: string;
    text: string;
    rating?: number;
  }>;
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    palette?: ColorPalette; // Generated color palette from primaryColor
  };
  contact?: {
    email?: string;
    phone?: string;
    bookingUrl?: string;
  };
  // Section ordering and visibility for visual editor
  sectionOrder?: string[]; // e.g., ['hero', 'valuePropositions', 'about', 'act']
  disabledSections?: string[]; // Sections that are hidden but data preserved
  // Template selection
  template?: LandingPageTemplate; // Visual layout template (default: 'classic')
}

// Expert Platform Preferences
export interface ExpertPlatformPreferences {
  featuredOnPlatform: boolean; // Show on myyoga.guru/courses
  defaultEmail?: string; // <expertId>@myyoga.guru (auto-assigned on signup)
  customEmail?: string; // Expert-provided email for sending (optional)
  emailVerified?: boolean; // Whether custom email is SES-verified
  forwardingEmail?: string; // Expert's personal email for receiving/forwarding
  emailForwardingEnabled?: boolean; // Whether to forward incoming emails
  location?: string; // Expert's country/location (ISO country code)
  currency?: SupportedCurrency; // Preferred currency for pricing
}

// Stripe Connect Status for Expert Payouts
export type StripeConnectStatus =
  | 'not_connected' // Expert hasn't started onboarding
  | 'pending' // Onboarding started but not complete
  | 'active' // Account ready for payouts
  | 'restricted' // Account needs attention (e.g., verification)
  | 'disabled'; // Account disabled by Stripe

// Stripe Connect Account Details
export interface StripeConnectDetails {
  accountId: string; // Stripe connected account ID (acct_xxx)
  status: StripeConnectStatus;
  chargesEnabled: boolean; // Can receive payments
  payoutsEnabled: boolean; // Can receive payouts
  onboardingCompletedAt?: string; // ISO timestamp
  lastUpdatedAt: string; // Last status check
  email?: string; // Email on Stripe account
  country?: string; // Account country
}

// Expert is now an alias for Tenant (consolidated entity)
// All expert data is stored in the TENANT entity
export type Expert = Tenant;

// Tenant Related Types (Multi-tenancy)
export type TenantStatus = 'active' | 'pending' | 'suspended';
export type SesVerificationStatus = 'pending' | 'verified' | 'failed';
export type DkimStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'NOT_STARTED' | 'TEMPORARY_FAILURE';

// Tenant Branding Configuration (for custom domain metadata)
export interface TenantBranding {
  faviconUrl?: string; // Custom favicon URL (use Cloudflare Images)
  siteTitle?: string; // Custom site title for browser tab
  siteDescription?: string; // Custom meta description
  ogImage?: string; // Custom Open Graph image for social sharing
}

// Cloudflare DNS Management (for custom domains using CF nameservers)
export type DnsManagementMethod = 'manual' | 'cloudflare';
export type CloudflareZoneStatus = 'pending' | 'active' | 'moved' | 'deleted';

export interface CloudflareDnsConfig {
  method: DnsManagementMethod;

  // The domain this config is for (e.g., "reelzai.com")
  domain?: string;

  // Cloudflare zone details (only when method === 'cloudflare')
  zoneId?: string;
  zoneStatus?: CloudflareZoneStatus;
  nameservers?: string[]; // e.g., ["ada.ns.cloudflare.com", "ben.ns.cloudflare.com"]

  // Record IDs for cleanup (stored after creation)
  recordIds?: {
    aRecord?: string;
    wwwCname?: string;
    mxRecord?: string;
    spfTxt?: string;
    dkim1Cname?: string;
    dkim2Cname?: string;
    dkim3Cname?: string;
  };

  // Timestamps
  zoneCreatedAt?: string;
  nsVerifiedAt?: string;
  recordsCreatedAt?: string;
}

// BYOD Email Configuration for custom domains
export interface TenantEmailConfig {
  // Domain email (e.g., contact@kavithayoga.com)
  domainEmail: string;

  // SES verification
  sesIdentityArn?: string;
  sesVerificationStatus: SesVerificationStatus;
  sesDkimTokens?: string[]; // 3 DKIM tokens from SES

  // DNS verification status
  dkimVerified: boolean;
  dkimStatus?: DkimStatus;
  mxVerified: boolean;
  spfVerified?: boolean;

  // Forwarding
  forwardToEmail: string; // Expert's personal email for receiving
  forwardingEnabled: boolean;

  // Timestamps
  enabledAt?: string;
  verifiedAt?: string;
}

// DNS Record information for expert to add
export interface TenantDnsRecord {
  type: 'MX' | 'TXT' | 'CNAME';
  name: string; // Host/Name field
  value: string; // Value field
  priority?: number; // For MX records
  purpose: string; // Human-readable purpose (e.g., "Email receiving", "DKIM 1")
}

export interface Tenant extends BaseEntity {
  // ===== Core Identity =====
  name: string; // Display name (e.g., "Kavitha Yoga")
  slug?: string; // URL-safe identifier (optional, defaults to id)
  userId?: string; // Link to User account (Cognito sub)

  // ===== Profile Data (formerly Expert) =====
  title: string;
  bio: string;
  avatar: string;
  rating: number;
  totalCourses: number;
  totalStudents: number;
  specializations: string[];
  featured: boolean;
  certifications?: string[];
  experience?: string;
  courses?: ExpertCourse[];
  socialLinks?: SocialLinks;
  onboardingCompleted?: boolean;
  promoVideo?: string; // Deprecated: use promoVideoCloudflareId instead
  promoVideoCloudflareId?: string; // Cloudflare Stream video UID for expert promo
  promoVideoStatus?: 'uploading' | 'processing' | 'ready' | 'error';

  // ===== Landing Page =====
  customLandingPage?: CustomLandingPageConfig; // Published landing page (live on subdomain)
  draftLandingPage?: CustomLandingPageConfig; // Draft landing page (WIP, viewable on preview subdomain)
  isLandingPagePublished?: boolean; // When false, subdomain visitors are redirected

  // ===== Expert ID Review =====
  flaggedForReview?: boolean; // When true, expert cannot publish until admin approves
  flagReason?: string; // Reason for flagging (from AI validation)
  flaggedAt?: string; // ISO timestamp when flagged
  reviewedAt?: string; // ISO timestamp when admin reviewed
  reviewedBy?: string; // Admin user ID who reviewed
  reviewStatus?: 'pending' | 'approved' | 'rejected'; // Review status

  // ===== Platform Preferences =====
  platformPreferences?: ExpertPlatformPreferences;

  // ===== Payments =====
  stripeConnect?: StripeConnectDetails; // Stripe Connect for receiving course payments

  // ===== Domain & Multi-tenancy =====
  primaryDomain?: string; // e.g., "kavithayoga.com" (custom domain)
  additionalDomains?: string[]; // e.g., ["kavitha.myyoga.guru"]
  featuredOnPlatform?: boolean; // Show on myyoga.guru browse
  status?: TenantStatus;

  // ===== Custom Domain Configuration =====
  emailConfig?: TenantEmailConfig; // BYOD Email Configuration
  branding?: TenantBranding; // Custom branding (favicon, metadata)
  cloudflareDns?: CloudflareDnsConfig; // Cloudflare DNS for custom domains
}

// Course Related Types
export type CourseStatus = 'IN_PROGRESS' | 'PUBLISHED' | 'ARCHIVED';

export type CourseLevel =
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced'
  | 'All Levels'
  | 'All Trimesters'
  | 'New Mothers'
  | 'Beginner to Advanced';
export type CourseCategory =
  | 'Vinyasa'
  | 'Power Yoga'
  | 'Yin Yoga'
  | 'Meditation'
  | 'Prenatal'
  | 'Postnatal'
  | 'Restorative'
  | 'Hatha'
  | 'Ashtanga';

export interface Instructor {
  id: string;
  name: string;
  title?: string;
  avatar?: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  isFree?: boolean;
  completed?: boolean;
  completedAt?: string;
  notes?: string;
  locked?: boolean;
  description?: string;
  videoUrl?: string; // Deprecated: use cloudflareVideoId instead
  cloudflareVideoId?: string; // Cloudflare Stream video UID
  cloudflareVideoStatus?: 'uploading' | 'processing' | 'ready' | 'error';
  resources?: string[];
}

export interface Curriculum {
  week: number;
  title: string;
  lessons: Lesson[];
}

export type ReviewStatus = 'submitted' | 'published';

export interface CourseReview {
  id: string;
  user: string; // Display name
  userId: string; // User ID (required)
  rating: number; // 1-5 stars
  date: string; // Date submitted
  comment: string; // Review text
  verified?: boolean; // Verified purchase badge
  status: ReviewStatus; // Review approval status
  courseProgress?: number; // Percentage complete when reviewed
  createdAt?: string; // ISO timestamp when created
  updatedAt?: string; // ISO timestamp when last updated
}

export interface Course extends BaseEntity {
  title: string;
  description: string;
  instructor: Instructor;
  thumbnail: string;
  coverImage?: string; // Cover image URL for course cards and hero banner
  promoVideo?: string; // Deprecated: use promoVideoCloudflareId instead
  promoVideoCloudflareId?: string; // Cloudflare Stream video UID for promo video
  promoVideoStatus?: 'uploading' | 'processing' | 'ready' | 'error';
  level: CourseLevel;
  duration: string;
  totalLessons: number;
  freeLessons: number;
  price: number;
  currency: SupportedCurrency; // Currency for the price (expert's preferred currency)
  rating: number;
  totalRatings?: number;
  totalStudents: number;
  category: CourseCategory;
  tags: string[];
  featured?: boolean;
  isNew?: boolean;
  status?: CourseStatus;
  requirements?: string[];
  whatYouWillLearn?: string[];
  curriculum?: Curriculum[];
  reviews?: CourseReview[];
}

// User Related Types
export type MembershipType = 'free' | 'curious' | 'committed' | 'lifetime';
export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'paused';
export type BillingInterval = 'monthly' | 'yearly';

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

export interface Membership {
  type: MembershipType;
  status: MembershipStatus;
  startDate: string;
  renewalDate?: string;
  cancelledAt?: string;
  benefits: string[];

  billingInterval?: BillingInterval; // 'monthly' | 'yearly'
  currentPeriodEnd?: string; // When current billing period ends
  cancelAtPeriodEnd?: boolean; // True if user has cancelled but still has access
  paymentGateway?: 'stripe' | 'razorpay';
}

export interface UserStatistics {
  totalCourses: number;
  completedCourses: number;
  totalLessons: number;
  completedLessons: number;
  totalPracticeTime: number; // in minutes
  currentStreak: number;
  longestStreak: number;
  lastPractice: string;
  averageSessionTime: number; // in minutes
  favoriteCategory?: CourseCategory;
  level?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
  points?: number;
}

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

export interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  reminderTime?: string;
  reminderDays?: string[];
  preferredDuration?: string;
  focusAreas?: string[];
  difficultyLevel?: string;
  language?: string;
  videoQuality?: 'sd' | 'hd' | '4k';
  autoPlayEnabled?: boolean;
  preferredCurrency?: SupportedCurrency; // Learner's preferred display currency
}

export interface Payment {
  date: string;
  amount: number;
  method: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded' | 'scheduled';
  description?: string;
  invoice?: string;
}

export interface Billing {
  lastPayment?: Payment;
  nextPayment?: Payment;
  paymentHistory?: Payment[];
  stripeCustomerId?: string;
  razorpayCustomerId?: string;
}

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

export interface UserSocial {
  following: string[];
  followers: number;
  friends?: number;
  sharedAchievements?: boolean;
  publicProfile?: boolean;
}

export interface User extends BaseEntity {
  role: UserRole[]; // User roles array: ['learner'], ['learner', 'expert'], etc.
  expertProfile?: string; // Expert ID if user is an expert
  signupExperts?: string[]; // Array of expert IDs where user signed up (from subdomains)
  profile: UserProfile;
  membership: Membership;
  statistics: UserStatistics;
  achievements: Achievement[];
  enrolledCourses: EnrolledCourse[];
  preferences: UserPreferences;
  billing?: Billing;
  savedItems?: SavedItem;
  social?: UserSocial;
  // Expert meeting settings
  defaultMeetingLink?: string;
  defaultMeetingPlatform?: 'zoom' | 'google-meet' | 'other';
}

// Progress Related Types
export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  completedAt?: string;
  timeSpent?: number;
  notes?: string;
}

export interface SessionHistory {
  date: string;
  lessonsCompleted: string[];
  duration: number;
  notes?: string;
}

export interface ProgressNote {
  lessonId: string;
  note: string;
  timestamp: string;
  isPrivate?: boolean;
}

export interface ProgressFeedback {
  overall?: string;
  improvement?: string;
  nextGoal?: string;
}

export interface CourseProgress {
  id: string; // Format: {userId}_{courseId}
  courseId: string;
  userId: string;
  enrolledAt: string;
  lastAccessed: string;
  completedAt?: string;

  // Progress tracking
  totalLessons: number;
  completedLessons: string[]; // Array of completed lesson IDs
  percentComplete: number;

  // Current position
  currentLessonId?: string;
  currentLesson?: {
    id: string;
    title: string;
    duration: string;
    position?: number;
  };

  // Time tracking
  totalTimeSpent: number; // in minutes
  averageSessionTime?: number; // in minutes

  // Streak tracking
  streak?: number;
  longestStreak?: number;
  lastPracticeDate?: string;

  // Detailed tracking
  lessonProgress: LessonProgress[];
  sessions?: SessionHistory[];
  notes?: ProgressNote[];

  // Achievements unlocked for this course
  achievementIds?: string[];
  achievements?: Achievement[];

  // Feedback
  feedback?: ProgressFeedback;
  lastCompletedLesson?: {
    id: string;
    title: string;
    completedAt: string;
  };

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

export interface NextLesson {
  id: string;
  title: string;
  duration: string;
  description?: string;
  preview?: string;
  equipment?: string[];
  focus?: string[];
}

export interface Recommendation {
  type: 'tip' | 'suggestion' | 'reminder' | 'warning';
  message: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface CommunityActivity {
  user: string;
  action: string;
  timestamp: string;
}

export interface Community {
  classmates?: number;
  yourRank?: number;
  recentActivity?: CommunityActivity[];
}

export interface ProgressData {
  courseId: string;
  savePoint: string;
  userId: string;
  userInfo?: {
    name: string;
    email: string;
    membership: string;
  };
  progress: CourseProgress;
  nextLesson?: NextLesson;
  recommendations?: Recommendation[];
  community?: Community;
}

// User Course Data (for authenticated endpoints)
export interface UserCourseData extends Course {
  enrolledAt: string;
  lastAccessed: string;
  completedLessons: number;
  percentComplete: number;
  certificateAvailable?: boolean;
  certificateUrl?: string;
  completedAt?: string;
  nextLesson?: NextLesson;
  progress: {
    totalLessons: number;
    completedLessons: number;
    percentComplete: number;
    currentLesson?: {
      id: string;
      title: string;
      duration: string;
      position?: number;
    };
    streak: number;
    longestStreak?: number;
    totalTimeSpent: number;
    averageSessionTime: number;
    lastCompletedLesson?: {
      id: string;
      title: string;
      completedAt: string;
    };
  };
  curriculum?: Array<{
    week: number;
    title: string;
    lessons: Array<
      Lesson & {
        completed: boolean;
        completedAt?: string;
      }
    >;
  }>;
  notes?: ProgressNote[];
  achievements?: Achievement[];
  resources?: Array<{
    id: string;
    title: string;
    type: string;
    url: string;
    size: string;
  }>;
}

export interface RecommendedCourse {
  id: string;
  title: string;
  description: string;
  instructor: Instructor;
  thumbnail: string;
  level: CourseLevel;
  price: number;
  rating: number;
  matchScore?: number;
  reason?: string;
}

export interface UserCoursesData {
  enrolled: UserCourseData[];
  recommended: RecommendedCourse[];
  statistics: {
    totalEnrolled: number;
    completed: number;
    inProgress: number;
    totalTimeSpent: number;
    currentStreak: number;
  };
}

// Asset Related Types
export type AssetType = 'image' | 'video' | 'document';
export type AssetCategory =
  | 'avatar'
  | 'banner'
  | 'thumbnail'
  | 'course'
  | 'lesson'
  | 'about'
  | 'logo'
  | 'blog_cover'
  | 'blog_inline'
  | 'blog_attachment'
  | 'value_prop'
  | 'other';

export interface AssetDimensions {
  width: number;
  height: number;
}

export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom?: number;
}

export interface Asset extends BaseEntity {
  tenantId: string; // Expert ID that owns this asset (used as PK partition)
  filename: string;
  originalUrl: string; // Cloudflare Images URL for original
  croppedUrl?: string; // Cloudflare Images URL for cropped version
  cloudflareImageId: string; // Original image ID
  croppedCloudflareImageId?: string; // Cropped image ID
  type: AssetType;
  category: AssetCategory;
  dimensions: AssetDimensions;
  cropData?: CropData;
  size: number; // in bytes
  mimeType: string;
  uploadedBy?: string; // User ID
  relatedTo?: {
    type: 'expert' | 'user' | 'course' | 'lesson';
    id: string;
  };
  metadata?: Record<string, unknown>;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Survey Related Types
export type QuestionType = 'multiple-choice' | 'text';

// Survey status: draft (not visible), active (accepting responses), closed (preserved, can reopen), archived (soft delete)
export type SurveyStatus = 'draft' | 'active' | 'closed' | 'archived';

export interface QuestionOption {
  id: string;
  label: string;
}

export interface SurveyQuestion {
  id: string;
  questionText: string;
  type: QuestionType;
  options?: QuestionOption[]; // Only for multiple-choice questions
  required: boolean;
  order: number;
}

export interface SurveyContactInfo {
  collectName: boolean;
  nameRequired: boolean;
  collectEmail: boolean;
  emailRequired: boolean;
  collectPhone: boolean;
  phoneRequired: boolean;
}

export interface Survey extends BaseEntity {
  expertId: string;
  title: string;
  description?: string;
  contactInfo?: SurveyContactInfo;
  questions: SurveyQuestion[];
  status: SurveyStatus;
  closedAt?: string;
  archivedAt?: string;
  responseCount?: number;
  // Deprecated: isActive - use status instead
  isActive?: boolean;
}

export interface SurveyAnswer {
  questionId: string;
  answer: string; // For text questions, this is the free text. For multiple-choice, this is the option ID
}

export interface SurveyResponseContactInfo {
  name?: string;
  email?: string;
  phone?: string;
}

export interface SurveyResponse extends BaseEntity {
  surveyId: string;
  expertId: string;
  userId?: string; // Optional, as guests can also respond
  contactInfo?: SurveyResponseContactInfo; // Contact information collected from user
  answers: SurveyAnswer[];
  submittedAt: string;
}

// Discussion Related Types
export type VoteType = 'up' | 'down';

export interface Discussion extends BaseEntity {
  courseId: string;
  lessonId: string;
  userId: string;
  userRole: UserRole;
  userName: string;
  userAvatar?: string;
  content: string;
  parentId?: string; // null/undefined for top-level discussions, ID for replies
  upvotes: number;
  downvotes: number;
  isPinned: boolean;
  isResolved: boolean;
  isHidden: boolean;
  editedAt?: string;
  deletedAt?: string;
}

export interface DiscussionVote extends BaseEntity {
  discussionId: string;
  userId: string;
  voteType: VoteType;
}

export interface DiscussionThread extends Discussion {
  replies: DiscussionThread[]; // Recursive type for nested replies
  userVote?: VoteType; // Current user's vote on this discussion
  netScore: number; // upvotes - downvotes
}

// Admin Dashboard Types
export interface AdminStats {
  totalUsers: number;
  totalLearners: number;
  totalExperts: number;
  activeUsers: number; // Users active in last 30 days
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  recentSignups: number; // Users signed up in last 7 days
}

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole[];
  membershipType: MembershipType;
  membershipStatus: MembershipStatus;
  joinedAt: string;
  lastActive: string;
  totalCourses: number;
  totalSpent: number;
  status: 'active' | 'suspended';
}

export interface ExpertListItem {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  expertId: string;
  joinedAt: string;
  lastActive: string;
  totalCourses: number;
  totalStudents: number;
  totalRevenue: number;
  featured: boolean;
  status: 'active' | 'suspended';
}

// Payment Transaction Types (for payment processing)
export type PaymentStatus =
  | 'initiated'
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type PaymentGateway = 'stripe' | 'razorpay';

export type PaymentType =
  | 'course_enrollment'
  | 'webinar_registration'
  | 'one_time'
  | 'boost_campaign';

export interface PaymentMetadata {
  chargeId?: string;
  customerId?: string;
  last4?: string;
  brand?: string;
  country?: string;
  errorCode?: string;
  errorMessage?: string;
  declineCode?: string;
  userAgent?: string;
  ipAddress?: string;
  [key: string]: unknown;
}

export interface PaymentTransaction extends BaseEntity {
  userId: string;
  courseId?: string;
  webinarId?: string;
  itemType: PaymentType;
  itemId: string;
  amount: number;
  currency: string;
  gateway: PaymentGateway;
  status: PaymentStatus;
  paymentIntentId: string;
  paymentMethodId?: string;
  initiatedAt: string;
  completedAt?: string;
  failedAt?: string;
  refundedAt?: string;
  metadata?: PaymentMetadata;
}

// Blog Related Types
export type BlogPostStatus = 'draft' | 'published';

export interface BlogPostAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface BlogPost extends BaseEntity {
  expertId: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string; // Tiptap JSON content stored as string
  coverImage?: string;
  status: BlogPostStatus;
  publishedAt?: string;
  readTimeMinutes: number;
  tags?: string[];
  attachments?: BlogPostAttachment[];
  likeCount: number;
  commentCount: number;
}

export interface BlogComment extends BaseEntity {
  postId: string;
  expertId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  editedAt?: string;
}

export interface BlogLike {
  postId: string;
  userId: string;
  createdAt: string;
}

// ============================================
// Webinar Related Types
// ============================================

export type WebinarStatus = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

// Video platform for webinar sessions
export type VideoPlatform = 'google_meet' | 'zoom' | 'none';

export type RecordingStatus = 'pending' | 'uploading' | 'processing' | 'ready' | 'error';

export interface WebinarSession {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  duration: number; // in minutes
  // Google Meet fields
  googleMeetLink?: string; // Generated Google Meet link
  googleEventId?: string; // Google Calendar event ID
  // Zoom fields
  zoomMeetingId?: string; // Zoom meeting ID
  zoomMeetingLink?: string; // Zoom meeting URL (for backward compatibility)
  zoomJoinUrl?: string; // Zoom join URL for participants
  zoomStartUrl?: string; // Zoom start URL for host
  zoomPassword?: string; // Zoom meeting password
  // Recording fields
  recordingCloudflareId?: string; // Cloudflare Stream video ID for recording
  recordingStatus?: RecordingStatus;
}

export interface WebinarFeedback {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5 stars
  comment: string;
  createdAt: string;
  status: ReviewStatus;
}

export interface Webinar extends BaseEntity {
  expertId: string;
  title: string;
  description: string;
  thumbnail?: string;
  coverImage?: string;
  promoVideoCloudflareId?: string;
  promoVideoStatus?: 'uploading' | 'processing' | 'ready' | 'error';
  price: number;
  currency: SupportedCurrency; // Currency for the price (expert's preferred currency)
  maxParticipants?: number; // Optional capacity limit
  status: WebinarStatus;
  videoPlatform?: VideoPlatform; // Video conferencing platform for sessions
  sessions: WebinarSession[];
  totalRegistrations: number;
  rating?: number;
  totalRatings?: number;
  tags?: string[];
  category?: CourseCategory;
  level?: CourseLevel;
  requirements?: string[];
  whatYouWillLearn?: string[];
  feedback?: WebinarFeedback[]; // Embedded for simplicity
}

export type WebinarRegistrationStatus = 'registered' | 'cancelled' | 'attended' | 'no_show';

export interface WebinarRemindersSent {
  dayBefore?: boolean;
  hourBefore?: boolean;
}

export interface WebinarRegistration extends BaseEntity {
  webinarId: string;
  userId: string;
  expertId: string;
  userName?: string;
  userEmail?: string;
  registeredAt: string;
  paymentId?: string;
  status: WebinarRegistrationStatus;
  remindersSent: WebinarRemindersSent;
  attendedSessions?: string[]; // Session IDs attended
  feedbackSubmitted?: boolean;
}

// Expert's Google OAuth tokens (secure storage)
export interface ExpertGoogleAuth extends BaseEntity {
  expertId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string; // ISO timestamp when access token expires
  email: string; // Google account email
  scope: string;
}

// Expert's Zoom OAuth tokens (secure storage)
export interface ExpertZoomAuth extends BaseEntity {
  expertId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string; // ISO timestamp when access token expires
  email: string; // Zoom account email
  accountId: string; // Zoom account ID
  userId: string; // Zoom user ID
  scope: string;
}

// Webinar payment type extension
export type WebinarPaymentType = 'webinar_registration';

// ========================================
// Email Inbox Types
// ========================================

// Email address with optional display name
export interface EmailAddress {
  name?: string;
  email: string;
}

// Email attachment stored in S3
export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  s3Key: string; // Path in S3 parsed/ prefix
  contentId?: string; // For inline images (cid: references)
}

// Email message record
export interface Email extends BaseEntity {
  expertId: string;
  messageId: string; // Original email Message-ID header
  threadId?: string; // For grouping conversations
  inReplyTo?: string; // Message-ID of parent email
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  attachments: EmailAttachment[];
  receivedAt: string; // ISO timestamp
  isRead: boolean;
  isStarred: boolean;
  isOutgoing: boolean; // true for replies sent by expert
  status: 'received' | 'sent' | 'failed';
  errorMessage?: string; // If status is 'failed'
}

// Paginated email list result
export interface EmailListResult {
  emails: Email[];
  totalCount: number;
  unreadCount: number;
  lastKey?: string; // For pagination
}

// Email filters for listing
export interface EmailFilters {
  unreadOnly?: boolean;
  starredOnly?: boolean;
  search?: string;
  limit?: number;
  lastKey?: string;
}

// ========================================
// Discoverability Boost Types
// ========================================

// Wallet transaction types
export type WalletTransactionType =
  | 'deposit' // Expert adds funds
  | 'boost_spend' // Funds used for boost
  | 'refund' // Boost cancelled/refunded
  | 'adjustment'; // Manual adjustment

export type WalletTransactionStatus = 'pending' | 'completed' | 'failed';

// Wallet transaction record
export interface WalletTransaction extends BaseEntity {
  expertId: string;
  type: WalletTransactionType;
  amount: number; // In cents (positive for deposits, negative for spends)
  currency: string; // 'USD' or 'INR'
  status: WalletTransactionStatus;
  paymentIntentId?: string; // For deposits via Stripe/Razorpay
  boostId?: string; // For boost_spend transactions
  description?: string;
  metadata?: Record<string, unknown>;
}

// Expert wallet balance
export interface ExpertWallet extends BaseEntity {
  expertId: string;
  balance: number; // In cents
  currency: string; // Primary currency ('USD' or 'INR')
  totalDeposited: number; // Lifetime deposits
  totalSpent: number; // Lifetime boost spend
  lastTransactionAt?: string;
}

// Boost goal options
export type BoostGoal =
  | 'get_students' // Get more course enrollments
  | 'promote_course' // Promote a specific course
  | 'brand_awareness'; // Increase expert visibility

// Boost status lifecycle
export type BoostStatus =
  | 'draft' // AI generated, not submitted
  | 'pending_payment' // Awaiting payment from expert
  | 'pending_approval' // Submitted to Meta, awaiting review
  | 'active' // Running on Meta
  | 'paused' // Paused by expert or system
  | 'completed' // Budget exhausted or ended
  | 'rejected' // Rejected by Meta
  | 'failed'; // Technical failure

// Targeting configuration for ads
export interface BoostTargeting {
  ageMin?: number;
  ageMax?: number;
  genders?: ('male' | 'female' | 'all')[];
  locations?: string[]; // Country codes or city names
  interests?: string[]; // Meta interest targeting IDs
  customAudiences?: string[];
}

// Ad creative content
export interface BoostCreative {
  headline: string; // Max 40 chars
  primaryText: string; // Max 125 chars for feed
  description?: string; // Max 30 chars
  callToAction: string;
  imageUrl?: string;
  videoUrl?: string;
}

// Performance metrics from Meta
export interface BoostMetrics {
  impressions: number;
  clicks: number;
  ctr: number; // Click-through rate
  spend: number; // Amount spent in cents
  conversions: number; // Enrollments/registrations
  costPerClick?: number;
  costPerConversion?: number;
  lastSyncedAt: string;
}

// Main Boost entity
export interface Boost extends BaseEntity {
  expertId: string;
  goal: BoostGoal;
  courseId?: string; // For 'promote_course' goal

  // Budget
  budget: number; // Total budget in cents
  dailyBudget?: number; // Optional daily cap
  spentAmount: number; // Amount spent so far
  currency: string; // 'USD' or 'INR'

  // Status
  status: BoostStatus;
  statusMessage?: string; // Error or rejection reason

  // Scheduling
  startDate?: string;
  endDate?: string;

  // AI Generated Content
  targeting: BoostTargeting;
  creative: BoostCreative;
  alternativeCreatives?: BoostCreative[]; // AI alternatives

  // Meta Ads API IDs (populated when submitted)
  metaCampaignId?: string;
  metaAdSetId?: string;
  metaAdId?: string;

  // Performance
  metrics?: BoostMetrics;

  // Timestamps
  submittedAt?: string;
  approvedAt?: string;
  pausedAt?: string;
  completedAt?: string;
}

// Boost list result for pagination
export interface BoostListResult {
  boosts: Boost[];
  totalCount: number;
  activeCount: number;
  lastKey?: string;
}
