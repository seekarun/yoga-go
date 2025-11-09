'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getClientExpertContext } from '@/lib/domainContext';

export default function Header() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [expertMode, setExpertMode] = useState<{ isExpertMode: boolean; expertId: string | null }>({
    isExpertMode: false,
    expertId: null,
  });
  const [isOnSrvPage, setIsOnSrvPage] = useState(false);

  // Detect expert mode on mount AND when viewing /experts/[expertId] pages
  useEffect(() => {
    const context = getClientExpertContext();
    const isOnExpertPage = window.location.pathname.startsWith('/experts/');
    const isOnSrv = window.location.pathname.startsWith('/srv');
    setExpertMode({
      isExpertMode: context.isExpertMode || isOnExpertPage,
      expertId: context.expertId,
    });
    setIsOnSrvPage(isOnSrv);
  }, []);

  const handleLogin = () => {
    login();
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
  };

  // In expert mode or on expert pages, logo should not link to home
  const logoHref = expertMode.isExpertMode ? '#' : '/';

  // Don't render header at all on expert pages
  if (expertMode.isExpertMode) {
    return null;
  }

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
          href={logoHref}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: 'none',
            color: '#000',
            cursor: expertMode.isExpertMode ? 'default' : 'pointer',
          }}
          onClick={e => {
            if (expertMode.isExpertMode) {
              e.preventDefault();
            }
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

        {/* Desktop Nav - Hidden in expert mode */}
        {!expertMode.isExpertMode && (
          <nav
            style={{
              display: 'none',
              gap: '40px',
            }}
            className="desktop-nav"
          >
            {!(isOnSrvPage && isAuthenticated) && (
              <>
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
                <Link
                  href="/srv"
                  style={{
                    textDecoration: 'none',
                    color: '#764ba2',
                    fontSize: '16px',
                    fontWeight: '500',
                    transition: 'color 0.2s',
                  }}
                >
                  For Experts
                </Link>
              </>
            )}
          </nav>
        )}

        {/* Auth Button - Hidden in expert mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {!expertMode.isExpertMode && isAuthenticated ? (
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
                    href="/app/live"
                    style={{
                      display: 'block',
                      padding: '12px 20px',
                      textDecoration: 'none',
                      color: '#000',
                      fontSize: '14px',
                    }}
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    Browse Live Sessions
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
                  {user?.role === 'expert' && (
                    <>
                      <div style={{ height: '1px', background: '#e0e0e0', margin: '8px 0' }} />
                      <div
                        style={{
                          padding: '8px 20px 4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#999',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Expert Tools
                      </div>
                      <Link
                        href="/srv"
                        style={{
                          display: 'block',
                          padding: '12px 20px',
                          textDecoration: 'none',
                          color: '#764ba2',
                          fontSize: '14px',
                          fontWeight: '500',
                        }}
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        📊 Expert Dashboard
                      </Link>
                      {user?.expertProfile && (
                        <Link
                          href={`/srv/${user.expertProfile}/live`}
                          style={{
                            display: 'block',
                            padding: '12px 20px',
                            textDecoration: 'none',
                            color: '#764ba2',
                            fontSize: '14px',
                            fontWeight: '500',
                          }}
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          🎥 Manage My Sessions
                        </Link>
                      )}
                    </>
                  )}
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
          ) : !expertMode.isExpertMode ? (
            <button
              onClick={handleLogin}
              className="btn btn-primary"
              style={{ padding: '10px 24px', fontSize: '14px' }}
            >
              Sign In
            </button>
          ) : null}

          {/* Mobile menu button - Hidden in expert mode */}
          {!expertMode.isExpertMode && (
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
          )}
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
