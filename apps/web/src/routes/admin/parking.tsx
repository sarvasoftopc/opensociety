import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { Apartment, ParkingSlotType, ParkingSummary } from '@opensociety/shared'
import { parkingSlotTypeSchema, parkingSlotStatus, summarizeParking } from '@opensociety/shared'

import { apiClient, type ParkingSlotRow } from '../../lib/api'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/parking')({ component: ParkingPage })

const NOW_ISH = () => Date.now()

function toMs(iso: string | null): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? null : t
}

function statusOf(slot: ParkingSlotRow) {
  return parkingSlotStatus(
    {
      isActive: slot.isActive,
      apartmentId: slot.apartmentId,
      isTemporary: slot.isTemporary,
      assignedUntilMs: toMs(slot.assignedUntil),
    },
    NOW_ISH(),
  )
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'ASSIGNED': return 'bg-emerald-50 text-emerald-700'
    case 'TEMPORARY': return 'bg-amber-50 text-amber-700'
    case 'AVAILABLE': return 'bg-blue-50 text-blue-700'
    case 'INACTIVE': return 'bg-slate-100 text-slate-600'
    default: return 'bg-slate-100 text-slate-600'
  }
}

function AddSlot() {
  const qc = useQueryClient()
  const [slotNumber, setSlotNumber] = useState('')
  const [type, setType] = useState<ParkingSlotType>('OPEN')
  const [isVisitor, setIsVisitor] = useState(false)

  const create = useMutation({
    mutationFn: () => apiClient.createParkingSlot({ slotNumber: slotNumber.trim(), type, isVisitor }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parking-slots'] })
      qc.invalidateQueries({ queryKey: ['visitor-parking'] })
      setSlotNumber('')
      setType('OPEN')
      setIsVisitor(false)
    },
  })

  const canSubmit = slotNumber.trim().length > 0 && !create.isPending

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit) create.mutate()
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="slot-no">Slot number</Label>
        <Input
          id="slot-no"
          className="w-40 h-11 rounded-xl border-slate-200 bg-slate-50"
          placeholder="e.g. B1-05"
          value={slotNumber}
          onChange={(e) => setSlotNumber(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as ParkingSlotType)}>
          <SelectTrigger className="w-32 h-11 rounded-xl border-slate-200 bg-slate-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {parkingSlotTypeSchema.options.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <label className="text-slate-500 flex items-center gap-1.5 pb-2 text-sm">
        <input type="checkbox" checked={isVisitor} onChange={(e) => setIsVisitor(e.target.checked)} />
        Visitor slot
      </label>
      <Button type="submit" className="rounded-xl" disabled={!canSubmit}>
        {create.isPending ? 'Adding…' : 'Add slot'}
      </Button>
      {create.isError && <p className="text-destructive w-full text-sm">{(create.error as Error).message}</p>}
    </form>
  )
}

