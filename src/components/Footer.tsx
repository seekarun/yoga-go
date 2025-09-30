'use client';

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      background: '#fff',
      borderTop: '1px solid #e2e8f0',
      marginTop: 'auto'
    }}>
      <div className="container" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '48px 20px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '48px',
          marginBottom: '48px'
        }}>
          {/* Brand */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '14px'
                }}>YG</span>
              </div>
              <span style={{
                fontSize: '20px',
                fontWeight: '500'
              }}>Yoga-GO</span>
            </div>
            <p style={{
              color: '#666',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '20px'
            }}>
              Transform your practice with expert-led yoga courses designed for every level.
            </p>
            <div style={{
              display: 'flex',
              gap: '16px'
            }}>
              <a href="#" style={{
                color: '#666',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#000'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#666'; }}>
                <svg style={{ width: '20px', height: '20px' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="#" style={{
                color: '#666',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#000'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#666'; }}>
                <svg style={{ width: '20px', height: '20px' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              <a href="#" style={{
                color: '#666',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#000'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#666'; }}>
                <svg style={{ width: '20px', height: '20px' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Practice */}
          <div>
            <h3 style={{
              fontWeight: '600',
              fontSize: '16px',
              marginBottom: '20px',
              color: '#000'
            }}>Practice</h3>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}>
              <li style={{ marginBottom: '12px' }}>
                <Link href="/courses" style={{
                  color: '#666',
                  fontSize: '14px',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}>
                  All Courses
                </Link>
              </li>
              <li style={{ marginBottom: '12px' }}>
                <Link href="/courses?level=beginner" style={{
                  color: '#666',
                  fontSize: '14px',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}>
                  Beginner
                </Link>
              </li>
              <li style={{ marginBottom: '12px' }}>
                <Link href="/courses?level=intermediate" style={{
                  color: '#666',
                  fontSize: '14px',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}>
                  Intermediate
                </Link>
              </li>
              <li style={{ marginBottom: '12px' }}>
                <Link href="/courses?level=advanced" style={{
                  color: '#666',
                  fontSize: '14px',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}>
                  Advanced
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 style={{
              fontWeight: '600',
              fontSize: '16px',
              marginBottom: '20px',
              color: '#000'
            }}>Company</h3>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}>
              <li style={{ marginBottom: '12px' }}>
                <Link href="/about" style={{
                  color: '#666',
                  fontSize: '14px',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}>
                  About Us
                </Link>
              </li>
              <li style={{ marginBottom: '12px' }}>
                <Link href="/experts" style={{
                  color: '#666',
                  fontSize: '14px',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}>
                  Our Experts
                </Link>
              </li>
              <li style={{ marginBottom: '12px' }}>
                <Link href="/blog" style={{
                  color: '#666',
                  fontSize: '14px',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}>
                  Blog
                </Link>
              </li>
              <li style={{ marginBottom: '12px' }}>
                <Link href="/contact" style={{
                  color: '#666',
                  fontSize: '14px',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}>
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 style={{
              fontWeight: '600',
              fontSize: '16px',
              marginBottom: '20px',
              color: '#000'
            }}>Support</h3>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}>
              <li style={{ marginBottom: '12px' }}>
                <Link href="/help" style={{
                  color: '#666',
                  fontSize: '14px',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}>
                  Help Center
                </Link>
              </li>
              <li style={{ marginBottom: '12px' }}>
                <Link href="/faq" style={{
                  color: '#666',
                  fontSize: '14px',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}>
                  FAQ
                </Link>
              </li>
              <li style={{ marginBottom: '12px' }}>
                <Link href="/privacy" style={{
                  color: '#666',
                  fontSize: '14px',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}>
                  Privacy Policy
                </Link>
              </li>
              <li style={{ marginBottom: '12px' }}>
                <Link href="/terms" style={{
                  color: '#666',
                  fontSize: '14px',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}>
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          paddingTop: '32px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px'
        }}>
          <p style={{
            color: '#666',
            fontSize: '12px',
            margin: 0
          }}>
            © {currentYear} Yoga-GO. All rights reserved.
          </p>
          <div style={{
            display: 'flex',
            gap: '24px'
          }}>
            <Link href="/privacy" style={{
              color: '#666',
              fontSize: '12px',
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}>
              Privacy
            </Link>
            <Link href="/terms" style={{
              color: '#666',
              fontSize: '12px',
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}>
              Terms
            </Link>
            <Link href="/cookies" style={{
              color: '#666',
              fontSize: '12px',
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}>
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}