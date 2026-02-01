export interface CourseEngagement {
  courseId: string;
  courseName: string;
  totalEnrollments: number;
  activeStudents: number;
  completionRate: number;
  averageProgress: number;
  totalRevenue: number;
  rating: number;
  totalReviews: number;
  trend: 'up' | 'down' | 'stable';
}

export interface SubscriberStats {
  totalSubscribers: number;
  activeSubscribers: number;
  newSubscribersThisMonth: number;
  churnRate: number;
  averageLifetimeValue: number;
  subscriberGrowth: number; // percentage
}

export interface RevenueStats {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  averageRevenuePerUser: number;
  projectedMonthlyRevenue: number;
  revenueGrowth: number; // percentage
}

export interface EngagementMetrics {
  totalLessonsWatched: number;
  averageWatchTime: number; // minutes
  completionRate: number;
  averageSessionDuration: number; // minutes
  peakEngagementDay: string;
  peakEngagementHour: number;
}

export interface StudentDemographics {
  experienceLevel: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
  ageGroups: {
    '18-24': number;
    '25-34': number;
    '35-44': number;
    '45-54': number;
    '55+': number;
  };
  topLocations: Array<{
    location: string;
    count: number;
  }>;
}

export interface RecentActivity {
  id: string;
  type: 'enrollment' | 'completion' | 'review' | 'milestone';
  message: string;
  timestamp: string;
  courseId?: string;
  userId?: string;
}

export interface ExpertDashboardData {
  expertId: string;
  expertName: string;
  overview: {
    totalStudents: number;
    totalCourses: number;
    totalRevenue: number;
    averageRating: number;
  };
  courseEngagement: CourseEngagement[];
  subscriberStats: SubscriberStats;
  revenueStats: RevenueStats;
  engagementMetrics: EngagementMetrics;
  demographics: StudentDemographics;
  recentActivity: RecentActivity[];
}
