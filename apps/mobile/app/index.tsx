import { StatusBar } from 'expo-status-bar'
import { Link } from 'expo-router'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import type { Notice } from '@opensociety/shared'
import { formatPaise } from '@opensociety/shared'

import { apiClient } from '../api/client'
import { AppTopBar, ResidentBottomNav } from '../components/app-shell'
import { AUTH_ENABLED, AuthStatus } from '../components/auth-status'
import { Button } from '../components/Button'
import { EmptyState, MobileScreen, SectionCard } from '../components/mobile-ui'
import { useAuthSession } from '../lib/auth-session'

const RESIDENT_SHORTCUTS = [
  { href: '/visitors' as const, label: 'Approvals', icon: 'shield-checkmark-outline' as const },
  { href: '/pre-approve' as const, label: 'Pre-Approve', icon: 'person-add-outline' as const },
  { href: '/bills' as const, label: 'Payments', icon: 'card-outline' as const },
  { href: '/my-house-help' as const, label: 'Daily Help', icon: 'people-outline' as const },
  { href: '/my-vehicles' as const, label: 'Vehicles', icon: 'car-sport-outline' as const },
  { href: '/tickets' as const, label: 'Services', icon: 'construct-outline' as const },
] as const

const RESIDENT_TOP_ACTIONS = [
  { href: '/pre-approve' as const, label: 'Pre-Approve', accent: '#ffdf4d', icon: 'person-add-outline' as const },
  { href: '/my-house-help' as const, label: 'Daily Help', accent: '#cfefff', icon: 'people-outline' as const },
  { href: '/notifications' as const, label: 'Alerts', accent: '#e6dcff', icon: 'notifications-outline' as const },
  { href: '/visitors' as const, label: 'Visitors', accent: '#ffd7cc', icon: 'walk-outline' as const },
] as const

const GUARD_ACTIONS = [
  { href: '/gate' as const, label: 'Gate queue', body: 'Redeem codes, register walk-ins, and check visitors in.' },
  { href: '/register' as const, label: 'Register visitor', body: 'Create a resident approval request for a walk-in guest.' },
  { href: '/duty' as const, label: 'Duty roster', body: 'Clock in and keep the shift board current.' },
  { href: '/house-help' as const, label: 'House help', body: 'Manage staff entry and exit.' },
] as const

