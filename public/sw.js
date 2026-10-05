// 1. Immediately activate updated service worker without waiting
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// 2. Handle incoming Web Push payload from Google / Apple / Mozilla
self.addEventListener("push", (event) => {
  let data = {
    title: "GeeksforGeeks SRMIST",
    message: "New alert received!",
    link: "/dashboard/notices",
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = {
        title: parsed.title || data.title,
        message: parsed.message || parsed.body || data.message,
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

// 3. Handle notification click on phone/desktop OS
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/dashboard/notices",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // If a portal tab is already open, focus and navigate it
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          if ("navigate" in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new portal tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});