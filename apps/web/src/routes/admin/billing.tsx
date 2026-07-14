import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { BillConfig, GenerateBills, MaintenanceBill, PaymentMethod } from '@opensociety/shared'
import { formatPaise, paymentMethodSchema, billStatusSchema } from '@opensociety/shared'
import { FileText, X } from 'lucide-react'

import { apiClient } from '../../lib/api'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/billing')({ component: BillingPage })

function statusPillClass(status: string): string {
  if (status === 'PAID') return 'bg-emerald-50 text-emerald-700'
  if (status === 'PARTIALLY_PAID') return 'bg-amber-50 text-amber-700'
  if (status === 'ISSUED') return 'bg-blue-50 text-blue-700'
  if (status === 'CANCELLED') return 'bg-rose-50 text-rose-700'
  return 'bg-slate-100 text-slate-600'
}

const rupeesToPaise = (r: string) => Math.round((parseFloat(r) || 0) * 100)
type LineDraft = { description: string; amount: string; taxRatePct: string }

function GenerateBillsForm() {
  const qc = useQueryClient()
  const [period, setPeriod] = useState('')
  const [title, setTitle] = useState('')
  const [lines, setLines] = useState<LineDraft[]>([{ description: 'Maintenance charge', amount: '', taxRatePct: '18' }])

  const setLine = (i: number, patch: Partial<LineDraft>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))

  const mutation = useMutation({
    mutationFn: () => {
      const body: GenerateBills = {
        periodMonth: period,
        title,
        lineItems: lines
          .filter((l) => l.description.trim() && l.amount)
          .map((l) => ({ description: l.description.trim(), amount: rupeesToPaise(l.amount), taxRatePct: parseInt(l.taxRatePct) || 0 })),
      }
      return apiClient.generateBills(body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      qc.invalidateQueries({ queryKey: ['dues'] })
    },
  })

  const canSubmit = /^\d{4}-\d{2}$/.test(period) && title.trim() && lines.some((l) => l.description.trim() && l.amount)

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit) mutation.mutate()
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="b-period">Period (YYYY-MM)</Label>
          <Input id="b-period" className="w-36 h-10 rounded-xl border-slate-200 bg-slate-50" placeholder="2026-07" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-title">Title</Label>
          <Input id="b-title" className="w-64 h-10 rounded-xl border-slate-200 bg-slate-50" placeholder="Maintenance — Jul 2026" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Line items</Label>
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_8rem_6rem_auto] items-center gap-2">
            <Input className="h-10 rounded-xl border-slate-200 bg-slate-50" placeholder="Description" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
            <Input className="h-10 rounded-xl border-slate-200 bg-slate-50" placeholder="Amount ₹" inputMode="decimal" value={l.amount} onChange={(e) => setLine(i, { amount: e.target.value })} />
            <Input className="h-10 rounded-xl border-slate-200 bg-slate-50" placeholder="GST %" inputMode="numeric" value={l.taxRatePct} onChange={(e) => setLine(i, { taxRatePct: e.target.value })} />
            {lines.length > 1 ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="rounded-lg px-2">
                <X className="h-4 w-4 text-slate-400" />
              </Button>
            ) : (
              <div className="w-8" />
            )}
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => setLines((ls) => [...ls, { description: '', amount: '', taxRatePct: '0' }])} className="rounded-xl mt-1">
          + Add line
        </Button>
      </div>

      <Button type="submit" disabled={mutation.isPending || !canSubmit} className="rounded-xl">
        {mutation.isPending ? 'Generating…' : 'Generate bills for all flats'}
      </Button>
      {mutation.isSuccess && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Created {mutation.data.created} bill{mutation.data.created === 1 ? '' : 's'} ({mutation.data.skipped} already existed).
        </p>
      )}
      {mutation.isError && <p className="text-destructive text-sm">{(mutation.error as Error).message}</p>}
    </form>
  )
}

function RecordPayment({ bill }: { bill: MaintenanceBill }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const pay = useMutation({
    mutationFn: () => apiClient.recordPayment({ billId: bill.id, amount: rupeesToPaise(amount), method }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      qc.invalidateQueries({ queryKey: ['dues'] })
      setAmount('')
    },
  })
  return (
    <div className="flex items-center justify-end gap-2">
      <Input className="h-9 w-24 rounded-xl border-slate-200 bg-slate-50 text-sm" placeholder="₹" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
        <SelectTrigger className="h-9 w-28 rounded-xl border-slate-200 bg-slate-50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {paymentMethodSchema.options.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" disabled={pay.isPending || !amount} onClick={() => pay.mutate()} className="rounded-xl h-9">
        {pay.isPending ? '…' : 'Record'}
      </Button>
    </div>
  )
}

