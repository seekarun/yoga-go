// Admin Types - Admin dashboard types

import type { UserRole, MembershipType, MembershipStatus } from "./user";

/**
 * Admin statistics
 */
export interface AdminStats {
  totalUsers: number;
  totalLearners: number;
  totalExperts: number;
  activeUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  recentSignups: number;
}

/**
 * User list item for admin
 */
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
  status: "active" | "suspended";
}

/**
 * Expert list item for admin
 */
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
  status: "active" | "suspended";
}
