'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogin = () => {
    login('mock-token');
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #e0e0e0',
        zIndex: 1000,
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: 'none',
            color: '#000',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            YG
          </div>
          <span style={{ fontSize: '20px', fontWeight: '600' }}>Yoga-GO</span>
        </Link>

        {/* Desktop Nav */}
        <nav
          style={{
            display: 'none',
            gap: '40px',
          }}
          className="desktop-nav"
        >
          <Link
            href="/courses"
            style={{
              textDecoration: 'none',
              color: '#666',
              fontSize: '16px',
              transition: 'color 0.2s',
            }}
          >
            Courses
          </Link>
          <Link
            href="/experts"
            style={{
              textDecoration: 'none',
              color: '#666',
              fontSize: '16px',
              transition: 'color 0.2s',
            }}
          >
            Experts
          </Link>
          <Link
            href="/pricing"
            style={{
              textDecoration: 'none',
              color: '#666',
              fontSize: '16px',
              transition: 'color 0.2s',
            }}
          >
            Pricing
          </Link>
        </nav>

        {/* Auth Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {isAuthenticated ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#000',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {!user?.profile?.avatar && (
                  <svg width="20" height="20" fill="#fff" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                )}
              </button>

              {isUserMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '44px',
                    right: 0,
                    background: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    minWidth: '200px',
                    padding: '8px 0',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 20px',
                      borderBottom: '1px solid #e0e0e0',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#000' }}>
                      {user?.profile?.name || 'User'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {user?.profile?.email || 'user@example.com'}
                    </div>
                  </div>
                  <Link
                    href="/app"
                    style={{
                      display: 'block',
                      padding: '12px 20px',
                      textDecoration: 'none',
                      color: '#000',
                      fontSize: '14px',
                    }}
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    My Dashboard
                  </Link>
                  <Link
                    href="/app/my-courses"
                    style={{
                      display: 'block',
                      padding: '12px 20px',
                      textDecoration: 'none',
                      color: '#000',
                      fontSize: '14px',
                    }}
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    My Courses
                  </Link>
                  <Link
                    href="/app/profile"
                    style={{
                      display: 'block',
                      padding: '12px 20px',
                      textDecoration: 'none',
                      color: '#000',
                      fontSize: '14px',
                    }}
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <div style={{ height: '1px', background: '#e0e0e0', margin: '8px 0' }} />
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsUserMenuOpen(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '12px 20px',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      color: '#ff3333',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="btn btn-primary"
              style={{ padding: '10px 24px', fontSize: '14px' }}
            >
              Sign In
            </button>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              display: 'block',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
            }}
            className="mobile-menu-btn"
          >
            <svg width="24" height="24" fill="#000" viewBox="0 0 24 24">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
          </button>
        </div>
      </div>

      <style jsx>{`
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-menu-btn {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