function InvoiceButton({ billId }: { billId: string }) {
  const [busy, setBusy] = useState(false)
  const open = async () => {
    setBusy(true)
    try {
      const url = await apiClient.invoiceObjectUrl(billId)
      window.open(url, '_blank', 'noopener')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button variant="ghost" size="sm" onClick={open} disabled={busy} className="rounded-lg gap-1.5 text-slate-500 hover:text-slate-700">
      <FileText className="h-3.5 w-3.5" />
      {busy ? '…' : 'Invoice'}
    </Button>
  )
}

function DuesCard() {
  const dues = useQuery({ queryKey: ['dues'], queryFn: apiClient.listDues })
  return (
    <Card className="border border-slate-100 rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Outstanding dues</CardTitle>
      </CardHeader>
      <CardContent>
        <QueryState q={dues} empty={dues.isSuccess && dues.data?.length === 0} emptyText="No outstanding dues 🎉">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100">
                <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Flat</TableHead>
                <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 text-right">Billed</TableHead>
                <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 text-right">Paid</TableHead>
                <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dues.data?.map((d) => (
                <TableRow key={d.apartmentId} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <TableCell className="font-medium text-slate-800">{d.apartment}</TableCell>
                  <TableCell className="text-right text-slate-600">{formatPaise(d.billed)}</TableCell>
                  <TableCell className="text-right text-slate-600">{formatPaise(d.paid)}</TableCell>
                  <TableCell className="text-right font-medium text-rose-600">{formatPaise(d.outstanding)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </QueryState>
      </CardContent>
    </Card>
  )
}

function BillsCard() {
  const [period, setPeriod] = useState('')
  const [status, setStatus] = useState('ALL')
  const bills = useQuery({
    queryKey: ['bills', period, status],
    queryFn: () => apiClient.listBills({ period: period || undefined, status: status === 'ALL' ? undefined : status }),
  })
  return (
    <Card className="border border-slate-100 rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Bills</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="f-period">Period</Label>
            <Input id="f-period" className="w-32 h-10 rounded-xl border-slate-200 bg-slate-50" placeholder="2026-07" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40 h-10 rounded-xl border-slate-200 bg-slate-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {billStatusSchema.options.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <QueryState q={bills} empty={bills.isSuccess && bills.data?.length === 0} emptyText="No bills match.">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100">
                <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Flat</TableHead>
                <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Title</TableHead>
                <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 text-right">Total</TableHead>
                <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 text-right">Paid</TableHead>
                <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Status</TableHead>
                <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 text-right">Record payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.data?.map((b) => (
                <TableRow key={b.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <TableCell className="font-medium text-slate-800">{b.apartment}</TableCell>
                  <TableCell className="text-slate-500">
                    <span className="align-middle text-sm">{b.title}</span> <InvoiceButton billId={b.id} />
                  </TableCell>
                  <TableCell className="text-right text-slate-700">{formatPaise(b.totalAmount)}</TableCell>
                  <TableCell className="text-right text-slate-700">{formatPaise(b.paidAmount ?? 0)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusPillClass(b.status)}`}>
                      {b.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {b.status !== 'PAID' && b.status !== 'CANCELLED' ? (
                      <RecordPayment bill={b} />
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </QueryState>
      </CardContent>
    </Card>
  )
}

function BillConfigForm({ initial }: { initial: BillConfig }) {
  const qc = useQueryClient()
  const [dueDay, setDueDay] = useState(String(initial.dueDayOfMonth))
  const [lines, setLines] = useState<LineDraft[]>(
    initial.lineItems.length
      ? initial.lineItems.map((l) => ({ description: l.description, amount: String(l.amount / 100), taxRatePct: String(l.taxRatePct) }))
      : [{ description: 'Maintenance charge', amount: '', taxRatePct: '18' }],
  )
  const setLine = (i: number, patch: Partial<LineDraft>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))

  const save = useMutation({
    mutationFn: () =>
      apiClient.updateBillConfig({
        dueDayOfMonth: parseInt(dueDay) || 10,
        lineItems: lines
          .filter((l) => l.description.trim() && l.amount)
          .map((l) => ({ description: l.description.trim(), amount: rupeesToPaise(l.amount), taxRatePct: parseInt(l.taxRatePct) || 0 })),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bill-config'] }),
  })

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cfg-due">Due day of month</Label>
        <Input id="cfg-due" className="w-24 h-10 rounded-xl border-slate-200 bg-slate-50" inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Recurring line items</Label>
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_8rem_6rem_auto] items-center gap-2">
            <Input className="h-10 rounded-xl border-slate-200 bg-slate-50" placeholder="Description" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
            <Input className="h-10 rounded-xl border-slate-200 bg-slate-50" placeholder="Amount ₹" inputMode="decimal" value={l.amount} onChange={(e) => setLine(i, { amount: e.target.value })} />
            <Input className="h-10 rounded-xl border-slate-200 bg-slate-50" placeholder="GST %" inputMode="numeric" value={l.taxRatePct} onChange={(e) => setLine(i, { taxRatePct: e.target.value })} />
            {lines.length > 1 ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="rounded-lg px-2">
                <X className="h-4 w-4 text-slate-400" />
              </Button>
            ) : (
              <div className="w-8" />
            )}
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => setLines((ls) => [...ls, { description: '', amount: '', taxRatePct: '0' }])} className="rounded-xl mt-1">
          + Add line
        </Button>
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending} className="rounded-xl">
        {save.isPending ? 'Saving…' : 'Save configuration'}
      </Button>
      {save.isSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved ✓ — the monthly cron will use this template.</p>}
      <p className="text-slate-400 text-xs">
        Bills auto-generate on the 1st of each month from this template. You can also generate any month manually above.
      </p>
    </div>
  )
}

function BillConfigCard() {
  const cfg = useQuery({ queryKey: ['bill-config'], queryFn: apiClient.getBillConfig })
  return (
    <Card className="border border-slate-100 rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Bill configuration (recurring template)</CardTitle>
      </CardHeader>
      <CardContent>
        <QueryState q={cfg} empty={false} emptyText="">
          {cfg.data && <BillConfigForm initial={cfg.data} />}
        </QueryState>
      </CardContent>
    </Card>
  )
}

function BillingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Generate maintenance bills, record payments, and track dues." />
      <BillConfigCard />
      <Card className="border border-slate-100 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Generate monthly bills</CardTitle>
        </CardHeader>
        <CardContent>
          <GenerateBillsForm />
        </CardContent>
      </Card>
      <DuesCard />
      <BillsCard />
    </div>
  )
}
