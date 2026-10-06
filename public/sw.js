// public/sw.js

// 1. Immediately activate updated service worker without waiting
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          // Clear stale caches on activation
          return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 2. Network-first fetch strategy for seamless seamless client updates
self.addEventListener("fetch", (event) => {
  // Only intercept GET requests
  if (event.request.method !== "GET") return;

  // Let browser/OneSignal handles API, WebSockets, or third-party SDK calls
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/webpack-hmr")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and store fresh response in cache if valid
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();
          caches.open("gfg-core-v2").then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// 3. Handle incoming Web Push payload from Google / Apple / Mozilla / OneSignal fallback
self.addEventListener("push", (event) => {
  let data = {
    title: "GFG CORE TEAM",
    message: "New update received!",
    link: "/dashboard/notices",
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = {
        title: parsed.title || parsed.headings?.en || data.title,
        message: parsed.message || parsed.contents?.en || parsed.body || data.message,
        link: parsed.link || parsed.url || data.link,
      };
    } catch (e) {
      data.message = event.data.text();
    }
  }

  const options = {
    body: data.message,
    icon: "/gfg.png",
    badge: "/gfg.png",
    vibrate: [200, 100, 200, 100, 200],
    tag: "gfg-notice-broadcast",
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.link,
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 4. Handle notification click on phone/desktop OS
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/dashboard/notices",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          if ("navigate" in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});