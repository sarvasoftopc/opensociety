import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Building2, Megaphone, UserCheck, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { apiClient } from '../../lib/api'
import { PageHeader } from '@/components/admin/ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PushNotificationCard } from '@/components/push-notification-card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const Route = createFileRoute('/admin/')({ component: Overview })

function StatCard({
  icon: Icon,
  label,
  value,
  to,
  hint,
  iconBg,
  iconColor,
}: {
  icon: LucideIcon
  label: string
  value: number | string
  to: string
  hint?: string
  iconBg?: string
  iconColor?: string
}) {
  return (
    <Link to={to} className="block rounded-2xl">
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 hover:shadow-md hover:border-slate-200 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">{label}</span>
          <div className={`rounded-xl p-2 ${iconBg ?? 'bg-slate-50'}`}>
            <Icon className={`size-4 ${iconColor ?? 'text-slate-500'}`} />
          </div>
        </div>
        <div className="text-3xl font-bold text-slate-900 mt-3">{value}</div>
        {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      </div>
    </Link>
  )
}

function Overview() {
  const society = useQuery({ queryKey: ['society'], queryFn: apiClient.getSociety })
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: () => apiClient.listApartments() })
  const visitors = useQuery({ queryKey: ['visitors'], queryFn: () => apiClient.listVisitors() })
  const notices = useQuery({ queryKey: ['notices'], queryFn: () => apiClient.listNotices() })
  const pending = useQuery({ queryKey: ['users', 'PENDING'], queryFn: () => apiClient.listUsers('PENDING') })
  const users = useQuery({ queryKey: ['users', 'ALL'], queryFn: () => apiClient.listUsers() })

  const pendingVisitors = visitors.data?.filter((v) => v.status === 'PENDING').length ?? 0
  const [targetMode, setTargetMode] = useState<'resident' | 'all-residents'>('resident')
  const [targetId, setTargetId] = useState('')
  const [residentSearch, setResidentSearch] = useState('')
  const [title, setTitle] = useState('Test notification')
  const [body, setBody] = useState('This is a SarvaSociety test push notification from admin.')
  const residentTargets = useMemo(
    () =>
      (users.data ?? [])
        .filter((item) => item.role === 'RESIDENT' && item.isActive)
        .map((item) => ({
          id: item.id,
          label: `${item.name} · ${item.email ?? item.phone ?? 'No contact'}`,
        })),
    [users.data],
  )
  const filteredResidentTargets = residentTargets.filter((target) =>
    residentSearch.trim()
      ? target.label.toLowerCase().includes(residentSearch.trim().toLowerCase())
      : true,
  )
  const sendTest = useMutation({
    mutationFn: () =>
      apiClient.sendTestNotification(
        targetMode === 'all-residents'
          ? { allResidents: true, title, body, data: { screen: 'resident_dashboard' } }
          : { userId: targetId, title, body, data: { screen: 'resident_dashboard' } },
      ),
  })

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Admin Console</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
          {society.data ? society.data.name : 'Dashboard'}
        </h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        <StatCard
          icon={Building2}
          label="Apartments"
          value={apartments.data?.length ?? '—'}
          to="/admin/apartments"
          iconBg="bg-cyan-50"
          iconColor="text-cyan-600"
        />
        <StatCard
          icon={Users}
          label="Pending residents"
          value={pending.data?.length ?? '—'}
          to="/admin/residents"
          hint="Awaiting approval"
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          icon={UserCheck}
          label="Visitors"
          value={visitors.data?.length ?? '—'}
          to="/admin/visitors"
          hint={`${pendingVisitors} pending`}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        />
        <StatCard
          icon={Megaphone}
          label="Notices"
          value={notices.data?.length ?? '—'}
          to="/admin/notices"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
      </div>

      {/* Getting started card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 mb-6">
        <p className="text-base font-bold text-slate-900 mb-4">Getting started</p>
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
              1
            </div>
            <p className="text-sm text-slate-600">
              Configure your society in{' '}
              <Link to="/admin/society" className="text-slate-900 font-medium underline underline-offset-2">
                Society
              </Link>
              .
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
              2
            </div>
            <p className="text-sm text-slate-600">
              Add units in{' '}
              <Link to="/admin/apartments" className="text-slate-900 font-medium underline underline-offset-2">
                Apartments
              </Link>{' '}
              (single or bulk).
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
              3
            </div>
            <p className="text-sm text-slate-600">
              Approve residents as they sign up under{' '}
              <Link to="/admin/residents" className="text-slate-900 font-medium underline underline-offset-2">
                Residents
              </Link>
              .
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
              4
            </div>
            <p className="text-sm text-slate-600">
              Register gate staff in{' '}
              <Link to="/admin/guards" className="text-slate-900 font-medium underline underline-offset-2">
                Guards
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Push notification card */}
      <div className="mb-6">
        <PushNotificationCard />
      </div>

      {/* Test notifications card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
        <p className="text-base font-bold text-slate-900 mb-1">Test push notifications</p>
        <p className="text-sm text-slate-500 mb-5">
          Search for one resident or send a notification to every resident at once. SarvaSociety always creates in-app notification records for targeted residents.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-4">
          <div className="flex flex-col gap-1.5">
            <Label>Target mode</Label>
            <Select value={targetMode} onValueChange={(value) => setTargetMode(value as 'resident' | 'all-residents')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resident">Single resident</SelectItem>
                <SelectItem value="all-residents">All residents</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resident-search">Search resident</Label>
            <Input
              id="resident-search"
              value={residentSearch}
              onChange={(e) => setResidentSearch(e.target.value)}
              placeholder={targetMode === 'all-residents' ? 'Broadcast mode selected' : 'Search by name, email, or phone'}
              disabled={targetMode === 'all-residents'}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Resident</Label>
            <Select value={targetId} onValueChange={setTargetId} disabled={targetMode === 'all-residents'}>
              <SelectTrigger>
                <SelectValue placeholder={targetMode === 'all-residents' ? 'All residents selected' : 'Choose resident'} />
              </SelectTrigger>
              <SelectContent>
                {filteredResidentTargets.map((target) => (
                  <SelectItem key={target.id} value={target.id}>
                    {target.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notif-title">Title</Label>
            <Input id="notif-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notif-body">Body</Label>
            <Input id="notif-body" value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-600 mb-4">
          {targetMode === 'all-residents'
            ? `Broadcast target: all ${residentTargets.length} active residents`
            : `Targeting: ${targetId ? filteredResidentTargets.find((target) => target.id === targetId)?.label ?? 'selected resident' : 'choose one resident'}`}
        </div>

        <button
          className="bg-[#0f172a] text-white rounded-xl h-10 px-5 text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={sendTest.isPending || !title.trim() || !body.trim() || (targetMode === 'resident' && !targetId.trim())}
          onClick={() => sendTest.mutate()}
        >
          {sendTest.isPending ? 'Sending…' : targetMode === 'all-residents' ? 'Send to all residents' : 'Send to selected resident'}
        </button>

        {sendTest.isSuccess ? (
          <p className="mt-3 text-sm text-emerald-600">
            Notifications created for {sendTest.data.createdCount} of {sendTest.data.targetCount} targeted residents.
            {' '}Push attempted: {sendTest.data.pushAttempted ? 'yes' : 'no'}, push sent to {sendTest.data.pushSuccessCount} resident device target(s)
            {sendTest.data.pushPartialFailureCount > 0 ? `, partial failures on ${sendTest.data.pushPartialFailureCount} resident send(s)` : ''}
            {sendTest.data.pushError ? ` (${sendTest.data.pushError})` : ''}
          </p>
        ) : null}
        {sendTest.isError ? <p className="mt-3 text-sm text-rose-500">{(sendTest.error as Error).message}</p> : null}
      </div>
    </div>
  )
}
