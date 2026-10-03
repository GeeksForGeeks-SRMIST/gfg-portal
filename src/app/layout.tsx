import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { GlobalAlert } from "@/components/GlobalAlert";

export const metadata: Metadata = {
  title: "GFG SRMIST Portal | Core Team",
  description: "GeeksforGeeks SRMIST Student Chapter Portal",
  manifest: "/manifest.json",
  icons: {
    icon: "/gfg.png",
    shortcut: "/gfg.png",
    apple: "/gfg.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GFG SRMIST",
  },
};

export const viewport: Viewport = {
  themeColor: "#2f8d46",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/gfg.png" sizes="any" />
        <link rel="apple-touch-icon" href="/gfg.png" />
      </head>
      <body className="antialiased bg-[var(--bg-base)] text-[var(--text-main)]">
        {children}
        <PwaInstallPrompt />
        <GlobalAlert />
      </body>
    </html>
  );
}