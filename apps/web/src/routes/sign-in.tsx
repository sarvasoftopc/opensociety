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
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-4">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_420px]">

        {/* Left panel */}
        <Card className="rounded-3xl border-white/10 bg-[#0f172a] text-white shadow-2xl">
          <CardHeader className="space-y-4 p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 text-[#0f172a] font-black text-sm">
                SS
              </div>
              <span className="font-bold text-white tracking-tight">SarvaSociety</span>
            </div>
            <CardTitle className="text-4xl font-extrabold leading-tight tracking-tight">
              One sign-in for the whole society
            </CardTitle>
            <p className="max-w-xl text-sm leading-6 text-slate-400">
              The same sign-in works for resident, guard, and admin accounts. After login, SarvaSociety opens the right role app on this same URL.
            </p>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-semibold text-white">Single URL experience</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Residents and guards use phone-style app surfaces here, while admins land in the operations console. No separate login URLs are required.
              </p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 p-8 pt-0 sm:grid-cols-3">
            <DemoCard title="Resident" email="resident@demo.local" password="Resident123!" />
            <DemoCard title="Guard" email="guard@demo.local" password="Guard123!" />
            <DemoCard title="Admin" email="admin@demo.local" password="DemoAdmin123!" />
          </CardContent>
        </Card>

        {/* Right panel — form */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full p-8 flex flex-col">
          <div className="flex flex-col items-start mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f172a] text-cyan-400 font-black text-sm mb-4">
              SS
            </div>
            <p className="font-bold text-slate-900 text-base">SarvaSociety</p>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {mode === 'sign-in' ? 'Sign in to continue' : 'Create your account'}
          </h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            {SUPABASE_ENABLED
              ? 'Use your account to access the correct app for your role.'
              : 'Supabase Auth is not configured in this environment yet.'}
          </p>

          <div className="flex flex-col gap-4 flex-1">
            {mode === 'sign-up' ? (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Full name</span>
                <input
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-cyan-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aman Sharma"
                />
              </label>
            ) : null}

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-cyan-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                type="email"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <input
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-cyan-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
              />
            </label>

            <Button
              className="h-12 w-full rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-semibold mt-2"
              disabled={!SUPABASE_ENABLED || loading || pending || !email.trim() || !password || (mode === 'sign-up' && !name.trim())}
              onClick={submit}
            >
              {pending ? (mode === 'sign-in' ? 'Signing in…' : 'Creating account…') : mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </Button>

            <Button
              className="h-11 w-full rounded-xl text-sm font-medium text-slate-700 border border-slate-200 bg-white hover:bg-slate-50"
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

            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
          </div>
        </div>

      </div>
    </div>
  )
}

function DemoCard({ title, email, password }: { title: string; email: string; password: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">{title}</p>
      <p className="text-sm font-mono text-slate-300 truncate">{email}</p>
      <p className="text-sm font-mono text-slate-300 truncate">{password}</p>
    </div>
  )
}
