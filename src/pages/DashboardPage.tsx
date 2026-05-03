import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { dashboardService } from '@/api/dashboardService'
import type {
  DashboardStatsResponse,
  DashboardChartsResponse,
  DashboardActivity,
  DashboardSoTrackingItem,
  DashboardReceiptItem,
  DashboardAtRiskCustomer,
  SoStatus,
} from '@/types/dashboard'

/* ─── SO Status config ─── */
const SO_STATUS_LABEL: Record<SoStatus, string> = {
  draft: 'ร่าง',
  pending_review: 'รอตรวจสอบ',
  pending_quote: 'รอใบเสนอราคา',
  approved: 'อนุมัติ',
  in_progress: 'กำลังซ่อม',
  completed: 'ซ่อมเสร็จ',
  pending_payment: 'รอชำระ',
  pending_pickup: 'รอรับรถ',
  closed: 'ปิดงาน',
}

const SO_STATUS_COLOR: Record<SoStatus, string> = {
  draft: '#9CA3AF',
  pending_review: '#EAB308',
  pending_quote: '#F59E0B',
  approved: '#22C55E',
  in_progress: '#3B82F6',
  completed: '#10B981',
  pending_payment: '#F97316',
  pending_pickup: '#8B5CF6',
  closed: '#6B7280',
}

const SO_STATUS_BG: Record<SoStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_review: 'bg-yellow-50 text-yellow-700',
  pending_quote: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
  pending_payment: 'bg-orange-50 text-orange-700',
  pending_pickup: 'bg-violet-50 text-violet-700',
  closed: 'bg-gray-50 text-gray-500',
}

const tabs = ['พอร์ตการเงิน', 'ติดตามสถานะ', 'รายงานใบเสร็จเงิน', 'ลูกค้าที่มีความเสี่ยง']

