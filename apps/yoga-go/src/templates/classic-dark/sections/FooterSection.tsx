import { SECTION_MAX_WIDTH } from '../../shared';
import type { FooterSectionProps } from '../../types';
import {
  InstagramIcon,
  YouTubeIcon,
  FacebookIcon,
  TwitterIcon,
  TikTokIcon,
} from '../../shared/SocialIcons';

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

  const hasSocialLinks =
    socialLinks.instagram ||
    socialLinks.youtube ||
    socialLinks.facebook ||
    socialLinks.twitter ||
    socialLinks.tiktok;

  const hasLegalLinks =
    legalLinks.privacyPolicy || legalLinks.termsOfService || legalLinks.refundPolicy;

  return (
    <div style={{ background: '#0a0a0a' }}>
      <footer
        style={{
          padding: '40px 20px',
          background: '#0a0a0a',
          color: '#fff',
          maxWidth: SECTION_MAX_WIDTH,
          margin: '0 auto',
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
                  <InstagramIcon />
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
                  <YouTubeIcon />
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
                  <FacebookIcon />
                </a>
              )}
              {socialLinks.twitter && (
                <a
                  href={socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#a0a0a0' }}
                  title="X (Twitter)"
                >
                  <TwitterIcon />
                </a>
              )}
              {socialLinks.tiktok && (
                <a
                  href={socialLinks.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#a0a0a0' }}
                  title="TikTok"
                >
                  <TikTokIcon />
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
                <a
                  href={legalLinks.privacyPolicy}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#a0a0a0', fontSize: '14px', textDecoration: 'none' }}
                >
                  Privacy Policy
                </a>
              )}
              {legalLinks.termsOfService && (
                <a
                  href={legalLinks.termsOfService}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#a0a0a0', fontSize: '14px', textDecoration: 'none' }}
                >
                  Terms of Service
                </a>
              )}
              {legalLinks.refundPolicy && (
                <a
                  href={legalLinks.refundPolicy}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#a0a0a0', fontSize: '14px', textDecoration: 'none' }}
                >
                  Refund Policy
                </a>
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
              <a
                href={`mailto:${contactEmail}`}
                style={{ color: '#a0a0a0', textDecoration: 'none' }}
              >
                {contactEmail}
              </a>
            </p>
          )}

          {/* Copyright */}
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#666' }}>
            © {displayCopyright}
          </p>
        </div>
      </footer>
    </div>
  );
}
