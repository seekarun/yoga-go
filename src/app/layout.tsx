import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { PaymentProvider } from '@/contexts/PaymentContext';
import { PostHogProvider } from '@/providers/PostHogProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'My Yoga.Guru | Transform Your Practice',
  description:
    'Expert-led yoga courses for every level. Join thousands on their journey to better health and mindfulness.',
};

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
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </PaymentProvider>
            </PostHogProvider>
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
