import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  Bell,
  Building2,
  CarFront,
  CreditCard,
  FileText,
  Home,
  MessageSquareText,
  UserRound,
  Wrench,
} from 'lucide-react'
import type { Notice, PaymentMethod } from '@opensociety/shared'
import { formatPaise, paymentMethodSchema } from '@opensociety/shared'

import { apiClient } from '@/lib/api'
import { useAuthSession } from '@/lib/auth-session'
import { PushPermissionModal } from '@/components/push-permission-modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const Route = createFileRoute('/resident')({ component: ResidentPage })

type ResidentTab = 'home' | 'community' | 'homes' | 'services'

function ResidentPage() {
  const { isSignedIn, loading, signOut } = useAuthSession()
  const me = useQuery({
    queryKey: ['auth-me'],
    queryFn: apiClient.me,
    enabled: isSignedIn,
    retry: false,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
  const notices = useQuery({
    queryKey: ['resident-notices'],
    queryFn: () => apiClient.listNotices(),
    enabled: isSignedIn,
    retry: false,
  })
  const notifications = useQuery({
    queryKey: ['resident-notifications'],
    queryFn: apiClient.listNotifications,
    enabled: isSignedIn,
    retry: false,
  })
  const tickets = useQuery({
    queryKey: ['resident-tickets'],
    queryFn: () => apiClient.listTickets(),
    enabled: isSignedIn,
    retry: false,
  })
  const vehicles = useQuery({
    queryKey: ['resident-vehicles'],
    queryFn: () => apiClient.listVehicles(),
    enabled: isSignedIn,
    retry: false,
  })
  const bills = useQuery({
    queryKey: ['resident-bills'],
    queryFn: () => apiClient.listBills(),
    enabled: isSignedIn,
    retry: false,
  })
  const myApartments = useQuery({
    queryKey: ['resident-apartments'],
    queryFn: () => apiClient.listMyApartments(),
    enabled: isSignedIn,
    retry: false,
  })
  const myHouseHelp = useQuery({
    queryKey: ['resident-house-help', myApartments.data?.map((item) => item.id).join(',') ?? 'none'],
    queryFn: async () => {
      const apartments = await apiClient.listMyApartments()
      const groups = await Promise.all(
        apartments.map(async (apartment) => ({
          apartment,
          helpers: await apiClient.listHouseHelpForApartment(apartment.id),
        })),
      )
      return groups
    },
    enabled: isSignedIn,
    retry: false,
  })

  const qc = useQueryClient()
  const markNoticeRead = useMutation({
    mutationFn: (id: string) => apiClient.markNoticeRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resident-notices'] }),
  })
  const markNotificationRead = useMutation({
    mutationFn: (id: string) => apiClient.markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resident-notifications'] }),
  })
  const updateProfile = useMutation({
    mutationFn: (body: { name?: string; phone?: string }) => apiClient.updateMe(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth-me'] }),
  })

  const [activeTab, setActiveTab] = useState<ResidentTab>('home')
  const [activeNotice, setActiveNotice] = useState<Notice | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profilePhone, setProfilePhone] = useState('')

  useEffect(() => {
    if (!me.data) return
    setProfileName(me.data.name ?? '')
    setProfilePhone(me.data.phone ?? '')
  }, [me.data])

  if (loading) return <ResidentLoadingShell title="Opening SarvaSociety" body="Restoring your secure session." />
  if (!isSignedIn) return <StateCard title="Sign in required" body="Use the SarvaSociety sign-in to open the resident app." />
  if (me.isLoading) return <ResidentLoadingShell title="Opening SarvaSociety" body="Restoring your dashboard and profile." />
  if (me.isError) return <StateCard title="Profile unavailable" body={String((me.error as Error)?.message ?? 'error')} />

  const meData = me.data
  if (!meData) return <StateCard title="Profile unavailable" body="No resident profile was returned for this session." />
  if (!['ADMIN', 'RESIDENT'].includes(meData.role)) return <StateCard title="Resident access only" body="This account does not have resident permissions." />
  if (meData.status !== 'APPROVED' && meData.role !== 'ADMIN') {
    return <StateCard title="Approval pending" body="An admin needs to approve this resident account before full access is enabled." />
  }

  const unreadAlerts = (notifications.data ?? []).filter((item) => !item.readAt)
  const outstandingBills = (bills.data ?? []).filter((bill) => bill.status !== 'PAID' && bill.status !== 'CANCELLED')
  const homeApartment = myApartments.data?.[0]
  const homeLabel = homeApartment ? `${homeApartment.tower} ${homeApartment.apartmentNo}` : meData.tenantSlug
  const highlightedHouseHelp = (myHouseHelp.data ?? [])
    .flatMap(({ apartment, helpers }) =>
      helpers.map((helper) => ({
        helper,
        apartmentLabel: `${apartment.tower}-${apartment.apartmentNo}`,
      })),
    )
    .slice(0, 4)

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#eef5ff_100%)] px-3 py-4 text-slate-950">
      <PushPermissionModal />

      <div className="mx-auto flex max-w-[420px] flex-col gap-3 pb-28">
        <div className="rounded-[28px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_12px_32px_rgba(148,163,184,0.14)] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-cyan-700">SarvaSociety</p>
              <h1 className="mt-1 truncate text-[1.15rem] font-black text-slate-950">{homeLabel}</h1>
              <p className="mt-0.5 truncate text-sm text-slate-500">Hi, {meData.name}</p>
            </div>
            <button
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700"
              onClick={() => setProfileOpen(true)}
              type="button"
            >
              <span className="text-sm font-black">{meData.name.slice(0, 1).toUpperCase()}</span>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <QuickAction icon={Bell} label="Pre-Approve" />
            <QuickAction icon={UserRound} label="Daily Help" />
            <QuickAction icon={CreditCard} label="Payments" />
            <QuickAction icon={Wrench} label="Services" />
          </div>
        </div>

        {activeTab === 'home' ? (
          <>
            <CompactCard title="Daily help" subtitle="Assigned staff for your flat.">
              <div className="space-y-2">
                {highlightedHouseHelp.map(({ helper, apartmentLabel }) => (
                  <div key={`${apartmentLabel}-${helper.id}`} className="flex items-center gap-3 rounded-[18px] bg-slate-50 px-3 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-sky-50 text-sky-700">
                      <UserRound className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-950">{helper.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {helper.type} · {apartmentLabel} · Trust {helper.trustScore}/100
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                      {helper.verificationLevel}
                    </span>
                  </div>
                ))}
                {highlightedHouseHelp.length === 0 ? <EmptyCopy text="No assigned house help yet." /> : null}
              </div>
            </CompactCard>

            <CompactCard title="Notice board" subtitle="Important updates from your society.">
              <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
                {(notices.data ?? []).map((notice) => (
                  <button
                    key={notice.id}
                    className="w-full rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-left shadow-sm"
                    onClick={() => {
                      setActiveNotice(notice)
                      if (!notice.read) markNoticeRead.mutate(notice.id)
                    }}
                    type="button"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-amber-50 text-amber-700">
                        <FileText className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold text-slate-950">{notice.title}</p>
                          <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-700">
                            {notice.priority}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{notice.category}</p>
                        <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{notice.body}</p>
                      </div>
                    </div>
                  </button>
                ))}
                {(notices.data ?? []).length === 0 ? <EmptyCopy text="No notices yet." /> : null}
              </div>
            </CompactCard>

            <CompactCard title="Home snapshot" subtitle="Quick counts that matter right now.">
              <div className="grid grid-cols-3 gap-2">
                <SummaryPill label="Alerts" value={String(unreadAlerts.length)} />
                <SummaryPill label="Notices" value={String(notices.data?.length ?? 0)} />
                <SummaryPill label="Flats" value={String(myApartments.data?.length ?? 0)} />
              </div>
            </CompactCard>
          </>
        ) : null}

        {activeTab === 'community' ? (
          <CompactCard title="Community" subtitle="Notices and unread alerts together.">
            <div className="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
              {unreadAlerts.map((alert) => (
                <button
                  key={alert.id}
                  className="w-full rounded-[18px] border border-amber-200 bg-amber-50 px-3 py-3 text-left"
                  onClick={() => markNotificationRead.mutate(alert.id)}
                  type="button"
                >
                  <p className="text-sm font-bold text-slate-950">{alert.title}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-600">{alert.body}</p>
                </button>
              ))}
              {(notices.data ?? []).map((notice) => (
                <button
                  key={`community-${notice.id}`}
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-left shadow-sm"
                  onClick={() => {
                    setActiveNotice(notice)
                    if (!notice.read) markNoticeRead.mutate(notice.id)
                  }}
                  type="button"
                >
                  <p className="text-sm font-bold text-slate-950">{notice.title}</p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{notice.category}</p>
                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{notice.body}</p>
                </button>
              ))}
              {unreadAlerts.length === 0 && (notices.data ?? []).length === 0 ? <EmptyCopy text="No community items yet." /> : null}
            </div>
          </CompactCard>
        ) : null}

        {activeTab === 'homes' ? (
          <>
            <CompactCard title="My homes" subtitle="Flat information for this account.">
              <div className="space-y-2">
                {(myApartments.data ?? []).map((apartment) => (
                  <div key={apartment.id} className="rounded-[18px] bg-slate-50 px-3 py-3">
                    <p className="text-sm font-bold text-slate-950">
                      {apartment.tower}-{apartment.apartmentNo}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Floor {apartment.floor ?? '—'} · {apartment.bhkType ?? 'Home'}
                    </p>
                  </div>
                ))}
                {(myApartments.data ?? []).length === 0 ? <EmptyCopy text="No apartments linked to this resident yet." /> : null}
              </div>
            </CompactCard>

            <CompactCard title="Vehicles" subtitle="Registered vehicles for your homes.">
              <div className="space-y-2">
                {(vehicles.data ?? []).map((vehicle) => (
                  <div key={vehicle.id} className="flex items-center gap-3 rounded-[18px] bg-slate-50 px-3 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white text-slate-700">
                      <CarFront className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-950">{vehicle.registrationNumber}</p>
                      <p className="truncate text-sm text-slate-500">
                        {vehicle.type} · {vehicle.make ?? 'Unknown make'}
                      </p>
                    </div>
                  </div>
                ))}
                {(vehicles.data ?? []).length === 0 ? <EmptyCopy text="No vehicles registered yet." /> : null}
              </div>
            </CompactCard>
          </>
        ) : null}

        {activeTab === 'services' ? (
          <>
            <CompactCard title="Payments" subtitle="Bills and payment records belong here, not on the home screen.">
              <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                {outstandingBills.map((bill) => (
                  <BillPayCard key={bill.id} bill={bill} />
                ))}
                {outstandingBills.length === 0 ? <EmptyCopy text="No outstanding bills." /> : null}
              </div>
            </CompactCard>

            <CompactCard title="Maintenance services" subtitle="Track the tickets raised for your society account.">
              <div className="space-y-2">
                {(tickets.data ?? []).map((ticket) => (
                  <div key={ticket.id} className="rounded-[18px] bg-slate-50 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-950">{ticket.title}</p>
                        <p className="mt-0.5 text-sm text-slate-500">{ticket.category} · {ticket.priority}</p>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                        {ticket.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-5 text-slate-600">{ticket.description}</p>
                  </div>
                ))}
                {(tickets.data ?? []).length === 0 ? <EmptyCopy text="No maintenance tickets yet." /> : null}
              </div>
            </CompactCard>
          </>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-4 z-40 px-3">
        <div className="mx-auto flex max-w-[420px] items-center justify-between rounded-[22px] border border-slate-200/80 bg-white/95 p-2 shadow-[0_16px_40px_rgba(148,163,184,0.2)] backdrop-blur">
          <BottomTab active={activeTab === 'home'} icon={Home} label="Home" onClick={() => setActiveTab('home')} />
          <BottomTab active={activeTab === 'community'} icon={MessageSquareText} label="Community" onClick={() => setActiveTab('community')} />
          <BottomTab active={activeTab === 'homes'} icon={Building2} label="Homes" onClick={() => setActiveTab('homes')} />
          <BottomTab active={activeTab === 'services'} icon={Wrench} label="Services" onClick={() => setActiveTab('services')} />
        </div>
      </div>

      {activeNotice ? (
        <OverlayCard onClose={() => setActiveNotice(null)}>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-cyan-700">{activeNotice.category}</p>
          <h2 className="mt-3 text-xl font-black text-slate-950">{activeNotice.title}</h2>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{activeNotice.priority}</p>
          <div className="mt-5 max-h-[55vh] overflow-y-auto pr-1">
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{activeNotice.body}</p>
          </div>
        </OverlayCard>
      ) : null}

      {profileOpen ? (
        <OverlayCard onClose={() => setProfileOpen(false)}>
          <h2 className="text-xl font-black text-slate-950">Resident profile</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Update the name and phone number used in SarvaSociety.</p>
          <div className="mt-5 space-y-3">
            <Input className="h-11 rounded-2xl" onChange={(e) => setProfileName(e.target.value)} placeholder="Full name" value={profileName} />
            <Input className="h-11 rounded-2xl" onChange={(e) => setProfilePhone(e.target.value)} placeholder="Phone number" value={profilePhone} />
          </div>
          <div className="mt-5 flex gap-3">
            <Button className="h-11 flex-1 rounded-2xl" onClick={() => setProfileOpen(false)} variant="outline">
              Close
            </Button>
            <Button
              className="h-11 flex-1 rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
              disabled={updateProfile.isPending || !profileName.trim()}
              onClick={() =>
                updateProfile.mutate(
                  { name: profileName.trim(), phone: profilePhone.trim() || undefined },
                  { onSuccess: () => setProfileOpen(false) },
                )
              }
            >
              {updateProfile.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
          <Button className="mt-3 h-11 w-full rounded-2xl" onClick={() => signOut()} variant="ghost">
            Sign out
          </Button>
        </OverlayCard>
      ) : null}
    </div>
  )
}

function CompactCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <Card className="rounded-[24px] border-slate-200/80 bg-white/92 shadow-[0_12px_28px_rgba(148,163,184,0.12)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-black text-slate-950">{title}</CardTitle>
        <p className="text-sm leading-5 text-slate-500">{subtitle}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function QuickAction({
  icon: Icon,
  label,
}: {
  icon: typeof Bell
  label: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] bg-slate-50 px-3 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-slate-900 shadow-sm">
        <Icon className="size-5" />
      </div>
      <p className="text-sm font-bold text-slate-900">{label}</p>
    </div>
  )
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-slate-50 px-3 py-3 text-center">
      <p className="text-lg font-black text-slate-950">{value}</p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
    </div>
  )
}

function BottomTab({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  icon: typeof Home
  label: string
  onClick: () => void
}) {
  return (
    <button
      className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[18px] px-2 py-2 text-center transition ${active ? 'bg-slate-950 text-white' : 'text-slate-400'}`}
      onClick={onClick}
      type="button"
    >
      <Icon className="size-4" />
      <span className={`truncate text-[10px] font-bold uppercase tracking-[0.12em] ${active ? 'text-white' : 'text-slate-400'}`}>{label}</span>
    </button>
  )
}

function BillPayCard({ bill }: { bill: Awaited<ReturnType<typeof apiClient.listBills>>[number] }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState(String(((bill.totalAmount - (bill.paidAmount ?? 0)) / 100).toFixed(2)))
  const [method, setMethod] = useState<PaymentMethod>('UPI')
  const [reference, setReference] = useState('')
  const pay = useMutation({
    mutationFn: () =>
      apiClient.recordPayment({
        billId: bill.id,
        amount: Math.round((parseFloat(amount) || 0) * 100),
        method,
        reference: reference || undefined,
        notes: 'Resident self-service payment',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resident-bills'] })
    },
  })

  const outstanding = bill.totalAmount - (bill.paidAmount ?? 0)

  return (
    <div className="rounded-[18px] bg-slate-50 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950">{bill.title}</p>
          <p className="mt-0.5 text-sm text-slate-500">{bill.periodMonth ?? 'One-time bill'}</p>
        </div>
        <p className="shrink-0 text-sm font-black text-slate-950">{formatPaise(outstanding)}</p>
      </div>
      <div className="mt-3 space-y-2">
        <Input className="h-10 rounded-2xl bg-white" onChange={(e) => setAmount(e.target.value)} placeholder="Amount in INR" value={amount} />
        <Select onValueChange={(value) => setMethod(value as PaymentMethod)} value={method}>
          <SelectTrigger className="h-10 rounded-2xl bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {paymentMethodSchema.options.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input className="h-10 rounded-2xl bg-white" onChange={(e) => setReference(e.target.value)} placeholder="Reference / UTR" value={reference} />
        <Button className="h-10 w-full rounded-2xl bg-amber-300 text-slate-950 hover:bg-amber-200" disabled={pay.isPending || !amount} onClick={() => pay.mutate()}>
          {pay.isPending ? 'Processing…' : 'Make payment'}
        </Button>
      </div>
      {pay.isSuccess ? <p className="mt-2 text-sm font-semibold text-emerald-600">Payment recorded successfully.</p> : null}
      {pay.isError ? <p className="mt-2 text-sm font-semibold text-rose-500">{(pay.error as Error).message}</p> : null}
    </div>
  )
}

function EmptyCopy({ text }: { text: string }) {
  return <p className="rounded-[18px] bg-slate-50 px-3 py-4 text-sm text-slate-500">{text}</p>
}

function OverlayCard({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl">
        <div className="flex justify-end">
          <Button className="h-10 rounded-2xl" onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  )
}

function StateCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-xl rounded-[24px] border-slate-200/80 bg-white/95 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-black text-slate-950">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500">{body}</p>
        </CardContent>
      </Card>
    </div>
  )
}

function ResidentLoadingShell({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#eef5ff_100%)] px-3 py-4 text-slate-950">
      <div className="mx-auto flex max-w-[420px] flex-col gap-3">
        <div className="rounded-[28px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_12px_32px_rgba(148,163,184,0.14)]">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-cyan-700">SarvaSociety</p>
          <h1 className="mt-2 text-lg font-black text-slate-950">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{body}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="h-16 rounded-[18px] bg-slate-50" />
            <div className="h-16 rounded-[18px] bg-slate-50" />
            <div className="h-16 rounded-[18px] bg-slate-50" />
            <div className="h-16 rounded-[18px] bg-slate-50" />
          </div>
        </div>
        <CompactCard title="Loading profile" subtitle="Bringing your resident space back exactly where you left it.">
          <div className="space-y-2">
            <div className="h-20 rounded-[18px] bg-slate-50" />
            <div className="h-20 rounded-[18px] bg-slate-50" />
            <div className="h-20 rounded-[18px] bg-slate-50" />
          </div>
        </CompactCard>
      </div>
    </div>
  )
}
