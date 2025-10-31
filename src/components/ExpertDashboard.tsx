'use client';

import Link from 'next/link';
import type { Expert } from '@/types';

interface ExpertDashboardProps {
  expert: Expert;
}

export default function ExpertDashboard({ expert }: ExpertDashboardProps) {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Welcome Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          padding: '60px 20px',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Promo Video Section */}
          {expert.promoVideoCloudflareId && expert.promoVideoStatus === 'ready' && (
            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '32px',
                backdropFilter: 'blur(10px)',
              }}
            >
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
                Your Promo Video
              </h2>
              <div
                style={{
                  position: 'relative',
                  paddingBottom: '56.25%',
                  height: 0,
                  overflow: 'hidden',
                  borderRadius: '12px',
                  background: '#000',
                }}
              >
                <iframe
                  src={`https://customer-${process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'placeholder'}.cloudflarestream.com/${expert.promoVideoCloudflareId}/iframe?preload=auto&poster=https%3A%2F%2Fcustomer-${process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'placeholder'}.cloudflarestream.com%2F${expert.promoVideoCloudflareId}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D1s%26height%3D600`}
                  style={{
                    border: 'none',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: '100%',
                  }}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen={true}
                />
              </div>
              <p style={{ fontSize: '14px', marginTop: '12px', opacity: 0.9 }}>
                This video is displayed on your public expert profile page. Students will see it
                when they visit your page.
              </p>
            </div>
          )}

          {/* Show upload prompt if no video */}
          {!expert.promoVideoCloudflareId && (
            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '32px',
                textAlign: 'center',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎥</div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                Add a Promo Video
              </h3>
              <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '16px' }}>
                Introduce yourself to potential students with a short promotional video
              </p>
              <Link
                href={`/srv/${expert.id}/edit`}
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  background: '#fff',
                  color: '#764ba2',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  textDecoration: 'none',
                }}
              >
                Upload Promo Video
              </Link>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
            {expert.avatar && (
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundImage: `url(${expert.avatar})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '3px solid #fff',
                }}
              />
            )}
            <div>
              <h1 style={{ fontSize: '36px', fontWeight: '600', marginBottom: '8px' }}>
                Welcome back, {expert.name}!
              </h1>
              <p style={{ fontSize: '18px', opacity: 0.9 }}>{expert.title}</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '24px',
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
                {expert.totalCourses ?? 0}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Courses</div>
            </div>
            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
                {expert.totalStudents ?? 0}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Students</div>
            </div>
            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
                {(expert.rating ?? 0).toFixed(1)}⭐
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 20px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '32px' }}>Quick Actions</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Create Course */}
          <Link
            href={`/srv/${expert.id}/courses/create`}
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'transform 0.2s, box-shadow 0.2s',
              display: 'block',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>➕</div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
              Create New Course
            </h3>
            <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
              Start building your next yoga course and reach more students
            </p>
          </Link>

          {/* Manage Courses */}
          <Link
            href={`/srv/${expert.id}`}
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'transform 0.2s, box-shadow 0.2s',
              display: 'block',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
              Manage Courses
            </h3>
            <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
              View and edit your existing courses and lessons
            </p>
          </Link>

          {/* Edit Profile */}
          <Link
            href={`/srv/${expert.id}/edit`}
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'transform 0.2s, box-shadow 0.2s',
              display: 'block',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
              Edit Profile
            </h3>
            <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
              Update your bio, certifications, and professional information
            </p>
          </Link>

          {/* View Public Page */}
          <Link
            href={`/experts/${expert.id}`}
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'transform 0.2s, box-shadow 0.2s',
              display: 'block',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌐</div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
              View Public Page
            </h3>
            <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
              See how your profile appears to students
            </p>
          </Link>

          {/* Analytics */}
          <Link
            href={`/srv/${expert.id}/analytics`}
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'transform 0.2s, box-shadow 0.2s',
              display: 'block',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
              View Analytics
            </h3>
            <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
              Track course performance and student engagement
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
