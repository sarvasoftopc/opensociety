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
}: {
  icon: LucideIcon
  label: string
  value: number | string
  to: string
  hint?: string
}) {
  return (
    <Link to={to} className="block">
      <Card className="hover:border-ring transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
          <Icon className="text-muted-foreground size-4" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{value}</div>
          {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
        </CardContent>
      </Card>
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
      <PageHeader
        title="Overview"
        description={society.data ? society.data.name : 'Society not configured yet'}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Apartments"
          value={apartments.data?.length ?? '—'}
          to="/admin/apartments"
        />
        <StatCard
          icon={Users}
          label="Pending residents"
          value={pending.data?.length ?? '—'}
          to="/admin/residents"
          hint="Awaiting approval"
        />
        <StatCard
          icon={UserCheck}
          label="Visitors"
          value={visitors.data?.length ?? '—'}
          to="/admin/visitors"
          hint={`${pendingVisitors} pending`}
        />
        <StatCard icon={Megaphone} label="Notices" value={notices.data?.length ?? '—'} to="/admin/notices" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p className="text-foreground">
            New here? Run the{' '}
            <Button asChild size="sm" className="mx-1 align-middle">
              <Link to="/admin/setup">guided setup wizard</Link>
            </Button>{' '}
            to configure your society and import apartments in one flow — or follow the steps below.
          </p>
          <p>
            1. Configure your society in <Link to="/admin/society" className="text-foreground underline">Society</Link>.
          </p>
          <p>
            2. Add units in{' '}
            <Link to="/admin/apartments" className="text-foreground underline">Apartments</Link> (single or bulk).
          </p>
          <p>
            3. Approve residents as they sign up under{' '}
            <Link to="/admin/residents" className="text-foreground underline">Residents</Link>.
          </p>
          <p>
            4. Register gate staff in{' '}
            <Link to="/admin/guards" className="text-foreground underline">Guards</Link>.
          </p>
        </CardContent>
      </Card>

      <div className="mt-6">
        <PushNotificationCard />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Test notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Search for one resident or send one notification to every resident at once. Even before device push succeeds, SarvaSociety still creates in-app notification records for the targeted residents.
          </p>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
              <Label htmlFor="resident-search">Search resident</Label>
              <Input
                id="resident-search"
                value={residentSearch}
                onChange={(e) => setResidentSearch(e.target.value)}
                placeholder={targetMode === 'all-residents' ? 'Broadcast mode selected' : 'Search by resident name, email, or phone'}
                disabled={targetMode === 'all-residents'}
              />
            </div>
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
              <Label htmlFor="notif-title">Title</Label>
              <Input id="notif-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notif-body">Body</Label>
              <Input id="notif-body" value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            {targetMode === 'all-residents'
              ? `Broadcast target: all ${residentTargets.length} active residents`
              : `Targeting: ${targetId ? filteredResidentTargets.find((target) => target.id === targetId)?.label ?? 'selected resident' : 'choose one resident'}`}
          </div>
          <Button
            disabled={sendTest.isPending || !title.trim() || !body.trim() || (targetMode === 'resident' && !targetId.trim())}
            onClick={() => sendTest.mutate()}
          >
            {sendTest.isPending ? 'Sending…' : targetMode === 'all-residents' ? 'Send to all residents' : 'Send to selected resident'}
          </Button>
          {sendTest.isSuccess ? (
            <p className="text-sm text-emerald-600">
              Notifications created for {sendTest.data.createdCount} of {sendTest.data.targetCount} targeted residents.
              {' '}Push attempted: {sendTest.data.pushAttempted ? 'yes' : 'no'}, push sent to {sendTest.data.pushSuccessCount} resident device target(s)
              {sendTest.data.pushPartialFailureCount > 0 ? `, partial failures on ${sendTest.data.pushPartialFailureCount} resident send(s)` : ''}
              {sendTest.data.pushError ? ` (${sendTest.data.pushError})` : ''}
            </p>
          ) : null}
          {sendTest.isError ? <p className="text-sm text-rose-500">{(sendTest.error as Error).message}</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
