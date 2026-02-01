// Yoga Vertical Types - Yoga-specific type definitions
// These types customize the generic core types for the yoga vertical

import type {
  Course as CoreCourse,
  Webinar as CoreWebinar,
  User as CoreUser,
  TenantUser as CoreTenantUser,
  UserStatistics as CoreUserStatistics,
  UserPreferences as CoreUserPreferences,
  UserCoursesData as CoreUserCoursesData,
  UserCourseData as CoreUserCourseData,
  RecommendedCourse as CoreRecommendedCourse,
  SupportedCurrency,
} from '@core/types';

/**
 * Yoga-specific course levels
 */
export type YogaCourseLevel =
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced'
  | 'All Levels'
  | 'All Trimesters'
  | 'New Mothers'
  | 'Beginner to Advanced';

/**
 * Yoga-specific course categories
 */
export type YogaCourseCategory =
  | 'Vinyasa'
  | 'Power Yoga'
  | 'Yin Yoga'
  | 'Meditation'
  | 'Prenatal'
  | 'Postnatal'
  | 'Restorative'
  | 'Hatha'
  | 'Ashtanga';

/**
 * Yoga Course - Core Course with yoga-specific types
 */
export type Course = CoreCourse<YogaCourseCategory, YogaCourseLevel, SupportedCurrency>;

/**
 * Yoga Webinar - Core Webinar with yoga-specific types
 */
export type Webinar = CoreWebinar<YogaCourseCategory, YogaCourseLevel, SupportedCurrency>;

/**
 * Yoga User Statistics
 */
export type UserStatistics = CoreUserStatistics<YogaCourseCategory>;

/**
 * Yoga User Preferences
 */
export type UserPreferences = CoreUserPreferences<SupportedCurrency>;

/**
 * Yoga User - Core User with yoga-specific types
 */
export type User = CoreUser<YogaCourseCategory, SupportedCurrency>;

/**
 * Yoga Tenant User
 */
export type TenantUser = CoreTenantUser<YogaCourseCategory, SupportedCurrency>;

/**
 * Yoga User Course Data
 */
export type UserCourseData = CoreUserCourseData<
  YogaCourseCategory,
  YogaCourseLevel,
  SupportedCurrency
>;

/**
 * Yoga User Courses Data
 */
export type UserCoursesData = CoreUserCoursesData<
  YogaCourseCategory,
  YogaCourseLevel,
  SupportedCurrency
>;

/**
 * Yoga Recommended Course
 */
export type RecommendedCourse = CoreRecommendedCourse<YogaCourseCategory, YogaCourseLevel>;

/**
 * Yoga vertical configuration
 */
export const verticalConfig = {
  name: 'Yoga',
  courseLevels: [
    'Beginner',
    'Intermediate',
    'Advanced',
    'All Levels',
    'All Trimesters',
    'New Mothers',
    'Beginner to Advanced',
  ] as YogaCourseLevel[],
  courseCategories: [
    'Vinyasa',
    'Power Yoga',
    'Yin Yoga',
    'Meditation',
    'Prenatal',
    'Postnatal',
    'Restorative',
    'Hatha',
    'Ashtanga',
  ] as YogaCourseCategory[],
  terminology: {
    expert: 'Instructor',
    course: 'Course',
    lesson: 'Lesson',
    webinar: 'Live Session',
    student: 'Student',
    practice: 'Practice',
  },
} as const;
