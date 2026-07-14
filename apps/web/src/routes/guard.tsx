import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Camera, ChevronRight, Clock3, LogOut, ShieldCheck, UserRoundCheck, Users, Waypoints } from 'lucide-react'

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
    <div className="min-h-screen bg-[#f0f4f8]">
      <PushPermissionModal />

      <div className="mx-auto max-w-[430px] px-4 py-5 flex flex-col gap-4">

        {/* ── HERO HEADER ── */}
        <div className="bg-[#0f172a] rounded-3xl p-5 text-white">
          {/* Top row */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-semibold">
              Sarvasociety Guard
            </span>
            <div className="bg-cyan-500/20 text-cyan-400 rounded-xl p-2">
              <ShieldCheck className="size-4" />
            </div>
          </div>

          {/* Guard info */}
          <h1 className="text-2xl font-bold text-white mt-3">{meData.name}</h1>
          <p className="text-sm text-slate-400 mt-0.5">{meData.tenantSlug}</p>

          {/* Metric chips */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            <MetricChip icon={UserRoundCheck} label="Gate Queue" value={String(gateQueue.length)} />
            <MetricChip icon={Clock3} label="On Duty" value={String(onDuty)} />
            <MetricChip icon={Users} label="Help Inside" value={String(insideHelp)} />
          </div>

          {/* Sign out */}
          <button
            onClick={() => signOut()}
            className="mt-4 text-slate-400 text-xs flex items-center gap-1 hover:text-white transition-colors"
          >
            <LogOut className="size-3" />
            Sign out
          </button>
        </div>

        {/* ── GATE QUEUE ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-bold text-slate-900">Gate Queue</span>
            <span className="bg-amber-50 text-amber-700 text-xs font-bold rounded-full px-2.5 py-0.5">
              {gateQueue.length}
            </span>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {gateQueue.length === 0 ? (
              <EmptyState icon={UserRoundCheck} text="No visitor queue right now." />
            ) : (
              gateQueue.map((visitor) => {
                const statusClass =
                  visitor.status === 'PENDING'
                    ? 'bg-amber-50 text-amber-700'
                    : visitor.status === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-blue-50 text-blue-700'
                return (
                  <div key={visitor.id} className="px-4 py-4 border-b border-slate-50 last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-semibold text-slate-900 text-sm">{visitor.visitorName}</span>
                      <span className={`${statusClass} rounded-full px-2.5 py-0.5 text-[11px] font-bold shrink-0`}>
                        {visitor.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
                        {visitor.type}
                      </span>
                      {visitor.purpose ? (
                        <span className="text-xs text-slate-400 truncate">{visitor.purpose}</span>
                      ) : null}
                    </div>
                    {visitor.partnerName ? (
                      <p className="text-xs text-slate-400 mt-1">{visitor.partnerName}</p>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div>
          <p className="text-base font-bold text-slate-900 mb-3">Quick Actions</p>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <ShortcutRow
              icon={Waypoints}
              iconClass="bg-cyan-50 text-cyan-700"
              title="Register walk-in"
              body="Search apartments, add visitor photo, partner name, and purpose before raising approval."
            />
            <ShortcutRow
              icon={Camera}
              iconClass="bg-violet-50 text-violet-700"
              title="Attendance with photo"
              body="Guard clock-in already supports checkpoint and photo capture in the guard workflow."
            />
            <ShortcutRow
              icon={Users}
              iconClass="bg-emerald-50 text-emerald-700"
              title="House-help movement"
              body="Track worker entry and exit so residents know who is inside the society."
            />
          </div>
        </div>

        {/* ── GUARD ROSTER ── */}
        <div>
          <p className="text-base font-bold text-slate-900 mb-3">Guard Roster</p>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {(guards.data ?? []).length === 0 ? (
              <EmptyState icon={ShieldCheck} text="No guards in the roster." />
            ) : (
              (guards.data ?? []).map((guard) => (
                <div key={guard.id} className="px-4 py-3.5 border-b border-slate-50 last:border-0 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center shrink-0">
                    {(guard.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">{guard.name}</p>
                    <p className="text-xs text-slate-400">{guard.employeeCode ?? 'No employee code'}</p>
                  </div>
                  {guard.isActive ? (
                    <span className="bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold px-2.5 py-0.5 flex items-center gap-1 shrink-0">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  ) : (
                    <span className="bg-slate-50 text-slate-400 rounded-full text-[10px] font-bold px-2.5 py-0.5 shrink-0">
                      Inactive
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

/* ── METRIC CHIP ── */
function MetricChip({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="bg-white/8 border border-white/10 rounded-2xl p-3 text-center">
      <Icon className="size-4 text-cyan-400 mx-auto" />
      <p className="text-xl font-bold text-white mt-1.5">{value}</p>
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  )
}

/* ── SHORTCUT ROW ── */
function ShortcutRow({
  icon: Icon,
  iconClass,
  title,
  body,
}: {
  icon: typeof Camera
  iconClass: string
  title: string
  body: string
}) {
  return (
    <div className="px-4 py-4 border-b border-slate-50 last:border-0 flex items-center gap-4">
      <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{body}</p>
      </div>
      <ChevronRight className="ml-auto text-slate-300 size-4 shrink-0" />
    </div>
  )
}

/* ── EMPTY STATE ── */
function EmptyState({ icon: Icon, text }: { icon: typeof ShieldCheck; text: string }) {
  return (
    <div className="py-8 text-center">
      <Icon className="text-slate-200 size-10 mx-auto" />
      <p className="text-sm text-slate-400 mt-2">{text}</p>
    </div>
  )
}

/* ── STATE CARD ── */
function StateCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-start justify-center px-4">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 max-w-sm mx-auto mt-16 w-full">
        <p className="font-bold text-slate-900 text-base">{title}</p>
        <p className="text-sm text-slate-500 mt-2">{body}</p>
      </div>
    </div>
  )
}

/* ── LOADING SHELL ── */
function GuardLoadingShell({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <div className="mx-auto max-w-[430px] px-4 py-5 flex flex-col gap-4">
        {/* Dark hero skeleton */}
        <div className="bg-[#0f172a] rounded-3xl p-5 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-2.5 w-28 bg-white/10 rounded-full" />
            <div className="bg-cyan-500/20 rounded-xl p-2">
              <ShieldCheck className="size-4 text-cyan-400/40" />
            </div>
          </div>
          <div className="mt-4 h-6 w-40 bg-white/10 rounded-full" />
          <div className="mt-2 h-3 w-24 bg-white/10 rounded-full" />
          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className="bg-white/8 border border-white/10 rounded-2xl p-3 h-20" />
            <div className="bg-white/8 border border-white/10 rounded-2xl p-3 h-20" />
            <div className="bg-white/8 border border-white/10 rounded-2xl p-3 h-20" />
          </div>
          <div className="mt-4 h-3 w-20 bg-white/10 rounded-full" />
        </div>
        {/* White card skeletons */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 animate-pulse space-y-3">
          <div className="h-4 w-24 bg-slate-100 rounded-full" />
          <div className="h-14 bg-slate-100 rounded-xl" />
          <div className="h-14 bg-slate-100 rounded-xl" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 animate-pulse space-y-3">
          <div className="h-4 w-28 bg-slate-100 rounded-full" />
          <div className="h-14 bg-slate-100 rounded-xl" />
          <div className="h-14 bg-slate-100 rounded-xl" />
          <div className="h-14 bg-slate-100 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
