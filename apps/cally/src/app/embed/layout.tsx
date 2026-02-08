import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Cally Widget",
  robots: { index: false, follow: false },
};

export default function EmbedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-transparent">{children}</body>
    </html>
  );
}
