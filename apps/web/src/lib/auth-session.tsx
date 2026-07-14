import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'

import { apiClient, setAuthTokenGetter } from './api'
import {
  FIREBASE_WEB_PUSH_ENABLED,
  getFirebaseMessagingServiceWorkerUrl,
  getFirebaseWebApp,
  getFirebaseWebVapidKey,
} from './firebase-web'
import { SUPABASE_ENABLED, supabase } from './supabase'

export type PushStatus =
  | 'idle'
  | 'unsupported'
  | 'permission-required'
  | 'registering'
  | 'enabled'
  | 'denied'
  | 'error'

type AuthSessionContextValue = {
  loading: boolean
  session: Session | null
  isSignedIn: boolean
  isUsingDevAuth: boolean
  pushStatus: PushStatus
  pushError: string | null
  enablePushNotifications: () => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (payload: { email: string; password: string; name?: string; phone?: string }) => Promise<void>
  signOut: () => Promise<void>
}

const DEV_AUTH_ENABLED = Boolean(import.meta.env.VITE_DEV_USER_ID)
const defaultAuthSessionContext: AuthSessionContextValue = {
  loading: SUPABASE_ENABLED,
  session: null,
  isSignedIn: DEV_AUTH_ENABLED,
  isUsingDevAuth: DEV_AUTH_ENABLED,
  pushStatus: FIREBASE_WEB_PUSH_ENABLED ? 'idle' : 'unsupported',
  pushError: null,
  async enablePushNotifications() {
    throw new Error('Push notifications are not available')
  },
  async signInWithPassword(email, password) {
    if (!supabase) throw new Error('Supabase Auth is not configured')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },
  async signUpWithPassword({ email, password, name, phone }) {
    if (!supabase) throw new Error('Supabase Auth is not configured')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone,
        },
      },
    })
    if (error) throw error
  },
  async signOut() {
    if (!supabase || DEV_AUTH_ENABLED) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },
}

const AuthSessionContext = createContext<AuthSessionContextValue>(defaultAuthSessionContext)
const PUSH_STATUS_STORAGE_KEY = 'sarvasociety-push-status'

async function ensureActiveServiceWorker(scriptUrl: string) {
  const registration = await navigator.serviceWorker.register(scriptUrl, { scope: '/' })

  if (registration.active) return registration

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Service worker activation timed out.')), 10000)

    function finish() {
      window.clearTimeout(timeout)
      resolve()
    }

    function watch(worker: ServiceWorker | null) {
      if (!worker) return
      if (worker.state === 'activated') {
        finish()
        return
      }
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') finish()
      })
    }

    watch(registration.installing)
    watch(registration.waiting)
    navigator.serviceWorker.ready.then(() => finish()).catch(reject)
  })

  return (await navigator.serviceWorker.ready) || registration
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(SUPABASE_ENABLED)
  const [session, setSession] = useState<Session | null>(null)
  const [pushStatus, setPushStatus] = useState<PushStatus>(() => {
    if (!FIREBASE_WEB_PUSH_ENABLED) return 'unsupported'
    if (typeof window === 'undefined') return 'idle'
    const saved = window.localStorage.getItem(PUSH_STATUS_STORAGE_KEY)
    if (saved === 'enabled' && 'Notification' in window && Notification.permission === 'granted') return 'enabled'
    return 'idle'
  })
  const [pushError, setPushError] = useState<string | null>(null)

  async function registerPushToken(promptForPermission: boolean) {
    if (!FIREBASE_WEB_PUSH_ENABLED) {
      setPushStatus('unsupported')
      return
    }
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setPushStatus('unsupported')
      return
    }

    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : promptForPermission
          ? await Notification.requestPermission()
          : Notification.permission

    if (permission === 'default') {
      setPushStatus('permission-required')
      return
    }
    if (permission !== 'granted') {
      setPushStatus('denied')
      return
    }

    const shouldShowRegisteringState = promptForPermission || pushStatus !== 'enabled'
    if (shouldShowRegisteringState) {
      setPushStatus('registering')
    }
    setPushError(null)

    try {
      const app = getFirebaseWebApp()
      if (!app) {
        setPushStatus('unsupported')
        return
      }
      const messagingModule = await import('firebase/messaging')
      if (!(await messagingModule.isSupported())) {
        setPushStatus('unsupported')
        return
      }
      const registration = await ensureActiveServiceWorker(getFirebaseMessagingServiceWorkerUrl())
      const messaging = messagingModule.getMessaging(app)
      const vapidKey = getFirebaseWebVapidKey()
      if (!vapidKey) {
        setPushStatus('error')
        setPushError('Firebase web push is missing the VAPID key.')
        return
      }
      const token = await messagingModule.getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      })
      if (!token) {
        setPushStatus('error')
        setPushError('Firebase did not return a device token.')
        return
      }
      await apiClient.registerDeviceToken({
        token,
        platform: 'web',
        provider: 'FCM',
        deviceLabel: globalThis.navigator?.userAgent?.slice(0, 120) || 'Web PWA',
      })
      window.localStorage.setItem(PUSH_STATUS_STORAGE_KEY, 'enabled')
      messagingModule.onMessage(messaging, (payload) => {
        window.dispatchEvent(
          new CustomEvent('sarvasociety:push-foreground', {
            detail: {
              title: payload.notification?.title || 'SarvaSociety',
              body: payload.notification?.body || '',
              data: payload.data || {},
            },
          }),
        )
      })
      setPushStatus('enabled')
    } catch (error) {
      if (pushStatus === 'enabled' && !promptForPermission) {
        setPushStatus('enabled')
      } else {
        setPushStatus('error')
      }
      setPushError((error as Error)?.message ?? 'Push registration failed')
    }
  }

  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase) {
      setAuthTokenGetter(null)
      setLoading(false)
      return
    }
    const client = supabase

    let mounted = true
    client.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
      setLoading(false)
    })

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    setAuthTokenGetter(async () => {
      const { data } = await client.auth.getSession()
      return data.session?.access_token ?? null
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
      setAuthTokenGetter(null)
    }
  }, [])

  useEffect(() => {
    if (!session) return
    if (!FIREBASE_WEB_PUSH_ENABLED) return
    if (typeof window === 'undefined') return
    if (Notification.permission === 'granted') {
      registerPushToken(false).catch(() => {
        // best effort sync
      })
    } else if (Notification.permission === 'default') {
      if (pushStatus !== 'enabled') setPushStatus('permission-required')
    }
  }, [session, pushStatus])

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      loading,
      session,
      isSignedIn: !!session || DEV_AUTH_ENABLED,
      isUsingDevAuth: !session && DEV_AUTH_ENABLED,
      pushStatus,
      pushError,
      async enablePushNotifications() {
        await registerPushToken(true)
      },
      async signInWithPassword(email, password) {
        if (!supabase) throw new Error('Supabase Auth is not configured')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      async signUpWithPassword({ email, password, name, phone }) {
        if (!supabase) throw new Error('Supabase Auth is not configured')
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              phone,
            },
          },
        })
        if (error) throw error
      },
      async signOut() {
        if (!session && DEV_AUTH_ENABLED) return
        if (!supabase) return
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      },
    }),
    [loading, pushError, pushStatus, session],
  )

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}

export function useAuthSession() {
  return useContext(AuthSessionContext)
}
