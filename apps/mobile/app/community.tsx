import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Notice } from '@opensociety/shared'

import { apiClient } from '../api/client'
import { AppTopBar, ResidentBottomNav } from '../components/app-shell'
import { MobileScreen, SectionCard } from '../components/mobile-ui'

export default function Community() {
  const [activeNotice, setActiveNotice] = useState<Notice | null>(null)
  const me = useQuery({ queryKey: ['community-me'], queryFn: () => apiClient.me() })
  const notices = useQuery({ queryKey: ['community-notices'], queryFn: () => apiClient.listNotices() })
  const notifications = useQuery({ queryKey: ['community-notifications'], queryFn: () => apiClient.listNotifications() })

  const residentName = me.data?.name ?? 'Resident'
  const apartmentLabel = me.data?.tenantSlug ?? 'SarvaSociety'
  const urgentNotices = useMemo(
    () => (notices.data ?? []).filter((notice) => notice.priority === 'URGENT' || notice.priority === 'HIGH'),
    [notices.data],
  )

  return (
    <MobileScreen>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <AppTopBar
            title="Community"
            subtitle={apartmentLabel}
            avatarText={residentName.slice(0, 1).toUpperCase()}
          />

          <SectionCard title="Priority updates" subtitle="Important notices stay visible in a compact feed.">
            {notices.isLoading ? <ActivityIndicator /> : null}
            {urgentNotices.length === 0 ? <Text style={styles.empty}>No urgent updates right now.</Text> : null}
            {urgentNotices.map((notice) => (
              <Pressable key={notice.id} style={styles.noticeCard} onPress={() => setActiveNotice(notice)}>
                <View style={styles.noticeTop}>
                  <Text style={styles.noticeTitle}>{notice.title}</Text>
                  <Text style={styles.noticeBadge}>{notice.priority}</Text>
                </View>
                <Text style={styles.noticeMeta}>{notice.category}</Text>
                <Text numberOfLines={2} style={styles.noticeBody}>
                  {notice.body}
                </Text>
              </Pressable>
            ))}
          </SectionCard>

          <SectionCard title="Alerts" subtitle="Resident-facing notifications from approvals and admin actions.">
            {notifications.isLoading ? <ActivityIndicator /> : null}
            {(notifications.data ?? []).slice(0, 6).map((item) => (
              <View key={item.id} style={styles.alertCard}>
                <Ionicons color="#12395c" name="notifications-outline" size={18} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>{item.title}</Text>
                  <Text style={styles.alertBody}>{item.body}</Text>
                </View>
              </View>
            ))}
            {(notifications.data ?? []).length === 0 && !notifications.isLoading ? (
              <Text style={styles.empty}>No new alerts.</Text>
            ) : null}
          </SectionCard>

          <SectionCard title="Notice archive" subtitle="Tap any update to read it in a popup without leaving the feed.">
            {(notices.data ?? []).map((notice) => (
              <Pressable key={notice.id} style={styles.archiveCard} onPress={() => setActiveNotice(notice)}>
                <Text style={styles.archiveTitle}>{notice.title}</Text>
                <Text numberOfLines={2} style={styles.alertBody}>
                  {notice.body}
                </Text>
              </Pressable>
            ))}
          </SectionCard>
        </ScrollView>

        <ResidentBottomNav active="community" />
      </View>

      <Modal animationType="slide" transparent visible={!!activeNotice} onRequestClose={() => setActiveNotice(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {activeNotice ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{activeNotice.title}</Text>
                    <Text style={styles.noticeMeta}>{activeNotice.category}</Text>
                  </View>
                  <Pressable style={styles.closeButton} onPress={() => setActiveNotice(null)}>
                    <Text style={styles.closeText}>Close</Text>
                  </Pressable>
                </View>
                <ScrollView style={{ maxHeight: 420 }}>
                  <Text style={styles.modalBody}>{activeNotice.body}</Text>
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </MobileScreen>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, gap: 16, paddingBottom: 120 },
  noticeCard: { gap: 6, borderRadius: 22, padding: 14, backgroundColor: '#fff8d8', borderWidth: 1, borderColor: '#f7e47f' },
  noticeTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  noticeTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: '#11203a' },
  noticeBadge: { color: '#8a6b00', fontWeight: '800', fontSize: 12 },
  noticeMeta: { color: '#6b7280', fontSize: 12, fontWeight: '700' },
  noticeBody: { color: '#475569', fontSize: 14, lineHeight: 21 },
  alertCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: 20, backgroundColor: '#f8fbff', borderWidth: 1, borderColor: '#dce8f7' },
  alertTitle: { color: '#11203a', fontWeight: '800', fontSize: 14 },
  alertBody: { color: '#64748b', fontSize: 13, lineHeight: 19 },
  archiveCard: { gap: 6, borderRadius: 20, padding: 14, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dce8f7' },
  archiveTitle: { color: '#11203a', fontWeight: '800', fontSize: 15 },
  empty: { color: '#64748b', fontSize: 13 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 14, maxHeight: '78%' },
  modalHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  modalTitle: { color: '#11203a', fontSize: 22, fontWeight: '900' },
  modalBody: { color: '#475569', fontSize: 15, lineHeight: 24, paddingBottom: 12 },
  closeButton: { borderWidth: 1, borderColor: '#dce8f7', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  closeText: { color: '#12395c', fontWeight: '800' },
})
