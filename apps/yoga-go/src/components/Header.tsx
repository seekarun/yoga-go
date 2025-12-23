'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getClientExpertContext } from '@/lib/domainContext';
import { isPrimaryDomain } from '@/config/domains';
import type { Expert } from '@/types';

export default function Header() {
  const { user, isAuthenticated, isExpert, login: _login, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [expertMode, setExpertMode] = useState<{ isExpertMode: boolean; expertId: string | null }>({
    isExpertMode: false,
    expertId: null,
  });
  const [expertData, setExpertData] = useState<Expert | null>(null);
  const [scrollOpacity, setScrollOpacity] = useState(0);

  // Detect expert mode on mount AND when viewing /experts/[expertId] pages
  // Also handles custom domains by calling the resolve-domain API
  useEffect(() => {
    const detectExpertMode = async () => {
      const context = getClientExpertContext();
      const isOnExpertPage = window.location.pathname.startsWith('/experts/');

      // If we already detected expert mode from static config or subdomain, use that
      if (context.isExpertMode || isOnExpertPage) {
        setExpertMode({
          isExpertMode: true,
          expertId: context.expertId,
        });
        return;
      }

      // Check if this might be a custom domain (not primary, not detected above)
      const host = window.location.host;
      if (!isPrimaryDomain(host)) {
        // Try resolving via API for custom domains
        try {
          console.log('[DBG][Header] Resolving custom domain:', host);
          const res = await fetch(
            `/api/internal/resolve-domain?domain=${encodeURIComponent(host)}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.expertId) {
              console.log('[DBG][Header] Custom domain resolved to expert:', data.expertId);
              setExpertMode({
                isExpertMode: true,
                expertId: data.expertId,
              });
              return;
            }
          }
        } catch (err) {
          console.error('[DBG][Header] Failed to resolve custom domain:', err);
        }
      }

      // Default: not expert mode
      setExpertMode({
        isExpertMode: false,
        expertId: null,
      });
    };

    detectExpertMode();
  }, []);

  // Fetch expert data when in expert mode (subdomain) to get custom logo
  useEffect(() => {
    if (expertMode.isExpertMode && expertMode.expertId) {
      fetch(`/data/experts/${expertMode.expertId}`)
        .then(res => res.json())
        .then(result => {
          if (result.success && result.data) {
            setExpertData(result.data);
          }
        })
        .catch(err => {
          console.error('[DBG][Header] Failed to fetch expert data:', err);
        });
    }
  }, [expertMode.isExpertMode, expertMode.expertId]);

  // Track scroll position for background opacity
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const maxScroll = 200; // Fully opaque after 200px scroll
      const opacity = Math.min(scrollPosition / maxScroll, 1);
      setScrollOpacity(opacity);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const handleLogout = () => {
    // Redirect experts to /srv after logout, others to landing page
    const returnTo = isExpert ? '/srv' : '/';
    logout(returnTo);
    setIsUserMenuOpen(false);
  };

  // Logo links to user's default page based on role
  const logoHref = expertMode.isExpertMode
    ? '#'
    : isAuthenticated
      ? isExpert
        ? '/srv'
        : '/app'
      : '/';

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: expertMode.isExpertMode
          ? `rgba(255, 255, 255, ${scrollOpacity * 0.95})`
          : `rgba(255, 255, 255, ${scrollOpacity * 0.95})`,
        backdropFilter: scrollOpacity > 0 ? 'blur(10px)' : 'none',
        borderBottom:
          scrollOpacity > 0 ? `1px solid rgba(224, 224, 224, ${scrollOpacity})` : 'none',
        transition: 'background 0.3s ease, backdrop-filter 0.3s ease, border-bottom 0.3s ease',
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
        {/* Logo - show expert's logo/name on subdomains, MYG logo otherwise */}
        <Link
          href={logoHref}
          style={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            cursor: expertMode.isExpertMode ? 'default' : 'pointer',
            paddingLeft: '20px',
            filter:
              expertMode.isExpertMode && scrollOpacity < 0.5
                ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                : 'none',
          }}
          onClick={e => {
            if (expertMode.isExpertMode) {
              e.preventDefault();
            }
          }}
        >
          {expertMode.isExpertMode && expertData ? (
            // Show expert's custom logo or name on expert subdomains
            expertData.customLandingPage?.branding?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={expertData.customLandingPage.branding.logo}
                alt={expertData.name}
                height={40}
                style={{
                  height: '40px',
                  width: 'auto',
                  maxWidth: '150px',
                  objectFit: 'contain',
                }}
              />
            ) : (
              // Show expert name as text logo if no custom logo
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: scrollOpacity < 0.5 ? '#fff' : '#000',
                  textShadow: scrollOpacity < 0.5 ? '0 2px 4px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                {expertData.name}
              </span>
            )
          ) : (
            // Show MYG logo on primary domain
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/myg.png"
              alt="My Yoga.Guru"
              width={40}
              height={40}
              style={{
                objectFit: 'contain',
              }}
            />
          )}
        </Link>

        {/* Desktop Nav - Hidden in expert mode */}
        {!expertMode.isExpertMode && (
          <nav
            style={{
              display: 'flex',
              gap: '40px',
            }}
            className="desktop-nav"
          >
            {/* Navigation links removed - focusing on expert experience */}
          </nav>
        )}

        {/* Auth Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingRight: '20px' }}>
          {isAuthenticated ? (
            <div ref={userMenuRef} style={{ position: 'relative' }}>
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
                  boxShadow:
                    expertMode.isExpertMode && scrollOpacity < 0.5
                      ? '0 2px 8px rgba(0,0,0,0.3)'
                      : 'none',
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

                  {/* Role-specific menu items */}
                  {isExpert ? (
                    /* Expert menu items */
                    <Link
                      href="/srv"
                      onClick={() => setIsUserMenuOpen(false)}
                      style={{
                        display: 'block',
                        padding: '12px 20px',
                        textDecoration: 'none',
                        color: '#333',
                        fontSize: '14px',
                      }}
                    >
                      Dashboard
                    </Link>
                  ) : (
                    /* Learner menu items */
                    <>
                      <Link
                        href="/app/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        style={{
                          display: 'block',
                          padding: '12px 20px',
                          textDecoration: 'none',
                          color: '#333',
                          fontSize: '14px',
                        }}
                      >
                        My Profile
                      </Link>
                      <Link
                        href="/app/purchases"
                        onClick={() => setIsUserMenuOpen(false)}
                        style={{
                          display: 'block',
                          padding: '12px 20px',
                          textDecoration: 'none',
                          color: '#333',
                          fontSize: '14px',
                        }}
                      >
                        My Purchases
                      </Link>
                    </>
                  )}

                  <div style={{ borderTop: '1px solid #e0e0e0', margin: '4px 0' }} />

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
            <a
              href="/auth/signin"
              className="btn btn-primary"
              style={{
                padding: '10px 24px',
                fontSize: '14px',
                textDecoration: 'none',
                display: 'inline-block',
                boxShadow:
                  expertMode.isExpertMode && scrollOpacity < 0.5
                    ? '0 2px 8px rgba(0,0,0,0.2)'
                    : 'none',
              }}
            >
              Sign In / Sign Up
            </a>
          )}

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
