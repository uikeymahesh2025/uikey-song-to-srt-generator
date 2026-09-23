import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UIKEY AI | SONG TO SRT GENERATOR BY UIKEY",
  description:
    "High-accuracy song lyrics alignment, vocal gap detection, and Master Sync SRT generator.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#06080d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#06080d] text-gray-100 selection:bg-emerald-500/20 selection:text-emerald-300 antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
