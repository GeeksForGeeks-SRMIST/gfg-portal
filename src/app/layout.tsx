// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "@/app/globals.css";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { OneSignalProvider } from "@/components/OneSignalProvider";

export const metadata: Metadata = {
  title: "GFG CORE TEAM",
  description: "GeeksforGeeks SRMIST Core Team Portal",
  manifest: "/manifest.json",
  icons: {
    icon: "/gfg.png",
    shortcut: "/gfg.png",
    apple: "/gfg.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GFG CORE TEAM",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/gfg.png" sizes="any" />
        <link rel="apple-touch-icon" href="/gfg.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/gfg.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GFG CORE TEAM" />
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          strategy="afterInteractive"
        />
      </head>
      <body className="antialiased bg-[var(--bg-base)] text-[var(--text-main)]">
        <OneSignalProvider>
          <Providers>
            <ServiceWorkerRegister />
            {children}
            <PwaInstallPrompt />
          </Providers>
        </OneSignalProvider>
      </body>
    </html>
  );
}