import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

import { apiClient } from '../api/client'
import { Button } from '../components/Button'
import { AppTopBar, ResidentBottomNav } from '../components/app-shell'
import { MobileScreen, SectionCard, mobileTheme } from '../components/mobile-ui'

export default function Profile() {
  const qc = useQueryClient()
  const me = useQuery({ queryKey: ['profile-me'], queryFn: () => apiClient.me() })
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    if (me.data) {
      setName(me.data.name)
      setPhone(me.data.phone ?? '')
    }
  }, [me.data])

  const save = useMutation({
    mutationFn: () => apiClient.updateMe({ name: name.trim(), phone: phone.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile-me'] })
      qc.invalidateQueries({ queryKey: ['mobile-auth-me'] })
    },
  })

  if (me.isLoading) {
    return (
      <MobileScreen>
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      </MobileScreen>
    )
  }

  if (!me.data) {
    return (
      <MobileScreen>
        <View style={styles.centered}>
          <Text style={styles.error}>Could not load profile.</Text>
        </View>
      </MobileScreen>
    )
  }

  return (
    <MobileScreen>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <AppTopBar
            title="Profile"
            subtitle={`${me.data.role} · ${me.data.tenantSlug}`}
            avatarText={me.data.name.slice(0, 1).toUpperCase()}
          />

          <SectionCard title="Resident profile" subtitle="Residents can now update their own name and phone.">
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={mobileTheme.input}
                value={name}
                onChangeText={setName}
                placeholder="Resident name"
                placeholderTextColor="#7a8aa3"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={mobileTheme.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Phone number"
                placeholderTextColor="#7a8aa3"
              />
            </View>
            <Button label={save.isPending ? 'Saving…' : 'Save profile'} onPress={() => save.mutate()} disabled={save.isPending || !name.trim()} />
            {save.isSuccess ? <Text style={styles.success}>Profile updated.</Text> : null}
            {save.isError ? <Text style={styles.error}>{String((save.error as Error)?.message ?? 'Failed')}</Text> : null}
          </SectionCard>

          <SectionCard title="Account details">
            <Text style={styles.meta}>Email: {me.data.email ?? 'Not set'}</Text>
            <Text style={styles.meta}>Status: {me.data.status}</Text>
            <Text style={styles.meta}>Tenant: {me.data.tenantSlug}</Text>
          </SectionCard>
        </ScrollView>

        <ResidentBottomNav active="home" />
      </View>
    </MobileScreen>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, gap: 16, paddingBottom: 120 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  field: { gap: 6 },
  label: { color: '#35507a', fontSize: 13, fontWeight: '700' },
  meta: { color: '#475569', fontSize: 14, lineHeight: 22 },
  success: { color: '#15803d', fontSize: 13, fontWeight: '700' },
  error: { color: '#d92d20', fontSize: 13, fontWeight: '700' },
})