export default function Index() {
  const { isSignedIn, loading } = useAuthSession()
  const me = useQuery({
    queryKey: ['mobile-auth-me'],
    queryFn: apiClient.me,
    enabled: isSignedIn,
    retry: false,
  })

  const residentNotices = useQuery({
    queryKey: ['resident-home-notices'],
    enabled: isSignedIn && me.data?.role === 'RESIDENT',
    queryFn: () => apiClient.listNotices(),
    retry: false,
  })
  const residentNotifications = useQuery({
    queryKey: ['resident-home-notifications'],
    enabled: isSignedIn && me.data?.role === 'RESIDENT',
    queryFn: () => apiClient.listNotifications(),
    retry: false,
  })
  const residentBills = useQuery({
    queryKey: ['resident-home-bills'],
    enabled: isSignedIn && me.data?.role === 'RESIDENT',
    queryFn: () => apiClient.listBills(),
    retry: false,
  })
  const residentApartments = useQuery({
    queryKey: ['resident-home-apartments'],
    enabled: isSignedIn && me.data?.role === 'RESIDENT',
    queryFn: () => apiClient.listMyApartments(),
    retry: false,
  })
  const residentHouseHelp = useQuery({
    queryKey: ['resident-home-house-help'],
    enabled: isSignedIn && me.data?.role === 'RESIDENT',
    queryFn: () => apiClient.listHouseHelp(),
    retry: false,
  })

  const guardVisitors = useQuery({
    queryKey: ['mobile-home-visitors'],
    queryFn: () => apiClient.listVisitors(),
    enabled: isSignedIn && me.data?.role === 'GUARD',
  })
  const guardDuty = useQuery({
    queryKey: ['mobile-home-duty'],
    queryFn: () => apiClient.listActiveDuty(),
    enabled: isSignedIn && me.data?.role === 'GUARD',
  })
  const guardRoster = useQuery({
    queryKey: ['mobile-home-guards'],
    queryFn: () => apiClient.listGuards(),
    enabled: isSignedIn && me.data?.role === 'GUARD',
  })

  if (!isSignedIn && !loading) {
    return (
      <MobileScreen scroll>
        <ResidentSignedOutLanding />
        {AUTH_ENABLED ? <AuthStatus /> : null}
        <StatusBar style="dark" />
      </MobileScreen>
    )
  }

  if (loading) {
    return (
      <MobileScreen>
        <CenteredState title="Checking session" body="Restoring your account access." />
        <StatusBar style="dark" />
      </MobileScreen>
    )
  }

  if (!isSignedIn) {
    return (
      <MobileScreen>
        <CenteredState title="Sign in required" body="Use the shared SarvaSociety sign-in to continue." />
        <StatusBar style="dark" />
      </MobileScreen>
    )
  }

  if (me.isLoading) {
    return (
      <MobileScreen>
        <CenteredState title="Loading profile" body="Syncing your role and society profile." />
        <StatusBar style="dark" />
      </MobileScreen>
    )
  }

  if (me.isError || !me.data) {
    return (
      <MobileScreen>
        <CenteredState title="Profile unavailable" body={String((me.error as Error)?.message ?? 'Please try again.')} />
        <StatusBar style="dark" />
      </MobileScreen>
    )
  }

  if (me.data.role === 'ADMIN') {
    return (
      <MobileScreen scroll>
        <AdminLanding tenantSlug={me.data.tenantSlug} />
        {AUTH_ENABLED ? <AuthStatus /> : null}
        <StatusBar style="dark" />
      </MobileScreen>
    )
  }

  if (me.data.status !== 'APPROVED') {
    return (
      <MobileScreen>
        <CenteredState title="Approval pending" body="An admin still needs to approve this account." />
        <StatusBar style="dark" />
      </MobileScreen>
    )
  }

  if (me.data.role === 'GUARD') {
    return (
      <MobileScreen scroll>
        <GuardHome
          userId={me.data.id}
          name={me.data.name}
          tenantSlug={me.data.tenantSlug}
          queueCount={(guardVisitors.data ?? []).filter((v) => v.status === 'PENDING' || v.status === 'APPROVED').length}
          dutyCount={guardDuty.data?.length ?? 0}
          guards={guardRoster.data ?? []}
          activeDuty={guardDuty.data ?? []}
        />
        {AUTH_ENABLED ? <AuthStatus /> : null}
        <StatusBar style="dark" />
      </MobileScreen>
    )
  }

  return (
    <MobileScreen>
      <ResidentHome
        notices={residentNotices.data ?? []}
        notifications={residentNotifications.data ?? []}
        bills={residentBills.data ?? []}
        apartments={residentApartments.data ?? []}
        houseHelp={residentHouseHelp.data ?? []}
        noticesLoading={residentNotices.isLoading}
        notificationsLoading={residentNotifications.isLoading}
        billsLoading={residentBills.isLoading}
        apartmentsLoading={residentApartments.isLoading}
        houseHelpLoading={residentHouseHelp.isLoading}
        notificationsError={residentNotifications.isError ? String((residentNotifications.error as Error)?.message ?? 'Failed to load alerts.') : null}
        residentName={me.data.name}
        tenantSlug={me.data.tenantSlug}
      />
      {AUTH_ENABLED ? <AuthStatus /> : null}
      <StatusBar style="dark" />
    </MobileScreen>
  )
}

