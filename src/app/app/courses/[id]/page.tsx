'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { trackLessonView, trackLessonComplete } from '@/lib/analytics';
import type { UserCourseData, Lesson } from '@/types';
import ReviewModal from '@/components/ReviewModal';

export default function CoursePlayer() {
  const { isAuthenticated } = useAuth();
  const params = useParams();
  const courseId = params.id as string;
  const [courseData, setCourseData] = useState<UserCourseData | null>(null);
  const [courseItems, setCourseItems] = useState<Lesson[]>([]);
  const [selectedItem, setSelectedItem] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [reviewEligibilityReason, setReviewEligibilityReason] = useState('');

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        console.log('[DBG][course-player] Fetching course data for:', courseId);

        // Fetch course details and progress
        const courseResponse = await fetch(`/data/app/courses/${courseId}`);
        const courseDataResult = await courseResponse.json();

        let completedLessonIds: string[] = [];

        if (courseDataResult.success) {
          setCourseData(courseDataResult.data);
          console.log('[DBG][course-player] Course data loaded:', courseDataResult.data.title);
          console.log('[DBG][course-player] Full course data:', courseDataResult.data);

          // Extract completed lesson IDs from progress
          const progressData = courseDataResult.data.progress;
          if (progressData?.completedLessons) {
            if (Array.isArray(progressData.completedLessons)) {
              completedLessonIds = progressData.completedLessons;
            }
          }
          console.log('[DBG][course-player] Completed lesson IDs:', completedLessonIds);
          console.log(
            '[DBG][course-player] Number of completed lessons:',
            completedLessonIds.length
          );
        }

        // Fetch course items (lessons/videos)
        const itemsResponse = await fetch(`/data/courses/${courseId}/items`);
        const itemsResult = await itemsResponse.json();

        console.log('[DBG][course-player] Items API response:', itemsResult);

        if (itemsResult.success && itemsResult.data) {
          // The API returns data as an array directly, not nested in data.items
          const items = Array.isArray(itemsResult.data) ? itemsResult.data : [];

          // Mark lessons as completed based on progress
          const itemsWithCompletion = items.map((item: Lesson) => ({
            ...item,
            completed: completedLessonIds.includes(item.id),
          }));

          console.log('[DBG][course-player] Loaded', itemsWithCompletion.length, 'course items');
          setCourseItems(itemsWithCompletion);

          // Auto-select first incomplete item, or first item if all complete
          const firstIncomplete = itemsWithCompletion.find((item: Lesson) => !item.completed);
          const itemToSelect = firstIncomplete || itemsWithCompletion[0];

          if (itemToSelect) {
            setSelectedItem(itemToSelect);
            console.log('[DBG][course-player] Auto-selected item:', itemToSelect.title);
          }
        } else {
          console.error('[DBG][course-player] Failed to load items:', itemsResult.error);
        }
      } catch (error) {
        console.error('[DBG][course-player] Error fetching course data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchCourseData();
    }
  }, [courseId, isAuthenticated]);

  // Track lesson view when lesson is selected
  useEffect(() => {
    if (selectedItem && courseId) {
      trackLessonView(courseId, selectedItem.id).catch(err => {
        console.error('[DBG][course-player] Failed to track lesson view:', err);
      });
    }
  }, [selectedItem, courseId]);

  // Check if user can review this course
  useEffect(() => {
    const checkReviewEligibility = async () => {
      if (!courseData || !courseId) return;

      try {
        // The API will check: enrolled, 25% progress, no existing review
        const response = await fetch(`/api/courses/${courseId}/reviews/eligibility`);
        if (response.status === 404) {
          // Route doesn't exist yet, we'll check client-side
          const progress = courseData.percentComplete || 0;
          if (progress >= 25) {
            setCanReview(true);
            setReviewEligibilityReason('');
          } else {
            setCanReview(false);
            setReviewEligibilityReason(
              `Complete at least 25% of the course to write a review (current: ${progress}%)`
            );
          }
          return;
        }

        const data = await response.json();
        if (data.canReview) {
          setCanReview(true);
          setReviewEligibilityReason('');
        } else {
          setCanReview(false);
          setReviewEligibilityReason(data.reason || 'You cannot review this course');
        }
      } catch (error) {
        console.error('[DBG][course-player] Error checking review eligibility:', error);
        // Default to checking progress only
        const progress = courseData.percentComplete || 0;
        setCanReview(progress >= 25);
        setReviewEligibilityReason(
          progress >= 25
            ? ''
            : `Complete at least 25% of the course to write a review (current: ${progress}%)`
        );
      }
    };

    checkReviewEligibility();
  }, [courseData, courseId]);

  const handleMarkComplete = async (moveToNext = false) => {
    if (!selectedItem) return;

    try {
      console.log('[DBG][course-player] Marking lesson complete:', selectedItem.id);

      // Track lesson complete
      trackLessonComplete(courseId, selectedItem.id).catch(err => {
        console.error('[DBG][course-player] Failed to track lesson complete:', err);
      });

      // Call API to mark lesson as complete
      const response = await fetch('/api/enrollment/complete-lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          lessonId: selectedItem.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[DBG][course-player] Lesson marked complete successfully');

        // Update local state
        const updatedItems = courseItems.map(item =>
          item.id === selectedItem.id ? { ...item, completed: true } : item
        );
        setCourseItems(updatedItems);
        setSelectedItem({ ...selectedItem, completed: true });

        // Refetch course data to update progress in top bar
        const courseResponse = await fetch(`/data/app/courses/${courseId}`);
        const courseDataResult = await courseResponse.json();
        if (courseDataResult.success) {
          setCourseData(courseDataResult.data);
        }

        // Move to next lesson if requested
        if (moveToNext) {
          handleNavigateNext();
        }
      } else {
        console.error('[DBG][course-player] Failed to mark complete:', result.error);
        alert('Failed to mark lesson as complete. Please try again.');
      }
    } catch (error) {
      console.error('[DBG][course-player] Error marking complete:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleNavigatePrev = () => {
    if (!selectedItem || courseItems.length === 0) return;

    const currentIndex = courseItems.findIndex(item => item.id === selectedItem.id);
    if (currentIndex > 0) {
      setSelectedItem(courseItems[currentIndex - 1]);
    }
  };

  const handleNavigateNext = () => {
    if (!selectedItem || courseItems.length === 0) return;

    const currentIndex = courseItems.findIndex(item => item.id === selectedItem.id);
    if (currentIndex < courseItems.length - 1) {
      setSelectedItem(courseItems[currentIndex + 1]);
    }
  };

  const getCurrentLessonIndex = () => {
    if (!selectedItem) return -1;
    return courseItems.findIndex(item => item.id === selectedItem.id);
  };

  const hasPrevLesson = getCurrentLessonIndex() > 0;
  const hasNextLesson = getCurrentLessonIndex() < courseItems.length - 1;

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
              background: 'var(--color-primary)',
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

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Top Navigation Bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div
          style={{
            maxWidth: '100%',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <Link
              href="/app"
              style={{
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500',
                flexShrink: 0,
              }}
            >
              ← Dashboard
            </Link>
            <div
              style={{
                height: '20px',
                width: '1px',
                background: '#e2e8f0',
                flexShrink: 0,
                display: 'none',
              }}
              className="hide-mobile"
            />
            <h1
              style={{
                fontSize: '16px',
                fontWeight: '600',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {courseData.title}
            </h1>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexShrink: 0,
            }}
          >
            {canReview && (
              <button
                onClick={() => setIsReviewModalOpen(true)}
                style={{
                  padding: '8px 16px',
                  background:
                    'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                title="Write a review for this course"
                className="hide-on-small-mobile"
              >
                ⭐ Write Review
              </button>
            )}
            <div style={{ fontSize: '12px', color: '#666' }} className="hide-on-small-mobile">
              {courseData.completedLessons} / {courseData.totalLessons}
            </div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-highlight)' }}>
              {courseData.percentComplete}%
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        style={{
          position: 'fixed',
          top: '80px',
          left: '16px',
          zIndex: 1001,
          padding: '12px',
          background: 'var(--color-primary)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '20px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '48px',
          height: '48px',
        }}
        className="mobile-menu-btn"
        aria-label="Toggle lesson list"
      >
        {isSidebarOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar Overlay (mobile only) */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999,
          }}
          className="sidebar-overlay"
        />
      )}

      {/* Main Layout: Left Sidebar + Right Content */}
      <div style={{ display: 'flex', height: 'calc(100vh - 128px)', position: 'relative' }}>
        {/* LEFT PANE: Course Items List */}
        <div
          style={{
            width: '100%',
            maxWidth: '380px',
            background: '#fff',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'fixed',
            top: '128px',
            left: isSidebarOpen ? '0' : '-100%',
            bottom: 0,
            zIndex: 1000,
            transition: 'left 0.3s ease-in-out',
          }}
          className="lesson-sidebar"
        >
          {/* Sidebar Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8f8f8',
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
              Course Content
            </h2>
            <div style={{ fontSize: '13px', color: '#666' }}>{courseItems.length} lessons</div>
          </div>

          {/* Course Items List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {courseItems.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: '#666' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📚</div>
                <div style={{ fontSize: '14px' }}>No lessons available yet</div>
              </div>
            ) : (
              courseItems.map((item, index) => {
                const isSelected = selectedItem?.id === item.id;
                const isCompleted = item.completed || false;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    style={{
                      padding: '16px 24px',
                      borderBottom: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      background: isSelected ? '#f0f4ff' : 'transparent',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = '#fafafa';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      {/* Index/Checkmark */}
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: isCompleted
                            ? 'var(--color-highlight)'
                            : isSelected
                              ? 'var(--color-primary)'
                              : '#e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#fff',
                          flexShrink: 0,
                        }}
                      >
                        {isCompleted ? '✓' : index + 1}
                      </div>

                      {/* Lesson Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: isSelected ? '600' : '500',
                            marginBottom: '6px',
                            color: isSelected ? 'var(--color-primary)' : '#000',
                            lineHeight: '1.4',
                          }}
                        >
                          {item.title}
                        </div>
                        {item.description && (
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#666',
                              marginBottom: '6px',
                              lineHeight: '1.4',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {item.description}
                          </div>
                        )}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px',
                            color: '#999',
                          }}
                        >
                          <span>⏱️ {item.duration || '30 min'}</span>
                          <span>•</span>
                          <span>🎥 Video</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: Video Player & Content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {selectedItem ? (
            <>
              {/* Video Player */}
              <div
                style={{
                  background: '#000',
                  aspectRatio: '16/9',
                  maxHeight: '70vh',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {selectedItem.cloudflareVideoId ? (
                  <iframe
                    src={`https://customer-iq7mgkvtb3bwxqf5.cloudflarestream.com/${selectedItem.cloudflareVideoId}/iframe?preload=true&poster=https%3A%2F%2Fcustomer-iq7mgkvtb3bwxqf5.cloudflarestream.com%2F${selectedItem.cloudflareVideoId}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D0s%26height%3D600`}
                    title={selectedItem.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                    }}
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                    allowFullScreen
                  />
                ) : selectedItem.videoUrl ? (
                  <iframe
                    src={selectedItem.videoUrl}
                    title={selectedItem.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#fff', padding: '40px' }}>
                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>▶️</div>
                    <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                      {selectedItem.title}
                    </div>
                    <div style={{ fontSize: '14px', opacity: 0.7 }}>
                      Video will appear here once uploaded
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Controls */}
              <div
                style={{
                  background: '#fff',
                  borderTop: '1px solid #e2e8f0',
                  borderBottom: '1px solid #e2e8f0',
                  padding: '12px 16px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                }}
                className="navigation-controls"
              >
                <button
                  onClick={handleNavigatePrev}
                  disabled={!hasPrevLesson}
                  style={{
                    padding: '10px 16px',
                    background: hasPrevLesson ? '#fff' : '#f5f5f5',
                    color: hasPrevLesson ? 'var(--color-primary)' : '#ccc',
                    border: `1px solid ${hasPrevLesson ? 'var(--color-primary)' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: hasPrevLesson ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    if (hasPrevLesson) {
                      e.currentTarget.style.background = 'var(--color-primary)';
                      e.currentTarget.style.color = '#fff';
                    }
                  }}
                  onMouseLeave={e => {
                    if (hasPrevLesson) {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.color = 'var(--color-primary)';
                    }
                  }}
                >
                  <span className="hide-text-mobile">← Prev</span>
                  <span className="show-text-mobile">←</span>
                </button>

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                  }}
                >
                  <button
                    onClick={() => handleMarkComplete(false)}
                    disabled={selectedItem.completed}
                    style={{
                      padding: '10px 16px',
                      background: selectedItem.completed ? 'var(--color-highlight)' : '#fff',
                      color: selectedItem.completed ? '#fff' : 'var(--color-highlight)',
                      border: `1px solid var(--color-highlight)`,
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: selectedItem.completed ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => {
                      if (!selectedItem.completed) {
                        e.currentTarget.style.background = 'var(--color-highlight)';
                        e.currentTarget.style.color = '#fff';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!selectedItem.completed) {
                        e.currentTarget.style.background = '#fff';
                        e.currentTarget.style.color = 'var(--color-highlight)';
                      }
                    }}
                  >
                    {selectedItem.completed ? '✓' : 'Complete'}
                  </button>

                  {hasNextLesson && !selectedItem.completed && (
                    <button
                      onClick={() => handleMarkComplete(true)}
                      style={{
                        padding: '10px 16px',
                        background: 'var(--color-primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#6a3f92';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'var(--color-primary)';
                      }}
                      className="complete-next-btn"
                    >
                      <span className="hide-text-mobile">Complete & Next →</span>
                      <span className="show-text-mobile">✓ & →</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={handleNavigateNext}
                  disabled={!hasNextLesson}
                  style={{
                    padding: '10px 16px',
                    background: hasNextLesson ? 'var(--color-primary)' : '#f5f5f5',
                    color: hasNextLesson ? '#fff' : '#ccc',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: hasNextLesson ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    if (hasNextLesson) {
                      e.currentTarget.style.background = '#6a3f92';
                    }
                  }}
                  onMouseLeave={e => {
                    if (hasNextLesson) {
                      e.currentTarget.style.background = 'var(--color-primary)';
                    }
                  }}
                >
                  <span className="hide-text-mobile">Next →</span>
                  <span className="show-text-mobile">→</span>
                </button>
              </div>

              {/* Lesson Details */}
              <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
                <div style={{ padding: '24px 20px' }} className="lesson-details">
                  {/* Lesson Header */}
                  <div style={{ marginBottom: '24px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px',
                      }}
                    >
                      <span
                        style={{
                          padding: '4px 12px',
                          background: '#f0f4ff',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: 'var(--color-primary)',
                          fontWeight: '600',
                        }}
                      >
                        VIDEO
                      </span>
                      <span style={{ fontSize: '14px', color: '#666' }}>
                        ⏱️ {selectedItem.duration || '30 min'}
                      </span>
                    </div>
                    <h2
                      style={{
                        fontSize: '28px',
                        fontWeight: '600',
                        marginBottom: '12px',
                        lineHeight: '1.3',
                      }}
                    >
                      {selectedItem.title}
                    </h2>
                    {selectedItem.description && (
                      <p style={{ fontSize: '16px', color: '#666', lineHeight: '1.6' }}>
                        {selectedItem.description}
                      </p>
                    )}
                  </div>

                  {/* Resources Button */}
                  {selectedItem.resources && selectedItem.resources.length > 0 && (
                    <div style={{ marginBottom: '32px' }}>
                      <button
                        style={{
                          padding: '12px 24px',
                          background: '#fff',
                          color: 'var(--color-primary)',
                          border: '1px solid var(--color-primary)',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        📎 Resources ({selectedItem.resources.length})
                      </button>
                    </div>
                  )}

                  {/* Resources */}
                  {selectedItem.resources && selectedItem.resources.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                        Resources
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {selectedItem.resources.map(resource => (
                          <div
                            key={resource}
                            style={{
                              padding: '16px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                            }}
                          >
                            <div style={{ fontSize: '24px' }}>📄</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                {resource}
                              </div>
                            </div>
                            <button
                              style={{
                                padding: '8px 16px',
                                background: 'var(--color-primary)',
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
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fafafa',
              }}
            >
              <div style={{ textAlign: 'center', color: '#666' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>📚</div>
                <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                  Select a lesson to begin
                </div>
                <div style={{ fontSize: '14px' }}>
                  Choose a lesson from the sidebar to start learning
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        courseId={courseId}
        courseTitle={courseData?.title || ''}
        onSuccess={() => {
          // Refresh review eligibility after successful submission
          setCanReview(false);
          setReviewEligibilityReason('You have already reviewed this course');
        }}
      />

      {/* Mobile-responsive CSS */}
      <style jsx>{`
        /* Desktop: show sidebar, hide menu button */
        @media (min-width: 769px) {
          .mobile-menu-btn {
            display: none !important;
          }
          .sidebar-overlay {
            display: none !important;
          }
          .lesson-sidebar {
            position: static !important;
            left: 0 !important;
            width: 380px !important;
            max-width: 380px !important;
          }
          .hide-mobile {
            display: block !important;
          }
          .show-text-mobile {
            display: none !important;
          }
          .lesson-details {
            padding: 32px 40px !important;
          }
          .navigation-controls {
            padding: 16px 40px !important;
          }
        }

        /* Mobile: hide sidebar by default, show toggle button */
        @media (max-width: 768px) {
          .hide-text-mobile {
            display: inline !important;
          }
          .show-text-mobile {
            display: none !important;
          }
        }

        @media (max-width: 480px) {
          .hide-text-mobile {
            display: none !important;
          }
          .show-text-mobile {
            display: inline !important;
          }
          .hide-on-small-mobile {
            display: none !important;
          }
          .navigation-controls {
            padding: 8px 12px !important;
          }
          .lesson-details {
            padding: 20px 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
