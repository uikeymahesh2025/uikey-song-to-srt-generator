import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UIKEY AI | SONG TO SRT GENERATOR BY UIKEY",
  description: "High-accuracy song lyrics alignment, vocal gap detection, and Master Sync SRT generator.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0b0d11] text-gray-100 selection:bg-emerald-500/20 selection:text-emerald-300">
        {children}
      </body>
    </html>
  );
}
