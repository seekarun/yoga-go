'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { ExpertDashboardData } from '@/types/expertStats';
import { expertDashboardData } from '@/data/expertStatsData';

export default function ExpertDashboard() {
  const params = useParams();
  const expertId = params.expertId as string;
  const [dashboardData, setDashboardData] = useState<ExpertDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const data = expertDashboardData[expertId];
      setDashboardData(data || null);
      setLoading(false);
    }, 300);
  }, [expertId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Expert Not Found</h1>
          <p className="text-gray-600 mb-6">
            The expert dashboard you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            href="/srv"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Back to Expert Portal
          </Link>
        </div>
      </div>
    );
  }

  const { overview, courseEngagement, subscriberStats, revenueStats, engagementMetrics } =
    dashboardData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/srv" className="text-blue-600 hover:text-blue-700 text-sm mb-3 inline-block">
            ← Back to Expert Portal
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {dashboardData.expertName}&apos;s Dashboard
            </h1>
            <div className="text-left sm:text-right">
              <p className="text-sm text-gray-500">Last updated</p>
              <p className="text-sm font-medium text-gray-900">Just now</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Students</p>
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {overview.totalStudents.toLocaleString()}
            </p>
            <p className="text-sm text-green-600 mt-1">
              +{subscriberStats.subscriberGrowth}% this month
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Revenue</p>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              ${overview.totalRevenue.toLocaleString()}
            </p>
            <p className="text-sm text-green-600 mt-1">+{revenueStats.revenueGrowth}% this month</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Active Courses</p>
              <span className="text-2xl">📚</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{overview.totalCourses}</p>
            <p className="text-sm text-gray-500 mt-1">Live courses</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Average Rating</p>
              <span className="text-2xl">⭐</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{overview.averageRating.toFixed(1)}</p>
            <p className="text-sm text-gray-500 mt-1">Across all courses</p>
          </div>
        </div>

        {/* Add New Course Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow mb-8 border border-blue-200">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Create New Course</h2>
                <p className="text-gray-600">
                  Share your expertise by creating a new course for your students
                </p>
              </div>
              <Link
                href={`/srv/${expertId}/courses/create`}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
              >
                <span className="text-xl mr-2">+</span>
                Add New Course
              </Link>
            </div>
          </div>
        </div>

        {/* Course Engagement */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">My Courses</h2>
            <span className="text-sm text-gray-500">{courseEngagement.length} courses</span>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {courseEngagement.map(course => (
                <div key={course.courseId} className="border-b border-gray-200 pb-6 last:border-0">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {course.courseName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
                      <span>{course.totalEnrollments.toLocaleString()} enrollments</span>
                      <span>•</span>
                      <span>{course.activeStudents.toLocaleString()} active</span>
                      <span>•</span>
                      <span>
                        ⭐ {course.rating} ({course.totalReviews} reviews)
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/srv/${expertId}/courses/${course.courseId}`}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Manage Course
                      </Link>
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          course.trend === 'up'
                            ? 'bg-green-100 text-green-800'
                            : course.trend === 'down'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {course.trend === 'up'
                          ? '📈 Growing'
                          : course.trend === 'down'
                            ? '📉 Declining'
                            : '➡️ Stable'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Completion Rate</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${course.completionRate}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-10 text-right">
                          {course.completionRate}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-2">Avg. Progress</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${course.averageProgress}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-10 text-right">
                          {course.averageProgress}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-2">Revenue</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ${course.totalRevenue.toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-2">Per Student</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ${(course.totalRevenue / course.totalEnrollments).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Subscriber Stats */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Subscriber Statistics</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Subscribers</span>
                <span className="text-lg font-semibold text-gray-900">
                  {subscriberStats.activeSubscribers.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">New This Month</span>
                <span className="text-lg font-semibold text-green-600">
                  +{subscriberStats.newSubscribersThisMonth}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Churn Rate</span>
                <span className="text-lg font-semibold text-gray-900">
                  {subscriberStats.churnRate}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg. Lifetime Value</span>
                <span className="text-lg font-semibold text-gray-900">
                  ${subscriberStats.averageLifetimeValue}
                </span>
              </div>
            </div>
          </div>

          {/* Engagement Metrics */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Engagement Metrics</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Lessons Watched</span>
                <span className="text-lg font-semibold text-gray-900">
                  {engagementMetrics.totalLessonsWatched.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg. Watch Time</span>
                <span className="text-lg font-semibold text-gray-900">
                  {engagementMetrics.averageWatchTime} min
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Completion Rate</span>
                <span className="text-lg font-semibold text-gray-900">
                  {engagementMetrics.completionRate}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Peak Day</span>
                <span className="text-lg font-semibold text-gray-900">
                  {engagementMetrics.peakEngagementDay}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardData.recentActivity.map(activity => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 pb-4 border-b last:border-0"
                >
                  <span className="text-2xl">
                    {activity.type === 'enrollment'
                      ? '📝'
                      : activity.type === 'completion'
                        ? '✅'
                        : activity.type === 'review'
                          ? '⭐'
                          : '🎉'}
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-900">{activity.message}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
