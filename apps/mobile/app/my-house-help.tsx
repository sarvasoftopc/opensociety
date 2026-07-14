import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Apartment } from '@opensociety/shared'

import { apiClient, type HouseHelpWithRating } from '../api/client'
import { Button } from '../components/Button'
import { HeroCard, MobileScreen, SectionCard } from '../components/mobile-ui'

export default function MyHouseHelp() {
  const apts = useQuery({ queryKey: ['my-apartments'], queryFn: () => apiClient.listMyApartments() })
  const registry = useQuery({ queryKey: ['house-help'], queryFn: () => apiClient.listHouseHelp() })

  if (apts.isLoading || registry.isLoading) {
    return (
      <MobileScreen>
        <Centered>
          <ActivityIndicator />
        </Centered>
      </MobileScreen>
    )
  }

  if (apts.isError) {
    return (
      <MobileScreen>
        <SectionCard title="House help directory unavailable">
          <Text style={styles.error}>API unreachable</Text>
          <Text style={styles.dim}>{String((apts.error as Error)?.message ?? 'error')}</Text>
        </SectionCard>
      </MobileScreen>
    )
  }

  const myApts = apts.data ?? []
  if (myApts.length === 0) {
    return (
      <MobileScreen>
        <SectionCard title="No flat assigned">
          <Text style={styles.dim}>You have no flats assigned yet.</Text>
        </SectionCard>
      </MobileScreen>
    )
  }

  return (
    <MobileScreen scroll contentStyle={styles.list}>
      <HeroCard
        eyebrow="Resident"
        title="House help management"
        subtitle="Assign approved workers to your flat, remove them when needed, and leave ratings for future trust scoring."
        badge={`${myApts.length} flats`}
      />
      {myApts.map((a) => (
        <ApartmentAssignments key={a.id} apartment={a} registry={registry.data ?? []} />
      ))}
    </MobileScreen>
  )
}

function StarRating({ help, apartmentKey }: { help: HouseHelpWithRating; apartmentKey: string }) {
  const qc = useQueryClient()
  const rate = useMutation({
    mutationFn: (rating: number) => apiClient.rateHouseHelp(help.id, { rating }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['house-help-for-apartment', apartmentKey] }),
  })
  return (
    <View style={styles.rating}>
      <Text style={styles.dim}>
        {help.ratingAvg === null ? 'Not rated yet' : `★ ${help.ratingAvg} (${help.reviewCount})`}
      </Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => rate.mutate(n)} disabled={rate.isPending} hitSlop={4}>
            <Text style={[styles.star, help.ratingAvg !== null && n <= Math.round(help.ratingAvg) && styles.starOn]}>★</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

function ApartmentAssignments({ apartment, registry }: { apartment: Apartment; registry: HouseHelpWithRating[] }) {
  const qc = useQueryClient()
  const assigned = useQuery({
    queryKey: ['house-help-for-apartment', apartment.id],
    queryFn: () => apiClient.listHouseHelpForApartment(apartment.id),
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['house-help-for-apartment', apartment.id] })
  const assign = useMutation({
    mutationFn: (helpId: string) => apiClient.assignHouseHelp(helpId, apartment.id),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (helpId: string) => apiClient.removeHouseHelpAssignment(helpId, apartment.id),
    onSuccess: invalidate,
  })
  const busy = assign.isPending || remove.isPending

  const assignedIds = new Set((assigned.data ?? []).map((h) => h.id))
  const unassigned = registry.filter((h) => h.isActive && !assignedIds.has(h.id))

  return (
    <SectionCard
      title={`${apartment.tower}-${apartment.apartmentNo}`}
      subtitle="Add trusted help to this flat or remove existing assignments."
    >
      <Text style={styles.label}>Assigned help</Text>
      {(assigned.data ?? []).length === 0 ? <Text style={styles.dim}>None yet.</Text> : null}
      {(assigned.data ?? []).map((h) => (
        <View key={h.id} style={styles.card}>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{h.name}</Text>
              <View style={[styles.badge, h.verificationLevel === 'VERIFIED' ? styles.badgeOk : styles.badgeMuted]}>
                <Text style={[styles.badgeText, h.verificationLevel === 'VERIFIED' && styles.badgeTextOk]}>
                  {h.verificationLevel === 'VERIFIED' ? 'Verified' : 'Unverified'}
                </Text>
              </View>
            </View>
            <Text style={styles.dim}>
              {h.type} · Trust {h.trustScore}/100
            </Text>
            <StarRating help={h} apartmentKey={apartment.id} />
          </View>
          <Button label="Remove" variant="outline" onPress={() => remove.mutate(h.id)} disabled={busy} />
        </View>
      ))}

      {unassigned.length > 0 ? <Text style={styles.label}>Available to add</Text> : null}
      {unassigned.map((h) => (
        <View key={h.id} style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{h.name}</Text>
            <Text style={styles.dim}>{h.type}</Text>
          </View>
          <Button label="Assign" onPress={() => assign.mutate(h.id)} disabled={busy} />
        </View>
      ))}
    </SectionCard>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>
}

const styles = StyleSheet.create({
  list: { gap: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { fontSize: 13, fontWeight: '800', color: '#35507a', marginTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 22,
    backgroundColor: '#f8fbff',
    gap: 10,
    borderWidth: 1,
    borderColor: '#dce8f7',
  },
  name: { fontSize: 16, fontWeight: '800', color: '#11203a' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeOk: { backgroundColor: '#dcfce7' },
  badgeMuted: { backgroundColor: '#e9eef6' },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#6d7e96' },
  badgeTextOk: { color: '#15803d' },
  dim: { color: '#697a94', fontSize: 13, lineHeight: 19 },
  rating: { gap: 4 },
  stars: { flexDirection: 'row', gap: 4 },
  star: { fontSize: 22, color: '#d4dbe7' },
  starOn: { color: '#f59e0b' },
  error: { color: '#d92d20', fontSize: 16, fontWeight: '700' },
})
