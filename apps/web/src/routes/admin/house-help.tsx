import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { Apartment, CreateHouseHelp, HouseHelpType, IdProofType } from '@opensociety/shared'
import type { BackgroundCheckStatus } from '@opensociety/shared'
import {
  houseHelpTypeSchema,
  idProofTypeSchema,
  backgroundCheckStatusSchema,
  summarizeHouseHelpAttendance,
  formatWorkedMinutes,
  houseHelpAttendanceToCsv,
  houseHelpWorkedMinutes,
} from '@opensociety/shared'

import { apiClient, type HouseHelpRow } from '../../lib/api'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/house-help')({ component: HouseHelpPage })

function AddHouseHelp() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState<HouseHelpType>('MAID')
  const [idProofType, setIdProofType] = useState<IdProofType>('AADHAAR')
  const [idProofNumber, setIdProofNumber] = useState('')

  const reset = () => {
    setName('')
    setPhone('')
    setType('MAID')
    setIdProofType('AADHAAR')
    setIdProofNumber('')
  }

  const mutation = useMutation({
    mutationFn: () => {
      const body: CreateHouseHelp = { name: name.trim(), type }
      if (phone.trim()) body.phone = phone.trim()
      if (idProofNumber.trim()) {
        body.idProofType = idProofType
        body.idProofNumber = idProofNumber.trim()
      }
      return apiClient.createHouseHelp(body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['house-help'] })
      reset()
    },
  })

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) mutation.mutate()
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="hh-name">Name</Label>
        <Input
          id="hh-name"
          className="w-44 h-11 rounded-xl border-slate-200 bg-slate-50"
          placeholder="Lakshmi Devi"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hh-phone">Phone</Label>
        <Input
          id="hh-phone"
          className="w-36 h-11 rounded-xl border-slate-200 bg-slate-50"
          placeholder="+91…"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as HouseHelpType)}>
          <SelectTrigger className="w-36 h-11 rounded-xl border-slate-200 bg-slate-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {houseHelpTypeSchema.options.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>ID proof</Label>
        <Select value={idProofType} onValueChange={(v) => setIdProofType(v as IdProofType)}>
          <SelectTrigger className="w-40 h-11 rounded-xl border-slate-200 bg-slate-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {idProofTypeSchema.options.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hh-idnum">ID number</Label>
        <Input
          id="hh-idnum"
          className="w-44 h-11 rounded-xl border-slate-200 bg-slate-50"
          placeholder="optional"
          value={idProofNumber}
          onChange={(e) => setIdProofNumber(e.target.value)}
        />
      </div>
      <Button type="submit" className="rounded-xl" disabled={mutation.isPending || !name.trim()}>
        {mutation.isPending ? 'Adding…' : 'Add help'}
      </Button>
      {mutation.isError && (
        <p className="text-destructive w-full text-sm">{(mutation.error as Error).message}</p>
      )}
    </form>
  )
}

