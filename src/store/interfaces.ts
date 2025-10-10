import type { Expert, Course, Lesson } from '@/types';

/**
 * Interface for Expert store operations
 */
export interface IExpertStore {
  getAllExperts(): Expert[];
  getExpertById(id: string): Expert | undefined;
  saveExpert(expert: Expert): void;
}

/**
 * Interface for Course store operations
 */
export interface ICourseStore {
  getAllCourses(): Course[];
  getCourseById(id: string): Course | undefined;
  saveCourse(course: Course): void;
}

/**
 * Interface for CourseItem/Lesson store operations
 */
export interface ICourseItemStore {
  getAllCourseItems(): Record<string, Lesson[]>;
  getCourseItemsByCourseId(courseId: string): Lesson[] | undefined;
  getCourseItemById(courseId: string, itemId: string): Lesson | undefined;
  saveCourseItem(courseId: string, lesson: Lesson): void;
}
