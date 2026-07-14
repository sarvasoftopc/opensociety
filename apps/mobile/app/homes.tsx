import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'

import { apiClient } from '../api/client'
import { AppTopBar, ResidentBottomNav } from '../components/app-shell'
import { MobileScreen, SectionCard } from '../components/mobile-ui'

export default function Homes() {
  const me = useQuery({ queryKey: ['homes-me'], queryFn: () => apiClient.me() })
  const apartments = useQuery({ queryKey: ['homes-apartments'], queryFn: () => apiClient.listMyApartments() })
  const guards = useQuery({ queryKey: ['homes-guards'], queryFn: () => apiClient.listActiveDuty() })
  const houseHelp = useQuery({ queryKey: ['homes-help'], queryFn: () => apiClient.listHouseHelp() })

  const residentName = me.data?.name ?? 'Resident'
  const tenantSlug = me.data?.tenantSlug ?? 'SarvaSociety'

  return (
    <MobileScreen>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <AppTopBar title="Homes" subtitle={tenantSlug} avatarText={residentName.slice(0, 1).toUpperCase()} />

          <SectionCard title="My apartments" subtitle="Resident homes assigned to your account.">
            {apartments.isLoading ? <ActivityIndicator /> : null}
            {(apartments.data ?? []).map((apartment) => (
              <View key={apartment.id} style={styles.card}>
                <Text style={styles.title}>{apartment.tower}-{apartment.apartmentNo}</Text>
                <Text style={styles.meta}>
                  Floor {apartment.floor ?? '—'} · {apartment.bhkType ?? 'Flat'}
                </Text>
              </View>
            ))}
          </SectionCard>

          <SectionCard title="Daily help assigned" subtitle="Workers linked to your society account and flat access.">
            {houseHelp.isLoading ? <ActivityIndicator /> : null}
            {(houseHelp.data ?? []).slice(0, 6).map((helper) => (
              <View key={helper.id} style={styles.card}>
                <Text style={styles.title}>{helper.name}</Text>
                <Text style={styles.meta}>
                  {helper.type} · Trust {helper.trustScore}/100 · {helper.verificationLevel}
                </Text>
              </View>
            ))}
            {(houseHelp.data ?? []).length === 0 && !houseHelp.isLoading ? <Text style={styles.empty}>No daily help assigned yet.</Text> : null}
          </SectionCard>

          <SectionCard title="Guards on duty" subtitle="Residents can see who is active and where they marked attendance.">
            {guards.isLoading ? <ActivityIndicator /> : null}
            {(guards.data ?? []).map((session) => (
              <View key={session.id} style={styles.guardCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{session.guardName ?? 'Guard'}</Text>
                  <Text style={styles.meta}>
                    {session.checkpoint ?? 'Checkpoint not set'} · since {new Date(session.clockInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={styles.liveBadge}>LIVE</Text>
              </View>
            ))}
            {(guards.data ?? []).length === 0 && !guards.isLoading ? <Text style={styles.empty}>No guards are clocked in right now.</Text> : null}
          </SectionCard>
        </ScrollView>

        <ResidentBottomNav active="homes" />
      </View>
    </MobileScreen>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, gap: 16, paddingBottom: 120 },
  card: { borderRadius: 22, padding: 14, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dce8f7', gap: 4 },
  guardCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 22, padding: 14, backgroundColor: '#effaf3', borderWidth: 1, borderColor: '#ccebd4' },
  title: { color: '#11203a', fontSize: 16, fontWeight: '800' },
  meta: { color: '#64748b', fontSize: 13, lineHeight: 19 },
  liveBadge: { color: '#15803d', fontSize: 12, fontWeight: '900' },
  empty: { color: '#64748b', fontSize: 13 },
})
