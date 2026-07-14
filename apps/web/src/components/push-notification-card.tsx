import { BellRing } from 'lucide-react'

import { useAuthSession } from '@/lib/auth-session'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function PushNotificationCard() {
  const { isSignedIn, isUsingDevAuth, pushStatus, pushError, enablePushNotifications } = useAuthSession()

  if (!isSignedIn || isUsingDevAuth) return null

  return (
    <Card className="rounded-[24px] border-slate-200/80 bg-white/95 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-black">
          <BellRing className="size-5 text-cyan-700" />
          Push notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-600">
        <p>
          Install this app and enable notifications so visitor approvals, notices, and guard alerts can reach the device even when the app is not actively open.
        </p>
        <p className="font-semibold text-slate-800">
          Status:{' '}
          {pushStatus === 'enabled'
            ? 'enabled'
            : pushStatus === 'permission-required'
              ? 'permission needed'
              : pushStatus}
        </p>
        {pushError ? <p className="text-rose-500">{pushError}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button disabled={pushStatus === 'registering' || pushStatus === 'enabled'} onClick={() => enablePushNotifications()}>
            {pushStatus === 'enabled'
              ? 'Notifications enabled'
              : pushStatus === 'registering'
                ? 'Registering…'
                : 'Enable notifications'}
          </Button>
          <p className="self-center text-xs text-slate-500">
            For phone testing, open the HTTPS URL, install the PWA, then allow notification permission.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
