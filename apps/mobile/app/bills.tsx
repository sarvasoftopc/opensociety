import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native'
import type { BillStatus, PaymentMethod } from '@opensociety/shared'
import { formatPaise, paymentMethodSchema } from '@opensociety/shared'

import { apiClient } from '../api/client'
import { Button } from '../components/Button'
import { HeroCard, MobileScreen, SectionCard, mobileTheme } from '../components/mobile-ui'

const STATUS_STYLE: Record<BillStatus, { bg: string; fg: string }> = {
  ISSUED: { bg: '#dbeafe', fg: '#1e40af' },
  PARTIALLY_PAID: { bg: '#fef3c7', fg: '#92400e' },
  PAID: { bg: '#dcfce7', fg: '#166534' },
  CANCELLED: { bg: '#e4e4e7', fg: '#52525b' },
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Bills() {
  const qc = useQueryClient()
  const bills = useQuery({ queryKey: ['bills'], queryFn: () => apiClient.listBills() })
  const payments = useQuery({ queryKey: ['payments'], queryFn: () => apiClient.listPayments() })

  if (bills.isLoading) {
    return (
      <MobileScreen>
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      </MobileScreen>
    )
  }

  if (bills.isError) {
    return (
      <MobileScreen>
        <SectionCard title="Could not load billing">
          <Text style={styles.error}>Couldn’t load bills</Text>
          <Text style={styles.dim}>{String((bills.error as Error)?.message ?? 'error')}</Text>
        </SectionCard>
      </MobileScreen>
    )
  }

  return (
    <MobileScreen scroll contentStyle={styles.list}>
      <HeroCard
        eyebrow="Resident"
        title="Billing and payments"
        subtitle="Track society dues, upcoming payments, and your payment history from the same resident app."
        badge={`${(bills.data ?? []).length} bills`}
      />

      <SectionCard title="Current bills">
        {(bills.data ?? []).length === 0 ? <Text style={styles.dim}>No bills yet.</Text> : null}
        {(bills.data ?? []).map((b) => {
          const outstanding = b.totalAmount - (b.paidAmount ?? 0)
          const s = STATUS_STYLE[b.status]
          return (
            <View key={b.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.title}>{b.title}</Text>
                <Text style={[styles.badge, { backgroundColor: s.bg, color: s.fg }]}>{b.status.replace('_', ' ')}</Text>
              </View>
              <Text style={styles.dim}>
                {b.periodMonth ?? 'One-time'}
                {b.dueDate ? ` · due ${fmtDate(b.dueDate)}` : ''}
              </Text>
              <View style={styles.row}>
                <Text style={styles.amount}>{formatPaise(b.totalAmount)}</Text>
                {outstanding > 0 ? (
                  <Text style={styles.outstanding}>{formatPaise(outstanding)} due</Text>
                ) : (
                  <Text style={styles.paid}>Paid</Text>
                )}
              </View>
              {outstanding > 0 ? <PaymentForm billId={b.id} outstanding={outstanding} onSuccess={() => {
                qc.invalidateQueries({ queryKey: ['bills'] })
                qc.invalidateQueries({ queryKey: ['payments'] })
              }} /> : null}
            </View>
          )
        })}
      </SectionCard>

      <SectionCard title="Payment history">
        {(payments.data ?? []).length === 0 ? <Text style={styles.dim}>No payments yet.</Text> : null}
        {(payments.data ?? []).map((p) => (
          <View key={p.id} style={styles.payRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.payMethod}>{p.method.replace('_', ' ')}</Text>
              <Text style={styles.dim}>
                {fmtDate(p.paidAt)}
                {p.reference ? ` · ${p.reference}` : ''}
              </Text>
            </View>
            <Text style={styles.amount}>{formatPaise(p.amount)}</Text>
          </View>
        ))}
      </SectionCard>
    </MobileScreen>
  )
}

function PaymentForm({
  billId,
  outstanding,
  onSuccess,
}: {
  billId: string
  outstanding: number
  onSuccess: () => void
}) {
  const [amount, setAmount] = useState((outstanding / 100).toFixed(2))
  const [reference, setReference] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('UPI')
  const pay = useMutation({
    mutationFn: () =>
      apiClient.recordPayment({
        billId,
        amount: Math.round((parseFloat(amount) || 0) * 100),
        method,
        reference: reference.trim() || undefined,
        notes: 'Resident mobile payment',
      }),
    onSuccess,
  })

  return (
    <View style={styles.payForm}>
      <Text style={styles.formLabel}>Record payment</Text>
      <TextInput
        style={mobileTheme.input}
        placeholder="Amount in INR"
        placeholderTextColor="#7a8aa3"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />
      <View style={styles.methodRow}>
        {paymentMethodSchema.options.map((item) => (
          <Button
            key={item}
            label={item}
            variant={method === item ? 'primary' : 'outline'}
            onPress={() => setMethod(item)}
          />
        ))}
      </View>
      <TextInput
        style={mobileTheme.input}
        placeholder="Reference / UTR"
        placeholderTextColor="#7a8aa3"
        value={reference}
        onChangeText={setReference}
      />
      <Button label={pay.isPending ? 'Processing…' : 'Pay now'} onPress={() => pay.mutate()} disabled={pay.isPending || !amount} />
      {pay.isSuccess ? <Text style={styles.success}>Payment recorded successfully.</Text> : null}
      {pay.isError ? <Text style={styles.error}>{String((pay.error as Error)?.message ?? 'Payment failed')}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  card: { padding: 16, borderRadius: 24, backgroundColor: '#f8fbff', gap: 6, borderWidth: 1, borderColor: '#dce8f7' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: '#11203a' },
  amount: { fontSize: 17, fontWeight: '900', color: '#11203a' },
  outstanding: { color: '#b45309', fontSize: 14, fontWeight: '700' },
  paid: { color: '#166534', fontSize: 14, fontWeight: '700' },
  dim: { color: '#697a94', fontSize: 13, lineHeight: 19 },
  error: { color: '#d92d20', fontSize: 16, fontWeight: '700' },
  badge: {
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 22,
    backgroundColor: '#f8fbff',
    borderWidth: 1,
    borderColor: '#dce8f7',
    gap: 10,
  },
  payMethod: { fontSize: 15, fontWeight: '800', color: '#11203a' },
  payForm: { gap: 10, marginTop: 8 },
  formLabel: { color: '#35507a', fontSize: 13, fontWeight: '800' },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  success: { color: '#166534', fontSize: 13, fontWeight: '700' },
})
