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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_24%),linear-gradient(180deg,#08111f_0%,#eef4fb_22%,#eef4fb_100%)] px-4 py-6 text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex items-center justify-between rounded-[28px] border border-white/10 bg-slate-950 px-5 py-4 text-white shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400 text-sm font-black text-slate-950">
              SS
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">SarvaSociety</p>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Choose your app</p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-[32px] border-white/10 bg-slate-950 text-white shadow-2xl">
            <CardHeader className="p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Live local preview</p>
              <CardTitle className="mt-3 text-4xl font-black leading-tight">Open the right surface and start testing the real flows.</CardTitle>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                Sign in with the seeded Supabase users and move directly into resident, guard, or admin operations without a mixed menu.
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 px-8 pb-8 pt-0">
              <Button asChild className="h-12 rounded-2xl bg-cyan-400 px-6 text-slate-950 hover:bg-cyan-300">
                <Link to="/sign-in">Sign in</Link>
              </Button>
              <Button asChild className="h-12 rounded-2xl px-6" variant="outline">
                <Link to="/app">Open mobile hub</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-slate-200/80 bg-white/94 shadow-xl">
            <CardHeader className="p-8 pb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">Demo accounts</p>
            </CardHeader>
            <CardContent className="grid gap-3 px-8 pb-8 pt-0">
              <DemoRow label="Resident" email="resident@demo.local" password="Resident123!" />
              <DemoRow label="Guard" email="guard@demo.local" password="Guard123!" />
              <DemoRow label="Admin" email="admin@demo.local" password="DemoAdmin123!" />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {surfaces.map(({ title, body, to, icon: Icon }) => (
            <Link
              key={title}
              className="group rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-lg transition-transform hover:-translate-y-0.5"
              to={to}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                <Icon className="size-6" />
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-950">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">{body}</p>
              <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-cyan-700">
                Open
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  )
}

function DemoRow({ label, email, password }: { label: string; email: string; password: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-sm font-black text-slate-950">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-600">{email}</p>
      <p className="text-sm font-medium text-slate-600">{password}</p>
    </div>
  )
}
