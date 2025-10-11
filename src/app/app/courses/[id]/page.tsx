'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import type { UserCourseData } from '@/types';

export default function CoursePlayer() {
  const { isAuthenticated } = useAuth();
  const params = useParams();
  const courseId = params.id as string;
  const [courseData, setCourseData] = useState<UserCourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'notes' | 'reviews'>(
    'overview'
  );
  const [currentLesson, setCurrentLesson] = useState(0);

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const response = await fetch(`/data/app/courses/${courseId}`);
        const data = await response.json();

        if (data.success) {
          setCourseData(data.data);
        }
      } catch (error) {
        console.error('[course-player] Error fetching course data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchCourseData();
    }
  }, [courseId, isAuthenticated]);

  if (loading) {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#666' }}>Loading course...</div>
        </div>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Course not found</h1>
          <p style={{ color: '#666', marginBottom: '24px' }}>
            The course you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to
            it.
          </p>
          <Link
            href="/app"
            style={{
              padding: '12px 24px',
              background: '#764ba2',
              color: '#fff',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const curriculum = courseData.curriculum || [];
  const allLessons = curriculum.flatMap(week => week.lessons);
  const currentLessonData = allLessons[currentLesson];

  const handleLessonComplete = (lessonId: string) => {
    // In a real app, this would make an API call to mark the lesson as complete
    // For now, we'll just show a success message
    alert(`Lesson ${lessonId} marked as complete! 🎉`);
  };

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Course Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <Link
              href="/app"
              style={{
                color: '#764ba2',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              ← Back to Dashboard
            </Link>
          </div>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
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
                  {courseData.category}
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
                  {courseData.level}
                </span>
              </div>
              <h1
                style={{
                  fontSize: '32px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  lineHeight: '1.2',
                }}
              >
                {courseData.title}
              </h1>
              <p
                style={{
                  fontSize: '16px',
                  color: '#666',
                  lineHeight: '1.6',
                  marginBottom: '16px',
                }}
              >
                {courseData.description}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundImage: `url(${courseData.instructor.avatar})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <span style={{ fontSize: '14px', color: '#4a5568' }}>
                    {courseData.instructor.name}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {courseData.completedLessons} of {courseData.totalLessons} lessons completed
                </div>
              </div>
            </div>
            <div style={{ width: '200px' }}>
              {/* Progress Ring */}
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: `conic-gradient(#48bb78 0deg ${courseData.percentComplete * 3.6}deg, #e2e8f0 ${courseData.percentComplete * 3.6}deg 360deg)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                }}
              >
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#48bb78',
                  }}
                >
                  {courseData.percentComplete}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px' }}>
          {/* Main Content */}
          <div>
            {/* Video Player */}
            <div
              style={{
                background: '#000',
                borderRadius: '12px',
                aspectRatio: '16/9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ textAlign: 'center', color: '#fff' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>▶️</div>
                <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                  {currentLessonData?.title || 'Select a lesson to begin'}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>
                  {currentLessonData?.duration || 'Video player coming soon'}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                {[
                  { id: 'overview' as const, label: 'Overview' },
                  { id: 'resources' as const, label: 'Resources' },
                  { id: 'notes' as const, label: 'Notes' },
                  { id: 'reviews' as const, label: 'Reviews' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      flex: 1,
                      padding: '16px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: activeTab === tab.id ? '#764ba2' : '#666',
                      borderBottom:
                        activeTab === tab.id ? '2px solid #764ba2' : '2px solid transparent',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ padding: '24px' }}>
                {activeTab === 'overview' && (
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                      Course Overview
                    </h3>
                    <p style={{ color: '#666', lineHeight: '1.6', marginBottom: '16px' }}>
                      {courseData.longDescription || courseData.description}
                    </p>
                    {courseData.whatYouWillLearn && (
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                          What you&apos;ll learn:
                        </h4>
                        <ul style={{ color: '#666', lineHeight: '1.6' }}>
                          {courseData.whatYouWillLearn.map((item, index) => (
                            <li key={index} style={{ marginBottom: '8px' }}>
                              ✓ {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'resources' && (
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                      Course Resources
                    </h3>
                    {courseData.resources && courseData.resources.length > 0 ? (
                      <div>
                        {courseData.resources.map(resource => (
                          <div
                            key={resource.id}
                            style={{
                              padding: '16px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              marginBottom: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                            }}
                          >
                            <div style={{ fontSize: '24px' }}>📄</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                {resource.title}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                {resource.type} • {resource.size}
                              </div>
                            </div>
                            <button
                              style={{
                                padding: '8px 16px',
                                background: '#764ba2',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              Download
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#666' }}>No resources available for this course.</p>
                    )}
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                      Your Notes
                    </h3>
                    {courseData.notes && courseData.notes.length > 0 ? (
                      <div>
                        {courseData.notes.map(note => (
                          <div
                            key={note.lessonId}
                            style={{
                              padding: '16px',
                              background: '#f8f8f8',
                              borderRadius: '8px',
                              marginBottom: '12px',
                            }}
                          >
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                              {new Date(note.createdAt).toLocaleDateString()}
                            </div>
                            <div>{note.note}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#666' }}>
                        No notes yet. Start taking notes as you learn!
                      </p>
                    )}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                      Student Reviews
                    </h3>
                    {courseData.reviews && courseData.reviews.length > 0 ? (
                      <div>
                        {courseData.reviews.map(review => (
                          <div
                            key={review.id}
                            style={{
                              padding: '16px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              marginBottom: '12px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '8px',
                              }}
                            >
                              <div style={{ fontWeight: '600' }}>{review.user}</div>
                              <div style={{ display: 'flex', gap: '2px' }}>
                                {[...Array(5)].map((_, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      color: i < review.rating ? '#FFB800' : '#e2e8f0',
                                      fontSize: '14px',
                                    }}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                {new Date(review.date).toLocaleDateString()}
                              </div>
                            </div>
                            <p style={{ color: '#666', lineHeight: '1.6' }}>{review.comment}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#666' }}>
                        No reviews yet. Be the first to review this course!
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                position: 'sticky',
                top: '84px',
              }}
            >
              <div
                style={{
                  padding: '20px',
                  borderBottom: '1px solid #e2e8f0',
                  background: '#f8f8f8',
                }}
              >
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                  Course Curriculum
                </h3>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {courseData.completedLessons} of {courseData.totalLessons} lessons completed
                </div>
              </div>

              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {curriculum.map((week, weekIndex) => (
                  <div key={weekIndex}>
                    <div
                      style={{
                        padding: '16px 20px',
                        background: '#f8f8f8',
                        borderBottom: '1px solid #e2e8f0',
                        fontSize: '14px',
                        fontWeight: '600',
                      }}
                    >
                      Week {week.week}: {week.title}
                    </div>
                    {week.lessons.map((lesson, lessonIndex) => {
                      const globalIndex =
                        curriculum
                          .slice(0, weekIndex)
                          .reduce((acc, w) => acc + w.lessons.length, 0) + lessonIndex;
                      const isActive = globalIndex === currentLesson;
                      const isCompleted = lesson.completed;

                      return (
                        <div
                          key={lesson.id}
                          style={{
                            padding: '12px 20px',
                            borderBottom: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            background: isActive ? '#f0f4ff' : 'transparent',
                            transition: 'background 0.2s',
                          }}
                          onClick={() => setCurrentLesson(globalIndex)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: isCompleted
                                  ? '#48bb78'
                                  : isActive
                                    ? '#764ba2'
                                    : '#e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                color: '#fff',
                                flexShrink: 0,
                              }}
                            >
                              {isCompleted ? '✓' : globalIndex + 1}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '14px',
                                  fontWeight: isActive ? '600' : '500',
                                  marginBottom: '4px',
                                  color: isActive ? '#764ba2' : '#000',
                                }}
                              >
                                {lesson.title}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                {lesson.duration}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {currentLessonData && (
                <div
                  style={{
                    padding: '20px',
                    borderTop: '1px solid #e2e8f0',
                    background: '#f8f8f8',
                  }}
                >
                  <button
                    onClick={() => handleLessonComplete(currentLessonData.id)}
                    disabled={currentLessonData.completed}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: currentLessonData.completed ? '#48bb78' : '#764ba2',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: currentLessonData.completed ? 'default' : 'pointer',
                    }}
                  >
                    {currentLessonData.completed ? '✓ Completed' : 'Mark as Complete'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
