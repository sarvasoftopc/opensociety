import { useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Notice } from '@opensociety/shared'
import { noticeMatchesQuery } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { Button } from '../components/Button'
import { HeroCard, MobileScreen, SectionCard, mobileTheme } from '../components/mobile-ui'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function isUrgent(priority: Notice['priority']): boolean {
  return priority === 'HIGH' || priority === 'URGENT'
}

export default function Notices() {
  const [search, setSearch] = useState('')
  const [activeNotice, setActiveNotice] = useState<Notice | null>(null)
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['notices'], queryFn: () => apiClient.listNotices() })

  const notices = useMemo(() => (data ?? []).filter((n) => noticeMatchesQuery(n, search)), [data, search])

  const qc = useQueryClient()
  const markRead = useMutation({
    mutationFn: (id: string) => apiClient.markNoticeRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notices'] }),
  })

  if (isLoading)
    return (
      <MobileScreen>
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      </MobileScreen>
    )
  if (isError)
    return (
      <MobileScreen>
        <SectionCard title="Could not load notices">
          <Text style={mobileTheme.error}>Couldn’t load notices</Text>
          <Text style={mobileTheme.body}>{String((error as Error)?.message ?? 'error')}</Text>
        </SectionCard>
      </MobileScreen>
    )

  return (
    <MobileScreen>
      <FlatList
        contentContainerStyle={styles.list}
        data={notices}
        keyExtractor={(n) => n.id}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <HeroCard
              eyebrow="Resident"
              title="Notice board"
              subtitle="Priority updates, circulars, and building communication in one place."
              badge={`${notices.length} notices`}
            />
            <SectionCard title="Search updates" subtitle="Tap a notice to open it in a popup and mark it as read.">
              <TextInput
                style={mobileTheme.input}
                placeholder="Search notices"
                placeholderTextColor="#7a8aa3"
                autoCorrect={false}
                value={search}
                onChangeText={setSearch}
              />
            </SectionCard>
          </View>
        }
        ListEmptyComponent={<Text style={styles.dim}>{search ? 'No matching notices.' : 'No notices yet.'}</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => {
              setActiveNotice(item)
              if (item.read === false) markRead.mutate(item.id)
            }}
          >
            <View style={styles.row}>
              <Text style={styles.title}>{item.title}</Text>
              {item.read === false && <Text style={styles.newBadge}>NEW</Text>}
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.category}>{item.category}</Text>
              <Text style={[styles.badge, isUrgent(item.priority) && styles.badgeUrgent]}>{item.priority}</Text>
            </View>
            <Text style={styles.dim}>{formatDate(item.publishedAt)}</Text>
            <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
            <Text style={styles.attachmentText}>Tap to open notice</Text>
          </Pressable>
        )}
      />
      <Modal animationType="slide" transparent visible={!!activeNotice} onRequestClose={() => setActiveNotice(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {activeNotice ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={styles.modalEyebrow}>{activeNotice.category}</Text>
                    <Text style={styles.modalTitle}>{activeNotice.title}</Text>
                  </View>
                  <Button label="Close" variant="outline" onPress={() => setActiveNotice(null)} />
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.dim}>{formatDate(activeNotice.publishedAt)}</Text>
                  <Text style={[styles.badge, isUrgent(activeNotice.priority) && styles.badgeUrgent]}>{activeNotice.priority}</Text>
                </View>
                <ScrollView style={styles.modalBodyWrap} contentContainerStyle={styles.modalBodyContent}>
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
  list: { padding: 18, gap: 12, paddingBottom: 40 },
  headerWrap: { gap: 14, marginBottom: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  card: { padding: 16, borderRadius: 24, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dce8f7', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: '#11203a' },
  body: { color: '#566983', fontSize: 14, lineHeight: 21 },
  dim: { color: '#73839b', fontSize: 13 },
  category: {
    fontSize: 11,
    fontWeight: '800',
    color: '#35507a',
    backgroundColor: '#edf4ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  badge: {
    fontSize: 12,
    color: '#127a44',
    backgroundColor: '#e9f6ee',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '800',
  },
  badgeUrgent: { color: '#b42318', backgroundColor: '#fee4e2' },
  newBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    backgroundColor: '#11203a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  attachmentText: { color: '#244c80', fontWeight: '700', fontSize: 14 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 17, 31, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '82%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#ffffff',
    padding: 20,
    gap: 14,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  modalEyebrow: { color: '#2b6b9a', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  modalTitle: { color: '#11203a', fontSize: 24, fontWeight: '900', lineHeight: 30 },
  modalBodyWrap: { maxHeight: '100%' },
  modalBodyContent: { paddingBottom: 20 },
  modalBody: { color: '#4f627d', fontSize: 15, lineHeight: 24 },
})
