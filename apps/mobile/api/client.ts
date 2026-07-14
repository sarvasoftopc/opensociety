import type {
  Apartment,
  UserRole,
  UserStatus,
  CheckInHouseHelp,
  CreatePreApproval,
  CreateTicket,
  CreateVisitorEntry,
  Guard,
  GuardDutySession,
  HouseHelp,
  HouseHelpAssignment,
  HouseHelpEntry,
  CreateHouseHelpReview,
  MaintenanceBill,
  Payment,
  Notice,
  SocietyConfig,
  Ticket,
  Vehicle,
  CreateVehicle,
  UpdateVehicle,
  VisitorEntry,
  VisitorPreApproval,
  VisitorStatus,
} from '@opensociety/shared'

function isLocalLikeHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname.startsWith('192.168.')
}

function resolveApiUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8788'
  if (typeof window === 'undefined') return configured

  try {
    const apiUrl = new URL(configured)
    const pageUrl = new URL(window.location.origin)
    if (isLocalLikeHost(apiUrl.hostname) && isLocalLikeHost(pageUrl.hostname) && apiUrl.hostname !== pageUrl.hostname) {
      apiUrl.hostname = pageUrl.hostname
    }
    return apiUrl.toString().replace(/\/$/, '')
  } catch {
    return configured
  }
}

export const API_URL = resolveApiUrl()

// House help as returned by the directory list — carries its anonymous rating
// summary plus verification/trust signals.
export type HouseHelpWithRating = HouseHelp & {
  ratingAvg: number | null
  reviewCount: number
  trustScore: number
  verificationLevel: 'VERIFIED' | 'UNVERIFIED'
}

export type AuthMeResponse = {
  id: string
  tenantId: string
  tenantSlug: string
  name: string
  email: string | null
  phone: string | null
  role: UserRole
  status: UserStatus
  isActive: boolean
  authSource: string
}

export type AppNotification = {
  id: string
  userId: string
  type: string
  title: string
  body: string
  data: Record<string, string> | null
  source: string | null
  deliveryStatus: string
  readAt: string | null
  createdAt: string
}

// Dev auth stand-in used only when no Supabase session is present. Set
// EXPO_PUBLIC_DEV_USER_ID to a real users.id (resident/admin) to act as them;
// it's sent as the x-user-id header.
const DEV_USER_ID = process.env.EXPO_PUBLIC_DEV_USER_ID

// Stable per-install device id (persisted on web via localStorage; native
// persistence is a follow-up via AsyncStorage). Sent with guard actions so the
// API can enforce the one-device-per-guard policy.
function deviceHeaders(): Record<string, string> {
  let id = 'unknown-device'
  try {
    const store = (globalThis as { localStorage?: Storage }).localStorage
    id = store?.getItem('opensociety-device-id') ?? ''
    if (!id) {
      id = globalThis.crypto?.randomUUID?.() ?? `dev-${Date.now()}`
      store?.setItem('opensociety-device-id', id)
    }
  } catch {
    // storage unavailable; fall back to the placeholder id
  }
  const ua = (globalThis as { navigator?: { userAgent?: string } }).navigator?.userAgent
  return { 'x-device-id': id, 'x-device-model': ua?.slice(0, 80) ?? 'Mobile device' }
}

// Bridge to the Supabase session token, registered by a React component in the
// root layout. When signed in, requests carry a Bearer JWT the API
// verifies, taking precedence over the dev header.
let tokenGetter: (() => Promise<string | null>) | null = null
export function setAuthTokenGetter(fn: (() => Promise<string | null>) | null) {
  tokenGetter = fn
}

