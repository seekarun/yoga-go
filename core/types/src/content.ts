// Content Types - Course and lesson types parameterized for verticals

import type { BaseEntity } from "./base";
import type { SupportedCurrency } from "./currency";

/**
 * Course status
 */
export type CourseStatus = "IN_PROGRESS" | "PUBLISHED" | "ARCHIVED";

/**
 * Instructor information
 */
export interface Instructor {
  id: string;
  name: string;
  title?: string;
  avatar?: string;
}

/**
 * Lesson/course item
 */
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
  videoUrl?: string;
  cloudflareVideoId?: string;
  cloudflareVideoStatus?: "uploading" | "processing" | "ready" | "error";
  resources?: string[];
}

/**
 * Curriculum week/section
 */
export interface Curriculum {
  week: number;
  title: string;
  lessons: Lesson[];
}

/**
 * Review status
 */
export type ReviewStatus = "submitted" | "published";

/**
 * Course review
 */
export interface CourseReview {
  id: string;
  user: string;
  userId: string;
  rating: number;
  date: string;
  comment: string;
  verified?: boolean;
  status: ReviewStatus;
  courseProgress?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Main Course entity - parameterized for vertical-specific categories and levels
 * TCategory: e.g., 'Vinyasa' | 'Hatha' for yoga, 'Painting' | 'Sculpture' for art
 * TLevel: e.g., 'Beginner' | 'Advanced' for general, 'All Trimesters' for prenatal yoga
 */
export interface Course<
  TCategory extends string = string,
  TLevel extends string = string,
  TCurrency extends string = SupportedCurrency,
> extends BaseEntity {
  title: string;
  description: string;
  instructor: Instructor;
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
  status?: CourseStatus;
  requirements?: string[];
  whatYouWillLearn?: string[];
  curriculum?: Curriculum[];
  reviews?: CourseReview[];
}

/**
 * Recommended course for user
 */
export interface RecommendedCourse<
  TCategory extends string = string,
  TLevel extends string = string,
> {
  id: string;
  title: string;
  description: string;
  instructor: Instructor;
  thumbnail: string;
  level: TLevel;
  price: number;
  rating: number;
  matchScore?: number;
  reason?: string;
}
