import LayoutContent from '@/components/LayoutContent';
import { ToastProvider } from '@/components/Toast';
import UploadNotifications from '@/components/UploadNotifications';
import { AuthProvider } from '@/contexts/AuthContext';
import { PaymentProvider } from '@/contexts/PaymentContext';
import { getTenantByDomain } from '@/lib/repositories/tenantRepository';
import { PostHogProvider } from '@/providers/PostHogProvider';
import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';
import { Geist, Geist_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Default metadata for myyoga.guru
const defaultMetadata: Metadata = {
  title: 'My Yoga.Guru | Transform Your Practice',
  description:
    'Expert-led yoga courses for every level. Join thousands on their journey to better health and mindfulness.',
};

/**
 * Dynamic metadata based on hostname
 * For custom domains, returns tenant-specific branding (favicon, title, description)
 * For myyoga.guru and subdomains, returns default metadata
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const headersList = await headers();
    const host = headersList.get('host') || '';

    // Skip for localhost and myyoga.guru (main domain and subdomains)
    const normalizedHost = host.toLowerCase().split(':')[0];
    if (
      normalizedHost === 'localhost' ||
      normalizedHost === 'myyoga.guru' ||
      normalizedHost.endsWith('.myyoga.guru')
    ) {
      return defaultMetadata;
    }

    // Look up tenant by custom domain
    const tenant = await getTenantByDomain(normalizedHost);

    if (!tenant?.branding) {
      console.log('[DBG][layout] No tenant or branding for domain:', normalizedHost);
      return defaultMetadata;
    }

    console.log('[DBG][layout] Using custom branding for domain:', normalizedHost);

    const { faviconUrl, siteTitle, siteDescription, ogImage } = tenant.branding;

    // Build metadata with custom branding
    const metadata: Metadata = {
      title: siteTitle || tenant.name || defaultMetadata.title,
      description: siteDescription || defaultMetadata.description,
    };

    // Add favicon if set
    if (faviconUrl) {
      metadata.icons = {
        icon: faviconUrl,
        shortcut: faviconUrl,
      };
    }

    // Add Open Graph metadata if OG image is set
    if (ogImage || siteTitle || siteDescription) {
      metadata.openGraph = {
        title: siteTitle || tenant.name || undefined,
        description: siteDescription || undefined,
        images: ogImage ? [{ url: ogImage }] : undefined,
      };
    }

    return metadata;
  } catch (error) {
    console.error('[DBG][layout] Error generating metadata:', error);
    return defaultMetadata;
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <SessionProvider>
          <AuthProvider>
            <PostHogProvider>
              <PaymentProvider>
                <ToastProvider>
                  <UploadNotifications />
                  <LayoutContent>{children}</LayoutContent>
                </ToastProvider>
              </PaymentProvider>
            </PostHogProvider>
          </AuthProvider>
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
