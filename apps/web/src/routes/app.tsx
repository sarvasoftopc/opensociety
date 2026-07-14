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
    <div className="bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_32%),linear-gradient(180deg,#0d1626_0%,#eef4fb_24%,#eef4fb_100%)] text-foreground min-h-screen px-4 py-8">
      <RoleRedirect destination={destination} />
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Card className="overflow-hidden rounded-[32px] border-white/10 bg-slate-950 text-white shadow-2xl">
          <CardHeader className="gap-4 p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">SarvaSociety</div>
            </div>
            <div className="space-y-3">
              <p className="text-cyan-200 text-sm font-semibold uppercase tracking-[0.24em]">Opening app</p>
              <CardTitle className="text-4xl font-black">Welcome, {user.name}</CardTitle>
              <p className="max-w-2xl text-sm leading-6 text-slate-300">
                You are signed into <span className="font-semibold text-white">{user.tenantSlug}</span> as <span className="font-semibold text-white">{user.role}</span>. SarvaSociety is taking you straight into the correct role app now.
              </p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-8 pt-0 md:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              <Button asChild className="h-14 rounded-2xl bg-cyan-400 px-6 text-slate-950 hover:bg-cyan-300">
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
    <div className="bg-background text-foreground flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-xl rounded-[28px] border-border/70 bg-card/95 shadow-xl">
        <CardHeader>
          <p className="text-cyan-600 text-sm font-semibold uppercase tracking-[0.24em]">Authentication required</p>
          <CardTitle className="text-3xl font-black">Sign in to continue</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild className="h-12 rounded-2xl px-6">
            <Link to="/sign-in">Open sign-in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function CenteredCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-background text-foreground flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-xl rounded-[28px] border-border/70 bg-card/95 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-black">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{body}</p>
        </CardContent>
      </Card>
    </div>
  )
}

function AppOpeningShell({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_32%),linear-gradient(180deg,#0d1626_0%,#eef4fb_24%,#eef4fb_100%)] px-4 py-8">
      <div className="mx-auto flex max-w-[430px] flex-col gap-4">
        <Card className="overflow-hidden rounded-[32px] border-white/10 bg-slate-950 text-white shadow-2xl">
          <CardHeader className="gap-4 p-8">
            <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">SarvaSociety</div>
            <div className="space-y-3">
              <p className="text-cyan-200 text-sm font-semibold uppercase tracking-[0.24em]">Opening app</p>
              <CardTitle className="text-4xl font-black">{title}</CardTitle>
              <p className="max-w-2xl text-sm leading-6 text-slate-300">{body}</p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-8 pt-0 md:grid-cols-3">
            <div className="h-24 rounded-[24px] border border-white/10 bg-white/8" />
            <div className="h-24 rounded-[24px] border border-white/10 bg-white/8" />
            <div className="h-24 rounded-[24px] border border-white/10 bg-white/8" />
          </CardContent>
        </Card>
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
    <Card className="rounded-[28px] border-border/70 bg-white/90 shadow-lg backdrop-blur">
      <CardHeader className="gap-3">
        <div className="bg-cyan-500/10 text-cyan-600 flex h-12 w-12 items-center justify-center rounded-2xl">
          <Icon className="size-6" />
        </div>
        <CardTitle className="text-2xl font-black">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-6">{body}</p>
      </CardContent>
    </Card>
  )
}

function QuickOpen({ to, title, body }: { to: '/resident' | '/guard'; title: string; body: string }) {
  return (
    <Button asChild className="h-auto justify-start rounded-[22px] bg-white/8 px-0 py-0 text-white hover:bg-white/12" variant="ghost">
      <Link className="flex w-full items-center justify-between gap-4 rounded-[22px] border border-white/10 p-4 text-left" to={to}>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm text-slate-300">{body}</p>
        </div>
      </Link>
    </Button>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/8 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">{label}</p>
      <p className="mt-2 text-lg font-bold text-white">{value}</p>
    </div>
  )
}
