import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { serviceOrderService } from '@/api/serviceOrderService'
import { quotationService } from '@/api/quotationService'
import { invoiceService } from '@/api/invoiceService'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import type { ServiceOrder, ServiceOrderStatus } from '@/types/serviceOrder'
import type { Quotation, QuotationStatus } from '@/types/quotation'
import { 
  Wrench, 
  Tag, 
  ShoppingCart, 
  Zap, 
  Clock, 
  CheckCircle2, 
  Banknote, 
  Search, 
  ArrowRight,
  FileText
} from 'lucide-react'

/* ─── Flow Config ─── */
const FLOW_TYPES = [
  {
    id: 'repair',
    label: 'ซ่อมรถ',
    desc: 'รับรถ → ประเมิน → เสนอราคา → ซ่อม → จ่าย → ส่งรถ',
    icon: Wrench,
    color: 'from-blue-500 to-blue-600',
    iconColor: 'text-blue-500',
    bgLight: 'bg-blue-50 border-blue-200',
    path: '/billing/new/repair',
  },
  {
    id: 'sale',
    label: 'ขายสินค้า',
    desc: 'เสนอราคา → ชำระเงิน → ส่งมอบ (มัดจำ optional)',
    icon: Tag,
    color: 'from-emerald-500 to-emerald-600',
    iconColor: 'text-emerald-500',
    bgLight: 'bg-emerald-50 border-emerald-200',
    path: '/billing/new/sale',
  },
  {
    id: 'pos',
    label: 'ขายหน้าร้าน',
    desc: 'ยิงบาร์โค้ด / ค้นสินค้า → ชำระ → ออกบิล',
    icon: ShoppingCart,
    color: 'from-amber-500 to-amber-600',
    iconColor: 'text-amber-500',
    bgLight: 'bg-amber-50 border-amber-200',
    path: '/billing/pos',
  },
] as const

/* ─── Job Status Config ─── */
type JobStatus = 'active' | 'waiting' | 'completed' | 'cancelled'

