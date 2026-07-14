import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Building2, ShieldCheck, Smartphone, Users } from 'lucide-react'

import { apiClient } from '@/lib/api'
import { useAuthSession } from '@/lib/auth-session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'


export const Route = createFileRoute('/app')({ component: AppHome })

function AppHome() {
  const { isSignedIn, loading } = useAuthSession()
  const me = useQuery({
    queryKey: ['auth-me'],
    queryFn: apiClient.me,
    enabled: isSignedIn,
    retry: false,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  if (loading) return <AppOpeningShell title="Opening SarvaSociety" body="Restoring your role access." />
  if (!isSignedIn) return <SignedOutState />
  if (me.isLoading) return <AppOpeningShell title="Opening SarvaSociety" body="Restoring your profile and dashboard." />
  if (me.isError) return <CenteredCard title="Could not load profile" body={String((me.error as Error)?.message ?? 'error')} />

  const user = me.data
  if (!user) return <CenteredCard title="Profile unavailable" body="No user profile was returned for this session." />
  const destination = user.role === 'ADMIN' ? '/admin' : user.role === 'GUARD' ? '/guard' : '/resident'

  return (
    <div className="min-h-screen bg-[#f0f4f8] text-foreground px-4 py-10">
      <RoleRedirect destination={destination} />
      <div className="mx-auto flex max-w-5xl flex-col gap-6">

        <Card className="overflow-hidden rounded-3xl border-white/10 bg-[#0f172a] text-white shadow-2xl">
          <CardHeader className="gap-4 p-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 text-[#0f172a] font-black text-sm">
                SS
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">SarvaSociety</span>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Opening app</p>
              <CardTitle className="text-4xl font-extrabold tracking-tight">Welcome, {user.name}</CardTitle>
              <p className="max-w-2xl text-sm leading-6 text-slate-400">
                You are signed into <span className="font-semibold text-white">{user.tenantSlug}</span> as{' '}
                <span className="font-semibold text-white">{user.role}</span>. SarvaSociety is taking you straight into the correct role app now.
              </p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-8 pt-0 md:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              <Button asChild className="h-12 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-6 text-[#0f172a] font-bold">
                <Link to={destination}>Open now</Link>
              </Button>
              {user.role === 'ADMIN' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <QuickOpen to="/resident" title="Preview resident app" body="Check the resident-facing mobile app." />
                  <QuickOpen to="/guard" title="Preview guard app" body="Check the guard operations flow." />
                </div>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
              <StatPill label="Tenant" value={user.tenantSlug} />
              <StatPill label="Role" value={user.role} />
              <StatPill label="Status" value={user.status} />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <MiniCard icon={Building2} title="Admin" body="Society setup, approvals, billing, notices, parking, and reporting." />
          <MiniCard icon={Users} title="Resident" body="Visitors, notices, maintenance, bills, vehicles, and house-help flows." />
          <MiniCard icon={ShieldCheck} title="Guard" body="Gate operations, duty logs, QR redemption, and worker attendance." />
        </div>

      </div>
    </div>
  )
}

function RoleRedirect({ destination }: { destination: '/admin' | '/guard' | '/resident' }) {
  const navigate = useNavigate()

  useEffect(() => {
    navigate({ to: destination, replace: true }).catch(() => {
      // best effort redirect into the role app
    })
  }, [destination, navigate])

  return null
}

function SignedOutState() {
  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-md p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 text-[#0f172a] font-black text-xl mx-auto mb-5">
          SS
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sign in to continue</h1>
        <p className="text-sm text-slate-500 mt-2 mb-6">Authentication is required to access your dashboard.</p>
        <Button asChild className="h-12 w-full rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-semibold">
          <Link to="/sign-in">Go to sign-in</Link>
        </Button>
      </div>
    </div>
  )
}

function CenteredCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-md p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 text-[#0f172a] font-black text-xl mx-auto mb-5">
          SS
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-sm text-slate-500 mt-2">{body}</p>
      </div>
    </div>
  )
}

function AppOpeningShell({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-sm p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 text-[#0f172a] font-black text-xl mx-auto mb-5">
          SS
        </div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
        <p className="text-sm text-slate-500 mt-1">{body}</p>
        <div className="flex items-center justify-center mt-5">
          <div className="animate-spin border-2 border-slate-200 border-t-cyan-500 rounded-full h-6 w-6" />
        </div>
      </div>
    </div>
  )
}

function MiniCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Smartphone
  title: string
  body: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 mb-4">
        <Icon className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 mt-1 leading-6">{body}</p>
    </div>
  )
}

function QuickOpen({ to, title, body }: { to: '/resident' | '/guard'; title: string; body: string }) {
  return (
    <Button asChild className="h-auto justify-start rounded-xl bg-white/8 px-0 py-0 text-white hover:bg-white/12" variant="ghost">
      <Link className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 p-4 text-left" to={to}>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-slate-400">{body}</p>
        </div>
      </Link>
    </Button>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/8 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1.5 text-base font-bold text-white">{value}</p>
    </div>
  )
}
