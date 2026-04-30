import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { serviceOrderService } from '@/api/serviceOrderService'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'

/* ─── Flow Config ─── */
const FLOW_TYPES = [
  {
    id: 'repair',
    label: 'ซ่อมรถ',
    desc: 'รับรถ → ประเมิน → เสนอราคา → ซ่อม → จ่าย → ส่งรถ',
    icon: '🔧',
    color: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50 border-blue-200',
    path: '/billing/new/repair',
  },
  {
    id: 'sale',
    label: 'ขายสินค้า',
    desc: 'เสนอราคา → ชำระเงิน → ส่งมอบ (มัดจำ optional)',
    icon: '🏷️',
    color: 'from-emerald-500 to-emerald-600',
    bgLight: 'bg-emerald-50 border-emerald-200',
    path: '/billing/new/sale',
  },
  {
    id: 'pos',
    label: 'ขายหน้าร้าน',
    desc: 'ยิงบาร์โค้ด / ค้นสินค้า → ชำระ → ออกบิล',
    icon: '🛒',
    color: 'from-amber-500 to-amber-600',
    bgLight: 'bg-amber-50 border-amber-200',
    path: '/billing/pos',
  },
] as const

/* ─── Job Status Config ─── */
type JobStatus = 'active' | 'waiting' | 'completed' | 'cancelled'

