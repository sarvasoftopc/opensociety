import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import type { VisitorPreApproval } from '@opensociety/shared'
import { preApprovalQrValue } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { Button } from '../components/Button'
import { HeroCard, MobileScreen, SectionCard, mobileTheme } from '../components/mobile-ui'

export default function PreApprove() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [apartmentId, setApartmentId] = useState<string | null>(null)
  const [created, setCreated] = useState<VisitorPreApproval | null>(null)

  const apartments = useQuery({ queryKey: ['apartments'], queryFn: () => apiClient.listApartments() })

  const create = useMutation({
    mutationFn: () =>
      apiClient.createPreApproval({
        apartmentId: apartmentId!,
        visitorName: name.trim(),
        visitorPhone: phone.trim() || undefined,
        approvalType: 'ONE_TIME',
      }),
    onSuccess: (pa) => {
      qc.invalidateQueries({ queryKey: ['visitors'] })
      setCreated(pa)
    },
  })

  if (created) {
    return (
      <MobileScreen scroll>
        <HeroCard
          eyebrow="Resident"
          title="Guest pass ready"
          subtitle="Share this QR code or entry code with your visitor for quick gate access."
          badge="Pre-approved"
        />
        <SectionCard title={`Show this to ${created.visitorName}`}>
          <View style={styles.qrBox}>
            <QRCode value={preApprovalQrValue(created.code)} size={200} />
          </View>
          <Text style={styles.code} selectable>
            {created.code}
          </Text>
          <Text style={styles.dim}>The guard can scan the QR or enter this code manually at the gate.</Text>
          <Button
            label="Pre-approve another"
            variant="outline"
            onPress={() => {
              setCreated(null)
              setName('')
              setPhone('')
              setApartmentId(null)
            }}
          />
        </SectionCard>
      </MobileScreen>
    )
  }

  const canSubmit = name.trim().length > 0 && !!apartmentId && !create.isPending

  return (
    <MobileScreen scroll contentStyle={styles.container}>
      <HeroCard
        eyebrow="Resident"
        title="Pre-approve a visitor"
        subtitle="Create a clean guest pass before arrival so the guard team can admit them instantly."
        badge="Guest pass"
      />
      <SectionCard title="Create access code">
        <Field label="Visitor name">
          <TextInput
            style={mobileTheme.input}
            placeholder="e.g. Priya"
            placeholderTextColor="#7a8aa3"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </Field>
        <Field label="Phone (optional)">
          <TextInput
            style={mobileTheme.input}
            placeholder="10-digit number"
            placeholderTextColor="#7a8aa3"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </Field>
        <Field label="Apartment">
          {apartments.isLoading ? (
            <ActivityIndicator />
          ) : apartments.isError ? (
            <Text style={styles.error}>Could not load apartments</Text>
          ) : (
            <View style={mobileTheme.chipRow}>
              {(apartments.data ?? []).map((a) => (
                <Chip
                  key={a.id}
                  label={`${a.tower}-${a.apartmentNo}`}
                  selected={apartmentId === a.id}
                  onPress={() => setApartmentId(a.id)}
                />
              ))}
            </View>
          )}
        </Field>
        <View style={styles.submit}>
          <Button
            label={create.isPending ? 'Generating…' : 'Generate code'}
            onPress={() => create.mutate()}
            disabled={!canSubmit}
          />
          {create.isError && (
            <Text style={styles.error}>{String((create.error as Error)?.message ?? 'Failed')}</Text>
          )}
        </View>
      </SectionCard>
    </MobileScreen>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  )
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[mobileTheme.chip, selected && mobileTheme.chipActive]}>
      <Text style={[mobileTheme.chipText, selected && mobileTheme.chipTextActive]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { gap: 16, paddingBottom: 40 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: '#35507a' },
  submit: { gap: 8, marginTop: 4 },
  error: { color: '#d92d20', fontSize: 13, fontWeight: '700' },
  qrBox: { backgroundColor: '#fff', padding: 16, borderRadius: 18, alignItems: 'center' },
  code: { fontSize: 38, fontWeight: '900', letterSpacing: 4, color: '#11203a', textAlign: 'center' },
  dim: { color: '#697a94', fontSize: 13, textAlign: 'center', marginBottom: 8, lineHeight: 19 },
})
