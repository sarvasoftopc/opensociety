import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const SUPABASE_ENABLED = !!SUPABASE_URL && !!SUPABASE_ANON_KEY

const storage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(key) ?? null
      } catch {
        return null
      }
    }
    try {
      return await SecureStore.getItemAsync(key)
    } catch {
      return null
    }
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.setItem(key, value)
      } catch {
        // ignore storage write issues
      }
      return
    }
    try {
      await SecureStore.setItemAsync(key, value)
    } catch {
      // ignore storage write issues
    }
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.removeItem(key)
      } catch {
        // ignore storage delete issues
      }
      return
    }
    try {
      await SecureStore.deleteItemAsync(key)
    } catch {
      // ignore storage delete issues
    }
  },
}

export const supabase = SUPABASE_ENABLED
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        storage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null
