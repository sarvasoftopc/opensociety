import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native'
import { availableVisitorActions } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { Button } from '../components/Button'
import { HeroCard, MobileScreen, SectionCard, mobileTheme } from '../components/mobile-ui'

export default function Visitors() {
  const qc = useQueryClient()
  const [denyingId, setDenyingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['visitors'],
    queryFn: () => apiClient.listVisitors(),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['visitors'] })
  const approve = useMutation({
    mutationFn: (id: string) => apiClient.approveVisitor(id),
    onSuccess: invalidate,
  })
  const deny = useMutation({
    mutationFn: (v: { id: string; reason: string }) => apiClient.denyVisitor(v.id, v.reason),
    onSuccess: () => {
      setDenyingId(null)
      setReason('')
      invalidate()
    },
  })
  const busy = approve.isPending || deny.isPending

  if (isLoading)
    return (
      <MobileScreen>
        <Centered>
          <ActivityIndicator />
        </Centered>
      </MobileScreen>
    )
  if (isError)
    return (
      <MobileScreen>
        <SectionCard title="Visitors unavailable">
          <Text style={styles.error}>API unreachable</Text>
          <Text style={styles.dim}>{String((error as Error)?.message ?? 'error')}</Text>
        </SectionCard>
      </MobileScreen>
    )

  return (
    <MobileScreen>
      <FlatList
        contentContainerStyle={styles.list}
        data={data ?? []}
        keyExtractor={(v) => v.id}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <HeroCard
              eyebrow="Resident"
              title="Visitor approvals"
              subtitle="Approve or deny requests from your flat without getting pulled into guard-only tools."
              badge={`${(data ?? []).length} requests`}
            />
          </View>
        }
        ListEmptyComponent={<Text style={styles.dim}>No visitors yet.</Text>}
        renderItem={({ item }) => {
          const actions = availableVisitorActions(item.status)
          const denying = denyingId === item.id
          return (
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.visitorName}</Text>
                  <Text style={styles.dim}>
                    {[item.type, item.partnerName, item.purpose].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Text style={styles.badge}>{item.status}</Text>
              </View>

              {actions.length > 0 && !denying ? (
                <View style={styles.actions}>
                  {actions.includes('approve') ? (
                    <Button label="Approve" onPress={() => approve.mutate(item.id)} disabled={busy} />
                  ) : null}
                  {actions.includes('deny') ? (
                    <Button
                      label="Deny"
                      variant="outline"
                      onPress={() => setDenyingId(item.id)}
                      disabled={busy}
                    />
                  ) : null}
                </View>
              ) : null}

              {denying ? (
                <View style={styles.denyPanel}>
                  <TextInput
                    style={mobileTheme.input}
                    placeholder="Reason for denial"
                    placeholderTextColor="#7a8aa3"
                    value={reason}
                    onChangeText={setReason}
                    autoFocus
                  />
                  <View style={styles.actions}>
                    <Button
                      label={deny.isPending ? 'Denying…' : 'Confirm'}
                      variant="danger"
                      onPress={() => deny.mutate({ id: item.id, reason })}
                      disabled={busy || !reason.trim()}
                    />
                    <Button
                      label="Cancel"
                      variant="outline"
                      onPress={() => {
                        setDenyingId(null)
                        setReason('')
                      }}
                      disabled={busy}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          )
        }}
      />
    </MobileScreen>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>
}

const styles = StyleSheet.create({
  list: { padding: 18, gap: 12, paddingBottom: 40 },
  headerWrap: { marginBottom: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  card: { padding: 16, borderRadius: 24, backgroundColor: '#ffffff', gap: 10, borderWidth: 1, borderColor: '#dce8f7' },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 17, fontWeight: '800', color: '#11203a' },
  dim: { color: '#697a94', fontSize: 13 },
  error: { color: '#d92d20', fontSize: 16, fontWeight: '700' },
  badge: {
    fontSize: 12,
    color: '#35507a',
    backgroundColor: '#edf4ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '800',
  },
  actions: { flexDirection: 'row', gap: 8 },
  denyPanel: { gap: 8 },
})
