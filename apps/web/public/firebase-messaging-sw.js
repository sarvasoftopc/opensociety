/* global importScripts, firebase */

const search = new URL(self.location.href).searchParams
const firebaseConfig = {
  apiKey: search.get('apiKey'),
  authDomain: search.get('authDomain'),
  projectId: search.get('projectId'),
  storageBucket: search.get('storageBucket'),
  messagingSenderId: search.get('messagingSenderId'),
  appId: search.get('appId'),
  measurementId: search.get('measurementId'),
}

if (firebaseConfig.apiKey && firebaseConfig.messagingSenderId && firebaseConfig.appId) {
  importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js')
  importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js')

  firebase.initializeApp(firebaseConfig)
  const messaging = firebase.messaging()

  messaging.onBackgroundMessage((payload) => {
    const notification = payload.notification || {}
    const title = notification.title || 'SarvaSociety'
    const options = {
      body: notification.body || '',
      icon: '/logo192.png',
      badge: '/logo192.png',
      data: {
        url: payload?.data?.url || payload?.fcmOptions?.link || '/resident',
      },
    }
    self.registration.showNotification(title, options)
  })
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/resident'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
      return undefined
    }),
  )
})
