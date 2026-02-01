// Progress Types - Learning progress tracking

import type { Achievement } from "./user";
import type { Lesson } from "./content";
import type { SupportedCurrency } from "./currency";

/**
 * Lesson progress details
 */
export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  completedAt?: string;
  timeSpent?: number;
  notes?: string;
}

/**
 * Session history entry
 */
export interface SessionHistory {
  date: string;
  lessonsCompleted: string[];
  duration: number;
  notes?: string;
}

/**
 * Progress note
 */
export interface ProgressNote {
  lessonId: string;
  note: string;
  timestamp: string;
  isPrivate?: boolean;
}

/**
 * Progress feedback
 */
export interface ProgressFeedback {
  overall?: string;
  improvement?: string;
  nextGoal?: string;
}

/**
 * Course progress tracking
 */
export interface CourseProgress {
  id: string;
  courseId: string;
  userId: string;
  enrolledAt: string;
  lastAccessed: string;
  completedAt?: string;
  totalLessons: number;
  completedLessons: string[];
  percentComplete: number;
  currentLessonId?: string;
  currentLesson?: {
    id: string;
    title: string;
    duration: string;
    position?: number;
  };
  totalTimeSpent: number;
  averageSessionTime?: number;
  streak?: number;
  longestStreak?: number;
  lastPracticeDate?: string;
  lessonProgress: LessonProgress[];
  sessions?: SessionHistory[];
  notes?: ProgressNote[];
  achievementIds?: string[];
  achievements?: Achievement[];
  feedback?: ProgressFeedback;
  lastCompletedLesson?: {
    id: string;
    title: string;
    completedAt: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Next lesson recommendation
 */
export interface NextLesson {
  id: string;
  title: string;
  duration: string;
  description?: string;
  preview?: string;
  equipment?: string[];
  focus?: string[];
}

/**
 * Progress recommendation
 */
export interface Recommendation {
  type: "tip" | "suggestion" | "reminder" | "warning";
  message: string;
  priority?: "high" | "medium" | "low";
}

/**
 * Community activity
 */
export interface CommunityActivity {
  user: string;
  action: string;
  timestamp: string;
}

/**
 * Community statistics
 */
export interface Community {
  classmates?: number;
  yourRank?: number;
  recentActivity?: CommunityActivity[];
}

/**
 * Progress data with context
 */
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

/**
 * User course data with progress (for authenticated endpoints)
 */
export interface UserCourseData<
  TCategory extends string = string,
  TLevel extends string = string,
  TCurrency extends string = SupportedCurrency,
> {
  id: string;
  title: string;
  description: string;
  instructor: { id: string; name: string; title?: string; avatar?: string };
  thumbnail: string;
  coverImage?: string;
  promoVideo?: string;
  promoVideoCloudflareId?: string;
  promoVideoStatus?: "uploading" | "processing" | "ready" | "error";
  level: TLevel;
  duration: string;
  totalLessons: number;
  freeLessons: number;
  price: number;
  currency: TCurrency;
  rating: number;
  totalRatings?: number;
  totalStudents: number;
  category: TCategory;
  tags: string[];
  featured?: boolean;
  isNew?: boolean;
  status?: "IN_PROGRESS" | "PUBLISHED" | "ARCHIVED";
  requirements?: string[];
  whatYouWillLearn?: string[];
  reviews?: Array<{
    id: string;
    user: string;
    userId: string;
    rating: number;
    date: string;
    comment: string;
    verified?: boolean;
    status: "submitted" | "published";
    courseProgress?: number;
    createdAt?: string;
    updatedAt?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
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

/**
 * User courses data summary
 */
export interface UserCoursesData<
  TCategory extends string = string,
  TLevel extends string = string,
  TCurrency extends string = SupportedCurrency,
> {
  enrolled: UserCourseData<TCategory, TLevel, TCurrency>[];
  recommended: Array<{
    id: string;
    title: string;
    description: string;
    instructor: { id: string; name: string; title?: string; avatar?: string };
    thumbnail: string;
    level: TLevel;
    price: number;
    rating: number;
    matchScore?: number;
    reason?: string;
  }>;
  statistics: {
    totalEnrolled: number;
    completed: number;
    inProgress: number;
    totalTimeSpent: number;
    currentStreak: number;
  };
}
