import { AuthProvider } from "@/contexts/AuthContext";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cally | Your Scheduling Platform",
  description:
    "Create landing pages, manage your calendar, and schedule live sessions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-[var(--color-bg-main)]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
