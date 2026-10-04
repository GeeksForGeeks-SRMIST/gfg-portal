// public/sw.js

// 1. Immediately activate updated service worker without waiting
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// 2. Handle incoming Web Push payload from Google / Apple
self.addEventListener("push", (event) => {
  let data = {
    title: "GeeksforGeeks SRMIST",
    message: "New alert received!",
    link: "/dashboard",
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
    vibrate: [100, 50, 100],
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

  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
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
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});