function ResidentSignedOutLanding() {
  return (
    <>
      <View style={styles.heroShell}>
        <Text style={styles.brandEyebrow}>SarvaSociety</Text>
        <Text style={styles.heroTitle}>One sign-in for resident, guard, and admin.</Text>
        <Text style={styles.heroBody}>
          Use the shared sign-in and SarvaSociety routes you into the right experience automatically.
        </Text>
        <View style={styles.demoCallout}>
          <Text style={styles.demoCalloutTitle}>Quick test</Text>
          <Text style={styles.demoCalloutBody}>Use the resident demo first to preview the mobile resident app flow.</Text>
        </View>
      </View>

      <SectionCard title="Demo accounts" subtitle="These are already seeded in Supabase Auth for local testing.">
        <DemoCredential title="Resident" email="resident@demo.local" password="Resident123!" />
        <DemoCredential title="Guard" email="guard@demo.local" password="Guard123!" />
        <DemoCredential title="Admin" email="admin@demo.local" password="DemoAdmin123!" />
        <Link href="/sign-in" asChild>
          <Pressable style={styles.primaryLaunchButton}>
            <Text style={styles.primaryLaunchButtonText}>Open sign in</Text>
          </Pressable>
        </Link>
      </SectionCard>
    </>
  )
}

function ResidentHome({
  notices,
  notifications,
  bills,
  apartments,
  houseHelp,
  noticesLoading,
  notificationsLoading,
  billsLoading,
  apartmentsLoading,
  houseHelpLoading,
  notificationsError,
  residentName,
  tenantSlug,
}: {
  notices: Awaited<ReturnType<typeof apiClient.listNotices>>
  notifications: Awaited<ReturnType<typeof apiClient.listNotifications>>
  bills: Awaited<ReturnType<typeof apiClient.listBills>>
  apartments: Awaited<ReturnType<typeof apiClient.listMyApartments>>
  houseHelp: Awaited<ReturnType<typeof apiClient.listHouseHelp>>
  noticesLoading: boolean
  notificationsLoading: boolean
  billsLoading: boolean
  apartmentsLoading: boolean
  houseHelpLoading: boolean
  notificationsError: string | null
  residentName: string
  tenantSlug: string
}) {
  const [activeNotice, setActiveNotice] = useState<Notice | null>(null)

  const unreadAlerts = notifications.filter((item) => !item.readAt)
  const totalOutstanding = bills.reduce(
    (sum, bill) => sum + Math.max(0, bill.totalAmount - (bill.paidAmount ?? 0)),
    0,
  )
  const highlightedHouseHelp = useMemo(
    () =>
      houseHelp.slice(0, 2).map((helper) => ({
        apartmentLabel: apartments[0] ? `${apartments[0].tower}-${apartments[0].apartmentNo}` : tenantSlug,
        helper,
      })),
    [houseHelp, apartments, tenantSlug],
  )
  const apartmentLabel = apartments[0] ? `${apartments[0].tower} ${apartments[0].apartmentNo}` : tenantSlug

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.residentScroll}>
        <AppTopBar title={apartmentLabel} subtitle={tenantSlug} avatarText={residentName.slice(0, 1).toUpperCase()} />

        <SectionCard title="Quick actions" subtitle="The most-used resident shortcuts stay at the top.">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickStrip}>
            {RESIDENT_TOP_ACTIONS.map((item) => (
              <Link key={item.href} href={item.href} asChild>
                <Pressable style={styles.quickActionPill}>
                  <View style={[styles.quickActionIcon, { backgroundColor: item.accent }]}>
                    <Ionicons color="#11203a" name={item.icon} size={22} />
                  </View>
                  <Text style={styles.quickActionText}>{item.label}</Text>
                </Pressable>
              </Link>
            ))}
          </ScrollView>
        </SectionCard>

        <Pressable style={styles.duesCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.duesAmount}>{formatPaise(totalOutstanding)}</Text>
            <Text style={styles.duesCopy}>
              {totalOutstanding > 0 ? 'Tap to settle current dues and record payment.' : 'No outstanding dues right now.'}
            </Text>
          </View>
          <Link href="/bills" asChild>
            <Pressable style={styles.duesIconWrap}>
              <Ionicons color="#12395c" name="wallet-outline" size={26} />
            </Pressable>
          </Link>
        </Pressable>

        {(noticesLoading || billsLoading || apartmentsLoading || houseHelpLoading) ? (
          <SectionCard title="Syncing dashboard" subtitle="Pulling your notices, bills, and approvals together.">
            <ActivityIndicator />
            <Text style={styles.syncText}>Loading resident modules…</Text>
          </SectionCard>
        ) : null}
        <>
            <SectionCard title="Notice board" subtitle="Important society communication appears here first.">
              {noticesLoading ? <Text style={styles.syncText}>Loading notices…</Text> : null}
              {notices.map((notice) => (
                <Pressable key={notice.id} style={styles.noticeFeedCard} onPress={() => setActiveNotice(notice)}>
                  <View style={styles.noticeHeader}>
                    <View style={styles.noticeBadgeIcon}>
                      <Ionicons color="#8a6b00" name="document-text-outline" size={22} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.noticeTitleRow}>
                        <Text style={styles.noticeFeedTitle}>{notice.title}</Text>
                        <Text style={styles.noticePriority}>{notice.priority}</Text>
                      </View>
                      <Text style={styles.noticeMeta}>{notice.category}</Text>
                    </View>
                    <Feather color="#11203a" name="more-vertical" size={18} />
                  </View>
                  <Text numberOfLines={3} style={styles.noticeFeedBody}>
                    {notice.body}
                  </Text>
                </Pressable>
              ))}
              {notices.length === 0 ? (
                <Text style={styles.emptyText}>No notices yet.</Text>
              ) : null}
            </SectionCard>

            <SectionCard title="Home summary" subtitle="Resident-specific live counts from your society account.">
              <View style={styles.summaryRow}>
                <SummaryPill label="Alerts" value={notificationsLoading ? '…' : String(unreadAlerts.length)} />
                <SummaryPill label="Bills" value={billsLoading ? '…' : String(bills.length)} />
                <SummaryPill label="Flats" value={apartmentsLoading ? '…' : String(apartments.length)} />
              </View>
              {notificationsError ? <Text style={styles.errorText}>{notificationsError}</Text> : null}
            </SectionCard>

            <SectionCard title="Daily help" subtitle="Assigned staff for your flat stay visible on the home screen.">
              {houseHelpLoading ? <Text style={styles.syncText}>Loading daily help…</Text> : null}
              {highlightedHouseHelp.map(({ apartmentLabel: label, helper }) => (
                <View key={`${label}-${helper.id}`} style={styles.helperCard}>
                  <View style={styles.helperAvatar}>
                    <Ionicons color="#12395c" name="person-outline" size={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.helperName}>{helper.name}</Text>
                    <Text style={styles.helperMeta}>
                      {helper.type} · {label} · Trust {helper.trustScore}/100
                    </Text>
                  </View>
                  <Text style={styles.helperStatus}>{helper.verificationLevel}</Text>
                </View>
              ))}
              {highlightedHouseHelp.length === 0 ? <Text style={styles.emptyText}>No assigned house help yet.</Text> : null}
              <Link href="/my-house-help" asChild>
                <Pressable style={styles.secondaryAction}>
                  <Text style={styles.secondaryActionText}>Manage daily help</Text>
                </Pressable>
              </Link>
            </SectionCard>

            <SectionCard title="Society services" subtitle="Everything residents usually reach for in one grid.">
              <View style={styles.serviceGrid}>
                {RESIDENT_SHORTCUTS.map((item) => (
                  <Link key={item.href} href={item.href} asChild>
                    <Pressable style={styles.serviceCard}>
                      <View style={styles.serviceIcon}>
                        <Ionicons color="#12395c" name={item.icon} size={26} />
                      </View>
                      <Text style={styles.serviceLabel}>{item.label}</Text>
                    </Pressable>
                  </Link>
                ))}
              </View>
            </SectionCard>
        </>
      </ScrollView>

      <ResidentBottomNav active="home" />

      <Link href="/pre-approve" asChild>
        <Pressable style={styles.fab}>
          <Ionicons color="#11203a" name="add" size={30} />
        </Pressable>
      </Link>

      <Modal animationType="slide" transparent visible={!!activeNotice} onRequestClose={() => setActiveNotice(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {activeNotice ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.modalTitle}>{activeNotice.title}</Text>
                    <Text style={styles.modalMeta}>{activeNotice.category} · {activeNotice.priority}</Text>
                  </View>
                  <Button label="Close" onPress={() => setActiveNotice(null)} variant="outline" />
                </View>
                <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                  <Text style={styles.modalBody}>{activeNotice.body}</Text>
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  )
}

