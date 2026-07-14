import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Camera, Clock3, ShieldCheck, UserRoundCheck, Users, Waypoints } from 'lucide-react'

import { apiClient } from '@/lib/api'
import { useAuthSession } from '@/lib/auth-session'
import { PushPermissionModal } from '@/components/push-permission-modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/guard')({ component: GuardPage })

function GuardPage() {
  const { isSignedIn, loading, signOut } = useAuthSession()
  const me = useQuery({
    queryKey: ['auth-me'],
    queryFn: apiClient.me,
    enabled: isSignedIn,
    retry: false,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
  const visitors = useQuery({ queryKey: ['guard-visitors'], queryFn: () => apiClient.listVisitors(), enabled: isSignedIn, retry: false })
  const activeDuty = useQuery({ queryKey: ['guard-active-duty'], queryFn: () => apiClient.listActiveDuty(), enabled: isSignedIn, retry: false })
  const helpEntries = useQuery({ queryKey: ['guard-house-help'], queryFn: () => apiClient.listHouseHelpEntries(), enabled: isSignedIn, retry: false })
  const guards = useQuery({ queryKey: ['guard-roster'], queryFn: apiClient.listGuards, enabled: isSignedIn, retry: false })

  if (loading) return <GuardLoadingShell title="Opening guard app" body="Restoring your secure session." />
  if (!isSignedIn) return <StateCard title="Sign in required" body="Use the SarvaSociety sign-in to open the guard app." />
  if (me.isLoading) return <GuardLoadingShell title="Opening guard app" body="Restoring your gate dashboard." />
  if (me.isError) return <StateCard title="Profile unavailable" body={String((me.error as Error)?.message ?? 'error')} />
  const meData = me.data
  if (!meData) return <StateCard title="Profile unavailable" body="No guard profile was returned for this session." />
  if (!['ADMIN', 'GUARD'].includes(meData.role)) return <StateCard title="Guard access only" body="This account does not have guard permissions." />
  if (meData.status !== 'APPROVED' && meData.role !== 'ADMIN') {
    return <StateCard title="Approval pending" body="An admin needs to approve this guard account before full access is enabled." />
  }

  const gateQueue = (visitors.data ?? []).filter((v) => v.status === 'PENDING' || v.status === 'APPROVED' || v.status === 'ENTERED')
  const onDuty = activeDuty.data?.length ?? 0
  const insideHelp = helpEntries.data?.filter((item) => !item.checkOutAt).length ?? 0

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.22),_transparent_24%),linear-gradient(180deg,#e9f4ff_0%,#f8fbff_45%,#eef5ff_100%)] px-3 py-5 text-slate-950">
      <PushPermissionModal />

      <div className="mx-auto flex max-w-[430px] flex-col gap-4">
        <div className="rounded-[34px] border border-white/70 bg-white/88 p-4 shadow-[0_22px_80px_rgba(120,148,190,0.18)] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.26em] text-cyan-700">SarvaSociety guard</p>
              <h1 className="mt-2 text-[2rem] leading-9 font-black text-slate-950">{meData.name}</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">{meData.tenantSlug}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-slate-950 text-white">
              <ShieldCheck className="size-6" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <MetricPill icon={UserRoundCheck} label="Gate queue" value={String(gateQueue.length)} />
            <MetricPill icon={Clock3} label="On duty" value={String(onDuty)} />
            <MetricPill icon={Users} label="Help inside" value={String(insideHelp)} />
          </div>
        </div>

        <PhoneCard title="Gate queue" subtitle="Visitors waiting for approval or check-in.">
          <div className="max-h-[24rem] space-y-3 overflow-y-auto pr-1">
            {gateQueue.map((visitor) => (
              <div key={visitor.id} className="rounded-[24px] bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-950">{visitor.visitorName}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {visitor.type} · {visitor.partnerName ?? 'Direct visitor'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{visitor.purpose ?? 'No purpose added yet.'}</p>
                  </div>
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-bold text-cyan-700">{visitor.status}</span>
                </div>
              </div>
            ))}
            {gateQueue.length === 0 ? <EmptyCopy text="No visitor queue right now." /> : null}
          </div>
        </PhoneCard>

        <PhoneCard title="Guard shortcuts" subtitle="The core operating actions for a shift.">
          <div className="grid gap-3">
            <ShortcutRow icon={Waypoints} title="Register walk-in" body="Search apartments, add visitor photo, partner name, and purpose before raising approval." />
            <ShortcutRow icon={Camera} title="Attendance with photo" body="Guard clock-in already supports checkpoint and photo capture in the guard workflow." />
            <ShortcutRow icon={Users} title="House-help movement" body="Track worker entry and exit so residents know who is inside the society." />
          </div>
        </PhoneCard>

        <PhoneCard title="Active guards" subtitle="Residents should be able to see who is currently posted in the society.">
          <div className="space-y-3">
            {(guards.data ?? []).map((guard) => (
              <div key={guard.id} className="flex items-center justify-between gap-3 rounded-[24px] bg-white p-4 shadow-sm">
                <div>
                  <p className="font-bold text-slate-950">{guard.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{guard.employeeCode ?? 'No employee code'} · {guard.phone ?? 'No phone'}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${guard.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {guard.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </PhoneCard>

        <Button className="h-12 rounded-2xl" onClick={() => signOut()} variant="outline">
          Sign out
        </Button>
      </div>
    </div>
  )
}

function PhoneCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <Card className="rounded-[30px] border-white/70 bg-white/88 shadow-[0_18px_50px_rgba(120,148,190,0.14)]">
      <CardHeader className="pb-4">
        <CardTitle className="text-[1.75rem] font-black text-slate-950">{title}</CardTitle>
        <p className="text-sm leading-6 text-slate-500">{subtitle}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function MetricPill({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="rounded-[24px] bg-slate-50 p-4 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[18px] bg-white text-cyan-700 shadow-sm">
        <Icon className="size-5" />
      </div>
      <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
    </div>
  )
}

function ShortcutRow({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Camera
  title: string
  body: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-[24px] bg-white p-4 shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-cyan-50 text-cyan-800">
        <Icon className="size-6" />
      </div>
      <div>
        <p className="font-bold text-slate-950">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{body}</p>
      </div>
    </div>
  )
}

function EmptyCopy({ text }: { text: string }) {
  return <p className="rounded-[22px] bg-slate-50 px-4 py-5 text-sm text-slate-500">{text}</p>
}

function StateCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-xl rounded-[28px] border-slate-200/80 bg-white/95 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-black text-slate-950">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500">{body}</p>
        </CardContent>
      </Card>
    </div>
  )
}

function GuardLoadingShell({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.22),_transparent_24%),linear-gradient(180deg,#e9f4ff_0%,#f8fbff_45%,#eef5ff_100%)] px-3 py-5 text-slate-950">
      <div className="mx-auto flex max-w-[430px] flex-col gap-4">
        <div className="rounded-[34px] border border-white/70 bg-white/88 p-4 shadow-[0_22px_80px_rgba(120,148,190,0.18)] backdrop-blur">
          <div className="rounded-[28px] bg-[#182136] p-5 text-white">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.26em] text-cyan-200">SarvaSociety guard</p>
            <h1 className="mt-3 text-[2rem] leading-9 font-black">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="h-24 rounded-[24px] bg-slate-50" />
            <div className="h-24 rounded-[24px] bg-slate-50" />
            <div className="h-24 rounded-[24px] bg-slate-50" />
          </div>
        </div>
        <PhoneCard title="Loading profile" subtitle="Getting gate operations back in place.">
          <div className="space-y-3">
            <div className="h-24 rounded-[24px] bg-white shadow-sm" />
            <div className="h-24 rounded-[24px] bg-white shadow-sm" />
            <div className="h-24 rounded-[24px] bg-white shadow-sm" />
          </div>
        </PhoneCard>
      </div>
    </div>
  )
}
