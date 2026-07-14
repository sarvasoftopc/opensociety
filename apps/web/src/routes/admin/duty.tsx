import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  summarizeGuardDuty,
  dutySessionMinutes,
  formatWorkedMinutes,
  entriesDuringSession,
} from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/duty')({ component: DutyPage })

const loc = (lat: number | null, lng: number | null) =>
  lat != null && lng != null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : '—'
const time = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

function OnDutyNow() {
  const active = useQuery({ queryKey: ['duty-active'], queryFn: apiClient.listActiveDuty })
  return (
    <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>On duty now</CardTitle>
      </CardHeader>
      <CardContent>
        <QueryState q={active} empty={active.isSuccess && active.data?.length === 0} emptyText="No guards on duty.">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Guard</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Since</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Clock-in location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.data?.map((s) => (
                <TableRow key={s.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60">
                  <TableCell className="font-medium">{s.guardName ?? '—'}</TableCell>
                  <TableCell className="text-slate-500">{time(s.clockInAt)}</TableCell>
                  <TableCell className="text-slate-500">{loc(s.clockInLat, s.clockInLng)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </QueryState>
      </CardContent>
    </Card>
  )
}

function ShiftReport() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const sessions = useQuery({
    queryKey: ['duty-sessions', from, to],
    queryFn: () => apiClient.listDutySessions({ from: from || undefined, to: to || undefined }),
  })
  const visitors = useQuery({ queryKey: ['visitors'], queryFn: () => apiClient.listVisitors() })

  const rows = useMemo(() => sessions.data ?? [], [sessions.data])
  const entryTimes = useMemo(() => (visitors.data ?? []).map((v) => v.createdAt), [visitors.data])
  const summary = useMemo(
    () =>
      summarizeGuardDuty(
        rows.map((r) => ({ guardId: r.guardId, guardName: r.guardName ?? '', clockInAt: r.clockInAt, clockOutAt: r.clockOutAt })),
      ),
    [rows],
  )

  return (
    <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Shift report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="duty-from">From</Label>
            <Input id="duty-from" type="date" className="w-40 h-10 rounded-xl border-slate-200 bg-slate-50" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="duty-to">To</Label>
            <Input id="duty-to" type="date" className="w-40 h-10 rounded-xl border-slate-200 bg-slate-50" value={to} onChange={(e) => setTo(e.target.value)} />
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
        </div>

        <QueryState q={sessions} empty={sessions.isSuccess && rows.length === 0} emptyText="No shifts in this range.">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Hours per guard</p>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Guard</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Shifts</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Hours</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((s) => (
                  <TableRow key={s.guardId} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60">
                    <TableCell className="font-medium">{s.guardName}</TableCell>
                    <TableCell className="text-right">{s.sessions}</TableCell>
                    <TableCell className="text-right">{formatWorkedMinutes(s.totalMinutes)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.onDuty ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {s.onDuty ? 'On duty' : 'Off'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Shift log</p>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Guard</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Clock-in</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Clock-out</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Duration</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Entries</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60">
                    <TableCell className="font-medium">{r.guardName ?? '—'}</TableCell>
                    <TableCell className="text-slate-500">{time(r.clockInAt)}</TableCell>
                    <TableCell className="text-slate-500">{time(r.clockOutAt)}</TableCell>
                    <TableCell className="text-right">
                      {formatWorkedMinutes(dutySessionMinutes(r.clockInAt, r.clockOutAt))}
                    </TableCell>
                    <TableCell className="text-right">{entriesDuringSession(r, entryTimes)}</TableCell>
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

function DutyPage() {
  const active = useQuery({ queryKey: ['duty-active'], queryFn: apiClient.listActiveDuty })
  return (
    <div className="space-y-6">
      <PageHeader title="Guard duty" description={`${active.data?.length ?? 0} on duty now`} />
      <OnDutyNow />
      <ShiftReport />
    </div>
  )
}
