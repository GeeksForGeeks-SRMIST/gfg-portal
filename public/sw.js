self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || '📢 GFG SRMIST Alert';
    const options = {
      body: data.message || 'New announcement on the core team portal.',
      icon: '/gfg.png',
      badge: '/gfg.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/dashboard/notices' }
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    const options = {
      body: event.data.text(),
      icon: '/gfg.png',
      badge: '/gfg.png'
    };
    event.waitUntil(
      self.registration.showNotification('📢 GFG SRMIST Notice', options)
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});