'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import type { UserCoursesData } from '@/types';

export default function MyCourses() {
  const { user } = useAuth();
  const [userCourses, setUserCourses] = useState<UserCoursesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed' | 'not-started'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'progress' | 'enrollment'>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchUserCourses = async () => {
      try {
        const response = await fetch('/data/app/courses');
        const data = await response.json();

        if (data.success) {
          setUserCourses(data.data);
        }
      } catch (error) {
        console.error('[my-courses] Error fetching user courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserCourses();
  }, []);

  if (!user) {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#666' }}>Loading user data...</div>
        </div>
      </div>
    );
  }

  const enrolledCourses = userCourses?.enrolled || [];

  // Filter courses
  const filteredCourses = enrolledCourses.filter(course => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor.name.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesFilter = true;
    if (filter === 'in-progress') {
      matchesFilter = course.percentComplete > 0 && course.percentComplete < 100;
    } else if (filter === 'completed') {
      matchesFilter = course.percentComplete === 100;
    } else if (filter === 'not-started') {
      matchesFilter = course.percentComplete === 0;
    }

    return matchesSearch && matchesFilter;
  });

  // Sort courses
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
    } else if (sortBy === 'progress') {
      return b.percentComplete - a.percentComplete;
    } else if (sortBy === 'enrollment') {
      return new Date(b.enrolledAt || '').getTime() - new Date(a.enrolledAt || '').getTime();
    }
    return 0;
  });

  const getStatusColor = (percentComplete: number) => {
    if (percentComplete === 0) return '#e2e8f0';
    if (percentComplete === 100) return 'var(--color-highlight)';
    return 'var(--color-primary)';
  };

  const getStatusText = (percentComplete: number) => {
    if (percentComplete === 0) return 'Not Started';
    if (percentComplete === 100) return 'Completed';
    return 'In Progress';
  };

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <Link
              href="/app"
              style={{
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              ← Back to Dashboard
            </Link>
          </div>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: '600',
              marginBottom: '8px',
            }}
          >
            My Courses
          </h1>
          <p style={{ fontSize: '16px', color: '#666' }}>Manage and track your enrolled courses</p>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
        {/* Filters and Controls */}
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              gap: '20px',
              alignItems: 'center',
            }}
          >
            {/* Search */}
            <div>
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
            </div>

            {/* Filter */}
            <div>
              <select
                value={filter}
                onChange={e =>
                  setFilter(e.target.value as 'all' | 'in-progress' | 'completed' | 'not-started')
                }
                style={{
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: '#fff',
                }}
              >
                <option value="all">All Courses</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="not-started">Not Started</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'recent' | 'progress' | 'enrollment')}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: '#fff',
                }}
              >
                <option value="recent">Recently Accessed</option>
                <option value="progress">Progress</option>
                <option value="enrollment">Enrollment Date</option>
              </select>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '20px',
            }}
          >
            <div style={{ fontSize: '14px', color: '#666' }}>
              Showing {sortedCourses.length} of {enrolledCourses.length} courses
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '8px 12px',
                  background: viewMode === 'grid' ? 'var(--color-primary)' : '#e2e8f0',
                  color: viewMode === 'grid' ? '#fff' : '#666',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  padding: '8px 12px',
                  background: viewMode === 'list' ? 'var(--color-primary)' : '#e2e8f0',
                  color: viewMode === 'list' ? '#fff' : '#666',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* Courses */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '16px', color: '#666' }}>Loading your courses...</div>
          </div>
        ) : sortedCourses.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                viewMode === 'grid' ? 'repeat(auto-fill, minmax(350px, 1fr))' : '1fr',
              gap: '24px',
            }}
          >
            {sortedCourses.map(course => (
              <Link
                key={course.id}
                href={`/app/courses/${course.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    background: '#fff',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                    display: viewMode === 'list' ? 'flex' : 'block',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  }}
                >
                  {/* Course Thumbnail */}
                  <div
                    style={{
                      height: viewMode === 'list' ? '120px' : '180px',
                      width: viewMode === 'list' ? '200px' : '100%',
                      backgroundImage: `url(${course.thumbnail})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      position: 'relative',
                      flexShrink: 0,
                    }}
                  >
                    {/* Status Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        padding: '4px 12px',
                        background: getStatusColor(course.percentComplete),
                        color: '#fff',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}
                    >
                      {getStatusText(course.percentComplete)}
                    </div>

                    {/* Progress Bar */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'rgba(0,0,0,0.2)',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${course.percentComplete}%`,
                          background: getStatusColor(course.percentComplete),
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Course Info */}
                  <div style={{ padding: '20px', flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          background: '#f7fafc',
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: 'var(--color-primary)',
                          fontWeight: '600',
                        }}
                      >
                        {course.category}
                      </span>
                      <span
                        style={{
                          padding: '4px 8px',
                          background: '#f7fafc',
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: '#4a5568',
                        }}
                      >
                        {course.level}
                      </span>
                    </div>

                    <h3
                      style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        marginBottom: '8px',
                        lineHeight: '1.4',
                      }}
                    >
                      {course.title}
                    </h3>

                    <p
                      style={{
                        fontSize: '14px',
                        color: '#666',
                        marginBottom: '16px',
                        lineHeight: '1.5',
                        display: viewMode === 'list' ? '-webkit-box' : 'block',
                        WebkitLineClamp: viewMode === 'list' ? 2 : 'none',
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {course.description}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px',
                      }}
                    >
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundImage: `url(${course.instructor.avatar})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      <span style={{ fontSize: '13px', color: '#4a5568' }}>
                        {course.instructor.name}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '12px',
                        borderTop: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        {course.completedLessons} of {course.totalLessons} lessons
                      </div>
                      <div
                        style={{
                          padding: '6px 12px',
                          background: getStatusColor(course.percentComplete),
                          color: '#fff',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        {course.percentComplete}%
                      </div>
                    </div>

                    {viewMode === 'list' && (
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                        Last accessed: {new Date(course.lastAccessed).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '60px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
              No courses found
            </h3>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              {searchQuery || filter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Start your yoga journey by enrolling in a course'}
            </p>
            <Link
              href="/courses"
              style={{
                padding: '12px 24px',
                background: 'var(--color-primary)',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Browse Courses
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
