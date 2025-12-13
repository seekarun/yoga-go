// Base Types
export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

// User Role Types
export type UserRole = 'learner' | 'expert' | 'admin';

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
    headline?: string; // Custom headline (problem hook)
    description?: string; // Custom description (results hook)
    ctaText?: string; // Call to action button text
    ctaLink?: string;
    alignment?: 'center' | 'left' | 'right'; // Text alignment
  };
  valuePropositions?: {
    type?: 'paragraph' | 'list'; // Display as paragraph or list
    content?: string; // Paragraph text (when type is 'paragraph')
    items?: string[]; // List items (when type is 'list')
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
    title?: string; // Act section title
    text?: string; // Act section description text
  };
  blog?: {
    title?: string; // Section title (default: "From the Blog")
    description?: string; // Section description
  };
  courses?: {
    title?: string; // Section title (default: "Courses")
    description?: string; // Section description
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
  };
  contact?: {
    email?: string;
    phone?: string;
    bookingUrl?: string;
  };
  // Section ordering and visibility for visual editor
  sectionOrder?: string[]; // e.g., ['hero', 'valuePropositions', 'about', 'act']
  disabledSections?: string[]; // Sections that are hidden but data preserved
}

// Expert Platform Preferences
export interface ExpertPlatformPreferences {
  featuredOnPlatform: boolean; // Show on myyoga.guru/courses
  defaultEmail?: string; // <expertId>@myyoga.guru (auto-assigned on signup)
  customEmail?: string; // Expert-provided email for sending (optional)
  emailVerified?: boolean; // Whether custom email is SES-verified
  forwardingEmail?: string; // Expert's personal email for receiving/forwarding
  emailForwardingEnabled?: boolean; // Whether to forward incoming emails
}

export interface Expert extends BaseEntity {
  name: string;
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
  userId?: string; // Link to User account
  customLandingPage?: CustomLandingPageConfig;
  onboardingCompleted?: boolean;
  promoVideo?: string; // Deprecated: use promoVideoCloudflareId instead
  promoVideoCloudflareId?: string; // Cloudflare Stream video UID for expert promo
  promoVideoStatus?: 'uploading' | 'processing' | 'ready' | 'error';

  // Platform preferences (subdomain, visibility, email)
  platformPreferences?: ExpertPlatformPreferences;
}

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
  name: string; // Display name (e.g., "Kavitha Yoga")
  slug: string; // URL-safe identifier (e.g., "kavitha")
  expertId: string; // Link to Expert entity

  // Domains
  primaryDomain: string; // e.g., "kavithayoga.com"
  additionalDomains?: string[]; // e.g., ["kavitha.myyoga.guru"]

  // Platform visibility
  featuredOnPlatform: boolean; // Show on myyoga.guru browse

  // Status
  status: TenantStatus;

  // BYOD Email Configuration (for custom domain email)
  emailConfig?: TenantEmailConfig;

  // Custom branding (favicon, metadata for custom domains)
  branding?: TenantBranding;
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

export type PaymentType = 'course_enrollment' | 'one_time';

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
