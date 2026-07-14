import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native'
import { apiClient } from '../api/client'
import { Button } from '../components/Button'
import { HeroCard, MobileScreen, SectionCard, mobileTheme } from '../components/mobile-ui'

// Guard house-help view: pre-approved domestic staff are checked in instantly
// (no resident approval). Each active worker shows their in/out state and the
// matching action; an open attendance entry means "currently inside".
export default function HouseHelp() {
  const qc = useQueryClient()
  const help = useQuery({ queryKey: ['house-help'], queryFn: () => apiClient.listHouseHelp() })
  const openEntries = useQuery({
    queryKey: ['house-help-entries', 'active'],
    queryFn: () => apiClient.listHouseHelpEntries({ active: true }),
  })

  const [search, setSearch] = useState('')
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['house-help'] })
    qc.invalidateQueries({ queryKey: ['house-help-entries'] })
  }
  const checkIn = useMutation({
    mutationFn: (id: string) => apiClient.checkInHouseHelp(id),
    onSuccess: invalidate,
  })
  const checkOut = useMutation({
    mutationFn: (entryId: string) => apiClient.checkOutHouseHelpEntry(entryId),
    onSuccess: invalidate,
  })
  const busy = checkIn.isPending || checkOut.isPending

  // houseHelpId -> open entry id (currently inside)
  const openByHelp = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of openEntries.data ?? []) map.set(e.houseHelpId, e.id)
    return map
  }, [openEntries.data])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const active = (help.data ?? []).filter((h) => h.isActive)
    return q ? active.filter((h) => h.name.toLowerCase().includes(q)) : active
  }, [help.data, search])

  if (help.isLoading)
    return (
      <MobileScreen>
        <Centered>
          <ActivityIndicator />
        </Centered>
      </MobileScreen>
    )
  if (help.isError)
    return (
      <MobileScreen>
        <SectionCard title="House help desk unavailable">
          <Text style={styles.error}>API unreachable</Text>
          <Text style={styles.dim}>{String((help.error as Error)?.message ?? 'error')}</Text>
        </SectionCard>
      </MobileScreen>
    )

  return (
    <MobileScreen>
      <FlatList
        contentContainerStyle={styles.list}
        data={rows}
        keyExtractor={(h) => h.id}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <HeroCard
              eyebrow="Guard"
              title="House help desk"
              subtitle="Quickly search approved workers and mark entry or exit without leaving the gate workflow."
              badge={`${rows.length} active`}
            />
            <SectionCard title="Search worker">
              <TextInput
                style={mobileTheme.input}
                placeholder="Search house help by name"
                placeholderTextColor="#7a8aa3"
                autoCorrect={false}
                value={search}
                onChangeText={setSearch}
              />
            </SectionCard>
          </View>
        }
        ListEmptyComponent={<Text style={styles.dim}>No house help found.</Text>}
        renderItem={({ item }) => {
          const openEntryId = openByHelp.get(item.id)
          const inside = openEntryId != null
          return (
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.dim}>{item.type}</Text>
                </View>
                <Text style={[styles.badge, inside ? styles.badgeIn : styles.badgeOut]}>
                  {inside ? 'INSIDE' : 'OUT'}
                </Text>
              </View>
              <View style={styles.actions}>
                {inside ? (
                  <Button
                    label="Check out"
                    variant="outline"
                    onPress={() => checkOut.mutate(openEntryId)}
                    disabled={busy}
                  />
                ) : (
                  <Button label="Check in" onPress={() => checkIn.mutate(item.id)} disabled={busy} />
                )}
              </View>
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
  headerWrap: { gap: 14, marginBottom: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  card: { padding: 16, borderRadius: 24, backgroundColor: '#ffffff', gap: 10, borderWidth: 1, borderColor: '#dce8f7' },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 17, fontWeight: '800', color: '#11203a' },
  dim: { color: '#697a94', fontSize: 13 },
  error: { color: '#d92d20', fontSize: 16, fontWeight: '700' },
  badge: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '800',
  },
  badgeIn: { color: '#217a47', backgroundColor: '#e9f6ee' },
  badgeOut: { color: '#6d7e96', backgroundColor: '#edf4ff' },
  actions: { flexDirection: 'row', gap: 8 },
})