function TrustBadge({ help }: { help: HouseHelpRow }) {
  const verified = help.verificationLevel === 'VERIFIED'
  return (
    <div className="flex flex-col items-start gap-1">
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${verified ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
        {verified ? '✓ Verified' : 'Unverified'}
      </span>
      <span className="text-slate-400 text-xs">Trust {help.trustScore}/100</span>
    </div>
  )
}

function VerificationButton({ help }: { help: HouseHelpRow }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [idVerified, setIdVerified] = useState(help.idVerified)
  const [backgroundCheck, setBackgroundCheck] = useState<BackgroundCheckStatus>(help.backgroundCheck)
  const [incidents, setIncidents] = useState(String(help.incidentCount))

  const save = useMutation({
    mutationFn: () =>
      apiClient.updateHouseHelpVerification(help.id, {
        idVerified,
        backgroundCheck,
        incidentCount: Number(incidents) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['house-help'] })
      setOpen(false)
    },
  })

  return (
    <>
      <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setOpen(true)}>
        Verify
      </Button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="bg-white w-full max-w-sm space-y-4 rounded-2xl p-6 shadow-lg border border-slate-100" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-semibold">{help.name} — verification</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={idVerified} onChange={(e) => setIdVerified(e.target.checked)} />
              ID proof verified
            </label>
            <div className="space-y-1.5">
              <Label>Background check</Label>
              <Select value={backgroundCheck} onValueChange={(v) => setBackgroundCheck(v as BackgroundCheckStatus)}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {backgroundCheckStatusSchema.options.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="incidents">Incident reports</Label>
              <Input
                id="incidents"
                type="number"
                min={0}
                className="h-10 rounded-xl border-slate-200 bg-slate-50"
                value={incidents}
                onChange={(e) => setIncidents(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1 rounded-xl" disabled={save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Rating({ avg, count }: { avg: number | null; count: number }) {
  if (count === 0) return <span className="text-slate-400 text-sm">No ratings</span>
  return (
    <span className="text-sm">
      <span className="text-amber-500">★</span> {avg}{' '}
      <span className="text-slate-400">({count})</span>
    </span>
  )
}

function ReviewsButton({ helpId, name }: { helpId: string; name: string }) {
  const [open, setOpen] = useState(false)
  const reviews = useQuery({
    queryKey: ['house-help-reviews', helpId],
    queryFn: () => apiClient.getHouseHelpReviews(helpId),
    enabled: open,
  })
  return (
    <>
      <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setOpen(true)}>
        Reviews
      </Button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white max-h-[80vh] w-full max-w-md overflow-auto rounded-2xl p-6 shadow-lg border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 text-lg font-semibold">{name}</p>
            {reviews.data && (
              <p className="text-slate-400 mb-4 text-sm">
                <span className="text-amber-500">★</span> {reviews.data.summary.average ?? '—'} · Trust{' '}
                {reviews.data.summary.trustScore}/100 · {reviews.data.summary.count} review
                {reviews.data.summary.count === 1 ? '' : 's'}
              </p>
            )}
            <div className="space-y-3">
              {reviews.data?.reviews.length === 0 && (
                <p className="text-slate-400 text-sm">No reviews yet.</p>
              )}
              {reviews.data?.reviews.map((r) => (
                <div key={r.id} className="border-slate-100 border-b pb-2 last:border-0">
                  <p className="text-sm">
                    <span className="text-amber-500">{'★'.repeat(r.rating)}</span>
                    <span className="text-slate-300">{'★'.repeat(5 - r.rating)}</span>
                  </p>
                  {r.comment && <p className="text-slate-400 text-sm">{r.comment}</p>}
                </div>
              ))}
            </div>
            <Button className="mt-4 w-full rounded-xl" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

function HouseHelpRow({ help, apartments }: { help: HouseHelpRow; apartments: Apartment[] }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [showFlats, setShowFlats] = useState(false)
  const [name, setName] = useState(help.name)
  const [phone, setPhone] = useState(help.phone ?? '')
  const [type, setType] = useState<HouseHelpType>(help.type)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['house-help'] })

  const save = useMutation({
    mutationFn: () => apiClient.updateHouseHelp(help.id, { name: name.trim(), phone: phone.trim() || null, type }),
    onSuccess: () => {
      invalidate()
      setEditing(false)
    },
  })

  const toggleActive = useMutation({
    mutationFn: () => apiClient.updateHouseHelp(help.id, { isActive: !help.isActive }),
    onSuccess: invalidate,
  })

  if (editing) {
    return (
      <TableRow>
        <TableCell>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-full rounded-xl border-slate-200 bg-slate-50" />
        </TableCell>
        <TableCell>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 w-full rounded-xl border-slate-200 bg-slate-50" />
        </TableCell>
        <TableCell>
          <Select value={type} onValueChange={(v) => setType(v as HouseHelpType)}>
            <SelectTrigger className="h-8 w-32 rounded-xl border-slate-200 bg-slate-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {houseHelpTypeSchema.options.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell />
        <TableCell />
        <TableCell />
        <TableCell />
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button size="sm" className="rounded-xl" disabled={save.isPending || !name.trim()} onClick={() => save.mutate()}>
              {save.isPending ? '…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <>
      <TableRow className={`border-b border-slate-50 transition-colors hover:bg-slate-50/60 ${help.isActive ? '' : 'opacity-60'}`}>
        <TableCell className="font-medium">{help.name}</TableCell>
        <TableCell className="text-slate-500">{help.phone ?? '—'}</TableCell>
        <TableCell>
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600">
            {help.type}
          </span>
        </TableCell>
        <TableCell className="text-slate-500">
          {help.idProofType ? `${help.idProofType}${help.idProofNumber ? ` · ${help.idProofNumber}` : ''}` : '—'}
        </TableCell>
        <TableCell>
          <Rating avg={help.ratingAvg} count={help.reviewCount} />
        </TableCell>
        <TableCell>
          <TrustBadge help={help} />
        </TableCell>
        <TableCell>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${help.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            {help.isActive ? 'Active' : 'Inactive'}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <VerificationButton help={help} />
            <ReviewsButton helpId={help.id} name={help.name} />
            <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setShowFlats((s) => !s)}>
              {showFlats ? 'Hide flats' : 'Flats'}
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant={help.isActive ? 'ghost' : 'default'}
              className="rounded-xl"
              onClick={() => toggleActive.mutate()}
              disabled={toggleActive.isPending}
            >
              {toggleActive.isPending ? '…' : help.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {showFlats && (
        <TableRow>
          <TableCell colSpan={8} className="p-0">
            <div className="bg-slate-50 rounded-xl p-3 m-2">
              <AssignmentsPanel helpId={help.id} apartments={apartments} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function AssignmentsPanel({ helpId, apartments }: { helpId: string; apartments: Apartment[] }) {
  const qc = useQueryClient()
  const [apartmentId, setApartmentId] = useState('')
  const assignments = useQuery({
    queryKey: ['house-help-assignments', helpId],
    queryFn: () => apiClient.listHouseHelpAssignments(helpId),
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['house-help-assignments', helpId] })
  const labelOf = (id: string) => {
    const a = apartments.find((x) => x.id === id)
    return a ? `${a.tower}-${a.apartmentNo}` : id
  }

  const add = useMutation({
    mutationFn: () => apiClient.assignHouseHelp(helpId, apartmentId),
    onSuccess: () => {
      invalidate()
      setApartmentId('')
    },
  })
  const remove = useMutation({
    mutationFn: (aptId: string) => apiClient.removeHouseHelpAssignment(helpId, aptId),
    onSuccess: invalidate,
  })

  const assignedIds = new Set((assignments.data ?? []).map((a) => a.apartmentId))
  const available = apartments.filter((a) => !assignedIds.has(a.id))

  return (
    <div className="space-y-3 py-1">
      <p className="text-sm font-medium text-slate-700">Assigned flats</p>
      <div className="flex flex-wrap gap-2">
        {(assignments.data ?? []).length === 0 && (
          <span className="text-slate-400 text-sm">Not assigned to any flat yet.</span>
        )}
        {(assignments.data ?? []).map((a) => (
          <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600">
            {labelOf(a.apartmentId)}
            <button
              className="hover:text-rose-500"
              onClick={() => remove.mutate(a.apartmentId)}
              disabled={remove.isPending}
              aria-label={`Remove ${labelOf(a.apartmentId)}`}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <Select value={apartmentId} onValueChange={setApartmentId}>
          <SelectTrigger className="h-8 w-40 rounded-xl border-slate-200 bg-slate-50">
            <SelectValue placeholder="Add a flat" />
          </SelectTrigger>
          <SelectContent>
            {available.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.tower}-{a.apartmentNo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="rounded-xl" disabled={!apartmentId || add.isPending} onClick={() => add.mutate()}>
          {add.isPending ? '…' : 'Assign'}
        </Button>
      </div>
      {add.isError && <p className="text-destructive text-sm">{(add.error as Error).message}</p>}
    </div>
  )
}

function HouseHelpPage() {
  const help = useQuery({ queryKey: ['house-help'], queryFn: () => apiClient.listHouseHelp() })
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: apiClient.listApartments })

  return (
    <div className="space-y-6">
      <PageHeader
        title="House help"
        description={`${help.data?.length ?? 0} domestic worker${help.data?.length === 1 ? '' : 's'} registered`}
      />

      <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Register house help</CardTitle>
        </CardHeader>
        <CardContent>
          <AddHouseHelp />
        </CardContent>
      </Card>

      <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>All house help</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            q={help}
            empty={help.isSuccess && help.data?.length === 0}
            emptyText="No house help yet. Register one above."
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Name</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Phone</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Type</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">ID proof</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Rating</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Trust</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Status</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {help.data?.map((h) => (
                  <HouseHelpRow key={h.id} help={h} apartments={apartments.data ?? []} />
                ))}
              </TableBody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>

      <AttendanceReports />
    </div>
  )
}

function AttendanceReports() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const entries = useQuery({
    queryKey: ['house-help-entries', from, to],
    queryFn: () => apiClient.listHouseHelpEntries({ from: from || undefined, to: to || undefined }),
  })

  const rows = useMemo(() => entries.data ?? [], [entries.data])
  const summary = useMemo(() => summarizeHouseHelpAttendance(rows), [rows])
  const csvHref = useMemo(
    () => `data:text/csv;charset=utf-8,${encodeURIComponent(houseHelpAttendanceToCsv(rows))}`,
    [rows],
  )
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

  return (
    <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Attendance &amp; reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="att-from">From</Label>
            <Input id="att-from" type="date" className="w-40 h-10 rounded-xl border-slate-200 bg-slate-50" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="att-to">To</Label>
            <Input id="att-to" type="date" className="w-40 h-10 rounded-xl border-slate-200 bg-slate-50" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {(from || to) && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl"
              onClick={() => {
                setFrom('')
                setTo('')
              }}
            >
              Clear
            </Button>
          )}
          <a
            href={csvHref}
            download="house-help-attendance.csv"
            className="border-slate-200 hover:bg-slate-50 ml-auto inline-flex h-9 items-center rounded-xl border px-4 text-sm font-medium transition-colors aria-disabled:pointer-events-none aria-disabled:opacity-50"
            aria-disabled={rows.length === 0}
          >
            Download CSV
          </a>
        </div>

        <QueryState q={entries} empty={entries.isSuccess && rows.length === 0} emptyText="No attendance in this range.">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Hours per help</p>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Name</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Type</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Visits</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Hours</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Inside</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((s) => (
                  <TableRow key={s.houseHelpId} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60">
                    <TableCell className="font-medium">{s.helpName}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600">
                        {s.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{s.visits}</TableCell>
                    <TableCell className="text-right">{formatWorkedMinutes(s.totalMinutes)}</TableCell>
                    <TableCell className="text-right">{s.openVisits || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Entry log</p>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Name</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Flat</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Check-in</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Check-out</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60">
                    <TableCell className="font-medium">{r.helpName}</TableCell>
                    <TableCell className="text-slate-500">{r.apartment ?? '—'}</TableCell>
                    <TableCell className="text-slate-500">{fmt(r.checkInAt)}</TableCell>
                    <TableCell className="text-slate-500">{fmt(r.checkOutAt)}</TableCell>
                    <TableCell className="text-right">
                      {formatWorkedMinutes(houseHelpWorkedMinutes(r.checkInAt, r.checkOutAt))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </QueryState>
      </CardContent>
    </Card>
  )
}
