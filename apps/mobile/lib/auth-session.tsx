import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import type { Session } from '@supabase/supabase-js'

import { apiClient, setAuthTokenGetter } from '../api/client'
import { SUPABASE_ENABLED, supabase } from './supabase'

type AuthSessionContextValue = {
  loading: boolean
  session: Session | null
  isSignedIn: boolean
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (payload: { email: string; password: string; name?: string; phone?: string }) => Promise<void>
  signOut: () => Promise<void>
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null)

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(SUPABASE_ENABLED)
  const [session, setSession] = useState<Session | null>(null)

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
    let cancelled = false
    const key = 'sarvasociety-device-token'
    const register = async () => {
      let token = ''
      if (Platform.OS === 'web') {
        token =
          globalThis.localStorage?.getItem(key) ??
          `web-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString()}`
        globalThis.localStorage?.setItem(key, token)
      } else {
        token = (await SecureStore.getItemAsync(key)) ?? `native-${Date.now()}`
        await SecureStore.setItemAsync(key, token)
      }
      if (cancelled) return
      await apiClient.registerDeviceToken({
        token,
        platform: Platform.OS,
        provider: 'FCM',
        deviceLabel: Platform.OS === 'web' ? 'Web preview' : 'Mobile device',
      })
    }
    register().catch(() => {
      // best effort; auth should continue even if token registration fails
    })
    return () => {
      cancelled = true
    }
  }, [session])

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      loading,
      session,
      isSignedIn: !!session,
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
        if (!supabase) return
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      },
    }),
    [loading, session],
  )

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}

export function useAuthSession() {
  const ctx = useContext(AuthSessionContext)
  if (!ctx) throw new Error('useAuthSession must be used within AuthSessionProvider')
  return ctx
}
