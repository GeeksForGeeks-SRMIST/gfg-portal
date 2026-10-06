// public/sw.js

const ICON_CACHE_NAME = "gfg-icon-v1";

// 1. Instantly activate updated service worker without waiting
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== ICON_CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 2. Selective Fetch Strategy: Cache ONLY icons/manifests, let everything else pass through
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // ONLY intercept icon and manifest requests
  const isAppIcon =
    url.pathname.includes("gfg") ||
    url.pathname.includes("icon") ||
    url.pathname.includes("manifest") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico");

  if (!isAppIcon || url.origin !== self.location.origin) {
    // Let Next.js, API routes, and JavaScript chunks load directly from network without caching
    return;
  }

  // Stale-While-Revalidate for icons: Serve instantly from cache, update cache in background
  event.respondWith(
    caches.open(ICON_CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      });
    })
  );
});

// 3. Handle incoming Web Push payload from Google / Apple / Mozilla / OneSignal
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