// Bearer token when signed in, else the dev x-user-id fallback. The API
// requires an authenticated actor even for GETs.
async function api<T>(path: string, init?: RequestInit, userId = DEV_USER_ID): Promise<T> {
  const token = tokenGetter ? await tokenGetter().catch(() => null) : null
  const auth: Record<string, string> = token
    ? { authorization: `Bearer ${token}` }
    : userId
      ? { 'x-user-id': userId }
      : {}
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...auth,
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`)
  return (await res.json()) as T
}

async function uploadBinary(blob: Blob, contentType: string, userId = DEV_USER_ID): Promise<{ key: string; url: string }> {
  const token = tokenGetter ? await tokenGetter().catch(() => null) : null
  const auth: Record<string, string> = token
    ? { authorization: `Bearer ${token}` }
    : userId
      ? { 'x-user-id': userId }
      : {}
  const res = await fetch(`${API_URL}/uploads`, {
    method: 'POST',
    body: blob,
    headers: {
      'content-type': contentType,
      ...auth,
    },
  })
  if (!res.ok) throw new Error(`API /uploads -> ${res.status}`)
  return (await res.json()) as { key: string; url: string }
}

export const apiClient = {
  health: () => api<{ status: string }>('/health'),
  me: () => api<AuthMeResponse>('/auth/me'),
  updateMe: (body: { name?: string; phone?: string }, userId?: string) =>
    api<AuthMeResponse>('/auth/me', { method: 'PATCH', body: JSON.stringify(body) }, userId),
  getSociety: () => api<SocietyConfig | null>('/society'),
  listApartments: () => api<Apartment[]>('/apartments'),
  listVisitors: (status?: VisitorStatus) =>
    api<VisitorEntry[]>(`/visitors${status ? `?status=${status}` : ''}`),
  createVisitor: (body: CreateVisitorEntry, userId?: string) =>
    api<VisitorEntry>('/visitors', { method: 'POST', body: JSON.stringify(body) }, userId),
  approveVisitor: (id: string, userId?: string) =>
    api<VisitorEntry>(`/visitors/${id}/approve`, { method: 'POST' }, userId),
  denyVisitor: (id: string, reason: string, userId?: string) =>
    api<VisitorEntry>(`/visitors/${id}/deny`, { method: 'POST', body: JSON.stringify({ reason }) }, userId),
  checkInVisitor: (id: string, userId?: string) =>
    api<VisitorEntry>(`/visitors/${id}/checkin`, { method: 'POST', body: JSON.stringify({}) }, userId),
  checkOutVisitor: (id: string, userId?: string) =>
    api<VisitorEntry>(`/visitors/${id}/checkout`, { method: 'POST' }, userId),
  createPreApproval: (body: CreatePreApproval, userId?: string) =>
    api<VisitorPreApproval>('/visitors/pre-approvals', { method: 'POST', body: JSON.stringify(body) }, userId),
  redeemPreApproval: (code: string, userId?: string) =>
    api<VisitorEntry>('/visitors/pre-approvals/redeem', { method: 'POST', body: JSON.stringify({ code }) }, userId),
  listNotices: () => api<Notice[]>('/notices'),
  listNotifications: () => api<AppNotification[]>('/notifications'),
  markNotificationRead: (id: string, userId?: string) =>
    api<AppNotification>(`/notifications/${id}/read`, { method: 'POST' }, userId),
  registerDeviceToken: (body: { token: string; platform: string; provider?: string; deviceLabel?: string }, userId?: string) =>
    api<{ ok: boolean }>('/notifications/register-device', { method: 'POST', body: JSON.stringify(body) }, userId),
  listBills: () => api<MaintenanceBill[]>('/bills'),
  listPayments: () => api<Payment[]>('/payments'),
  recordPayment: (body: { billId: string; amount: number; method: string; reference?: string; notes?: string }, userId?: string) =>
    api<Payment>('/payments', { method: 'POST', body: JSON.stringify(body) }, userId),
  listTickets: (status?: string) => api<Ticket[]>(`/tickets${status ? `?status=${status}` : ''}`),
  createTicket: (body: CreateTicket, userId?: string) =>
    api<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(body) }, userId),
  listHouseHelp: (type?: string) => api<HouseHelpWithRating[]>(`/house-help${type ? `?type=${type}` : ''}`),
  rateHouseHelp: (id: string, body: CreateHouseHelpReview, userId?: string) =>
    api<{ ok: true; id: string; rating: number }>(
      `/house-help/${id}/reviews`,
      { method: 'POST', body: JSON.stringify(body) },
      userId,
    ),
  listHouseHelpEntries: (params?: { active?: boolean; houseHelpId?: string }) => {
    const q = new URLSearchParams()
    if (params?.active) q.set('active', 'true')
    if (params?.houseHelpId) q.set('houseHelpId', params.houseHelpId)
    const qs = q.toString()
    return api<HouseHelpEntry[]>(`/house-help/entries${qs ? `?${qs}` : ''}`)
  },
  checkInHouseHelp: (id: string, body: CheckInHouseHelp = {}, userId?: string) =>
    api<HouseHelpEntry>(`/house-help/${id}/checkin`, { method: 'POST', body: JSON.stringify(body) }, userId),
  checkOutHouseHelpEntry: (entryId: string, userId?: string) =>
    api<HouseHelpEntry>(`/house-help/entries/${entryId}/checkout`, { method: 'POST', body: JSON.stringify({}) }, userId),
  listMyApartments: () => api<Apartment[]>('/apartments/mine'),
  listVehicles: (apartmentId?: string) =>
    api<Vehicle[]>(`/vehicles${apartmentId ? `?apartmentId=${apartmentId}` : ''}`),
  createVehicle: (body: CreateVehicle, userId?: string) =>
    api<Vehicle>('/vehicles', { method: 'POST', body: JSON.stringify(body) }, userId),
  updateVehicle: (id: string, body: UpdateVehicle, userId?: string) =>
    api<Vehicle>(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(body) }, userId),
  listGuards: () => api<Guard[]>('/guards'),
  listActiveDuty: () => api<GuardDutySession[]>('/guards/duty/active'),
  clockInGuard: (
    guardId: string,
    coords?: { lat?: number; lng?: number; checkpoint?: string; clockInPhotoUrl?: string },
    userId?: string,
  ) =>
    api<GuardDutySession>(
      `/guards/${guardId}/duty/clock-in`,
      { method: 'POST', body: JSON.stringify(coords ?? {}), headers: deviceHeaders() },
      userId,
    ),
  clockOutGuard: (sessionId: string, coords?: { lat?: number; lng?: number }, userId?: string) =>
    api<GuardDutySession>(`/guards/duty/${sessionId}/clock-out`, { method: 'POST', body: JSON.stringify(coords ?? {}) }, userId),
  listHouseHelpForApartment: (apartmentId: string) =>
    api<HouseHelpWithRating[]>(`/house-help?apartmentId=${apartmentId}`),
  assignHouseHelp: (id: string, apartmentId: string, userId?: string) =>
    api<HouseHelpAssignment>(`/house-help/${id}/assignments`, { method: 'POST', body: JSON.stringify({ apartmentId }) }, userId),
  removeHouseHelpAssignment: (id: string, apartmentId: string, userId?: string) =>
    api<HouseHelpAssignment>(`/house-help/${id}/assignments/${apartmentId}`, { method: 'DELETE' }, userId),
  markNoticeRead: (id: string, userId?: string) =>
    api<{ ok: boolean }>(`/notices/${id}/read`, { method: 'POST', body: JSON.stringify({}) }, userId),
  uploadImage: async (uri: string) => {
    const response = await fetch(uri)
    const blob = await response.blob()
    const contentType = blob.type || 'image/jpeg'
    return uploadBinary(blob, contentType)
  },
  // Auth-fetch a stored R2 object (GET /uploads/:key is auth-gated) and return a
  // local object URL suitable for opening/displaying an attachment.
  fetchUploadObjectUrl: async (path: string, userId = DEV_USER_ID): Promise<string> => {
    const token = tokenGetter ? await tokenGetter().catch(() => null) : null
    const auth: Record<string, string> = token
      ? { authorization: `Bearer ${token}` }
      : userId
        ? { 'x-user-id': userId }
        : {}
    const res = await fetch(`${API_URL}${path}`, { headers: auth })
    if (!res.ok) throw new Error(`attachment fetch failed (${res.status})`)
    return URL.createObjectURL(await res.blob())
  },
}
