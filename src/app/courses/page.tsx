'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Course } from '@/types';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        console.log('[DBG][courses-page] Fetching all courses...');
        const response = await fetch('/data/courses');
        const data = await response.json();

        if (data.success) {
          setCourses(data.data || []);
          console.log('[DBG][courses-page] Courses loaded:', data.data);
        }
      } catch (error) {
        console.error('[DBG][courses-page] Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // Get unique categories and levels
  const categories = ['all', ...new Set(courses.map(c => c.category))];
  const levels = ['all', ...new Set(courses.map(c => c.level))];

  // Filter courses
  const filteredCourses = courses.filter(course => {
    const categoryMatch = selectedCategory === 'all' || course.category === selectedCategory;
    const levelMatch = selectedLevel === 'all' || course.level === selectedLevel;
    return categoryMatch && levelMatch;
  });

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header Section */}
      <section
        style={{
          padding: '80px 20px',
          background: '#fff',
          textAlign: 'center',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <h1
          style={{
            fontSize: '48px',
            fontWeight: '600',
            marginBottom: '16px',
          }}
        >
          All Courses
        </h1>
        <p
          style={{
            fontSize: '20px',
            color: '#666',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          Discover our complete collection of yoga courses taught by expert instructors.
        </p>
      </section>

      {/* Filters Section */}
      <section
        style={{ padding: '40px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}
      >
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label
                htmlFor="category"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#4a5568',
                }}
              >
                Category
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                }}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1', minWidth: '200px' }}>
              <label
                htmlFor="level"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#4a5568',
                }}
              >
                Level
              </label>
              <select
                id="level"
                value={selectedLevel}
                onChange={e => setSelectedLevel(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                }}
              >
                {levels.map(level => (
                  <option key={level} value={level}>
                    {level === 'all' ? 'All Levels' : level}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: '0 0 auto', alignSelf: 'flex-end' }}>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Showing {filteredCourses.length} of {courses.length} courses
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Courses Grid */}
      <section style={{ padding: '80px 20px' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {loading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px',
              }}
            >
              <div style={{ fontSize: '16px', color: '#666' }}>Loading courses...</div>
            </div>
          ) : filteredCourses.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '32px',
              }}
            >
              {filteredCourses.map(course => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    style={{
                      background: '#fff',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'pointer',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
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
                    {/* Course Cover Image or Thumbnail */}
                    <div
                      style={{
                        height: '200px',
                        backgroundImage: `url(${course.coverImage || course.thumbnail})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative',
                      }}
                    >
                      {/* Badges */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '16px',
                          left: '16px',
                          display: 'flex',
                          gap: '8px',
                        }}
                      >
                        {course.isNew && (
                          <span
                            style={{
                              padding: '6px 12px',
                              background: '#48bb78',
                              color: '#fff',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                            }}
                          >
                            NEW
                          </span>
                        )}
                        {course.featured && (
                          <span
                            style={{
                              padding: '6px 12px',
                              background: '#764ba2',
                              color: '#fff',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                            }}
                          >
                            FEATURED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Course Info */}
                    <div
                      style={{
                        padding: '24px',
                        flex: '1',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {/* Category & Level */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            background: '#f7fafc',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: '#764ba2',
                            fontWeight: '600',
                          }}
                        >
                          {course.category}
                        </span>
                        <span
                          style={{
                            padding: '4px 12px',
                            background: '#f7fafc',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: '#4a5568',
                          }}
                        >
                          {course.level}
                        </span>
                      </div>

                      <h2
                        style={{
                          fontSize: '20px',
                          fontWeight: '600',
                          marginBottom: '8px',
                          lineHeight: '1.4',
                        }}
                      >
                        {course.title}
                      </h2>

                      <p
                        style={{
                          fontSize: '14px',
                          color: '#666',
                          lineHeight: '1.6',
                          marginBottom: '16px',
                          flex: '1',
                        }}
                      >
                        {course.description}
                      </p>

                      {/* Instructor */}
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
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundImage: `url(${course.instructor.avatar || '/images/default-avatar.jpg'})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundColor: '#e2e8f0',
                            border: '2px solid #fff',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          }}
                        />
                        <div style={{ fontSize: '14px', color: '#4a5568', fontWeight: '500' }}>
                          {course.instructor.name}
                        </div>
                      </div>

                      {/* Stats */}
                      <div
                        style={{
                          display: 'flex',
                          gap: '16px',
                          paddingTop: '16px',
                          borderTop: '1px solid #e2e8f0',
                          marginBottom: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#FFB800' }}>★</span>
                          <span style={{ fontSize: '14px', fontWeight: '600' }}>
                            {course.rating}
                          </span>
                        </div>
                        <div style={{ fontSize: '14px', color: '#666' }}>
                          {course.totalLessons} lessons
                        </div>
                        <div style={{ fontSize: '14px', color: '#666' }}>{course.duration}</div>
                      </div>

                      {/* Price */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ fontSize: '24px', fontWeight: '600', color: '#764ba2' }}>
                          ${course.price}
                        </div>
                        <div style={{ fontSize: '12px', color: '#48bb78' }}>
                          {course.freeLessons} free lessons
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '60px',
                background: '#fff',
                borderRadius: '16px',
              }}
            >
              <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>No courses found</h2>
              <p style={{ color: '#666' }}>Try adjusting your filters.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
