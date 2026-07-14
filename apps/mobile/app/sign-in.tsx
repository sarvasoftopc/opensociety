import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { Button } from '../components/Button'
import { HeroCard, MobileScreen, SectionCard, mobileTheme } from '../components/mobile-ui'
import { useAuthSession } from '../lib/auth-session'

export default function SignInScreen() {
  const { signInWithPassword, signUpWithPassword, loading } = useAuthSession()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit() {
    if (loading || pending) return
    setPending(true)
    setError(null)
    setMessage(null)
    try {
      if (isRegister) {
        await signUpWithPassword({ email: email.trim(), password, name: name.trim() || undefined })
        setMessage('Account created. Verify your email if confirmation is enabled, then sign in.')
      } else {
        await signInWithPassword(email.trim(), password)
        router.replace('/')
      }
    } catch (e) {
      const msg = (e as { message?: string })?.message
      setError(msg ?? (isRegister ? 'Sign up failed' : 'Sign in failed'))
    } finally {
      setPending(false)
    }
  }

  return (
    <MobileScreen scroll>
      <HeroCard
        eyebrow="SarvaSociety"
        title={isRegister ? 'Create your society account' : 'Welcome back'}
        subtitle="Use Supabase Auth to enter the correct resident, guard, or admin experience."
        badge={isRegister ? 'Register' : 'Sign in'}
      />

      <SectionCard title={isRegister ? 'Set up access' : 'Secure sign-in'} subtitle="This local demo is already seeded with resident, guard, and admin accounts.">
        {!isRegister ? (
          <View style={styles.demoPickerRow}>
            <QuickFill
              label="Resident demo"
              onPress={() => {
                setEmail('resident@demo.local')
                setPassword('Resident123!')
              }}
            />
            <QuickFill
              label="Guard demo"
              onPress={() => {
                setEmail('guard@demo.local')
                setPassword('Guard123!')
              }}
            />
            <QuickFill
              label="Admin demo"
              onPress={() => {
                setEmail('admin@demo.local')
                setPassword('DemoAdmin123!')
              }}
            />
          </View>
        ) : null}
        {isRegister ? (
          <TextInput
            style={mobileTheme.input}
            placeholder="Full name"
            placeholderTextColor="#7a8aa3"
            value={name}
            onChangeText={setName}
          />
        ) : null}
        <TextInput
          style={mobileTheme.input}
          placeholder="Email"
          placeholderTextColor="#7a8aa3"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={mobileTheme.input}
          placeholder="Password"
          placeholderTextColor="#7a8aa3"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Button
          label={pending ? (isRegister ? 'Creating account…' : 'Signing in…') : isRegister ? 'Create account' : 'Sign in'}
          onPress={onSubmit}
          disabled={loading || pending || !email.trim() || !password || (isRegister && !name.trim())}
        />
        <Button
          label={isRegister ? 'Have an account? Sign in' : 'New here? Create account'}
          onPress={() => {
            setIsRegister((value) => !value)
            setError(null)
            setMessage(null)
          }}
          variant="outline"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </SectionCard>

      {!isRegister ? (
        <SectionCard title="Demo accounts" subtitle="Use these to test the full end-to-end flows locally.">
          <CredentialCard title="Resident" email="resident@demo.local" password="Resident123!" />
          <CredentialCard title="Guard" email="guard@demo.local" password="Guard123!" />
          <CredentialCard title="Admin" email="admin@demo.local" password="DemoAdmin123!" />
        </SectionCard>
      ) : null}
    </MobileScreen>
  )
}

function CredentialCard({ title, email, password }: { title: string; email: string; password: string }) {
  return (
    <View style={styles.credentialCard}>
      <Text style={styles.credentialTitle}>{title}</Text>
      <Text style={styles.credentialMeta}>{email}</Text>
      <Text style={styles.credentialMeta}>{password}</Text>
    </View>
  )
}

function QuickFill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.quickFill}>
      <Text style={styles.quickFillText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  demoPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickFill: {
    borderRadius: 999,
    backgroundColor: '#fff7d6',
    borderWidth: 1,
    borderColor: '#f4de7d',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  quickFillText: {
    color: '#6b5600',
    fontSize: 12,
    fontWeight: '800',
  },
  error: { color: '#d92d20', fontSize: 13, fontWeight: '700' },
  message: { color: '#217a47', fontSize: 13, fontWeight: '700' },
  credentialCard: {
    borderRadius: 20,
    backgroundColor: '#f6faff',
    borderWidth: 1,
    borderColor: '#dbe8f8',
    padding: 14,
    gap: 4,
  },
  credentialTitle: {
    color: '#11203a',
    fontSize: 15,
    fontWeight: '800',
  },
  credentialMeta: {
    color: '#6f8098',
    fontSize: 13,
    fontWeight: '600',
  },
})
