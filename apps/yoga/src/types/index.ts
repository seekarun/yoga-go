// Yoga App Types
// Re-exports core types and provides yoga-specific type aliases

// Re-export all core types
export * from '@core/types';

// Re-export yoga-specific types (these override generic core types with yoga-specific versions)
export {
  type YogaCourseLevel,
  type YogaCourseCategory,
  type Course,
  type Webinar,
  type User,
  type TenantUser,
  type UserStatistics,
  type UserPreferences,
  type UserCourseData,
  type UserCoursesData,
  type RecommendedCourse,
  verticalConfig,
} from './vertical';

// Legacy type aliases for backward compatibility
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
