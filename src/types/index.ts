// Base Types
export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

// User Role Types
export type UserRole = 'learner' | 'expert';

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

export interface CourseReview {
  id: string;
  user: string;
  userId?: string;
  rating: number;
  date: string;
  comment: string;
  verified?: boolean;
}

export interface Course extends BaseEntity {
  title: string;
  description: string;
  longDescription?: string;
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
export type MembershipType = 'free' | 'basic' | 'premium' | 'lifetime';
export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'paused';

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
  role: UserRole; // User role: learner or expert
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
  courseId: string;
  userId: string;
  totalLessons: number;
  completedLessons: number | string[]; // Can be count or array of IDs
  percentComplete: number;
  currentLesson?: {
    id: string;
    title: string;
    duration: string;
    position?: number;
  };
  lastAccessed: string;
  enrolledAt?: string;
  totalTimeSpent: number;
  streak?: number;
  longestStreak?: number;
  averageSessionTime?: number;
  sessions?: SessionHistory[];
  notes?: ProgressNote[];
  achievements?: Achievement[];
  feedback?: ProgressFeedback;
  lastCompletedLesson?: {
    id: string;
    title: string;
    completedAt: string;
  };
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
  notes?: Array<{
    lessonId: string;
    note: string;
    createdAt: string;
  }>;
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
  metadata?: Record<string, any>;
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
  isActive: boolean;
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
