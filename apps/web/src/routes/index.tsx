import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, ShieldCheck, UserRound, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'

export const Route = createFileRoute('/')({ component: HomeRoute })

const surfaces = [
  {
    title: 'Resident app',
    body: 'Visitors, notices, maintenance, payments, vehicles, and staff approvals in one mobile-style flow.',
    to: '/app',
    icon: UserRound,
  },
  {
    title: 'Guard app',
    body: 'Gate queue, walk-in registration, approvals, and duty workflows for security staff.',
    to: '/guard',
    icon: ShieldCheck,
  },
  {
    title: 'Admin console',
    body: 'Society setup, residents, guards, notices, billing, and operational reporting.',
    to: '/admin',
    icon: Users,
  },
] as const

function HomeRoute() {
  return (
    <div className="min-h-screen bg-white text-foreground">
      {/* Hero */}
      <div className="bg-[#0f172a]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 text-[#0f172a] font-black text-sm">
                SS
              </div>
              <span className="text-white font-bold text-lg tracking-tight">SarvaSociety</span>
            </div>
            <ThemeToggle />
          </div>

          <div className="text-center max-w-3xl mx-auto">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 text-[#0f172a] font-black text-xl mx-auto mb-6">
              SS
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
              SarvaSociety
            </h1>
            <p className="text-lg text-slate-400 mt-4 max-w-lg mx-auto leading-relaxed">
              One platform for residents, guards, and admins. Sign in and land exactly where you belong.
            </p>
            <div className="flex flex-wrap gap-3 mt-8 justify-center">
              <Button asChild className="bg-cyan-500 hover:bg-cyan-400 text-[#0f172a] font-bold rounded-xl px-6 py-3 h-auto">
                <Link to="/sign-in">Sign in</Link>
              </Button>
              <Button asChild className="border border-white/20 text-white rounded-xl px-6 py-3 h-auto hover:bg-white/10 bg-transparent" variant="ghost">
                <Link to="/app">Open mobile hub</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* App Surfaces */}
      <div className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Role-based apps</p>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Three purpose-built surfaces</h2>
            <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto">
              Each role gets its own optimised interface. No clutter, no confusion.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {surfaces.map(({ title, body, to, icon: Icon }) => (
              <Link
                key={title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                to={to}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                  <Icon className="size-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
                <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-cyan-600">
                  Open
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Demo Credentials */}
      <div className="bg-slate-50 py-16 border-t border-slate-100">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Try it now</p>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Demo credentials</h2>
            <p className="text-sm text-slate-500 mt-2">Use these seeded accounts to explore each role.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 max-w-2xl mx-auto">
            <DemoRow label="Resident" email="resident@demo.local" password="Resident123!" />
            <DemoRow label="Guard" email="guard@demo.local" password="Guard123!" />
            <DemoRow label="Admin" email="admin@demo.local" password="DemoAdmin123!" />
          </div>
        </div>
      </div>
    </div>
  )
}

function DemoRow({ label, email, password }: { label: string; email: string; password: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400 mb-3">{label}</p>
      <p className="text-sm font-mono bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 text-slate-700 mb-2 truncate">{email}</p>
      <p className="text-sm font-mono bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 text-slate-700 truncate">{password}</p>
    </div>
  )
}