function GuardHome({
  userId,
  name,
  tenantSlug,
  queueCount,
  dutyCount,
  guards,
  activeDuty,
}: {
  userId: string
  name: string
  tenantSlug: string
  queueCount: number
  dutyCount: number
  guards: Awaited<ReturnType<typeof apiClient.listGuards>>
  activeDuty: Awaited<ReturnType<typeof apiClient.listActiveDuty>>
}) {
  const meGuard = guards.find((guard) => guard.userId === userId)
  return (
    <>
      <View style={styles.guardHero}>
        <Text style={styles.brandEyebrow}>SarvaSociety guard</Text>
        <Text style={styles.guardHeroTitle}>{name}</Text>
        <Text style={styles.heroBody}>{tenantSlug}</Text>
      </View>
      <SectionCard title="Guard app" subtitle="Focused gate operations with the same card-first visual language as resident mode.">
        <View style={styles.summaryRow}>
          <SummaryPill label="Gate queue" value={String(queueCount)} />
          <SummaryPill label="On duty" value={String(dutyCount)} />
          <SummaryPill label="My shift" value={activeDuty.some((session) => session.guardId === meGuard?.id) ? 'Live' : 'Off'} />
        </View>
      </SectionCard>
      <SectionCard title="Guard shortcuts" subtitle="Direct links to active gate operations.">
        <View style={{ gap: 10 }}>
          {GUARD_ACTIONS.map((item) => (
            <Link key={item.href} href={item.href} asChild>
              <Pressable style={styles.guardActionCard}>
                <Text style={styles.guardActionTitle}>{item.label}</Text>
                <Text style={styles.guardActionBody}>{item.body}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </SectionCard>
    </>
  )
}

function AdminLanding({ tenantSlug }: { tenantSlug: string }) {
  const adminWebUrl = process.env.EXPO_PUBLIC_ADMIN_WEB_URL
  return (
    <>
      <SectionCard title="Admin mobile access" subtitle="Admins mainly work from the web console.">
        <Text style={styles.syncText}>You are signed in as admin for {tenantSlug}. Use the web console for setup, notices, guards, billing, and approvals.</Text>
        <Pressable
          style={styles.primaryLaunchButton}
          onPress={() => {
            if (!adminWebUrl) return
            Linking.openURL(adminWebUrl)
          }}
        >
          <Text style={styles.primaryLaunchButtonText}>Open admin console on web</Text>
        </Pressable>
      </SectionCard>
    </>
  )
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryPill}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  )
}

function DemoCredential({ title, email, password }: { title: string; email: string; password: string }) {
  return (
    <View style={styles.demoCredentialCard}>
      <Text style={styles.demoCredentialTitle}>{title}</Text>
      <Text style={styles.demoCredentialMeta}>{email}</Text>
      <Text style={styles.demoCredentialMeta}>{password}</Text>
    </View>
  )
}

function CenteredState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.centeredState}>
      <ActivityIndicator />
      <Text style={styles.centeredTitle}>{title}</Text>
      <Text style={styles.centeredBody}>{body}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#eef4fb',
  },
  residentScroll: {
    padding: 18,
    gap: 16,
    paddingBottom: 120,
  },
  heroShell: {
    borderRadius: 30,
    backgroundColor: '#0f1b31',
    padding: 22,
    gap: 12,
  },
  brandEyebrow: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  heroBody: {
    color: '#ccdaeb',
    fontSize: 14,
    lineHeight: 22,
  },
  demoCallout: {
    borderRadius: 22,
    backgroundColor: '#173156',
    padding: 14,
    gap: 4,
  },
  demoCalloutTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  demoCalloutBody: {
    color: '#d8e7fb',
    fontSize: 13,
    lineHeight: 19,
  },
  demoCredentialCard: {
    borderRadius: 20,
    backgroundColor: '#f7fbff',
    borderWidth: 1,
    borderColor: '#dbe8f8',
    padding: 14,
    gap: 4,
  },
  demoCredentialTitle: {
    color: '#11203a',
    fontSize: 15,
    fontWeight: '800',
  },
  demoCredentialMeta: {
    color: '#6f8098',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryLaunchButton: {
    borderRadius: 20,
    backgroundColor: '#ffdf33',
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLaunchButtonText: {
    color: '#11203a',
    fontSize: 15,
    fontWeight: '900',
  },
  guardHero: {
    borderRadius: 30,
    backgroundColor: '#0f1b31',
    padding: 22,
    gap: 6,
  },
  guardHeroTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
  },
  quickStrip: {
    gap: 12,
    paddingRight: 8,
  },
  quickActionPill: {
    width: 88,
    alignItems: 'center',
    gap: 8,
  },
  quickActionIcon: {
    width: 62,
    height: 62,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  duesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce8f7',
    padding: 18,
    shadowColor: '#d7dde6',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  duesAmount: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '900',
  },
  duesCopy: {
    color: '#5b6575',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  duesIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef7ff',
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  serviceCard: {
    width: '30%',
    minWidth: 88,
    flexGrow: 1,
    alignItems: 'center',
    gap: 8,
    borderRadius: 22,
    backgroundColor: '#fdfdfd',
    paddingVertical: 16,
    paddingHorizontal: 10,
  },
  serviceIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dde7f6',
  },
  serviceLabel: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  syncText: {
    color: '#5b6b85',
    fontSize: 14,
    lineHeight: 21,
  },
  errorText: {
    color: '#d92d20',
    fontSize: 14,
    fontWeight: '700',
  },
  noticeFeedCard: {
    borderRadius: 26,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dde7f6',
    padding: 16,
    gap: 12,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noticeBadgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff8d6',
  },
  noticeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  noticeFeedTitle: {
    color: '#111827',
    fontSize: 19,
    fontWeight: '900',
    flexShrink: 1,
  },
  noticePriority: {
    color: '#0f4b63',
    backgroundColor: '#e8f7ff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
  },
  noticeMeta: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  noticeFeedBody: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 23,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryPill: {
    minWidth: 92,
    flexGrow: 1,
    borderRadius: 20,
    backgroundColor: '#f7fbff',
    borderWidth: 1,
    borderColor: '#dce8f7',
    padding: 14,
  },
  summaryValue: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
  },
  summaryLabel: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  helperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    backgroundColor: '#f7fbff',
    borderWidth: 1,
    borderColor: '#dce8f7',
    padding: 14,
  },
  helperAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5f3ff',
  },
  helperName: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  helperMeta: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  helperStatus: {
    color: '#117a45',
    fontSize: 11,
    fontWeight: '800',
  },
  secondaryAction: {
    borderRadius: 18,
    backgroundColor: '#fffef3',
    borderWidth: 1,
    borderColor: '#f3dd6b',
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryActionText: {
    color: '#715400',
    fontSize: 14,
    fontWeight: '800',
  },
  guardActionCard: {
    borderRadius: 22,
    backgroundColor: '#f7fbff',
    borderWidth: 1,
    borderColor: '#dce8f7',
    padding: 16,
    gap: 6,
  },
  guardActionTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  guardActionBody: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 19,
  },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 88,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffdf33',
    shadowColor: '#c5b100',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(7, 17, 31, 0.45)',
  },
  modalCard: {
    maxHeight: '78%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#ffffff',
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  modalMeta: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '700',
  },
  modalScroll: {
    maxHeight: '100%',
  },
  modalScrollContent: {
    paddingBottom: 24,
  },
  modalBody: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 24,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 28,
  },
  centeredTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  centeredBody: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
})
