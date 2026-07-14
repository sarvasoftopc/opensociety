import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { TicketCategory, TicketPriority, TicketStatus } from '@opensociety/shared'
import { ticketCategorySchema, ticketPrioritySchema } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { Button } from '../components/Button'
import { HeroCard, MobileScreen, SectionCard, mobileTheme } from '../components/mobile-ui'

const STATUS_COLOR: Record<TicketStatus, string> = {
  OPEN: '#0e7490',
  IN_PROGRESS: '#0e7490',
  RESOLVED: '#15803d',
  CLOSED: '#71717a',
  CANCELLED: '#71717a',
}

export default function Tickets() {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [apartmentId, setApartmentId] = useState<string | null>(null)
  const [category, setCategory] = useState<TicketCategory>('OTHER')
  const [priority, setPriority] = useState<TicketPriority>('NORMAL')

  const apartments = useQuery({ queryKey: ['apartments'], queryFn: () => apiClient.listApartments() })
  const tickets = useQuery({ queryKey: ['tickets'], queryFn: () => apiClient.listTickets() })

  const create = useMutation({
    mutationFn: () =>
      apiClient.createTicket({
        apartmentId: apartmentId!,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] })
      setTitle('')
      setDescription('')
      setApartmentId(null)
      setCategory('OTHER')
      setPriority('NORMAL')
    },
  })

  const canSubmit =
    title.trim().length > 0 && description.trim().length > 0 && !!apartmentId && !create.isPending

  const rows = tickets.data ?? []

  return (
    <MobileScreen scroll contentStyle={styles.container}>
      <HeroCard
        eyebrow="Resident"
        title="Maintenance requests"
        subtitle="Raise issues, choose the flat, and track every ticket without leaving the app."
        badge={`${rows.length} tickets`}
      />

      <SectionCard title="Raise a ticket" subtitle="The backend contract remains unchanged, so submissions still hit the same workflow.">
        <Field label="Title">
          <TextInput
            style={mobileTheme.input}
            placeholder="e.g. Leaking tap"
            placeholderTextColor="#7a8aa3"
            value={title}
            onChangeText={setTitle}
          />
        </Field>
        <Field label="Description">
          <TextInput
            style={[mobileTheme.input, mobileTheme.multiline]}
            placeholder="What needs fixing?"
            placeholderTextColor="#7a8aa3"
            value={description}
            onChangeText={setDescription}
            multiline
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
        <Field label="Category">
          <View style={mobileTheme.chipRow}>
            {ticketCategorySchema.options.map((c) => (
              <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
            ))}
          </View>
        </Field>
        <Field label="Priority">
          <View style={mobileTheme.chipRow}>
            {ticketPrioritySchema.options.map((p) => (
              <Chip key={p} label={p} selected={priority === p} onPress={() => setPriority(p)} />
            ))}
          </View>
        </Field>
        <View style={styles.submit}>
          <Button
            label={create.isPending ? 'Submitting…' : 'Submit ticket'}
            onPress={() => create.mutate()}
            disabled={!canSubmit}
          />
          {create.isError && (
            <Text style={styles.error}>{String((create.error as Error)?.message ?? 'Failed')}</Text>
          )}
        </View>
      </SectionCard>

      <SectionCard title="Your tickets">
        {tickets.isLoading ? (
          <ActivityIndicator />
        ) : rows.length === 0 ? (
          <Text style={styles.dim}>No tickets yet.</Text>
        ) : (
          rows.map((t) => (
            <View key={t.id} style={styles.ticket}>
              <View style={styles.ticketHead}>
                <Text style={styles.ticketTitle}>{t.title}</Text>
                <Text style={[styles.status, { color: STATUS_COLOR[t.status] }]}>{t.status}</Text>
              </View>
              <Text style={styles.dim}>{t.description}</Text>
              <Text style={styles.meta}>
                {t.category} · {t.priority}
              </Text>
            </View>
          ))
        )}
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
  dim: { color: '#697a94', fontSize: 13, lineHeight: 19 },
  ticket: { borderWidth: 1, borderColor: '#dce8f7', borderRadius: 22, padding: 14, gap: 6, backgroundColor: '#f8fbff' },
  ticketHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketTitle: { fontSize: 16, fontWeight: '800', color: '#11203a', flexShrink: 1 },
  status: { fontSize: 12, fontWeight: '800' },
  meta: { fontSize: 12, color: '#72839c', marginTop: 2, fontWeight: '600' },
})
