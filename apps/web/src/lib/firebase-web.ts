import { getApp, getApps, initializeApp } from 'firebase/app'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
}

export const FIREBASE_WEB_PUSH_ENABLED = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId &&
    import.meta.env.VITE_FIREBASE_VAPID_KEY,
)

export function getFirebaseWebApp() {
  if (!FIREBASE_WEB_PUSH_ENABLED) return null
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
}

export function getFirebaseWebVapidKey() {
  return import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined
}

export function getFirebaseMessagingServiceWorkerUrl() {
  const params = new URLSearchParams()
  Object.entries(firebaseConfig).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  return `/firebase-messaging-sw.js?${params.toString()}`
}
