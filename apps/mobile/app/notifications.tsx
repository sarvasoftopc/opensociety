import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'

import { apiClient } from '../api/client'
import { HeroCard, MobileScreen, SectionCard } from '../components/mobile-ui'

export default function NotificationsScreen() {
  const qc = useQueryClient()
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: apiClient.listNotifications })
  const markRead = useMutation({
    mutationFn: (id: string) => apiClient.markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  if (notifications.isLoading) {
    return (
      <MobileScreen>
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      </MobileScreen>
    )
  }

  return (
    <MobileScreen>
      <FlatList
        contentContainerStyle={styles.list}
        data={notifications.data ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <HeroCard
              eyebrow="Resident"
              title="Notifications"
              subtitle="Visitor approval requests, notice alerts, and important updates."
              badge={`${(notifications.data ?? []).filter((item) => !item.readAt).length} unread`}
            />
          </View>
        }
        ListEmptyComponent={
          <SectionCard title="No notifications">
            <Text style={styles.empty}>You have no notifications right now.</Text>
          </SectionCard>
        }
        renderItem={({ item }) => {
          const targetScreen =
            item.data?.screen === 'visitors'
              ? '/visitors'
              : item.data?.screen === 'resident_dashboard' && item.data?.noticeId
                ? (`/notice/${item.data.noticeId}` as const)
                : '/visitors'
          return (
            <Link href={targetScreen} asChild>
              <Pressable
                style={[styles.card, !item.readAt && styles.unreadCard]}
                onPress={() => {
                  if (!item.readAt) markRead.mutate(item.id)
                }}
              >
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.meta}>{item.readAt ? 'Read' : 'Unread'}</Text>
              </Pressable>
            </Link>
          )
        }}
      />
    </MobileScreen>
  )
}

const styles = StyleSheet.create({
  list: { padding: 18, gap: 12, paddingBottom: 40 },
  headerWrap: { marginBottom: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce8f7',
    gap: 6,
  },
  unreadCard: {
    backgroundColor: '#fff7e8',
    borderColor: '#f3d39a',
  },
  title: { color: '#11203a', fontSize: 16, fontWeight: '800' },
  body: { color: '#667995', fontSize: 13, lineHeight: 19 },
  meta: { color: '#7a5a1f', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  empty: { color: '#667995', fontSize: 13 },
})
