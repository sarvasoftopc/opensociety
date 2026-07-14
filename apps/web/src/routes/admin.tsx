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

const NAV_GROUPS = [
  { label: 'Overview', items: ['/admin'] },
  { label: 'Properties', items: ['/admin/society', '/admin/apartments'] },
  {
    label: 'People',
    items: ['/admin/residents', '/admin/guards', '/admin/duty', '/admin/house-help', '/admin/vehicles', '/admin/parking'],
  },
  {
    label: 'Operations',
    items: ['/admin/visitors', '/admin/pre-approvals', '/admin/tickets', '/admin/billing'],
  },
  {
    label: 'Insights',
    items: ['/admin/reports', '/admin/analytics', '/admin/notices'],
  },
]

function AdminLayout() {
  const { isSignedIn, loading } = useAuthSession()
  const health = useQuery({ queryKey: ['health'], queryFn: apiClient.health, retry: false })
  const me = useQuery({ queryKey: ['auth-me'], queryFn: apiClient.me, retry: false, enabled: isSignedIn })
  const { t } = useT()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
          <p className="text-sm text-slate-500">Loading admin access…</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm w-full rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-900">Sign in required</p>
          <p className="mt-2 text-sm text-slate-500">Use the SarvaSociety sign-in page to open the admin console.</p>
          <div className="mt-5">
            <Link className="text-sm font-medium text-cyan-600 hover:text-cyan-700" to="/sign-in">
              Open sign-in →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (me.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
          <p className="text-sm text-slate-500">Loading admin profile…</p>
        </div>
      </div>
    )
  }

  if (me.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm w-full rounded-2xl border border-rose-100 bg-white p-8 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-900">Admin access unavailable</p>
          <p className="mt-2 text-sm text-slate-500">{String((me.error as Error)?.message ?? 'error')}</p>
        </div>
      </div>
    )
  }

  const meData = me.data
  if (!meData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">No profile found.</p>
      </div>
    )
  }

  if (meData.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm w-full rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-900">Admin role required</p>
          <p className="mt-2 text-sm text-slate-500">This shell is only available to approved admins.</p>
          <div className="mt-5">
            <Link className="text-sm font-medium text-cyan-600 hover:text-cyan-700" to="/app">
              Go back to app hub →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 bg-[#0f172a] flex-col h-screen sticky top-0 overflow-y-auto">
        {/* Logo */}
        <Link to="/" className="px-5 pt-5 pb-4 flex items-center gap-3 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-[#0f172a] font-black text-sm shrink-0">
            SS
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">SarvaSociety</p>
            <p className="text-slate-400 text-xs leading-none mt-0.5">Admin</p>
          </div>
        </Link>

        {/* Workspace info */}
        <div className="mx-4 mb-4 rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 shrink-0">
          <p className="text-white font-semibold text-sm">{meData.tenantSlug}</p>
          <p className="text-slate-400 text-xs mt-0.5">{meData.name}</p>
        </div>

        {/* Grouped nav */}
        <nav className="flex-1 pb-2">
          {NAV_GROUPS.map((group, groupIdx) => {
            const groupNavItems = group.items
              .map((path) => NAV.find((n) => n.to === path))
              .filter(Boolean) as typeof NAV
            return (
              <div key={group.label}>
                <p
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 px-4 mb-1',
                    groupIdx === 0 ? 'mt-2' : 'mt-5',
                  )}
                >
                  {group.label}
                </p>
                {groupNavItems.map(({ to, tKey, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    activeOptions={{ exact: to === '/admin' }}
                    className="flex items-center gap-2.5 px-4 py-2.5 mx-2 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                    activeProps={{
                      className:
                        'flex items-center gap-2.5 px-4 py-2.5 mx-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500/20 to-teal-500/10 text-cyan-300 border border-cyan-500/20 transition-all cursor-pointer',
                    }}
                  >
                    <Icon className="size-4 shrink-0" />
                    {t(tKey)}
                  </Link>
                ))}
              </div>
            )
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="mt-auto px-4 pb-5 pt-4 border-t border-white/[0.08] shrink-0">
          <p className="text-white text-xs font-semibold truncate">{meData.name}</p>
          {(meData as any).email && (
            <p className="text-slate-500 text-xs truncate mt-0.5">{(meData as any).email}</p>
          )}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {AUTH_ENABLED ? <AuthControls /> : null}
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden">
        {/* Mobile nav */}
        <div className="md:hidden bg-white border-b border-slate-200/60">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-[#0f172a] flex items-center justify-center text-cyan-400 text-xs font-black shrink-0">
              SS
            </div>
            <span className="text-sm font-bold text-slate-900">SarvaSociety</span>
          </div>
          <div className="overflow-x-auto flex gap-2 px-4 pb-3">
            {NAV.map(({ to, tKey }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === '/admin' }}
                className="rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                activeProps={{
                  className: 'rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap bg-[#0f172a] text-white',
                }}
              >
                {t(tKey)}
              </Link>
            ))}
          </div>
        </div>

        {/* Topbar */}
        <header className="bg-white border-b border-slate-200/60 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400 text-xs">Admin</span>
            <span className="text-slate-300 text-xs">/</span>
            <span className="font-semibold text-slate-700">SarvaSociety Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className="rounded-full px-2.5 py-1 text-xs"
              variant={health.isSuccess ? 'default' : 'destructive'}
            >
              {t('header.api')}{' '}
              {health.isLoading ? '…' : health.isSuccess ? t('header.apiOnline') : t('header.apiOffline')}
            </Badge>
            <LanguageSwitcher />
            {AUTH_ENABLED ? <AuthControls /> : null}
            <ThemeToggle />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
