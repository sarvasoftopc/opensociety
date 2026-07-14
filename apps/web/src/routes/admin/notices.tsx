import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { CreateNotice, NoticeCategory, NoticePriority } from '@opensociety/shared'
import { noticePrioritySchema, noticeCategorySchema } from '@opensociety/shared'
import { Eye, Paperclip, X } from 'lucide-react'

import { apiClient } from '../../lib/api'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const Route = createFileRoute('/admin/notices')({ component: NoticesPage })

function priorityPillClass(priority: NoticePriority): string {
  if (priority === 'URGENT' || priority === 'HIGH') return 'bg-rose-50 text-rose-700'
  if (priority === 'NORMAL') return 'bg-amber-50 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function AttachmentLink({ url, name }: { url: string; name: string }) {
  const [busy, setBusy] = useState(false)
  const open = async () => {
    setBusy(true)
    try {
      const obj = await apiClient.fetchUploadObjectUrl(url)
      window.open(obj, '_blank', 'noopener')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={open} disabled={busy} className="rounded-xl gap-1.5">
      <Paperclip className="h-3.5 w-3.5" />
      {busy ? 'Opening…' : name}
    </Button>
  )
}

// Engagement: a read count that expands to show who has read the notice.
function ReadReceipts({ noticeId, readCount }: { noticeId: string; readCount: number }) {
  const [open, setOpen] = useState(false)
  const reads = useQuery({
    queryKey: ['notice-reads', noticeId],
    queryFn: () => apiClient.listNoticeReads(noticeId),
    enabled: open,
  })
  return (
    <div className="mt-2">
      <Button variant="ghost" size="sm" onClick={() => setOpen((s) => !s)} className="rounded-xl gap-1.5 text-slate-500 hover:text-slate-700">
        <Eye className="h-3.5 w-3.5" />
        {readCount} read{readCount === 1 ? '' : 's'}
      </Button>
      {open && (
        <div className="text-slate-500 mt-1 space-y-0.5 text-xs">
          {reads.isLoading && <p>Loading…</p>}
          {reads.isSuccess && reads.data.length === 0 && <p>No one has read this yet.</p>}
          {reads.data?.map((r) => (
            <div key={r.userId}>
              {r.name ?? r.userId} · {formatDate(r.readAt)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CreateNoticeForm() {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState<NoticePriority>('NORMAL')
  const [category, setCategory] = useState<NoticeCategory>('GENERAL')
  const [expiresAt, setExpiresAt] = useState('')
  const [attachment, setAttachment] = useState<{ url: string; name: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const reset = () => {
    setTitle('')
    setBody('')
    setPriority('NORMAL')
    setCategory('GENERAL')
    setExpiresAt('')
    setAttachment(null)
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload: CreateNotice = { title, body, priority, category }
      if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString()
      if (attachment) {
        payload.attachmentUrl = attachment.url
        payload.attachmentName = attachment.name
      }
      return apiClient.createNotice(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] })
      reset()
    },
  })

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadError('')
    setUploading(true)
    try {
      const { url } = await apiClient.uploadFile(file)
      setAttachment({ url, name: file.name })
    } catch (err) {
      setUploadError((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (title.trim() && body.trim()) mutation.mutate()
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="n-title">Title</Label>
        <Input id="n-title" placeholder="Water supply interruption" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl border-slate-200 bg-slate-50 h-10" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="n-body">Message</Label>
        <Textarea
          id="n-body"
          rows={4}
          placeholder="Details of the announcement…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="rounded-xl border-slate-200 bg-slate-50"
        />
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as NoticeCategory)}>
            <SelectTrigger className="w-40 rounded-xl border-slate-200 bg-slate-50 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {noticeCategorySchema.options.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as NoticePriority)}>
            <SelectTrigger className="w-36 rounded-xl border-slate-200 bg-slate-50 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {noticePrioritySchema.options.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="n-exp">Expires (optional)</Label>
          <Input
            id="n-exp"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-56 rounded-xl border-slate-200 bg-slate-50 h-10"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="n-file">Attachment (PDF/image, optional)</Label>
        <div className="flex items-center gap-3">
          <Input id="n-file" type="file" accept="image/*,application/pdf" onChange={onFile} className="w-72 rounded-xl border-slate-200 bg-slate-50" disabled={uploading} />
          {uploading && <span className="text-slate-400 text-sm">Uploading…</span>}
          {attachment && (
            <span className="flex items-center gap-2 text-sm text-slate-600">
              <Paperclip className="h-3.5 w-3.5 text-slate-400" />
              {attachment.name}
              <button
                type="button"
                className="text-slate-400 hover:text-rose-500 transition-colors"
                onClick={() => setAttachment(null)}
                aria-label="Remove attachment"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
        </div>
        {uploadError && <p className="text-destructive text-sm">{uploadError}</p>}
      </div>
      <Button type="submit" disabled={mutation.isPending || uploading || !title.trim() || !body.trim()} className="rounded-xl">
        {mutation.isPending ? 'Publishing…' : 'Publish notice'}
      </Button>
      {mutation.isSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">Published ✓</p>}
      {mutation.isError && <p className="text-destructive text-sm">{(mutation.error as Error).message}</p>}
    </form>
  )
}

const ALL = 'ALL'

function NoticesPage() {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState<string>(ALL)
  const notices = useQuery({
    queryKey: ['notices', q, category],
    queryFn: () => apiClient.listNotices({ q: q || undefined, category: category === ALL ? undefined : category }),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Notices" description="Publish announcements to residents." />

      <Card className="border border-slate-100 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>New notice</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateNoticeForm />
        </CardContent>
      </Card>

      <Card className="border border-slate-100 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Archive</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="n-search">Search</Label>
              <Input
                id="n-search"
                className="w-64 rounded-xl border-slate-200 bg-slate-50 h-10"
                placeholder="Keyword in title or message"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-40 rounded-xl border-slate-200 bg-slate-50 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All categories</SelectItem>
                  {noticeCategorySchema.options.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <QueryState q={notices} empty={notices.isSuccess && notices.data?.length === 0} emptyText="No notices match.">
            <div className="space-y-3">
              {notices.data?.map((n) => (
                <div key={n.id} className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-slate-800 text-sm">{n.title}</p>
                    <div className="flex shrink-0 gap-1.5">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600">
                        {n.category}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${priorityPillClass(n.priority)}`}>
                        {n.priority}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm whitespace-pre-wrap">{n.body}</p>
                  {n.attachmentUrl && (
                    <div className="mt-1">
                      <AttachmentLink url={n.attachmentUrl} name={n.attachmentName ?? 'Attachment'} />
                    </div>
                  )}
                  <p className="text-slate-400 text-xs">
                    Published {formatDate(n.publishedAt)}
                    {n.expiresAt ? ` · expires ${formatDate(n.expiresAt)}` : ''}
                  </p>
                  <ReadReceipts noticeId={n.id} readCount={n.readCount ?? 0} />
                </div>
              ))}
            </div>
          </QueryState>
        </CardContent>
      </Card>
    </div>
  )
}
