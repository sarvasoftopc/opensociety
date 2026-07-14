import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Fragment, useMemo, useState } from 'react'
import { availableVisitorActions } from '@opensociety/shared'
import type { VisitorEntry, VisitorStatus } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/visitors')({ component: VisitorsPage })

function statusPillClass(status: VisitorStatus): string {
  if (status === 'APPROVED') return 'bg-emerald-50 text-emerald-700'
  if (status === 'ENTERED') return 'bg-blue-50 text-blue-700'
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700'
  if (status === 'DENIED' || status === 'CANCELLED') return 'bg-rose-50 text-rose-700'
  return 'bg-slate-100 text-slate-600'
}

const ALL_STATUSES: VisitorStatus[] = [
  'PENDING',
  'APPROVED',
  'ENTERED',
  'EXITED',
  'DENIED',
  'CANCELLED',
  'EXPIRED',
]

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function DenyPanel({ entry, onDone }: { entry: VisitorEntry; onDone: () => void }) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')
  const mutation = useMutation({
    mutationFn: () => apiClient.denyVisitor(entry.id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitors'] })
      onDone()
    },
  })
  return (
    <div className="bg-slate-50 flex flex-wrap items-center gap-3 rounded-xl p-3">
      <Input
        placeholder="Reason for denial"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="max-w-xs rounded-xl border-slate-200 bg-white h-9"
      />
      <Button variant="destructive" size="sm" disabled={!reason.trim() || mutation.isPending} onClick={() => mutation.mutate()} className="rounded-lg">
        {mutation.isPending ? 'Denying…' : 'Confirm deny'}
      </Button>
      <Button variant="ghost" size="sm" onClick={onDone} className="rounded-lg">
        Cancel
      </Button>
      {mutation.isError && <p className="text-destructive w-full text-xs">{(mutation.error as Error).message}</p>}
    </div>
  )
}

function TransitionButton({
  entry,
  label,
  variant,
  mutationFn,
}: {
  entry: VisitorEntry
  label: string
  variant?: 'default' | 'outline'
  mutationFn: (id: string) => Promise<VisitorEntry>
}) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => mutationFn(entry.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visitors'] }),
  })
  return (
    <Button size="sm" variant={variant} disabled={mutation.isPending} onClick={() => mutation.mutate()} className="rounded-lg">
      {mutation.isPending ? '…' : label}
    </Button>
  )
}

function VisitorsPage() {
  const [filter, setFilter] = useState<VisitorStatus | 'ALL'>('ALL')
  const [denying, setDenying] = useState<string | null>(null)

  const visitors = useQuery({ queryKey: ['visitors'], queryFn: () => apiClient.listVisitors() })
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: () => apiClient.listApartments() })

  const aptLabel = useMemo(() => {
    const m = new Map<string, string>()
    apartments.data?.forEach((a) => m.set(a.id, `${a.tower}-${a.apartmentNo}`))
    return m
  }, [apartments.data])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    visitors.data?.forEach((v) => (c[v.status] = (c[v.status] ?? 0) + 1))
    return c
  }, [visitors.data])

  const rows = (visitors.data ?? []).filter((v) => filter === 'ALL' || v.status === filter)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visitor logs"
        description={`${visitors.data?.length ?? 0} total entries`}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            filter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All ({visitors.data?.length ?? 0})
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      <Card className="border border-slate-100 rounded-2xl shadow-sm">
        <CardContent className="pt-6">
          <QueryState
            q={visitors}
            empty={visitors.isSuccess && rows.length === 0}
            emptyText="No visitor entries in this view."
          >
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100">
                  <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Visitor</TableHead>
                  <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Type</TableHead>
                  <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Apartment</TableHead>
                  <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Status</TableHead>
                  <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Created</TableHead>
                  <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Checked in</TableHead>
                  <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((v) => (
                  <Fragment key={v.id}>
                    <TableRow className="border-b border-slate-50 hover:bg-slate-50/60">
                      <TableCell className="font-medium text-slate-800">
                        {v.visitorName}
                        {v.visitorPhone && (
                          <span className="block text-xs text-slate-400">{v.visitorPhone}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">{v.type}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{aptLabel.get(v.apartmentId) ?? '—'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusPillClass(v.status)}`}>
                          {v.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs">{formatTime(v.createdAt)}</TableCell>
                      <TableCell className="text-slate-400 text-xs">{formatTime(v.checkInAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {availableVisitorActions(v.status).map((action) => {
                            if (action === 'approve')
                              return (
                                <TransitionButton
                                  key={action}
                                  entry={v}
                                  label="Approve"
                                  mutationFn={apiClient.approveVisitor}
                                />
                              )
                            if (action === 'checkin')
                              return (
                                <TransitionButton
                                  key={action}
                                  entry={v}
                                  label="Check in"
                                  mutationFn={apiClient.checkInVisitor}
                                />
                              )
                            if (action === 'checkout')
                              return (
                                <TransitionButton
                                  key={action}
                                  entry={v}
                                  label="Check out"
                                  variant="outline"
                                  mutationFn={apiClient.checkOutVisitor}
                                />
                              )
                            if (action === 'deny')
                              return (
                                <Button
                                  key={action}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDenying(denying === v.id ? null : v.id)}
                                  className="rounded-lg"
                                >
                                  {denying === v.id ? 'Close' : 'Deny'}
                                </Button>
                              )
                            return null
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                    {denying === v.id && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7} className="py-2 px-4">
                          <DenyPanel entry={v} onDone={() => setDenying(null)} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>
    </div>
  )
}
