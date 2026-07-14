import { useEffect, useState } from 'react'
import { BellRing } from 'lucide-react'

import { useAuthSession } from '@/lib/auth-session'
import { Button } from '@/components/ui/button'

export function PushPermissionModal() {
  const { isSignedIn, isUsingDevAuth, pushStatus, pushError, enablePushNotifications } = useAuthSession()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!isSignedIn || isUsingDevAuth) return
    if (pushStatus === 'enabled' || pushStatus === 'unsupported') {
      setOpen(false)
      return
    }
    if (pushStatus === 'idle' || pushStatus === 'permission-required' || pushStatus === 'error' || pushStatus === 'denied') {
      setOpen(true)
    }
  }, [isSignedIn, isUsingDevAuth, pushStatus])

  if (!open || !isSignedIn || isUsingDevAuth || pushStatus === 'enabled' || pushStatus === 'unsupported') return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-[30px] bg-white p-6 shadow-2xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-amber-100 text-amber-700">
          <BellRing className="size-7" />
        </div>
        <p className="mt-5 text-2xl font-black text-slate-950">Enable alerts</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Visitor approvals, gate alerts, notices, and payment reminders should come to this device even when the app is in the background.
        </p>
        <div className="mt-4 rounded-[22px] bg-slate-50 p-4 text-sm text-slate-600">
          {pushStatus === 'denied'
            ? 'Browser permission is currently denied. Enable notifications for this site from browser settings, then reopen the app.'
            : 'Tap allow and accept the browser prompt. On Android, install the PWA first for the best notification behavior.'}
        </div>
        {pushError ? <p className="mt-3 text-sm font-semibold text-rose-500">{pushError}</p> : null}
        <div className="mt-5 flex gap-3">
          <Button className="h-12 flex-1 rounded-2xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => setOpen(false)} variant="outline">
            Later
          </Button>
          <Button
            className="h-12 flex-1 rounded-2xl bg-amber-300 text-slate-950 hover:bg-amber-200"
            disabled={pushStatus === 'registering' || pushStatus === 'denied'}
            onClick={() => enablePushNotifications()}
          >
            {pushStatus === 'registering' ? 'Enabling…' : 'Allow'}
          </Button>
        </div>
      </div>
    </div>
  )
}
