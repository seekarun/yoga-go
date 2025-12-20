'use client';

import type { SectionPreviewProps } from '../types';

export default function FooterPreview({
  data,
  expertName,
  template = 'classic',
}: SectionPreviewProps) {
  const footer = data.footer;
  const currentYear = new Date().getFullYear();
  const isModern = template === 'modern';

  const defaultCopyright = `${currentYear} ${expertName || 'Your Name'}. All rights reserved.`;
  const copyrightText = footer?.copyrightText || defaultCopyright;
  const tagline = footer?.tagline;
  const showSocialLinks = footer?.showSocialLinks !== false;
  const showLegalLinks = footer?.showLegalLinks !== false;
  const showContactInfo = footer?.showContactInfo !== false;
  const socialLinks = footer?.socialLinks || {};
  const legalLinks = footer?.legalLinks || {};
  const contactEmail = footer?.contactEmail;

  const hasSocialLinks =
    socialLinks.instagram ||
    socialLinks.youtube ||
    socialLinks.facebook ||
    socialLinks.twitter ||
    socialLinks.tiktok;

  const hasLegalLinks =
    legalLinks.privacyPolicy || legalLinks.termsOfService || legalLinks.refundPolicy;

  // Modern template - Expanded footer with gradient
  if (isModern) {
    return (
      <footer
        style={{
          padding: '80px 40px 40px',
          background: '#0a0a0a',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Gradient line at top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, #6366f1, #a855f7, transparent)',
          }}
        />

        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          {/* Main footer content */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr',
              gap: '60px',
              marginBottom: '60px',
            }}
          >
            {/* Brand column */}
            <div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  marginBottom: '16px',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {expertName || 'Your Brand'}
              </div>
              {tagline && (
                <p
                  style={{
                    fontSize: '15px',
                    color: 'rgba(255,255,255,0.6)',
                    lineHeight: '1.6',
                    marginBottom: '24px',
                    maxWidth: '280px',
                  }}
                >
                  {tagline}
                </p>
              )}

              {/* Social Links */}
              {showSocialLinks && hasSocialLinks && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  {socialLinks.instagram && (
                    <a
                      href={socialLinks.instagram}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255,255,255,0.6)',
                        textDecoration: 'none',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z" />
                      </svg>
                    </a>
                  )}
                  {socialLinks.youtube && (
                    <a
                      href={socialLinks.youtube}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255,255,255,0.6)',
                        textDecoration: 'none',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                      </svg>
                    </a>
                  )}
                  {socialLinks.facebook && (
                    <a
                      href={socialLinks.facebook}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255,255,255,0.6)',
                        textDecoration: 'none',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                      </svg>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div>
              <h4
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#fff',
                  marginBottom: '20px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Quick Links
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {['Courses', 'Live Sessions', 'Blog', 'About'].map(link => (
                  <span key={link} style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                    {link}
                  </span>
                ))}
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#fff',
                  marginBottom: '20px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Legal
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {showLegalLinks && (
                  <>
                    {legalLinks.privacyPolicy && (
                      <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                        Privacy Policy
                      </span>
                    )}
                    {legalLinks.termsOfService && (
                      <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                        Terms of Service
                      </span>
                    )}
                    {legalLinks.refundPolicy && (
                      <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                        Refund Policy
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#fff',
                  marginBottom: '20px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Contact
              </h4>
              {showContactInfo && contactEmail && (
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>{contactEmail}</p>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          <div
            style={{
              paddingTop: '30px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>© {copyrightText}</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
              Powered by <span style={{ color: '#a855f7' }}>MyYoga.Guru</span>
            </p>
          </div>
        </div>
      </footer>
    );
  }

  // Classic template - Original compact footer
  return (
    <footer
      style={{
        padding: '40px 20px',
        background: '#1a1a1a',
        color: '#fff',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Tagline */}
        {tagline && (
          <p
            style={{
              fontSize: '16px',
              color: '#a0a0a0',
              textAlign: 'center',
              marginBottom: '24px',
              fontStyle: 'italic',
            }}
          >
            {tagline}
          </p>
        )}

        {/* Social Links */}
        {showSocialLinks && hasSocialLinks && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            {socialLinks.instagram && (
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#a0a0a0' }}
                title="Instagram"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z" />
                </svg>
              </a>
            )}
            {socialLinks.youtube && (
              <a
                href={socialLinks.youtube}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#a0a0a0' }}
                title="YouTube"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                </svg>
              </a>
            )}
            {socialLinks.facebook && (
              <a
                href={socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#a0a0a0' }}
                title="Facebook"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                </svg>
              </a>
            )}
          </div>
        )}

        {/* Legal Links */}
        {showLegalLinks && hasLegalLinks && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '24px',
              marginBottom: '24px',
              flexWrap: 'wrap',
            }}
          >
            {legalLinks.privacyPolicy && (
              <span style={{ color: '#a0a0a0', fontSize: '14px' }}>Privacy Policy</span>
            )}
            {legalLinks.termsOfService && (
              <span style={{ color: '#a0a0a0', fontSize: '14px' }}>Terms of Service</span>
            )}
            {legalLinks.refundPolicy && (
              <span style={{ color: '#a0a0a0', fontSize: '14px' }}>Refund Policy</span>
            )}
          </div>
        )}

        {/* Contact Email */}
        {showContactInfo && contactEmail && (
          <p
            style={{
              textAlign: 'center',
              fontSize: '14px',
              color: '#a0a0a0',
              marginBottom: '16px',
            }}
          >
            {contactEmail}
          </p>
        )}

        {/* Copyright */}
        <p
          style={{
            textAlign: 'center',
            fontSize: '12px',
            color: '#666',
          }}
        >
          © {copyrightText}
        </p>
      </div>
    </footer>
  );
}