function VisitorParkingCard() {
  const q = useQuery({ queryKey: ['visitor-parking'], queryFn: apiClient.listVisitorParking })
  const summary = q.data?.summary
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString(undefined, { timeStyle: 'short' }) : '—')

  return (
    <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          Visitor parking
          {summary?.isFull && (
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-700">
              Full — {summary.occupied}/{summary.total}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <QueryState
          q={q}
          empty={q.isSuccess && (q.data?.slots.length ?? 0) === 0}
          emptyText="No visitor slots yet. Add one above with 'Visitor slot' ticked."
        >
          {summary && (
            <p className="text-slate-400 mb-4 text-sm">
              {summary.available} of {summary.total} free · {summary.occupied} occupied
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Slot</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Status</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Visitor</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Vehicle</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data?.slots.map((s) => (
                <TableRow key={s.id} className={`border-b border-slate-50 transition-colors hover:bg-slate-50/60 ${s.isActive ? '' : 'opacity-60'}`}>
                  <TableCell className="font-mono font-medium">{s.slotNumber}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.occupiedByEntryId ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                      {s.occupiedByEntryId ? 'Occupied' : 'Free'}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-500">{s.visitorName ?? '—'}</TableCell>
                  <TableCell className="text-slate-500 font-mono">{s.vehicleNumber ?? '—'}</TableCell>
                  <TableCell className="text-slate-500 text-xs">{fmt(s.occupiedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </QueryState>
      </CardContent>
    </Card>
  )
}

function AssignControls({ slot, apartments }: { slot: ParkingSlotRow; apartments: Apartment[] }) {
  const qc = useQueryClient()
  const [apartmentId, setApartmentId] = useState('')
  const [temporary, setTemporary] = useState(false)
  const [until, setUntil] = useState('')
  const invalidate = () => qc.invalidateQueries({ queryKey: ['parking-slots'] })

  const assign = useMutation({
    mutationFn: () =>
      apiClient.assignParkingSlot(slot.id, {
        apartmentId,
        isTemporary: temporary,
        assignedUntil: temporary && until ? new Date(`${until}T23:59:59`).toISOString() : null,
      }),
    onSuccess: () => {
      invalidate()
      setApartmentId('')
      setTemporary(false)
      setUntil('')
    },
  })
  const release = useMutation({
    mutationFn: () => apiClient.assignParkingSlot(slot.id, { apartmentId: null, isTemporary: false, assignedUntil: null }),
    onSuccess: invalidate,
  })

  const canAssign = !!apartmentId && (!temporary || until.length > 0) && !assign.isPending

  if (slot.apartmentId) {
    return (
      <Button size="sm" variant="ghost" className="rounded-xl" disabled={release.isPending} onClick={() => release.mutate()}>
        {release.isPending ? '…' : 'Release'}
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Select value={apartmentId} onValueChange={setApartmentId}>
        <SelectTrigger className="h-8 w-28 rounded-xl border-slate-200 bg-slate-50">
          <SelectValue placeholder="Flat" />
        </SelectTrigger>
        <SelectContent>
          {apartments.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.tower}-{a.apartmentNo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <label className="text-slate-500 flex items-center gap-1 text-xs">
        <input type="checkbox" checked={temporary} onChange={(e) => setTemporary(e.target.checked)} />
        Temp
      </label>
      {temporary && (
        <Input type="date" className="h-8 w-36 rounded-xl border-slate-200 bg-slate-50" value={until} onChange={(e) => setUntil(e.target.value)} />
      )}
      <Button size="sm" className="rounded-xl" disabled={!canAssign} onClick={() => assign.mutate()}>
        {assign.isPending ? '…' : 'Assign'}
      </Button>
    </div>
  )
}

function SlotRow({ slot, apartments }: { slot: ParkingSlotRow; apartments: Apartment[] }) {
  const qc = useQueryClient()
  const status = statusOf(slot)
  const toggleActive = useMutation({
    mutationFn: () => apiClient.updateParkingSlot(slot.id, { isActive: !slot.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parking-slots'] }),
  })
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'

  return (
    <TableRow className={`border-b border-slate-50 transition-colors hover:bg-slate-50/60 ${slot.isActive ? '' : 'opacity-60'}`}>
      <TableCell className="font-mono font-medium">{slot.slotNumber}</TableCell>
      <TableCell>
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600">
          {slot.type}
        </span>
      </TableCell>
      <TableCell className="text-slate-500">{slot.apartment ?? '—'}</TableCell>
      <TableCell>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusBadgeClass(status)}`}>
          {status}
        </span>
        {slot.isTemporary && slot.assignedUntil && (
          <span className="text-slate-400 ml-1 text-xs">till {fmtDate(slot.assignedUntil)}</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {slot.isActive && <AssignControls slot={slot} apartments={apartments} />}
          <Button
            size="sm"
            variant={slot.isActive ? 'ghost' : 'default'}
            className="rounded-xl"
            disabled={toggleActive.isPending}
            onClick={() => toggleActive.mutate()}
          >
            {toggleActive.isPending ? '…' : slot.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function SummaryCard({ summary }: { summary: ParkingSummary }) {
  const stat = (label: string, value: number) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xl font-semibold text-slate-800">{value}</span>
      <span className="text-slate-400 text-xs">{label}</span>
    </div>
  )
  return (
    <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
      <CardContent className="flex flex-wrap gap-8 pt-6">
        {stat('Total', summary.total)}
        {stat('Available', summary.available)}
        {stat('Assigned', summary.assigned)}
        {stat('Temporary', summary.temporary)}
        {stat('Covered', summary.covered)}
        {stat('Open', summary.open)}
      </CardContent>
    </Card>
  )
}

function ParkingPage() {
  const slots = useQuery({ queryKey: ['parking-slots'], queryFn: apiClient.listParkingSlots })
  const apartmentsQ = useQuery({ queryKey: ['apartments'], queryFn: apiClient.listApartments })
  const apartments = apartmentsQ.data ?? []

  const summary = useMemo<ParkingSummary>(
    () =>
      summarizeParking(
        (slots.data ?? []).map((s) => ({
          isActive: s.isActive,
          type: s.type,
          apartmentId: s.apartmentId,
          isTemporary: s.isTemporary,
          assignedUntilMs: toMs(s.assignedUntil),
        })),
        NOW_ISH(),
      ),
    [slots.data],
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Parking" description="Allocate parking slots to flats and keep a live directory." />

      <SummaryCard summary={summary} />

      <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Add slot</CardTitle>
        </CardHeader>
        <CardContent>
          <AddSlot />
        </CardContent>
      </Card>

      <VisitorParkingCard />

      <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Resident slots</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            q={slots}
            empty={slots.isSuccess && slots.data?.length === 0}
            emptyText="No resident parking slots yet. Add one above."
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Slot</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Type</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Flat</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Status</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.data?.map((s) => (
                  <SlotRow key={s.id} slot={s} apartments={apartments} />
                ))}
              </TableBody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>
    </div>
  )
}
