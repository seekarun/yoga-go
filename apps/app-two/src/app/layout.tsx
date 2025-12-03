import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "App Two",
  description: "Second application in the monorepo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
