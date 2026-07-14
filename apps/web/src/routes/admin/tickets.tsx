import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { TicketAction, TicketCategory, TicketPriority, TicketStatus, User } from '@opensociety/shared'
import {
  availableTicketActions,
  ticketCategorySchema,
  ticketPrioritySchema,
  ticketStatusSchema,
} from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const Route = createFileRoute('/admin/tickets')({ component: TicketsPage })

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function priorityPillClass(priority: TicketPriority): string {
  if (priority === 'URGENT' || priority === 'HIGH') return 'bg-rose-50 text-rose-700'
  if (priority === 'NORMAL') return 'bg-amber-50 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

function statusPillClass(status: TicketStatus): string {
  if (status === 'OPEN') return 'bg-blue-50 text-blue-700'
  if (status === 'IN_PROGRESS') return 'bg-violet-50 text-violet-700'
  if (status === 'RESOLVED') return 'bg-emerald-50 text-emerald-700'
  return 'bg-slate-100 text-slate-600'
}

const ACTION_LABEL: Record<TicketAction, string> = {
  start: 'Start',
  resolve: 'Resolve',
  close: 'Close',
  reopen: 'Reopen',
  cancel: 'Cancel',
}

function CreateForm({ apartmentOptions }: { apartmentOptions: { id: string; label: string }[] }) {
  const qc = useQueryClient()
  const [apartmentId, setApartmentId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TicketCategory>('OTHER')
  const [priority, setPriority] = useState<TicketPriority>('NORMAL')

  const create = useMutation({
    mutationFn: () =>
      apiClient.createTicket({ apartmentId, title: title.trim(), description: description.trim(), category, priority }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] })
      setTitle('')
      setDescription('')
      setApartmentId('')
    },
  })

  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && !!apartmentId && !create.isPending

  return (
    <Card className="mb-6 border border-slate-100 rounded-2xl shadow-sm">
      <CardContent className="flex flex-wrap items-end gap-3 pt-6">
        <div className="space-y-1.5">
          <Label>Apartment</Label>
          <Select value={apartmentId} onValueChange={setApartmentId}>
            <SelectTrigger className="w-36 h-10 rounded-xl border-slate-200 bg-slate-50">
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {apartmentOptions.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input
            className="w-44 h-10 rounded-xl border-slate-200 bg-slate-50"
            placeholder="e.g. Leaking tap"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input
            className="w-56 h-10 rounded-xl border-slate-200 bg-slate-50"
            placeholder="What needs fixing?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
            <SelectTrigger className="w-40 h-10 rounded-xl border-slate-200 bg-slate-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ticketCategorySchema.options.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
            <SelectTrigger className="w-32 h-10 rounded-xl border-slate-200 bg-slate-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ticketPrioritySchema.options.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => create.mutate()} disabled={!canSubmit} className="h-10 rounded-xl">
          {create.isPending ? 'Creating…' : 'Raise ticket'}
        </Button>
        {create.isError && (
          <p className="text-destructive w-full text-xs">{(create.error as Error).message}</p>
        )}
      </CardContent>
    </Card>
  )
}

function ActionButtons({ id, status }: { id: string; status: TicketStatus }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (action: TicketAction) => apiClient.transitionTicket(id, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  })
  const actions = availableTicketActions(status)
  if (actions.length === 0) return <span className="text-slate-400 text-xs">—</span>
  return (
    <div className="flex justify-end gap-1.5">
      {actions.map((a) => (
        <Button
          key={a}
          size="sm"
          variant={a === 'cancel' ? 'outline' : 'default'}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(a)}
          className="rounded-lg"
        >
          {ACTION_LABEL[a]}
        </Button>
      ))}
    </div>
  )
}

function AssignCell({
  id,
  assignedTo,
  assignees,
  userLabel,
  editable,
}: {
  id: string
  assignedTo: string | null
  assignees: User[]
  userLabel: Map<string, string>
  editable: boolean
}) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (userId: string) => apiClient.assignTicket(id, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  })
  if (!editable) {
    return (
      <span className="text-slate-400 text-xs">
        {assignedTo ? (userLabel.get(assignedTo) ?? '—') : '—'}
      </span>
    )
  }
  return (
    <Select value={assignedTo ?? undefined} onValueChange={(v) => mutation.mutate(v)} disabled={mutation.isPending}>
      <SelectTrigger className="w-36 rounded-xl border-slate-200 bg-slate-50">
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent>
        {assignees.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const tickets = useQuery({
    queryKey: ['tickets', statusFilter],
    queryFn: () => apiClient.listTickets(statusFilter === 'ALL' ? undefined : statusFilter),
  })
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: () => apiClient.listApartments() })
  const users = useQuery({ queryKey: ['users'], queryFn: () => apiClient.listUsers() })

  const aptLabel = useMemo(() => {
    const m = new Map<string, string>()
    apartments.data?.forEach((a) => m.set(a.id, `${a.tower}-${a.apartmentNo}`))
    return m
  }, [apartments.data])

  // Tickets are assigned to staff who do the work — not residents.
  const assignees = useMemo(
    () => (users.data ?? []).filter((u) => u.role === 'ADMIN' || u.role === 'STAFF' || u.role === 'GUARD'),
    [users.data],
  )
  const userLabel = useMemo(() => {
    const m = new Map<string, string>()
    users.data?.forEach((u) => m.set(u.id, u.name))
    return m
  }, [users.data])

  const apartmentOptions = useMemo(
    () => apartments.data?.map((a) => ({ id: a.id, label: `${a.tower}-${a.apartmentNo}` })) ?? [],
    [apartments.data],
  )

  const rows = tickets.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance tickets"
        description="Requests raised by residents — triage, work and resolve them here."
      />

      <CreateForm apartmentOptions={apartmentOptions} />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All
        </button>
        {ticketStatusSchema.options.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <Card className="border border-slate-100 rounded-2xl shadow-sm">
        <CardContent className="pt-6">
          <QueryState q={tickets} empty={tickets.isSuccess && rows.length === 0} emptyText="No tickets.">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100">
                  <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Title</TableHead>
                  <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Apartment</TableHead>
                  <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Category</TableHead>
                  <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Priority</TableHead>
                  <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Status</TableHead>
                  <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Assignee</TableHead>
                  <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Raised</TableHead>
                  <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => (
                  <TableRow key={t.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <TableCell className="font-medium text-slate-800">
                      {t.title}
                      <p className="line-clamp-2 max-w-xs text-xs text-slate-400 mt-0.5">
                        {t.description}
                      </p>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">{aptLabel.get(t.apartmentId) ?? '—'}</TableCell>
                    <TableCell className="text-slate-500 text-xs">{t.category}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${priorityPillClass(t.priority)}`}>
                        {t.priority}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusPillClass(t.status)}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <AssignCell
                        id={t.id}
                        assignedTo={t.assignedTo}
                        assignees={assignees}
                        userLabel={userLabel}
                        editable={t.status !== 'CLOSED' && t.status !== 'CANCELLED'}
                      />
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs">{formatDate(t.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <ActionButtons id={t.id} status={t.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>
    </div>
  )
}
