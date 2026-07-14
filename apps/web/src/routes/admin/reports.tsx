import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { formatPaise, collectionRatePct, collectionReportToCsv, towerCollectionToCsv } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/reports')({ component: ReportsPage })

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-slate-400 text-xs">{label}</p>
      <p className="text-2xl font-semibold text-slate-800">{value}</p>
    </div>
  )
}

function csvDataHref(csv: string): string {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
}

function RateBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="bg-slate-100 h-2 w-full overflow-hidden rounded-full">
        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-slate-400 w-12 shrink-0 text-right text-xs">{pct}%</span>
    </div>
  )
}

function AnalyticsSection() {
  const q = useQuery({ queryKey: ['collection-analytics'], queryFn: apiClient.getCollectionAnalytics })
  const data = q.data
  if (!data) return null
  const { payers } = data

  return (
    <>
      <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Collection efficiency</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-10">
          <Stat label="Overall collection rate" value={`${data.overallRatePct}%`} />
          <Stat label="Bills paid in full" value={`${data.fullyPaidPct}%`} />
          <Stat
            label="Avg days to pay"
            value={payers.avgDaysToPay === null ? '—' : `${payers.avgDaysToPay > 0 ? '+' : ''}${payers.avgDaysToPay}d`}
          />
        </CardContent>
      </Card>

      <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Collection by tower</CardTitle>
          <a
            href={csvDataHref(towerCollectionToCsv(data.byTower))}
            download="collection-by-tower.csv"
            className="border-slate-200 hover:bg-slate-50 inline-flex h-9 items-center rounded-xl border px-4 text-sm font-medium transition-colors aria-disabled:pointer-events-none aria-disabled:opacity-50"
            aria-disabled={data.byTower.length === 0}
          >
            Download CSV
          </a>
        </CardHeader>
        <CardContent>
          {data.byTower.length === 0 ? (
            <p className="text-slate-400 text-sm">No bills yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Tower</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Billed</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Collected</TableHead>
                  <TableHead className="w-48 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Collection %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byTower.map((t) => (
                  <TableRow key={t.tower} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60">
                    <TableCell className="font-medium">{t.tower}</TableCell>
                    <TableCell className="text-right">{formatPaise(t.billed)}</TableCell>
                    <TableCell className="text-right">{formatPaise(t.collected)}</TableCell>
                    <TableCell>
                      <RateBar pct={collectionRatePct(t.billed, t.collected)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Payer patterns</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-10">
          <Stat label="Early" value={String(payers.early)} />
          <Stat label="On time" value={String(payers.onTime)} />
          <Stat label="Late" value={String(payers.late)} />
          <Stat label="Outstanding" value={String(payers.outstanding)} />
        </CardContent>
      </Card>
    </>
  )
}

function ReportsPage() {
  const report = useQuery({ queryKey: ['finance-report'], queryFn: apiClient.getFinanceReport })
  const csvHref = report.data
    ? `data:text/csv;charset=utf-8,${encodeURIComponent(collectionReportToCsv(report.data.byMonth))}`
    : '#'

  return (
    <div className="space-y-6">
      <PageHeader title="Financial reports" description="Collection summary, method breakdown, and export." />
      <QueryState q={report} empty={false} emptyText="">
        {report.data && (
          <>
            <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>Collection summary</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-10">
                <Stat label="Total billed" value={formatPaise(report.data.totalBilled)} />
                <Stat label="Total collected" value={formatPaise(report.data.totalCollected)} />
                <Stat
                  label="Collection rate"
                  value={`${collectionRatePct(report.data.totalBilled, report.data.totalCollected)}%`}
                />
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Collection by month</CardTitle>
                <a
                  href={csvHref}
                  download="collection-report.csv"
                  className="border-slate-200 hover:bg-slate-50 inline-flex h-9 items-center rounded-xl border px-4 text-sm font-medium transition-colors aria-disabled:pointer-events-none aria-disabled:opacity-50"
                  aria-disabled={report.data.byMonth.length === 0}
                >
                  Download CSV
                </a>
              </CardHeader>
              <CardContent>
                {report.data.byMonth.length === 0 ? (
                  <p className="text-slate-400 text-sm">No bills yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80">
                        <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Period</TableHead>
                        <TableHead className="text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Billed</TableHead>
                        <TableHead className="text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Collected</TableHead>
                        <TableHead className="w-48 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Collection %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.data.byMonth.map((r) => {
                        const pct = collectionRatePct(r.billed, r.collected)
                        return (
                          <TableRow key={r.period} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60">
                            <TableCell className="font-medium">{r.period}</TableCell>
                            <TableCell className="text-right">{formatPaise(r.billed)}</TableCell>
                            <TableCell className="text-right">{formatPaise(r.collected)}</TableCell>
                            <TableCell>
                              <RateBar pct={pct} />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>Payment method breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {report.data.byMethod.length === 0 ? (
                  <p className="text-slate-400 text-sm">No payments recorded yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80">
                        <TableHead className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Method</TableHead>
                        <TableHead className="text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.data.byMethod.map((m) => (
                        <TableRow key={m.method} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60">
                          <TableCell className="font-medium">{m.method}</TableCell>
                          <TableCell className="text-right">{formatPaise(m.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </QueryState>
      <AnalyticsSection />
    </div>
  )
}
