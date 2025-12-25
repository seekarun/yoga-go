import type { FooterSectionProps } from '../../types';
import { InstagramIcon, YouTubeIcon, FacebookIcon } from '../../shared/SocialIcons';

export default function FooterSection({
  copyrightText,
  tagline,
  showSocialLinks = true,
  socialLinks = {},
  showLegalLinks = true,
  legalLinks = {},
  showContactInfo = true,
  contactEmail,
  expertName,
}: FooterSectionProps) {
  const currentYear = new Date().getFullYear();
  const displayCopyright = copyrightText || `${currentYear} ${expertName}. All rights reserved.`;

  const hasSocialLinks = socialLinks.instagram || socialLinks.youtube || socialLinks.facebook;

  const SocialIconButton = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
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
      {children}
    </a>
  );

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
          background:
            'linear-gradient(90deg, transparent, var(--brand-500), var(--brand-600), transparent)',
        }}
      />

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Main footer content */}
        <div
          className="footer-modern-grid"
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
                background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {expertName}
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
                  <SocialIconButton href={socialLinks.instagram}>
                    <InstagramIcon size={18} />
                  </SocialIconButton>
                )}
                {socialLinks.youtube && (
                  <SocialIconButton href={socialLinks.youtube}>
                    <YouTubeIcon size={18} />
                  </SocialIconButton>
                )}
                {socialLinks.facebook && (
                  <SocialIconButton href={socialLinks.facebook}>
                    <FacebookIcon size={18} />
                  </SocialIconButton>
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
                    <a
                      href={legalLinks.privacyPolicy}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '14px',
                        color: 'rgba(255,255,255,0.5)',
                        textDecoration: 'none',
                      }}
                    >
                      Privacy Policy
                    </a>
                  )}
                  {legalLinks.termsOfService && (
                    <a
                      href={legalLinks.termsOfService}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '14px',
                        color: 'rgba(255,255,255,0.5)',
                        textDecoration: 'none',
                      }}
                    >
                      Terms of Service
                    </a>
                  )}
                  {legalLinks.refundPolicy && (
                    <a
                      href={legalLinks.refundPolicy}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '14px',
                        color: 'rgba(255,255,255,0.5)',
                        textDecoration: 'none',
                      }}
                    >
                      Refund Policy
                    </a>
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
              <a
                href={`mailto:${contactEmail}`}
                style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}
              >
                {contactEmail}
              </a>
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
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>© {displayCopyright}</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            Powered by <span style={{ color: 'var(--brand-400)' }}>MyYoga.Guru</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
