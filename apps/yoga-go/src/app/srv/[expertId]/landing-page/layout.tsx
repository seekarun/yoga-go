/**
 * Landing Page Editor Layout
 * Adds top padding to account for the global header and hides the footer
 */
export default function LandingPageEditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Hide footer and add top offset for header */}
      <style>{`
        body > footer,
        body > div > footer {
          display: none !important;
        }
      `}</style>
      <div className="pt-16">{children}</div>
    </>
  );
}
