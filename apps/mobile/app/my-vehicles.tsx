import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { Apartment, CreateVehicle, VehicleType } from '@opensociety/shared'
import { vehicleTypeSchema } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { Button } from '../components/Button'
import { HeroCard, MobileScreen, SectionCard, mobileTheme } from '../components/mobile-ui'

// Resident view: register and manage the vehicles for their own flat(s).
export default function MyVehicles() {
  const qc = useQueryClient()
  const apts = useQuery({ queryKey: ['my-apartments'], queryFn: () => apiClient.listMyApartments() })
  const vehicles = useQuery({ queryKey: ['vehicles'], queryFn: () => apiClient.listVehicles() })

  const myApts = apts.data ?? []
  const [apartmentId, setApartmentId] = useState<string | null>(null)
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [type, setType] = useState<VehicleType>('CAR')

  const invalidate = () => qc.invalidateQueries({ queryKey: ['vehicles'] })
  const flat = apartmentId ?? (myApts.length === 1 ? myApts[0].id : null)

  const add = useMutation({
    mutationFn: () => {
      const body: CreateVehicle = { apartmentId: flat!, registrationNumber: registrationNumber.trim(), type }
      return apiClient.createVehicle(body)
    },
    onSuccess: () => {
      invalidate()
      setRegistrationNumber('')
      setType('CAR')
    },
  })
  const toggle = useMutation({
    mutationFn: (v: { id: string; isActive: boolean }) => apiClient.updateVehicle(v.id, { isActive: !v.isActive }),
    onSuccess: invalidate,
  })

  const labelOf = (id: string) => {
    const a = myApts.find((x) => x.id === id)
    return a ? `${a.tower}-${a.apartmentNo}` : id
  }

  if (apts.isLoading || vehicles.isLoading)
    return (
      <MobileScreen>
        <Centered>
          <ActivityIndicator />
        </Centered>
      </MobileScreen>
    )
  if (apts.isError)
    return (
      <MobileScreen>
        <SectionCard title="Vehicle directory unavailable">
          <Text style={styles.error}>API unreachable</Text>
          <Text style={styles.dim}>{String((apts.error as Error)?.message ?? 'error')}</Text>
        </SectionCard>
      </MobileScreen>
    )
  if (myApts.length === 0)
    return (
      <MobileScreen>
        <SectionCard title="No flat assigned">
          <Text style={styles.dim}>You have no flats assigned yet.</Text>
        </SectionCard>
      </MobileScreen>
    )

  const canAdd = flat != null && registrationNumber.trim().length > 0 && !add.isPending

  return (
    <MobileScreen scroll contentStyle={styles.list}>
      <HeroCard
        eyebrow="Resident"
        title="Vehicle management"
        subtitle="Keep resident vehicles current so gate staff and parking records stay accurate."
        badge={`${(vehicles.data ?? []).length} registered`}
      />

      <SectionCard title="Register a vehicle">
        {myApts.length > 1 && (
          <Chips
            options={myApts.map((a: Apartment) => ({ value: a.id, label: `${a.tower}-${a.apartmentNo}` }))}
            selected={flat}
            onSelect={setApartmentId}
          />
        )}
        <TextInput
          style={mobileTheme.input}
          placeholder="Reg. number (KA 01 AB 1234)"
          placeholderTextColor="#7a8aa3"
          autoCapitalize="characters"
          autoCorrect={false}
          value={registrationNumber}
          onChangeText={setRegistrationNumber}
        />
        <Chips
          options={vehicleTypeSchema.options.map((t) => ({ value: t, label: t }))}
          selected={type}
          onSelect={(v) => setType(v as VehicleType)}
        />
        <Button label={add.isPending ? 'Adding…' : 'Add vehicle'} onPress={() => add.mutate()} disabled={!canAdd} />
        {add.isError && <Text style={styles.error}>{String((add.error as Error)?.message ?? 'Failed')}</Text>}
      </SectionCard>

      <SectionCard title="My vehicles">
        {(vehicles.data ?? []).length === 0 && <Text style={styles.dim}>No vehicles registered yet.</Text>}
        {(vehicles.data ?? []).map((v) => (
          <View key={v.id} style={[styles.card, v.isActive ? null : styles.inactive]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.plate}>{v.registrationNumber}</Text>
              <Text style={styles.dim}>
                {v.type} · {labelOf(v.apartmentId)}
              </Text>
            </View>
            <Button
              label={v.isActive ? 'Deactivate' : 'Activate'}
              variant={v.isActive ? 'outline' : 'primary'}
              onPress={() => toggle.mutate({ id: v.id, isActive: v.isActive })}
              disabled={toggle.isPending}
            />
          </View>
        ))}
      </SectionCard>
    </MobileScreen>
  )
}

function Chips({
  options,
  selected,
  onSelect,
}: {
  options: { value: string; label: string }[]
  selected: string | null
  onSelect: (v: string) => void
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = o.value === selected
        return (
          <Pressable key={o.value} onPress={() => onSelect(o.value)} style={[mobileTheme.chip, on && mobileTheme.chipActive]}>
            <Text style={[mobileTheme.chipText, on && mobileTheme.chipTextActive]}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>
}

const styles = StyleSheet.create({
  list: { gap: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 22, backgroundColor: '#f8fbff', gap: 10, borderWidth: 1, borderColor: '#dce8f7' },
  inactive: { opacity: 0.55 },
  plate: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'], color: '#11203a' },
  dim: { color: '#697a94', fontSize: 13 },
  error: { color: '#d92d20', fontSize: 13, fontWeight: '700' },
})
