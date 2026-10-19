// Service worker — push notifications for Magomano County Sacco
/* eslint-disable no-undef */
self.addEventListener('push', (event) => {
  let data = { title: 'Magomano County Sacco', body: 'You have a new notification.' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/vite.svg',
      badge: '/vite.svg',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow('/'))
})
