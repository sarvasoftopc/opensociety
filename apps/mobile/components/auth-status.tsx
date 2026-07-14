import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text } from 'react-native'

import { useAuthSession } from '../lib/auth-session'
import { SUPABASE_ENABLED } from '../lib/supabase'


export const AUTH_ENABLED = SUPABASE_ENABLED

export function AuthStatus() {
  const { loading, isSignedIn, signOut } = useAuthSession()
  if (!AUTH_ENABLED || loading) return null
  return isSignedIn ? (
    <Pressable onPress={() => signOut()}>
      <Text style={styles.link}>Sign out</Text>
    </Pressable>
  ) : (
    <Link href="/sign-in" style={styles.link}>
      Sign in →
    </Link>
  )
}

const styles = StyleSheet.create({
  link: { marginTop: 6, fontSize: 15, color: '#33527d', fontWeight: '700' },
})
