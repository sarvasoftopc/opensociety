import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Fragment, useState } from 'react'
import type { ResidencyRelation, User, UserRole, UserStatus } from '@opensociety/shared'
import { residencyRelationSchema, userRoleSchema } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const Route = createFileRoute('/admin/residents')({ component: ResidentsPage })

const FILTERS: { label: string; value: UserStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Suspended', value: 'SUSPENDED' },
]

function statusPillClass(status: UserStatus): string {
  if (status === 'APPROVED') return 'bg-emerald-50 text-emerald-700'
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700'
  if (status === 'SUSPENDED') return 'bg-rose-50 text-rose-700'
  return 'bg-slate-100 text-slate-600'
}

function ApprovePanel({ user, onDone }: { user: User; onDone: () => void }) {
  const qc = useQueryClient()
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: () => apiClient.listApartments() })
  const [apartmentId, setApartmentId] = useState('')
  const [relation, setRelation] = useState<ResidencyRelation>('OWNER')
  const [isPrimary, setIsPrimary] = useState(true)

  const mutation = useMutation({
    mutationFn: () => apiClient.approveUser(user.id, { apartmentId, relation, isPrimary }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      onDone()
    },
  })

  return (
    <div className="bg-slate-50 flex flex-wrap items-end gap-3 rounded-2xl p-4">
      <div className="space-y-1.5">
        <Label>Apartment</Label>
        <Select value={apartmentId} onValueChange={setApartmentId}>
          <SelectTrigger className="w-44 rounded-xl border-slate-200 bg-white h-10">
            <SelectValue placeholder="Select unit" />
          </SelectTrigger>
          <SelectContent>
            {apartments.data?.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.tower}-{a.apartmentNo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Relation</Label>
        <Select value={relation} onValueChange={(v) => setRelation(v as ResidencyRelation)}>
          <SelectTrigger className="w-36 rounded-xl border-slate-200 bg-white h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {residencyRelationSchema.options.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 pb-2 text-sm text-slate-700 cursor-pointer select-none">
        <span
          role="checkbox"
          aria-checked={isPrimary}
          tabIndex={0}
          onClick={() => setIsPrimary((v) => !v)}
          onKeyDown={(e) => e.key === ' ' && setIsPrimary((v) => !v)}
          className={`inline-flex h-4 w-4 items-center justify-center rounded border transition-colors ${isPrimary ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-300'}`}
        >
          {isPrimary && (
            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={2}>
              <path d="M1.5 5l2.5 2.5 4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        Primary resident
      </label>
      <Button onClick={() => mutation.mutate()} disabled={!apartmentId || mutation.isPending} className="rounded-xl">
        {mutation.isPending ? 'Approving…' : 'Confirm'}
      </Button>
      <Button variant="ghost" onClick={onDone} className="rounded-xl">
        Cancel
      </Button>
      {apartments.isSuccess && apartments.data?.length === 0 && (
        <p className="text-destructive w-full text-xs">Add apartments first before approving residents.</p>
      )}
      {mutation.isError && <p className="text-destructive w-full text-xs">{(mutation.error as Error).message}</p>}
    </div>
  )
}

function RoleSelect({ user }: { user: User }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (role: UserRole) => apiClient.updateUserRole(user.id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
  return (
    <Select value={user.role} onValueChange={(v) => mutation.mutate(v as UserRole)} disabled={mutation.isPending}>
      <SelectTrigger size="sm" className="w-32 rounded-xl border-slate-200 bg-slate-50">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {userRoleSchema.options.map((r) => (
          <SelectItem key={r} value={r}>
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ResidentsPage() {
  const [filter, setFilter] = useState<UserStatus | 'ALL'>('ALL')
  const [approving, setApproving] = useState<string | null>(null)
  const users = useQuery({
    queryKey: ['users', filter],
    queryFn: () => apiClient.listUsers(filter === 'ALL' ? undefined : filter),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Residents" description="Approve new residents and manage their roles." />

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card className="border border-slate-100 rounded-2xl shadow-sm">
        <CardContent className="pt-6">
          <QueryState
            q={users}
            empty={users.isSuccess && users.data?.length === 0}
            emptyText="No residents in this view yet."
          >
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100">
                  <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Name</TableHead>
                  <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Contact</TableHead>
                  <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Role</TableHead>
                  <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Status</TableHead>
                  <TableHead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.data?.map((u) => (
                  <Fragment key={u.id}>
                    <TableRow className="border-b border-slate-50 hover:bg-slate-50/60">
                      <TableCell className="font-medium text-slate-800">{u.name}</TableCell>
                      <TableCell className="text-slate-500">{u.email ?? u.phone ?? '—'}</TableCell>
                      <TableCell>
                        <RoleSelect user={u} />
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusPillClass(u.status)}`}>
                          {u.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {u.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant={approving === u.id ? 'secondary' : 'default'}
                            onClick={() => setApproving(approving === u.id ? null : u.id)}
                            className="rounded-xl"
                          >
                            {approving === u.id ? 'Close' : 'Approve'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {approving === u.id && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={5} className="py-2 px-4">
                          <ApprovePanel user={u} onDone={() => setApproving(null)} />
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
