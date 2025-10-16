'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import type { UserCourseData, Lesson } from '@/types';

export default function CoursePlayer() {
  const { isAuthenticated } = useAuth();
  const params = useParams();
  const courseId = params.id as string;
  const [courseData, setCourseData] = useState<UserCourseData | null>(null);
  const [courseItems, setCourseItems] = useState<Lesson[]>([]);
  const [selectedItem, setSelectedItem] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        console.log('[DBG][course-player] Fetching course data for:', courseId);

        // Fetch course details
        const courseResponse = await fetch(`/data/app/courses/${courseId}`);
        const courseDataResult = await courseResponse.json();

        if (courseDataResult.success) {
          setCourseData(courseDataResult.data);
          console.log('[DBG][course-player] Course data loaded:', courseDataResult.data.title);
        }

        // Fetch course items (lessons/videos)
        const itemsResponse = await fetch(`/data/courses/${courseId}/items`);
        const itemsResult = await itemsResponse.json();

        console.log('[DBG][course-player] Items API response:', itemsResult);

        if (itemsResult.success && itemsResult.data) {
          // The API returns data as an array directly, not nested in data.items
          const items = Array.isArray(itemsResult.data) ? itemsResult.data : [];
          console.log('[DBG][course-player] Loaded', items.length, 'course items');
          setCourseItems(items);

          // Auto-select first item
          if (items.length > 0) {
            setSelectedItem(items[0]);
            console.log('[DBG][course-player] Auto-selected first item:', items[0].title);
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

  const handleMarkComplete = async () => {
    if (!selectedItem) return;

    try {
      console.log('[DBG][course-player] Marking lesson complete:', selectedItem.id);
      // TODO: Call API to mark lesson as complete
      // For now, just show success
      alert(`Lesson "${selectedItem.title}" marked as complete! 🎉`);
    } catch (error) {
      console.error('[DBG][course-player] Error marking complete:', error);
    }
  };

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

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Top Navigation Bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div
          style={{
            maxWidth: '100%',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link
              href="/app"
              style={{
                color: '#764ba2',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              ← Dashboard
            </Link>
            <div style={{ height: '20px', width: '1px', background: '#e2e8f0' }} />
            <h1
              style={{
                fontSize: '18px',
                fontWeight: '600',
                margin: 0,
              }}
            >
              {courseData.title}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>
              {courseData.completedLessons} / {courseData.totalLessons} lessons completed
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#48bb78' }}>
              {courseData.percentComplete}% complete
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout: Left Sidebar + Right Content */}
      <div style={{ display: 'flex', height: 'calc(100vh - 128px)' }}>
        {/* LEFT PANE: Course Items List */}
        <div
          style={{
            width: '380px',
            background: '#fff',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
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
                          background: isCompleted ? '#48bb78' : isSelected ? '#764ba2' : '#e2e8f0',
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
                            color: isSelected ? '#764ba2' : '#000',
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

              {/* Lesson Details */}
              <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
                <div style={{ padding: '32px 40px' }}>
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
                          color: '#764ba2',
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

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                    <button
                      onClick={handleMarkComplete}
                      disabled={selectedItem.completed}
                      style={{
                        padding: '12px 24px',
                        background: selectedItem.completed ? '#48bb78' : '#764ba2',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: selectedItem.completed ? 'default' : 'pointer',
                        opacity: selectedItem.completed ? 0.8 : 1,
                      }}
                    >
                      {selectedItem.completed ? '✓ Completed' : 'Mark as Complete'}
                    </button>
                    {selectedItem.resources && selectedItem.resources.length > 0 && (
                      <button
                        style={{
                          padding: '12px 24px',
                          background: '#fff',
                          color: '#764ba2',
                          border: '1px solid #764ba2',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        📎 Resources ({selectedItem.resources.length})
                      </button>
                    )}
                  </div>

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
    </div>
  );
}
