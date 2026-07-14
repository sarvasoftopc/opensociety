import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Building2,
  Car,
  Clock,
  HeartHandshake,
  Home,
  LayoutDashboard,
  Megaphone,
  Receipt,
  ShieldCheck,
  SquareParking,
  Ticket,
  TrendingUp,
  Users,
  UserCheck,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { apiClient } from '../lib/api'
import { AUTH_ENABLED, AuthControls } from '@/components/auth-controls'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useAuthSession } from '@/lib/auth-session'

export const Route = createFileRoute('/admin')({ component: AdminLayout })

const NAV: { to: string; tKey: string; icon: LucideIcon }[] = [
  { to: '/admin', tKey: 'nav.overview', icon: LayoutDashboard },
  { to: '/admin/society', tKey: 'nav.society', icon: Home },
  { to: '/admin/apartments', tKey: 'nav.apartments', icon: Building2 },
  { to: '/admin/residents', tKey: 'nav.residents', icon: Users },
  { to: '/admin/guards', tKey: 'nav.guards', icon: ShieldCheck },
  { to: '/admin/duty', tKey: 'nav.duty', icon: Clock },
  { to: '/admin/house-help', tKey: 'nav.houseHelp', icon: HeartHandshake },
  { to: '/admin/vehicles', tKey: 'nav.vehicles', icon: Car },
  { to: '/admin/parking', tKey: 'nav.parking', icon: SquareParking },
  { to: '/admin/visitors', tKey: 'nav.visitors', icon: UserCheck },
  { to: '/admin/pre-approvals', tKey: 'nav.preApprovals', icon: Ticket },
  { to: '/admin/tickets', tKey: 'nav.tickets', icon: Wrench },
  { to: '/admin/billing', tKey: 'nav.billing', icon: Receipt },
  { to: '/admin/reports', tKey: 'nav.reports', icon: BarChart3 },
  { to: '/admin/analytics', tKey: 'nav.analytics', icon: TrendingUp },
  { to: '/admin/notices', tKey: 'nav.notices', icon: Megaphone },
]

function AdminLayout() {
  const { isSignedIn, loading } = useAuthSession()
  const health = useQuery({ queryKey: ['health'], queryFn: apiClient.health, retry: false })
  const me = useQuery({ queryKey: ['auth-me'], queryFn: apiClient.me, retry: false, enabled: isSignedIn })
  const { t } = useT()

  if (loading) {
    return <div className="bg-background text-foreground flex min-h-screen items-center justify-center">Loading admin access…</div>
  }

  if (!isSignedIn) {
    return (
      <div className="bg-background text-foreground flex min-h-screen items-center justify-center px-4">
        <div className="rounded-[28px] border border-border/70 bg-card p-6 text-center shadow-lg">
          <p className="text-lg font-semibold">Sign in required</p>
          <p className="text-muted-foreground mt-2 text-sm">Use the SarvaSociety sign-in page to open the admin console.</p>
          <div className="mt-4">
            <Link className="text-cyan-600 font-medium" to="/sign-in">
              Open sign-in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (me.isLoading) {
    return <div className="bg-background text-foreground flex min-h-screen items-center justify-center">Loading admin profile…</div>
  }

  if (me.isError) {
    return (
      <div className="bg-background text-foreground flex min-h-screen items-center justify-center px-4">
        <div className="rounded-[28px] border border-rose-200 bg-card p-6 text-center shadow-lg">
          <p className="text-lg font-semibold">Admin access unavailable</p>
          <p className="text-muted-foreground mt-2 text-sm">{String((me.error as Error)?.message ?? 'error')}</p>
        </div>
      </div>
    )
  }

  const meData = me.data
  if (!meData) {
    return <div className="bg-background text-foreground flex min-h-screen items-center justify-center">No profile found.</div>
  }

  if (meData.role !== 'ADMIN') {
    return (
      <div className="bg-background text-foreground flex min-h-screen items-center justify-center px-4">
        <div className="rounded-[28px] border border-border/70 bg-card p-6 text-center shadow-lg">
          <p className="text-lg font-semibold">Admin role required</p>
          <p className="text-muted-foreground mt-2 text-sm">This shell is only available to approved admins.</p>
          <div className="mt-4">
            <Link className="text-cyan-600 font-medium" to="/app">
              Go back to app hub
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e9f5ff_0%,#f7fbff_28%,#f7fbff_100%)] text-foreground px-3 py-3 md:px-5 md:py-5">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-7xl gap-4">
        <aside className="hidden w-72 shrink-0 flex-col rounded-[30px] bg-slate-950 p-5 text-white shadow-2xl md:flex">
          <Link to="/" className="mb-6 flex items-center gap-3 px-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400 text-sm font-black text-slate-950">
              SS
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">SarvaSociety</p>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Admin console</p>
            </div>
          </Link>
          <div className="mb-5 rounded-[24px] border border-white/10 bg-white/6 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Workspace</p>
            <p className="mt-2 text-lg font-bold">{meData.tenantSlug}</p>
            <p className="mt-1 text-sm text-slate-300">{meData.name}</p>
          </div>
          <nav className="flex flex-col gap-1.5">
            {NAV.map(({ to, tKey, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === '/admin' }}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white',
                )}
                activeProps={{ className: 'bg-white text-slate-950 shadow-lg' }}
              >
                <Icon className="size-4" />
                {t(tKey)}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col rounded-[30px] border border-slate-200/80 bg-white/88 shadow-xl backdrop-blur">
          <header className="border-b border-slate-200/80 px-4 py-4 md:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-cyan-700 text-xs font-semibold uppercase tracking-[0.24em]">Admin dashboard</p>
                  <h1 className="mt-2 text-2xl font-black text-slate-950 md:text-3xl">Society operations</h1>
                  <p className="mt-1 max-w-2xl text-sm text-slate-500">
                    Manage residents, visitors, guards, billing, and compliance from a structured workspace that stays usable on desktop and tablet widths.
                  </p>
                </div>
                <div className="hidden items-center gap-3 md:flex">
                  <Badge className="rounded-full px-3 py-1.5" variant={health.isSuccess ? 'default' : 'destructive'}>
                    {t('header.api')}{' '}
                    {health.isLoading ? '…' : health.isSuccess ? t('header.apiOnline') : t('header.apiOffline')}
                  </Badge>
                  <LanguageSwitcher />
                  {AUTH_ENABLED ? <AuthControls /> : null}
                  <ThemeToggle />
                </div>
              </div>
              <nav className="flex gap-2 overflow-x-auto md:hidden">
                {NAV.map(({ to, tKey }) => (
                  <Link
                    key={to}
                    to={to}
                    activeOptions={{ exact: to === '/admin' }}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold whitespace-nowrap text-slate-500"
                    activeProps={{ className: 'rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold whitespace-nowrap text-white' }}
                  >
                    {t(tKey)}
                  </Link>
                ))}
              </nav>
              <div className="flex items-center gap-3 md:hidden">
                <Badge className="rounded-full px-3 py-1.5" variant={health.isSuccess ? 'default' : 'destructive'}>
                  {t('header.api')}{' '}
                  {health.isLoading ? '…' : health.isSuccess ? t('header.apiOnline') : t('header.apiOffline')}
                </Badge>
                <LanguageSwitcher />
                {AUTH_ENABLED ? <AuthControls /> : null}
                <ThemeToggle />
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">
            <div className="mx-auto w-full max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
