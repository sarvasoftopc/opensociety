import { Link } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { apiClient } from '../api/client'
import { AppTopBar, ResidentBottomNav } from '../components/app-shell'
import { MobileScreen, SectionCard } from '../components/mobile-ui'

const SERVICE_LINKS = [
  { href: '/bills' as const, title: 'Payments', body: 'Track and pay maintenance dues.', icon: 'wallet-outline' as const },
  { href: '/tickets' as const, title: 'Maintenance', body: 'Raise complaints and track resolution.', icon: 'construct-outline' as const },
  { href: '/my-house-help' as const, title: 'Daily help', body: 'Assign and rate house help.', icon: 'people-outline' as const },
  { href: '/my-vehicles' as const, title: 'Vehicles', body: 'Manage resident vehicles and parking.', icon: 'car-outline' as const },
  { href: '/visitors' as const, title: 'Visitor approvals', body: 'Approve walk-ins and gate requests.', icon: 'shield-checkmark-outline' as const },
] as const

export default function Services() {
  const me = useQuery({ queryKey: ['services-me'], queryFn: () => apiClient.me() })
  const bills = useQuery({ queryKey: ['services-bills'], queryFn: () => apiClient.listBills() })
  const tickets = useQuery({ queryKey: ['services-tickets'], queryFn: () => apiClient.listTickets() })

  const totalOutstanding = (bills.data ?? []).reduce(
    (sum, bill) => sum + Math.max(0, bill.totalAmount - (bill.paidAmount ?? 0)),
    0,
  )

  return (
    <MobileScreen>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <AppTopBar
            title="Services"
            subtitle="Resident utility stack"
            avatarText={(me.data?.name ?? 'R').slice(0, 1).toUpperCase()}
          />

          <SectionCard title="Quick status" subtitle="Your money and service requests stay visible up front.">
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>₹{(totalOutstanding / 100).toFixed(2)}</Text>
                <Text style={styles.summaryLabel}>Outstanding</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{tickets.data?.length ?? 0}</Text>
                <Text style={styles.summaryLabel}>Tickets</Text>
              </View>
            </View>
          </SectionCard>

          <SectionCard title="Service modules" subtitle="These are real route targets now, not placeholder tabs.">
            <View style={styles.grid}>
              {SERVICE_LINKS.map((item) => (
                <Link key={item.href} href={item.href} asChild>
                  <Pressable style={styles.serviceCard}>
                    <View style={styles.serviceIcon}>
                      <Ionicons color="#12395c" name={item.icon} size={24} />
                    </View>
                    <Text style={styles.serviceTitle}>{item.title}</Text>
                    <Text style={styles.serviceBody}>{item.body}</Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          </SectionCard>
        </ScrollView>

        <ResidentBottomNav active="services" />
      </View>
    </MobileScreen>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, gap: 16, paddingBottom: 120 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, borderRadius: 22, padding: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dce8f7', gap: 4 },
  summaryValue: { color: '#11203a', fontSize: 22, fontWeight: '900' },
  summaryLabel: { color: '#64748b', fontSize: 13, fontWeight: '700' },
  grid: { gap: 12 },
  serviceCard: { borderRadius: 24, padding: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dce8f7', gap: 8 },
  serviceIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#edf4ff', alignItems: 'center', justifyContent: 'center' },
  serviceTitle: { color: '#11203a', fontSize: 16, fontWeight: '800' },
  serviceBody: { color: '#64748b', fontSize: 13, lineHeight: 20 },
})
