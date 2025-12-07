import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Calel - Simple Scheduling for Professionals",
  description:
    "Let clients book appointments 24/7. Eliminate back-and-forth emails. Integrate with Zoom and Google Meet. Built for professionals who value their time.",
  keywords: [
    "scheduling",
    "appointments",
    "booking",
    "calendar",
    "calendly alternative",
    "meeting scheduler",
  ],
  openGraph: {
    title: "Calel - Simple Scheduling for Professionals",
    description:
      "Let clients book appointments 24/7. Eliminate back-and-forth emails. Integrate with Zoom and Google Meet.",
    type: "website",
    url: "https://calel.io",
  },
  twitter: {
    card: "summary_large_image",
    title: "Calel - Simple Scheduling for Professionals",
    description:
      "Let clients book appointments 24/7. Eliminate back-and-forth emails. Integrate with Zoom and Google Meet.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
