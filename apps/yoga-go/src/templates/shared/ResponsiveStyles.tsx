// Responsive styles for landing page templates
// These styles handle mobile/desktop layout switching

export const responsiveStyles = `
  /* Default: Hide mobile, show desktop */
  .hero-section-mobile { display: none !important; }
  .hero-section-desktop { display: block !important; }

  /* Mobile: Show mobile, hide desktop */
  @media (max-width: 768px) {
    .hero-section-mobile { display: block !important; }
    .hero-section-desktop { display: none !important; }

    /* Course and webinar cards - single column on mobile */
    .courses-grid,
    .webinars-grid {
      grid-template-columns: 1fr !important;
    }

    /* Value props - stack on mobile */
    .value-props-list {
      flex-direction: column;
    }

    /* About section - stack on mobile */
    .about-grid {
      grid-template-columns: 1fr !important;
    }

    /* Act section - stack on mobile */
    .act-grid {
      grid-template-columns: 1fr !important;
    }

    /* Footer - stack on mobile */
    .footer-grid {
      grid-template-columns: 1fr !important;
      text-align: center;
    }

    /* Photo gallery - 2 columns on mobile */
    .gallery-grid {
      grid-template-columns: repeat(2, 1fr) !important;
    }
  }
`;

export default function ResponsiveStyles() {
  return <style dangerouslySetInnerHTML={{ __html: responsiveStyles }} />;
}