/* ─── Helpers ─── */
function formatBaht(value: number): string {
  if (value >= 1_000_000) return `฿${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `฿${(value / 1_000).toFixed(1)}k`
  return `฿${value.toLocaleString('th-TH')}`
}

function dayLabel(isoLabel: string): string {
  const parts = isoLabel.split('-')
  if (parts.length === 2) {
    // year mode: "2026-01" → month number without leading zero
    return String(parseInt(parts[1], 10))
  }
  const d = new Date(isoLabel)
  return isNaN(d.getTime()) ? isoLabel : String(d.getDate())
}

/* ─── Component ─── */
export function DashboardPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)
  const [period, setPeriod] = useState<'month' | 'year'>('month')
  const [statsData, setStatsData] = useState<DashboardStatsResponse | null>(null)
  const [chartsData, setChartsData] = useState<DashboardChartsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activities, setActivities] = useState<DashboardActivity[]>([])
  const [soTracking, setSoTracking] = useState<DashboardSoTrackingItem[]>([])
  const [receipts, setReceipts] = useState<DashboardReceiptItem[]>([])
  const [atRiskCustomers, setAtRiskCustomers] = useState<DashboardAtRiskCustomer[]>([])
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(true)
  const [isSoTrackingLoading, setIsSoTrackingLoading] = useState(true)
  const [isReceiptsLoading, setIsReceiptsLoading] = useState(true)
  const [isAtRiskLoading, setIsAtRiskLoading] = useState(true)
  const [isChartsLoading, setIsChartsLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const [statsRes, chartsRes] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getCharts('month'),
        ])
        setStatsData(statsRes.data.data)
        setChartsData(chartsRes.data.data)
      } catch {
        // 403 permission denied — show empty widgets without error modal
      } finally {
        setIsLoading(false)
      }
    }
    load()

    const loadActivities = async () => {
      setIsActivitiesLoading(true)
      try {
        const res = await dashboardService.getActivities()
        setActivities(res.data.data)
      } catch {
        // ignore
      } finally {
        setIsActivitiesLoading(false)
      }
    }
    loadActivities()

    const loadSoTracking = async () => {
      setIsSoTrackingLoading(true)
      try {
        const res = await dashboardService.getSoTracking()
        setSoTracking(res.data.data)
      } catch {
        // ignore
      } finally {
        setIsSoTrackingLoading(false)
      }
    }
    loadSoTracking()

    const loadReceipts = async () => {
      setIsReceiptsLoading(true)
      try {
        const res = await dashboardService.getReceipts()
        setReceipts(res.data.data)
      } catch {
        // ignore
      } finally {
        setIsReceiptsLoading(false)
      }
    }
    loadReceipts()

    const loadAtRisk = async () => {
      setIsAtRiskLoading(true)
      try {
        const res = await dashboardService.getAtRiskCustomers()
        setAtRiskCustomers(res.data.data)
      } catch {
        // ignore
      } finally {
        setIsAtRiskLoading(false)
      }
    }
    loadAtRisk()
  }, [])

  useEffect(() => {
    if (isLoading) return
    const load = async () => {
      setIsChartsLoading(true)
      try {
        const res = await dashboardService.getCharts(period)
        setChartsData(res.data.data)
      } finally {
        setIsChartsLoading(false)
      }
    }
    load()
  }, [period]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Stat card definitions (real data) ─── */
  const statCards = statsData
    ? [
        {
          label: 'ยอดขายวันนี้',
          value: formatBaht(statsData.revenue.today),
          sublabel: `เดือนนี้ ${formatBaht(statsData.revenue.this_month)}`,
          color: 'emerald',
          onClick: undefined,
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          ),
        },
        {
          label: 'ยอดขายเดือนนี้',
          value: formatBaht(statsData.revenue.this_month),
          sublabel: `ปีนี้ ${formatBaht(statsData.revenue.this_year)}`,
          color: 'blue',
          onClick: undefined,
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          ),
        },
        {
          label: 'งานซ่อมทั้งหมด',
          value: `${statsData.service_orders.total} คัน`,
          sublabel: `กำลังซ่อม ${statsData.service_orders.by_status.in_progress ?? 0} คัน`,
          color: 'amber',
          onClick: undefined,
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4" />
            </svg>
          ),
        },
        {
          label: 'สต็อกต่ำ',
          value: `${statsData.inventory.low_stock_count} SKU`,
          sublabel: `สินค้าทั้งหมด ${statsData.inventory.total_products} รายการ`,
          color: 'rose',
          onClick: undefined,
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          ),
        },
        {
          label: 'ใบแจ้งหนี้ค้างชำระ',
          value: `${statsData.overdue.invoices} รายการ`,
          sublabel: `สินเชื่อค้าง ${statsData.overdue.store_loans} รายการ`,
          color: 'red',
          onClick: undefined,
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          ),
        },
      ]
    : []

  const colorMap: Record<string, { iconBg: string; text: string }> = {
    emerald: { iconBg: 'bg-emerald-50', text: 'text-emerald-600' },
    blue:    { iconBg: 'bg-blue-50',    text: 'text-blue-600' },
    amber:   { iconBg: 'bg-amber-50',   text: 'text-amber-600' },
    violet:  { iconBg: 'bg-violet-50',  text: 'text-violet-600' },
    rose:    { iconBg: 'bg-rose-50',    text: 'text-rose-600' },
    red:     { iconBg: 'bg-red-50',     text: 'text-red-600' },
  }

  /* ─── Bar chart data ─── */
  const revenueChart = chartsData?.revenue_chart ?? []
  const maxRevenue = revenueChart.length > 0 ? Math.max(...revenueChart.map((d) => d.value), 1) : 1

  /* ─── Donut chart data from SO by_status ─── */
  const soByStatus = statsData?.service_orders.by_status
  const soTotal = statsData?.service_orders.total ?? 0
  const donutSegments = soByStatus
    ? (Object.keys(soByStatus) as SoStatus[])
        .filter((s) => soByStatus[s] > 0)
        .map((s) => ({
          status: s,
          count: soByStatus[s],
          color: SO_STATUS_COLOR[s] ?? '#6B7280',
          label: SO_STATUS_LABEL[s] ?? s,
          pct: soTotal > 0 ? (soByStatus[s] / soTotal) * 100 : 0,
        }))
    : []
  const circumference = 2 * Math.PI * 14 // r=14
  let offset = 0
  const donutArcs = donutSegments.map((seg) => {
    const arc = (seg.pct / 100) * circumference
    const dasharray = `${arc.toFixed(2)} ${(circumference - arc).toFixed(2)}`
    const dashoffset = -offset
    offset += arc
    return { ...seg, dasharray, dashoffset }
  })

  return (
    <div className="space-y-6">
      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                    <div className="h-7 w-24 animate-pulse rounded bg-gray-100" />
                  </div>
                  <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-100" />
                </div>
                <div className="mt-4 h-2.5 w-32 animate-pulse rounded bg-gray-100" />
              </div>
            ))
          : statCards.map((stat) => {
              const c = colorMap[stat.color] ?? colorMap['blue']
              return (
                <div
                  key={stat.label}
                  onClick={stat.onClick}
                  className={cn(
                    'group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors',
                    stat.onClick ? 'cursor-pointer hover:border-gray-300 hover:bg-gray-50/50' : '',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', c.iconBg, c.text)}>
                      {stat.icon}
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-xs text-gray-500">{stat.sublabel}</span>
                  </div>
                </div>
              )
            })}
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex w-full gap-2 overflow-x-auto border-b border-gray-200 sidebar-scrollbar">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={cn(
              'shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === i
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 0 && <>
      {/* ─── Charts Row ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bar Chart — Revenue */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">รายรับตาม{period === 'month' ? 'เดือนนี้' : 'ปีนี้'}</h3>
            <div className="flex gap-1">
              {(['month', 'year'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    period === p
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-transparent text-gray-500 hover:bg-gray-50',
                  )}
                >
                  {p === 'month' ? 'เดือนนี้' : 'ปีนี้'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-1.5 overflow-x-auto" style={{ height: 200 }}>
            {(isLoading || isChartsLoading)
              ? Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="w-full animate-pulse rounded-t bg-gray-100" style={{ height: `${40 + i * 20}px` }} />
                    <div className="h-3 w-5 animate-pulse rounded bg-gray-100" />
                  </div>
                ))
              : revenueChart.length === 0
                ? <p className="flex w-full items-center justify-center text-sm text-gray-500">ไม่มีข้อมูล</p>
                : revenueChart.map((d) => (
                    <div key={d.label} className="group flex flex-1 flex-col items-center gap-1.5" style={{ minWidth: 24 }}>
                      <div
                        className="w-full rounded-t bg-blue-500 transition-colors group-hover:bg-blue-600"
                        style={{ height: `${(d.value / maxRevenue) * 180}px` }}
                        title={`฿${d.value.toLocaleString('th-TH')}`}
                      />
                      <span className="text-xs text-gray-500">{dayLabel(d.label)}</span>
                    </div>
                  ))}
          </div>
        </div>

        {/* Donut Chart — SO Status Breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">สถานะใบสั่งซ่อม</h3>
          <div className="flex items-center justify-center gap-8 lg:justify-start">
            <div className="relative h-36 w-36 shrink-0">
              {isLoading ? (
                <div className="h-36 w-36 animate-pulse rounded-full bg-gray-100" />
              ) : (
                <>
                  <svg viewBox="0 0 36 36" className="h-36 w-36 -rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#F3F4F6" strokeWidth="4" />
                    {donutArcs.map((arc) => (
                      <circle
                        key={arc.status}
                        cx="18" cy="18" r="14"
                        fill="none"
                        stroke={arc.color}
                        strokeWidth="4"
                        strokeDasharray={arc.dasharray}
                        strokeDashoffset={arc.dashoffset}
                        className="transition-all duration-700"
                        strokeLinecap="round"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">{soTotal}</span>
                    <span className="text-xs text-gray-500">งานทั้งหมด</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto pr-2 sidebar-scrollbar" style={{ maxHeight: 150 }}>
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-gray-200" />
                      <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                    </div>
                  ))
                : donutSegments.map((seg) => (
                    <div key={seg.status} className="flex items-center gap-3">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{seg.label}</span>
                        <span className="text-sm font-semibold text-gray-900">{seg.count}</span>
                        <span className="text-xs text-gray-400">({seg.pct.toFixed(0)}%)</span>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Activity + Quick Table ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-1">
          <h3 className="mb-4 text-base font-semibold text-gray-900">อัปเดตล่าสุด</h3>
          <div className="flex flex-col gap-4">
            {isActivitiesLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
                      <div className="h-2.5 w-1/3 animate-pulse rounded bg-gray-100" />
                    </div>
                  </div>
                ))
              : activities.length === 0
                ? <p className="text-sm text-gray-500">ไม่มีกิจกรรมล่าสุด</p>
                : activities.slice(0, 5).map((a, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className={cn(
                        'mt-1 h-2 w-2 shrink-0 rounded-full',
                        a.type === 'sale' ? 'bg-emerald-500' :
                        a.type === 'repair' ? 'bg-blue-500' :
                        a.type === 'stock' ? 'bg-amber-500' :
                        a.type === 'done' ? 'bg-green-500' : 'bg-violet-500',
                      )} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 leading-snug">{a.text}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{a.ref_no} · {new Date(a.created_at).toLocaleDateString('th-TH')}</p>
                      </div>
                    </div>
                  ))}
          </div>
        </div>

        {/* Quick Report Table */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">รายงานใบเสร็จ</h3>
            <button onClick={() => navigate('/billing/documents')} className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
              ดูทั้งหมด &rarr;
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">เลขที่</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">ลูกค้า</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">ยอดรวม</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">วันที่</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isReceiptsLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-gray-100" />
                        </td>
                      </tr>
                    ))
                  : receipts.slice(0, 5).map((row) => (
                      <tr key={row.no} className="bg-white hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{row.no}</td>
                        <td className="px-4 py-3 text-gray-600">{row.customer}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {row.total.toLocaleString('th-TH')} ฿
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">{row.date}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
                            row.status === 'ชำระแล้ว'
                              ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                              : 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20',
                          )}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>แสดง 1-5 จากทั้งหมด {receipts.length} รายการ</span>
          </div>
        </div>
      </div>
      </>}

      {activeTab === 1 && (
        <>
          {/* SO Status Bar Chart */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-gray-900">สัดส่วนสถานะงานซ่อม</h3>
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
                    <div className="h-5 flex-1 animate-pulse rounded bg-gray-100" />
                  </div>
                ))}
              </div>
            ) : !soByStatus || soTotal === 0 ? (
              <p className="flex items-center justify-center py-8 text-sm text-gray-500">ไม่มีข้อมูล</p>
            ) : (
              <div className="flex flex-col gap-3">
                {(Object.keys(SO_STATUS_LABEL) as SoStatus[]).map((s) => {
                  const count = soByStatus[s] ?? 0
                  const pct = soTotal > 0 ? (count / soTotal) * 100 : 0
                  if (count === 0) return null
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-xs text-gray-500">{SO_STATUS_LABEL[s]}</span>
                      <div className="flex flex-1 items-center gap-2">
                        <div className="relative h-4 flex-1 overflow-hidden rounded bg-gray-100">
                          <div
                            className="h-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: SO_STATUS_COLOR[s] }}
                          />
                        </div>
                        <span className="w-8 text-right text-xs font-semibold text-gray-700">{count}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">ติดตามสถานะใบสั่งซ่อม</h3>
            <button onClick={() => navigate('/billing')} className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
              ไปหน้าใบงาน &rarr;
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">เลขที่งาน</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">ลูกค้า</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">รถ</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">สถานะ</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">ช่างที่รับผิดชอบ</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">อัปเดต</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isSoTrackingLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-gray-100" />
                        </td>
                      </tr>
                    ))
                  : soTracking.length === 0
                    ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">ไม่มีข้อมูล</td>
                      </tr>
                    )
                    : soTracking.slice(0, 5).map((row) => (
                        <tr key={row.id} className="bg-white hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{row.so_number}</td>
                          <td className="px-4 py-3 text-gray-600">{row.customer}</td>
                          <td className="px-4 py-3 text-gray-600">{row.vehicle}</td>
                          <td className="px-4 py-3">
                            <span className={cn('inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset', SO_STATUS_BG[row.status])}>
                              {SO_STATUS_LABEL[row.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{row.technician}</td>
                          <td className="px-4 py-3 text-right text-gray-500">{new Date(row.updated_at).toLocaleDateString('th-TH')}</td>
                        </tr>
                      ))}
              </tbody>
            </table>
          </div>
          </div>
        </>
      )}

      {activeTab === 2 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">ยอดรวมทั้งหมด</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {isReceiptsLoading ? '...' : receipts.filter((r) => r.status !== 'ยกเลิก').reduce((s, r) => s + r.total, 0).toLocaleString('th-TH')} ฿
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">ชำระแล้ว</p>
              <p className="mt-1 text-2xl font-bold text-green-600">
                {isReceiptsLoading ? '...' : receipts.filter((r) => r.status === 'ชำระแล้ว').length} รายการ
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">รอชำระ</p>
              <p className="mt-1 text-2xl font-bold text-amber-500">
                {isReceiptsLoading ? '...' : receipts.filter((r) => r.status === 'รอชำระ').length} รายการ
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">รายงานใบเสร็จรับเงิน</h3>
              <button onClick={() => navigate('/billing/documents')} className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">ดูทั้งหมด &rarr;</button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">เลขที่</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">ลูกค้า</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">ประเภท</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">ยอดรวม</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">วันที่</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isReceiptsLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={6} className="px-4 py-3">
                            <div className="h-4 animate-pulse rounded bg-gray-100" />
                          </td>
                        </tr>
                      ))
                    : receipts.length === 0
                      ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">ไม่มีข้อมูล</td>
                        </tr>
                      )
                      : receipts.slice(0, 5).map((row) => (
                          <tr key={row.no} className="bg-white hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">{row.no}</td>
                            <td className="px-4 py-3 text-gray-600">{row.customer}</td>
                            <td className="px-4 py-3 text-gray-600">{row.type}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">{row.total.toLocaleString('th-TH')} <span className="text-xs font-normal text-gray-500">฿</span></td>
                            <td className="px-4 py-3 text-right text-gray-500">{row.date}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={cn(
                                'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                                row.status === 'ชำระแล้ว' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                row.status === 'รอชำระ' ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' :
                                'bg-gray-50 text-gray-600 ring-gray-500/20',
                              )}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 3 && (
        <>
          {/* At-risk: overdue amount bar chart */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-gray-900">ยอดค้างชำระรายลูกค้า</h3>
              <div className="flex flex-col gap-3">
                {isAtRiskLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
                        <div className="h-4 flex-1 animate-pulse rounded bg-gray-100" />
                      </div>
                    ))
                  : (() => {
                      const topAtRiskCustomers = atRiskCustomers.slice(0, 5)
                      const maxAmt = Math.max(...topAtRiskCustomers.map((r) => r.overdue_amount), 1)
                      return topAtRiskCustomers.map((row) => (
                        <div key={row.id} className="flex items-center gap-3">
                          <span className="w-28 shrink-0 truncate text-xs text-gray-500">{row.name.split(' ')[0]}</span>
                          <div className="flex flex-1 items-center gap-2">
                            <div className="relative h-4 flex-1 overflow-hidden rounded bg-gray-100">
                              <div
                                className="h-full transition-all duration-700"
                                style={{
                                  width: `${(row.overdue_amount / maxAmt) * 100}%`,
                                  backgroundColor: row.days_overdue >= 30 ? '#EF4444' : row.days_overdue >= 15 ? '#F97316' : '#F59E0B',
                                }}
                              />
                            </div>
                            <span className="w-20 text-right text-xs font-semibold text-gray-700">
                              {(row.overdue_amount / 1000).toFixed(0)}k ฿
                            </span>
                          </div>
                        </div>
                      ))
                    })()}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-gray-900">จำแนกตามวันเกินกำหนด</h3>
              {isAtRiskLoading
                ? <div className="h-4 animate-pulse rounded bg-gray-100" />
                : (() => {
                    const groups = [
                      { label: '1–14 วัน', color: '#F59E0B', bg: 'bg-amber-400', count: atRiskCustomers.filter((r) => r.days_overdue < 15).length },
                      { label: '15–29 วัน', color: '#F97316', bg: 'bg-orange-400', count: atRiskCustomers.filter((r) => r.days_overdue >= 15 && r.days_overdue < 30).length },
                      { label: '30+ วัน', color: '#EF4444', bg: 'bg-red-500', count: atRiskCustomers.filter((r) => r.days_overdue >= 30).length },
                    ]
                    const total = atRiskCustomers.length
                    return (
                      <>
                        <div className="mb-4 flex h-4 w-full overflow-hidden rounded">
                          {groups.map((g) => g.count > 0 && (
                            <div
                              key={g.label}
                              className={cn('h-full transition-all duration-700', g.bg)}
                              style={{ width: `${(g.count / total) * 100}%` }}
                              title={`${g.label}: ${g.count} ราย`}
                            />
                          ))}
                        </div>
                        <div className="mt-4 flex flex-col gap-3">
                          {groups.map((g) => (
                            <div key={g.label} className="flex items-center gap-3">
                              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
                              <span className="flex-1 text-sm text-gray-600">{g.label}</span>
                              <span className="text-sm font-semibold text-gray-900">{g.count} ราย</span>
                              <span className="text-xs text-gray-400">({total > 0 ? ((g.count / total) * 100).toFixed(0) : 0}%)</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )
                  })()}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">ลูกค้าที่มีความเสี่ยง</h3>
            <div className="flex items-center gap-3">
              <span className="rounded-md ring-1 ring-inset ring-red-600/20 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                {atRiskCustomers.length} ราย
              </span>
              <button onClick={() => navigate('/store-loans')} className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                ดูลูกค้าทั้งหมด &rarr;
              </button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">ลูกค้า</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">เบอร์โทร</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">ประเภท</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">ยอดค้างชำระ</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">จำนวนรายการ</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">เกินกำหนด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isAtRiskLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-gray-100" />
                        </td>
                      </tr>
                    ))
                  : atRiskCustomers.length === 0
                    ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">ไม่มีข้อมูล</td>
                      </tr>
                    )
                    : atRiskCustomers.slice(0, 5).map((row) => (
                        <tr key={row.id} className="bg-white hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                          <td className="px-4 py-3 text-gray-600">{row.phone}</td>
                          <td className="px-4 py-3 text-gray-600">{row.type}</td>
                          <td className="px-4 py-3 text-right font-medium text-red-600">{row.overdue_amount.toLocaleString('th-TH')} ฿</td>
                          <td className="px-4 py-3 text-center text-gray-600">{row.overdue_count} รายการ</td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn(
                              'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                              row.days_overdue >= 30 ? 'bg-red-50 text-red-700 ring-red-600/20' :
                              row.days_overdue >= 15 ? 'bg-orange-50 text-orange-700 ring-orange-600/20' :
                              'bg-amber-50 text-amber-800 ring-amber-600/20',
                            )}>
                              {row.days_overdue} วัน
                            </span>
                          </td>
                        </tr>
                      ))}
              </tbody>
            </table>
          </div>
          </div>
        </>
      )}
    </div>
  )
}
