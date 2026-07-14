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
  X,
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
    <div className="min-h-screen bg-[#f0f4f8]">
      <PushPermissionModal />

      <div className="mx-auto flex max-w-[430px] flex-col gap-3 px-4 py-5 pb-24">

        {/* ── Hero Header Card ── */}
        <div className="rounded-3xl bg-[#0f172a] p-5">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">SarvaSociety</p>
              <h1 className="mt-1 truncate text-xl font-bold text-white">{homeLabel}</h1>
              <p className="mt-0.5 truncate text-sm text-slate-400">Hello, {meData.name}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {/* Bell with unread badge */}
              <div className="relative">
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20 transition-colors"
                  type="button"
                  onClick={() => setActiveTab('community')}
                >
                  <Bell className="size-4" />
                </button>
                {unreadAlerts.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[9px] font-bold text-white">
                    {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
                  </span>
                )}
              </div>
              {/* Avatar */}
              <button
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-white font-bold text-sm hover:bg-cyan-400 transition-colors"
                onClick={() => setProfileOpen(true)}
                type="button"
              >
                {meData.name.slice(0, 1).toUpperCase()}
              </button>
            </div>
          </div>

          {/* Quick Actions 2×2 grid */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 p-3">
              <Bell className="size-5 text-cyan-400" />
              <span className="text-xs font-medium text-white">Pre-Approve</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 p-3">
              <UserRound className="size-5 text-violet-400" />
              <span className="text-xs font-medium text-white">Daily Help</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 p-3">
              <CreditCard className="size-5 text-emerald-400" />
              <span className="text-xs font-medium text-white">Payments</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 p-3">
              <Wrench className="size-5 text-amber-400" />
              <span className="text-xs font-medium text-white">Services</span>
            </div>
          </div>
        </div>

        {/* ── Home Tab ── */}
        {activeTab === 'home' ? (
          <>
            {/* Summary Pills */}
            <div className="grid grid-cols-3 gap-3">
              <SummaryPill label="Alerts" value={String(unreadAlerts.length)} />
              <SummaryPill label="Notices" value={String(notices.data?.length ?? 0)} />
              <SummaryPill label="Flats" value={String(myApartments.data?.length ?? 0)} />
            </div>

            {/* Daily Help */}
            <SectionCard label="Daily Help" title="Assigned staff for your flat">
              {highlightedHouseHelp.length === 0 ? (
                <EmptyState text="No assigned house help yet." />
              ) : (
                highlightedHouseHelp.map(({ helper, apartmentLabel }) => (
                  <div key={`${apartmentLabel}-${helper.id}`} className="flex items-center gap-3 border-b border-slate-50 py-2.5 last:border-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                      {helper.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{helper.name}</p>
                      <p className="truncate text-xs text-slate-400">
                        {helper.type} · {apartmentLabel}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        helper.verificationLevel === 'VERIFIED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {helper.verificationLevel}
                    </span>
                  </div>
                ))
              )}
            </SectionCard>

            {/* Notice Board */}
            <SectionCard label="Notice Board" title="Important updates from your society">
              <div className="max-h-[22rem] overflow-y-auto">
                {(notices.data ?? []).length === 0 ? (
                  <EmptyState text="No notices yet." />
                ) : (
                  (notices.data ?? []).map((notice) => (
                    <button
                      key={notice.id}
                      className="relative flex w-full gap-3 border-b border-slate-50 py-3 text-left last:border-0 hover:bg-slate-50 transition-colors"
                      onClick={() => {
                        setActiveNotice(notice)
                        if (!notice.read) markNoticeRead.mutate(notice.id)
                      }}
                      type="button"
                    >
                      <div
                        className={`mt-1 w-1 shrink-0 self-stretch rounded-full ${
                          notice.priority === 'HIGH'
                            ? 'bg-rose-400'
                            : notice.priority === 'MEDIUM'
                            ? 'bg-amber-400'
                            : 'bg-slate-300'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{notice.title}</p>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">{notice.category}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{notice.body}</p>
                      </div>
                      {!notice.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-500" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </SectionCard>
          </>
        ) : null}

        {/* ── Community Tab ── */}
        {activeTab === 'community' ? (
          <SectionCard label="Community" title="Notices and alerts">
            <div className="max-h-[34rem] overflow-y-auto">
              {unreadAlerts.map((alert) => (
                <button
                  key={alert.id}
                  className="flex w-full gap-3 border-b border-slate-50 py-3 text-left last:border-0 hover:bg-slate-50 transition-colors"
                  onClick={() => markNotificationRead.mutate(alert.id)}
                  type="button"
                >
                  <div className="mt-1 w-1 shrink-0 self-stretch rounded-full bg-amber-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{alert.body}</p>
                  </div>
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                </button>
              ))}
              {(notices.data ?? []).map((notice) => (
                <button
                  key={`community-${notice.id}`}
                  className="relative flex w-full gap-3 border-b border-slate-50 py-3 text-left last:border-0 hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    setActiveNotice(notice)
                    if (!notice.read) markNoticeRead.mutate(notice.id)
                  }}
                  type="button"
                >
                  <div
                    className={`mt-1 w-1 shrink-0 self-stretch rounded-full ${
                      notice.priority === 'HIGH'
                        ? 'bg-rose-400'
                        : notice.priority === 'MEDIUM'
                        ? 'bg-amber-400'
                        : 'bg-slate-300'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{notice.title}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">{notice.category}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{notice.body}</p>
                  </div>
                  {!notice.read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-500" />
                  )}
                </button>
              ))}
              {unreadAlerts.length === 0 && (notices.data ?? []).length === 0 ? (
                <EmptyState text="No community items yet." />
              ) : null}
            </div>
          </SectionCard>
        ) : null}

        {/* ── Homes Tab ── */}
        {activeTab === 'homes' ? (
          <>
            <SectionCard label="My Homes" title="Flat information for this account">
              {(myApartments.data ?? []).length === 0 ? (
                <EmptyState text="No apartments linked to this resident yet." />
              ) : (
                (myApartments.data ?? []).map((apartment) => (
                  <div key={apartment.id} className="flex items-center justify-between border-b border-slate-50 py-2.5 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {apartment.tower}-{apartment.apartmentNo}
                      </p>
                      <p className="text-xs text-slate-400">
                        Floor {apartment.floor ?? '—'} · {apartment.bhkType ?? 'Home'}
                      </p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <Building2 className="size-4" />
                    </div>
                  </div>
                ))
              )}
            </SectionCard>

            <SectionCard label="Vehicles" title="Registered vehicles for your homes">
              {(vehicles.data ?? []).length === 0 ? (
                <EmptyState text="No vehicles registered yet." />
              ) : (
                (vehicles.data ?? []).map((vehicle) => (
                  <div key={vehicle.id} className="flex items-center gap-3 border-b border-slate-50 py-2.5 last:border-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <CarFront className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{vehicle.registrationNumber}</p>
                      <p className="truncate text-xs text-slate-400">
                        {vehicle.type} · {vehicle.make ?? 'Unknown make'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </SectionCard>
          </>
        ) : null}

        {/* ── Services Tab ── */}
        {activeTab === 'services' ? (
          <>
            <SectionCard label="Payments" title="Outstanding bills">
              <div className="max-h-[28rem] overflow-y-auto">
                {outstandingBills.length === 0 ? (
                  <EmptyState text="No outstanding bills." />
                ) : (
                  outstandingBills.map((bill) => (
                    <BillPayCard key={bill.id} bill={bill} />
                  ))
                )}
              </div>
            </SectionCard>

            <SectionCard label="Maintenance" title="Service tickets">
              {(tickets.data ?? []).length === 0 ? (
                <EmptyState text="No maintenance tickets yet." />
              ) : (
                (tickets.data ?? []).map((ticket) => (
                  <div key={ticket.id} className="border-b border-slate-50 py-3 last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{ticket.title}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {ticket.category} · {ticket.priority}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                        {ticket.status}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">{ticket.description}</p>
                  </div>
                ))
              )}
            </SectionCard>
          </>
        ) : null}
      </div>

      {/* ── Bottom Tab Bar ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-white border-t border-slate-100 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-[430px] items-stretch">
          <BottomTab active={activeTab === 'home'} icon={Home} label="Home" onClick={() => setActiveTab('home')} />
          <BottomTab active={activeTab === 'community'} icon={MessageSquareText} label="Community" onClick={() => setActiveTab('community')} />
          <BottomTab active={activeTab === 'homes'} icon={Building2} label="Homes" onClick={() => setActiveTab('homes')} />
          <BottomTab active={activeTab === 'services'} icon={Wrench} label="Services" onClick={() => setActiveTab('services')} />
        </div>
      </div>

      {/* ── Notice Detail Overlay ── */}
      {activeNotice ? (
        <OverlayCard onClose={() => setActiveNotice(null)}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-600">{activeNotice.category}</p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">{activeNotice.title}</h2>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">{activeNotice.priority} priority</p>
          <div className="mt-4 max-h-[55vh] overflow-y-auto pr-1">
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{activeNotice.body}</p>
          </div>
        </OverlayCard>
      ) : null}

      {/* ── Profile Overlay ── */}
      {profileOpen ? (
        <OverlayCard onClose={() => setProfileOpen(false)}>
          <h2 className="text-xl font-bold text-slate-900">Resident profile</h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">Update your name and phone number.</p>
          <div className="mt-5 space-y-3">
            <Input
              className="h-11 rounded-xl border-slate-200 bg-slate-50"
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Full name"
              value={profileName}
            />
            <Input
              className="h-11 rounded-xl border-slate-200 bg-slate-50"
              onChange={(e) => setProfilePhone(e.target.value)}
              placeholder="Phone number"
              value={profilePhone}
            />
          </div>
          <div className="mt-5 flex gap-3">
            <Button className="h-11 flex-1 rounded-xl" onClick={() => setProfileOpen(false)} variant="outline">
              Close
            </Button>
            <Button
              className="h-11 flex-1 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
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
          <Button className="mt-3 h-11 w-full rounded-xl text-rose-500 hover:text-rose-600" onClick={() => signOut()} variant="ghost">
            Sign out
          </Button>
        </OverlayCard>
      ) : null}
    </div>
  )
}

/* ─────────────────────────── Sub-components ─────────────────────────── */

function SectionCard({
  label,
  title,
  children,
}: {
  label: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-50 px-4 pb-3 pt-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="mt-0.5 text-base font-bold text-slate-900">{title}</p>
      </div>
      <div className="px-4 pb-4 pt-3">{children}</div>
    </div>
  )
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
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
      className="relative flex flex-1 flex-col items-center justify-center gap-1 py-3"
      onClick={onClick}
      type="button"
    >
      {active && (
        <span className="absolute inset-x-0 top-0 h-0.5 rounded-b-full bg-cyan-500" />
      )}
      <Icon className={`size-5 ${active ? 'text-cyan-600' : 'text-slate-400'}`} />
      <span
        className={`text-[10px] uppercase tracking-wider ${
          active ? 'font-semibold text-cyan-600' : 'font-medium text-slate-400'
        }`}
      >
        {label}
      </span>
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
    <div className="mb-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm last:mb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{bill.title}</p>
          <p className="mt-0.5 text-xs text-slate-400">{bill.periodMonth ?? 'One-time bill'}</p>
        </div>
        <p className="shrink-0 text-2xl font-bold text-slate-900">{formatPaise(outstanding)}</p>
      </div>
      <div className="mt-4 space-y-2">
        <Input
          className="h-11 rounded-xl border-slate-200 bg-slate-50"
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount in INR"
          value={amount}
        />
        <Select onValueChange={(value) => setMethod(value as PaymentMethod)} value={method}>
          <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50">
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
        <Input
          className="h-11 rounded-xl border-slate-200 bg-slate-50"
          onChange={(e) => setReference(e.target.value)}
          placeholder="Reference / UTR"
          value={reference}
        />
        <Button
          className="h-11 w-full rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
          disabled={pay.isPending || !amount}
          onClick={() => pay.mutate()}
        >
          {pay.isPending ? 'Processing…' : 'Make payment'}
        </Button>
      </div>
      {pay.isSuccess ? <p className="mt-2 text-sm font-semibold text-emerald-600">Payment recorded successfully.</p> : null}
      {pay.isError ? <p className="mt-2 text-sm font-semibold text-rose-500">{(pay.error as Error).message}</p> : null}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center py-8">
      <FileText className="size-10 text-slate-300" />
      <p className="mt-3 text-sm text-slate-400">{text}</p>
    </div>
  )
}

function OverlayCard({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 max-h-[85vh] flex flex-col">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
        <button
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          onClick={onClose}
          type="button"
        >
          <X className="size-4" />
        </button>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function StateCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f4f8] px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-50 px-5 pb-3 pt-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">SarvaSociety</p>
          <p className="mt-1 text-base font-bold text-slate-900">{title}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-slate-500">{body}</p>
        </div>
      </div>
    </div>
  )
}

function ResidentLoadingShell({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-[#f0f4f8] px-4 py-5">
      <div className="mx-auto flex max-w-[430px] flex-col gap-3">
        {/* Loading hero */}
        <div className="rounded-3xl bg-[#0f172a] p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">SarvaSociety</p>
          <h1 className="mt-2 text-xl font-bold text-white">{title}</h1>
          <p className="mt-1 text-sm text-slate-400">{body}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="h-16 animate-pulse rounded-2xl bg-white/10" />
            <div className="h-16 animate-pulse rounded-2xl bg-white/10" />
            <div className="h-16 animate-pulse rounded-2xl bg-white/10" />
            <div className="h-16 animate-pulse rounded-2xl bg-white/10" />
          </div>
        </div>
        {/* Loading summary pills */}
        <div className="grid grid-cols-3 gap-3">
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        </div>
        {/* Loading section card */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-50 px-4 pb-3 pt-4">
            <div className="h-2.5 w-20 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-2 h-4 w-40 animate-pulse rounded-full bg-slate-100" />
          </div>
          <div className="space-y-3 px-4 pb-4 pt-3">
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  )
}