const JOB_STATUS: Record<JobStatus, { label: string; dot: string; bg: string }> = {
  active:    { label: 'กำลังดำเนินการ', dot: 'bg-blue-500', bg: 'bg-blue-50 text-blue-700 ring-1 ring-blue-500/20' },
  waiting:   { label: 'รอดำเนินการ',  dot: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700 ring-1 ring-amber-500/20' },
  completed: { label: 'เสร็จสิ้น',    dot: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20' },
  cancelled: { label: 'ยกเลิก',       dot: 'bg-gray-400', bg: 'bg-gray-50 text-gray-600 ring-1 ring-gray-500/20' },
}

/* ─── Summary Cards ─── */
interface SummaryData {
  active: number
  waiting: number
  completedToday: number
  totalRevenue: number
}

function SummaryCards({ data }: { data: SummaryData }) {
  const cards = [
    { label: 'กำลังดำเนินการ', value: data.active, color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-100', icon: Zap, gradient: 'from-blue-500 to-cyan-400', glow: 'bg-blue-400' },
    { label: 'รอดำเนินการ', value: data.waiting, color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-100', icon: Clock, gradient: 'from-amber-400 to-orange-400', glow: 'bg-amber-400' },
    { label: 'เสร็จวันนี้', value: data.completedToday, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100', icon: CheckCircle2, gradient: 'from-emerald-400 to-teal-400', glow: 'bg-emerald-400' },
    { label: 'รายได้วันนี้', value: data.totalRevenue, color: 'text-violet-600', bg: 'bg-violet-50', ring: 'ring-violet-100', icon: Banknote, isCurrency: true, gradient: 'from-violet-500 to-purple-500', glow: 'bg-violet-400' },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <div key={c.label} className="group relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/50 hover:ring-gray-300">
            {/* Top accent line */}
            <div className={cn('absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r opacity-80 transition-opacity duration-300 group-hover:opacity-100', c.gradient)} />
            
            <div className="flex items-center justify-between relative z-10">
              <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl ring-1 transition-transform duration-300 group-hover:scale-110', c.bg, c.ring, c.color)}>
                <Icon className="h-6 w-6" strokeWidth={2} />
              </div>
              <span className={cn("rounded-full px-3 py-1 text-xs font-bold tracking-wide", c.bg, c.color)}>
                {c.label}
              </span>
            </div>
            
            <div className="mt-6 flex items-baseline gap-2 relative z-10">
              <span className="text-4xl font-black tracking-tight text-gray-900">
                {c.isCurrency ? `฿${c.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : c.value}
              </span>
            </div>

            {/* Subtle background glow effect on hover */}
            <div className={cn("absolute -bottom-10 -right-10 h-40 w-40 rounded-full blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-15", c.glow)} />
            
            {/* Watermark icon */}
            <div className="absolute -bottom-6 -right-6 opacity-[0.02] pointer-events-none text-gray-900 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12">
              <Icon className="h-36 w-36" strokeWidth={1.5} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Flow Quick-Action Card ─── */
function FlowCard({ flow, onClick }: { flow: typeof FLOW_TYPES[number]; onClick: () => void }) {
  const Icon = flow.icon
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl bg-white p-6 text-left shadow-sm ring-1 ring-gray-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:ring-gray-300"
    >
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-[0.03]', flow.color)} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 ring-1 ring-gray-100 transition-transform duration-300 group-hover:scale-110 group-hover:bg-white', flow.iconColor)}>
            <Icon className="h-6 w-6" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors group-hover:bg-gray-100 group-hover:text-gray-900">
            สร้างงาน <ArrowRight className="h-3 w-3" />
          </span>
        </div>
        <h3 className="mt-4 text-xl font-bold text-gray-900">{flow.label}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">{flow.desc}</p>
      </div>
    </button>
  )
}

/* ─── Job Row ─── */
interface JobItem {
  id: number
  jobNumber: string
  flowType: 'repair' | 'sale' | 'pos'
  sourceKey: string
  customerName: string
  description: string
  currentStep: string
  assignedTo: string
  status: JobStatus
  updatedAt: string
}

const SO_STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  draft: 'ร่าง', pending_review: 'รอตรวจ', pending_quote: 'รอเสนอราคา', approved: 'อนุมัติ',
  in_progress: 'กำลังซ่อม', completed: 'ซ่อมเสร็จ', pending_payment: 'รอชำระ',
  pending_pickup: 'รอรับรถ', closed: 'ปิดงาน', cancelled: 'ยกเลิก',
}

const QT_STATUS_LABEL: Record<QuotationStatus, string> = {
  draft: 'ร่าง', sent: 'รอลูกค้า', approved: 'อนุมัติ', rejected: 'ปฏิเสธ', expired: 'หมดอายุ',
}

function soToJob(so: ServiceOrder): JobItem {
  const c = so.customer
  const cName = c ? (c.type === 'corporate' ? (c.company_name ?? '') : `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim()) : ''
  const v = so.vehicle
  const desc = [v?.brand, v?.model, v?.plate_number].filter(Boolean).join(' ') + (so.symptom ? ` / ${so.symptom}` : '')
  let status: JobStatus = 'waiting'
  if (['in_progress', 'pending_payment', 'pending_pickup'].includes(so.status)) status = 'active'
  else if (so.status === 'closed') status = 'completed'
  else if (so.status === 'cancelled') status = 'cancelled'
  return {
    id: so.id, jobNumber: so.so_number, flowType: 'repair', sourceKey: `repair:${so.id}`,
    customerName: cName || '—', description: desc || '—',
    currentStep: SO_STATUS_LABEL[so.status] ?? so.status,
    assignedTo: so.technician ? `${so.technician.first_name ?? ''} ${so.technician.last_name ?? ''}`.trim() || '—' : '—',
    status, updatedAt: so.updated_at ?? so.created_at ?? '',
  }
}

function qtToJob(qt: Quotation): JobItem {
  const c = qt.customer
  const cName = c ? (c.type === 'corporate' ? (c.company_name ?? '') : `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim()) : ''
  let status: JobStatus = 'waiting'
  if (qt.status === 'approved') status = 'active'
  else if (qt.status === 'rejected' || qt.status === 'expired') status = 'cancelled'
  return {
    id: qt.id, jobNumber: qt.quotation_no, flowType: 'sale', sourceKey: `sale:${qt.id}`,
    customerName: cName || '—', description: qt.note ?? '—',
    currentStep: QT_STATUS_LABEL[qt.status] ?? qt.status, assignedTo: '—',
    status, updatedAt: qt.updated_at ?? qt.created_at ?? '',
  }
}

function formatRelative(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'เมื่อสักครู่'
  if (m < 60) return `${m} นาทีที่แล้ว`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ชม. ที่แล้ว`
  const days = Math.floor(h / 24)
  return `${days} วัน ที่แล้ว`
}

/* ─── Main Page ─── */
export function BillingHubPage() {
  const navigate = useNavigate()
  const { permissions } = useAuthStore()
  const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('')
  const [search, setSearch] = useState('')
  const [jobs, setJobs] = useState<JobItem[]>([])
  const [summary, setSummary] = useState<SummaryData>({ active: 0, waiting: 0, completedToday: 0, totalRevenue: 0 })
  const [loading, setLoading] = useState(true)

  const canCreateSO = hasPermission(permissions, 'service_orders', 'can_create')
  const canCreateQT = hasPermission(permissions, 'quotations', 'can_create')
  const canCreateINV = hasPermission(permissions, 'invoices', 'can_create')

  useEffect(() => {
    let cancelled = false
    const today = new Date().toISOString().split('T')[0]
    setLoading(true)
    Promise.all([
      serviceOrderService.getSummary().then((r) => r.data.data).catch(() => null),
      serviceOrderService.getServiceOrders({ page: 1, limit: 50 }).then((r) => r.data.data ?? []).catch(() => []),
      quotationService.getQuotations({ type: 'sale', page: 1, limit: 50 }).then((r) => r.data.data ?? []).catch(() => []),
      invoiceService.getInvoices({ status: 'paid', date_from: today, limit: 100 }).then((r) => r.data.data ?? []).catch(() => []),
    ]).then(([soSummary, sos, saleQts, paidInvs]) => {
      if (cancelled) return
      const merged = [...sos.map(soToJob), ...saleQts.map(qtToJob)]
        .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
      setJobs(merged)
      const active = soSummary ? (soSummary.in_progress + soSummary.pending_payment + soSummary.pending_pickup) : 0
      const waiting = soSummary ? (soSummary.draft + soSummary.pending_review + soSummary.pending_quote + soSummary.approved + soSummary.completed) : 0
      const totalRevenue = paidInvs.reduce((s, i) => s + (Number(i.grand_total) || 0), 0)
      setSummary({
        active,
        waiting,
        completedToday: paidInvs.length,
        totalRevenue,
      })
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filteredJobs = jobs.filter((j) => {
    if (statusFilter && j.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        j.jobNumber.toLowerCase().includes(q) ||
        j.customerName.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">บิล / เอกสาร</h1>
          <p className="mt-2 text-sm text-gray-500">จัดการงานซ่อม ขาย และเอกสารทั้งหมดในที่เดียว</p>
        </div>
      </div>

      {/* Summary */}
      <SummaryCards data={summary} />

      {/* Quick Actions */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-gray-900">สร้างงานใหม่</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FLOW_TYPES.map((flow) => {
            if (flow.id === 'repair' && !canCreateSO) return null
            if (flow.id === 'sale' && !canCreateQT) return null
            if (flow.id === 'pos' && !canCreateINV) return null
            return (
              <FlowCard
                key={flow.id}
                flow={flow}
                onClick={() => navigate(flow.path)}
              />
            )
          })}
        </div>
      </div>

      {/* Job List */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold tracking-tight text-gray-900">รายการงาน</h2>
            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
            <Link to="/billing/documents" className="group inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700">
              <FileText className="h-4 w-4" />
              <span>ค้นหาเอกสารทั้งหมด</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:min-w-[240px]">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="ค้นหาเลขงาน / ชื่อลูกค้า..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border-0 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-900 ring-1 ring-inset ring-gray-200 transition-all placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-600"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['', 'active', 'waiting', 'completed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s as JobStatus | '')}
                  className={cn(
                    'whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all',
                    statusFilter === s
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-100'
                  )}
                >
                  {s === '' ? 'ทั้งหมด' : JOB_STATUS[s].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Jobs Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">งาน</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ลูกค้า / รายละเอียด</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ขั้นตอน</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ผู้รับผิดชอบ</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">สถานะ</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">อัปเดตล่าสุด</th>
                <th className="relative px-6 py-4"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                      กำลังโหลดข้อมูล...
                    </div>
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-100">
                        <FileText className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="mt-4 text-sm font-medium text-gray-900">ไม่พบรายการงาน</p>
                      <p className="mt-1 text-sm text-gray-500">ลองปรับตัวกรองหรือค้นหาด้วยคำอื่น</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const st = JOB_STATUS[job.status]
                  const FlowIcon = FLOW_TYPES.find(f => f.id === job.flowType)?.icon || FileText
                  return (
                    <tr key={job.sourceKey} className="group transition-colors hover:bg-blue-50/40">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 ring-1 ring-gray-100', FLOW_TYPES.find(f => f.id === job.flowType)?.iconColor)}>
                            <FlowIcon className="h-4 w-4" />
                          </div>
                          <Link
                            to={`/billing/jobs/${job.sourceKey}`}
                            className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                          >
                            {job.jobNumber}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{job.customerName}</div>
                        <div className="mt-0.5 text-sm text-gray-500 line-clamp-1">{job.description}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="text-sm font-medium text-gray-700">{job.currentStep}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200">
                          {job.assignedTo}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', st.bg)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />
                          {st.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-500">
                        {formatRelative(job.updatedAt)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <Link
                          to={`/billing/jobs/${job.sourceKey}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-100 hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
