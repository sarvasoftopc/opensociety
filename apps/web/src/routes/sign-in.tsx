import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { useAuthSession } from '@/lib/auth-session'
import { SUPABASE_ENABLED } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'


export const Route = createFileRoute('/sign-in')({ component: SignInPage })

function SignInPage() {
  const navigate = useNavigate()
  const { signInWithPassword, signUpWithPassword, loading } = useAuthSession()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit() {
    if (loading || pending) return
    setPending(true)
    setError(null)
    setMessage(null)
    try {
      if (mode === 'sign-up') {
        await signUpWithPassword({ email: email.trim(), password, name: name.trim() || undefined })
        setMessage('Account created. If email confirmation is enabled, verify it and then sign in.')
      } else {
        await signInWithPassword(email.trim(), password)
        navigate({ to: '/app' })
      }
    } catch (e) {
      setError((e as { message?: string })?.message ?? 'Authentication failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_28%),linear-gradient(180deg,#0f1b31_0%,#eef4fb_24%,#eef4fb_100%)] px-4 py-10 text-foreground">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_420px]">
        <Card className="rounded-[32px] border-white/10 bg-slate-950 text-white shadow-2xl">
          <CardHeader className="space-y-4 p-8">
            <p className="text-cyan-200 text-sm font-semibold uppercase tracking-[0.24em]">SarvaSociety</p>
            <CardTitle className="text-4xl font-black leading-tight">One sign-in for the whole society</CardTitle>
            <p className="max-w-xl text-sm leading-6 text-slate-300">
              The same sign-in works for resident, guard, and admin accounts. After login, SarvaSociety opens the right role app on this same URL.
            </p>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <p className="text-sm font-semibold text-white">Single URL experience</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Residents and guards use phone-style app surfaces here, while admins land in the operations console. No separate login URLs are required.
              </p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-8 pt-0 sm:grid-cols-3">
            <DemoCard title="Resident" email="resident@demo.local" password="Resident123!" />
            <DemoCard title="Guard" email="guard@demo.local" password="Guard123!" />
            <DemoCard title="Admin" email="admin@demo.local" password="DemoAdmin123!" />
          </CardContent>
        </Card>

        <Card className="w-full rounded-[32px] border-slate-200/80 bg-white/96 shadow-xl">
          <CardHeader className="space-y-3 p-8">
            <p className="text-cyan-700 text-sm font-semibold uppercase tracking-[0.24em]">{mode === 'sign-in' ? 'Secure sign-in' : 'Create account'}</p>
            <CardTitle className="text-3xl font-black text-slate-950">
              {mode === 'sign-in' ? 'Welcome back' : 'Create your society account'}
            </CardTitle>
            <p className="text-sm text-slate-500">
              {SUPABASE_ENABLED
                ? 'Use your Supabase account to access the correct app for your role.'
                : 'Supabase Auth is not configured in this environment yet.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4 px-8 pb-8 pt-0">
            {mode === 'sign-up' ? (
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Full name</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:bg-white"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aman Sharma"
                />
              </label>
            ) : null}
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Email</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:bg-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                type="email"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Password</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:bg-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
              />
            </label>
            <Button
              className="h-12 w-full rounded-2xl bg-slate-950 text-base font-semibold text-white hover:bg-slate-800"
              disabled={!SUPABASE_ENABLED || loading || pending || !email.trim() || !password || (mode === 'sign-up' && !name.trim())}
              onClick={submit}
            >
              {pending ? (mode === 'sign-in' ? 'Signing in…' : 'Creating account…') : mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </Button>
            <Button
              className="h-12 w-full rounded-2xl text-base font-semibold text-slate-950"
              onClick={() => {
                setMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'))
                setError(null)
                setMessage(null)
              }}
              type="button"
              variant="outline"
            >
              {mode === 'sign-in' ? 'New here? Create account' : 'Already have an account? Sign in'}
            </Button>
            {error ? <p className="text-sm font-semibold text-rose-500">{error}</p> : null}
            {message ? <p className="text-sm font-semibold text-emerald-600">{message}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DemoCard({ title, email, password }: { title: string; email: string; password: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-slate-300">{email}</p>
      <p className="text-sm text-slate-300">{password}</p>
    </div>
  )
}
