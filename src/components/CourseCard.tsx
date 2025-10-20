import Link from 'next/link';
import type { Course, UserCourseData } from '@/types';

interface CourseCardProps {
  course: Course | UserCourseData;
  variant?: 'compact' | 'full' | 'enrolled';
  isEnrolled?: boolean;
}

export default function CourseCard({ course, variant = 'full' }: CourseCardProps) {
  const isCompact = variant === 'compact';
  const isEnrolled = variant === 'enrolled';

  // Use coverImage if available, otherwise fall back to thumbnail
  const imageUrl = course.coverImage || course.thumbnail;

  // Type guard to check if course is UserCourseData
  const enrolledCourse = isEnrolled ? (course as UserCourseData) : null;

  // Enrolled variant for dashboard
  if (isEnrolled && enrolledCourse) {
    return (
      <Link href={`/app/courses/${course.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'pointer',
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
          {/* Course Thumbnail with Progress */}
          <div
            style={{
              height: '180px',
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
            }}
          >
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
                  width: `${enrolledCourse.percentComplete}%`,
                  background: '#48bb78',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Course Info */}
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <span
                style={{
                  padding: '4px 8px',
                  background: '#f7fafc',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#764ba2',
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
                  backgroundImage: `url(${course.instructor.avatar || '/images/default-avatar.jpg'})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundColor: '#e2e8f0',
                }}
              />
              <span style={{ fontSize: '13px', color: '#4a5568' }}>{course.instructor.name}</span>
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
                {enrolledCourse.completedLessons} of {course.totalLessons} lessons
              </div>
              <div
                style={{
                  padding: '6px 12px',
                  background: enrolledCourse.percentComplete === 100 ? '#48bb78' : '#764ba2',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                {enrolledCourse.percentComplete === 0
                  ? 'Start'
                  : enrolledCourse.percentComplete === 100
                    ? 'Re-visit'
                    : 'Continue'}
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (isCompact) {
    // Compact variant for homepage carousel
    return (
      <Link
        href={`/courses/${course.id}`}
        style={{
          textDecoration: 'none',
          color: 'inherit',
          minWidth: '320px',
          flex: '0 0 320px',
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'pointer',
            height: '100%',
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
          {/* Image */}
          <div
            style={{
              height: '180px',
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
            }}
          >
            {course.isNew && (
              <span
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  padding: '4px 12px',
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
          </div>

          {/* Info */}
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <span
                style={{
                  padding: '4px 8px',
                  background: '#f7fafc',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#764ba2',
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
                display: '-webkit-box',
                WebkitLineClamp: 2,
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
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundImage: `url(${course.instructor.avatar || '/images/default-avatar.jpg'})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundColor: '#e2e8f0',
                }}
              />
              <span style={{ fontSize: '13px', color: '#4a5568' }}>{course.instructor.name}</span>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#FFB800' }}>★</span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>{course.rating}</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#764ba2' }}>
                ${course.price}
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Full variant for courses page grid
  return (
    <Link href={`/courses/${course.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
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
        {/* Course Cover Image */}
        <div
          style={{
            height: '200px',
            backgroundImage: `url(${imageUrl})`,
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
              <span style={{ fontSize: '14px', fontWeight: '600' }}>{course.rating}</span>
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>{course.totalLessons} lessons</div>
            <div style={{ fontSize: '14px', color: '#666' }}>{course.duration}</div>
          </div>

          {/* Price or Enrolled Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {isEnrolled ? (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <Link
                  href={`/app/courses/${course.id}`}
                  style={{
                    padding: '8px 16px',
                    background: '#2563eb',
                    color: '#fff',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#1d4ed8';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#2563eb';
                  }}
                >
                  ENROLLED
                </Link>
              </div>
            ) : (
              <>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#764ba2' }}>
                  ${course.price}
                </div>
                <div style={{ fontSize: '12px', color: '#48bb78' }}>
                  {course.freeLessons} free lessons
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