const JOB_STATUS: Record<JobStatus, { label: string; dot: string; bg: string }> = {
  active:    { label: 'กำลังดำเนินการ', dot: 'bg-blue-500', bg: 'bg-blue-50 text-blue-700' },
  waiting:   { label: 'รอดำเนินการ',  dot: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700' },
  completed: { label: 'เสร็จสิ้น',    dot: 'bg-green-500', bg: 'bg-green-50 text-green-700' },
  cancelled: { label: 'ยกเลิก',       dot: 'bg-gray-400', bg: 'bg-gray-100 text-gray-500' },
}

/* ─── Icons ─── */
function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
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
    { label: 'กำลังดำเนินการ', value: data.active, color: 'text-blue-600', bg: 'bg-blue-50', icon: '⚡' },
    { label: 'รอดำเนินการ', value: data.waiting, color: 'text-amber-600', bg: 'bg-amber-50', icon: '⏳' },
    { label: 'เสร็จวันนี้', value: data.completedToday, color: 'text-green-600', bg: 'bg-green-50', icon: '✅' },
    { label: 'รายได้วันนี้', value: data.totalRevenue, color: 'text-purple-600', bg: 'bg-purple-50', icon: '💰', isCurrency: true },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className={cn('rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md')}>
          <div className="flex items-center justify-between">
            <span className="text-2xl">{c.icon}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', c.bg, c.color)}>
              {c.label}
            </span>
          </div>
          <div className={cn('mt-3 text-2xl font-bold', c.color)}>
            {c.isCurrency ? `฿${c.value.toLocaleString()}` : c.value}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Flow Quick-Action Card ─── */
function FlowCard({ flow, onClick }: { flow: typeof FLOW_TYPES[number]; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-5', flow.color)} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-3xl">{flow.icon}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors group-hover:bg-gray-200">
            สร้างงาน <ArrowRightIcon />
          </span>
        </div>
        <h3 className="mt-3 text-lg font-semibold text-gray-900">{flow.label}</h3>
        <p className="mt-1 text-sm text-gray-500">{flow.desc}</p>
      </div>
    </button>
  )
}

/* ─── Mock Job Row ─── */
interface JobItem {
  id: number
  jobNumber: string
  flowType: 'repair' | 'sale' | 'pos'
  customerName: string
  description: string
  currentStep: string
  assignedTo: string
  status: JobStatus
  updatedAt: string
}

const MOCK_JOBS: JobItem[] = [
  { id: 1, jobNumber: 'JOB-2026-0051', flowType: 'repair', customerName: 'นายสมชาย ใจดี', description: 'Toyota Camry กข-1234 / เปลี่ยนหม้อน้ำ', currentStep: 'ซ่อม (6/8)', assignedTo: 'ช่างวิทย์', status: 'active', updatedAt: '2 ชม. ที่แล้ว' },
  { id: 2, jobNumber: 'JOB-2026-0050', flowType: 'sale', customerName: 'น.ส.มาลี สุขใจ', description: 'Honda Wave 125i สีแดง', currentStep: 'รอชำระ (3/4)', assignedTo: 'บัญชี', status: 'waiting', updatedAt: '4 ชม. ที่แล้ว' },
  { id: 3, jobNumber: 'JOB-2026-0049', flowType: 'repair', customerName: 'บจก.รุ่งเรือง', description: 'Isuzu D-Max มค-5678 / เช็คระยะ', currentStep: 'เสนอราคา (3/8)', assignedTo: 'หน้าร้าน', status: 'waiting', updatedAt: '5 ชม. ที่แล้ว' },
  { id: 4, jobNumber: 'JOB-2026-0048', flowType: 'sale', customerName: 'นายประสิทธิ์ ดีงาม', description: 'Honda Click 150i + อุปกรณ์เสริม', currentStep: 'ส่งมอบ (4/5)', assignedTo: 'หน้าร้าน', status: 'active', updatedAt: '1 วัน ที่แล้ว' },
  { id: 5, jobNumber: 'JOB-2026-0047', flowType: 'repair', customerName: 'นายวิชัย มั่นคง', description: 'Nissan March สก-9012 / เปลี่ยนผ้าเบรค', currentStep: 'ปิดงาน ✓', assignedTo: '—', status: 'completed', updatedAt: '1 วัน ที่แล้ว' },
]

const FLOW_ICONS: Record<string, string> = { repair: '🔧', sale: '🏷️', pos: '🛒' }

function formatDate(d: string) { return d }

/* ─── Main Page ─── */
export function BillingHubPage() {
  const navigate = useNavigate()
  const { permissions } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('')
  const [search, setSearch] = useState('')

  const canCreateSO = hasPermission(permissions, 'service_orders', 'can_create')
  const canCreateQT = hasPermission(permissions, 'quotations', 'can_create')
  const canCreateINV = hasPermission(permissions, 'invoices', 'can_create')

  // Mock summary
  const summary: SummaryData = { active: 8, waiting: 5, completedToday: 3, totalRevenue: 47500 }

  const filteredJobs = MOCK_JOBS.filter((j) => {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">บิล / เอกสาร</h1>
          <p className="mt-1 text-sm text-gray-500">จัดการงานซ่อม ขาย และเอกสารทั้งหมดในที่เดียว</p>
        </div>
      </div>

      {/* Summary */}
      <SummaryCards data={summary} />

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-800">สร้างงานใหม่</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FLOW_TYPES.map((flow) => {
            // Check permission for each flow type
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
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">รายการงาน</h2>
          <Link to="/billing/documents" className="text-sm text-blue-600 hover:underline">
            ค้นหาเอกสาร →
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 mb-3">
          <div className="relative flex-1 min-w-48">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="ค้นหาเลขงาน / ชื่อลูกค้า..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-1.5">
            {(['', 'active', 'waiting', 'completed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s as JobStatus | '')}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  statusFilter === s
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {s === '' ? 'ทั้งหมด' : JOB_STATUS[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Jobs Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">งาน</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ลูกค้า / รายละเอียด</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ขั้นตอน</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ตาใคร</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">สถานะ</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">อัปเดต</th>
                <th className="relative px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                    ไม่พบรายการงาน
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const st = JOB_STATUS[job.status]
                  return (
                    <tr key={job.id} className="group hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{FLOW_ICONS[job.flowType]}</span>
                          <Link
                            to={`/billing/jobs/${job.id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {job.jobNumber}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{job.customerName}</div>
                        <div className="text-xs text-gray-500">{job.description}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-700">{job.currentStep}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                          {job.assignedTo}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', st.bg)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{job.updatedAt}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/billing/jobs/${job.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 text-blue-500 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <ArrowRightIcon />
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
