"use client";

import { useEffect } from "react";

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
      (window as any).OneSignalDeferred.push(async function (OneSignal: any) {
        await OneSignal.init({
          appId: "35f658c9-512c-458d-8752-ebbeb01eda75",
          safari_web_id: "web.onesignal.auto.1afb9025-a2b0-4a54-8c00-23b218b2b39b",
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: false, // We use your custom NotificationBell UI
          },
        });
      });
    }
  }, []);

  return <>{children}</>;
}