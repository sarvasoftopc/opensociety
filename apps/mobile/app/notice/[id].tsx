import { useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native'

import { apiClient } from '../../api/client'
import { Button } from '../../components/Button'
import { HeroCard, MobileScreen, SectionCard } from '../../components/mobile-ui'

export default function NoticeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const notices = useQuery({ queryKey: ['notices'], queryFn: () => apiClient.listNotices() })

  if (notices.isLoading) {
    return (
      <MobileScreen>
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      </MobileScreen>
    )
  }

  const notice = (notices.data ?? []).find((item) => item.id === id)
  if (!notice) {
    return (
      <MobileScreen>
        <SectionCard title="Notice not found">
          <Text style={styles.body}>This notice is no longer available.</Text>
        </SectionCard>
      </MobileScreen>
    )
  }

  return (
    <MobileScreen scroll contentStyle={styles.content}>
      <HeroCard
        eyebrow="Resident"
        title={notice.title}
        subtitle={notice.category}
        badge={notice.priority}
      />
      <SectionCard title="Details">
        <Text style={styles.body}>{notice.body}</Text>
        {notice.attachmentUrl ? (
          <Button
            label={notice.attachmentName ? `Open ${notice.attachmentName}` : 'Open attachment'}
            onPress={async () => {
              const url = await apiClient.fetchUploadObjectUrl(notice.attachmentUrl!)
              await Linking.openURL(url)
            }}
          />
        ) : null}
      </SectionCard>
    </MobileScreen>
  )
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { gap: 16, paddingBottom: 40 },
  body: { color: '#4f627d', fontSize: 15, lineHeight: 24 },
})
