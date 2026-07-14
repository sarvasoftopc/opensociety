import { useState } from 'react'

import { useAuthSession } from '@/lib/auth-session'
import { SUPABASE_ENABLED } from '@/lib/supabase'


export const AUTH_ENABLED = SUPABASE_ENABLED

export function AuthControls() {
  const { isSignedIn, isUsingDevAuth, signOut } = useAuthSession()
  const [pending, setPending] = useState(false)

  if (!AUTH_ENABLED) return null

  if (!isSignedIn) {
    return (
      <a href="/sign-in" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
        Sign in
      </a>
    )
  }

  if (isUsingDevAuth) {
    return (
      <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
        Local dev auth
      </span>
    )
  }

  return (
    <button
      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
      disabled={pending}
      onClick={async () => {
        setPending(true)
        try {
          await signOut()
        } finally {
          setPending(false)
        }
      }}
      type="button"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
