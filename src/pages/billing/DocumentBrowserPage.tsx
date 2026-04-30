import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'

/* ─── Document Type Config ─── */
const DOC_TYPES = [
  { id: '', label: 'ทั้งหมด' },
  { id: 'SO', label: 'ใบสั่งซ่อม', color: 'bg-blue-100 text-blue-700' },
  { id: 'QT', label: 'ใบเสนอราคา', color: 'bg-purple-100 text-purple-700' },
  { id: 'INV', label: 'ใบแจ้งหนี้', color: 'bg-orange-100 text-orange-700' },
  { id: 'RCP', label: 'ใบเสร็จ', color: 'bg-green-100 text-green-700' },
  { id: 'DP', label: 'มัดจำ', color: 'bg-amber-100 text-amber-700' },
  { id: 'DN', label: 'ใบส่งมอบ', color: 'bg-pink-100 text-pink-700' },
  { id: 'WR', label: 'ใบรับประกัน', color: 'bg-teal-100 text-teal-700' },
]

/* ─── Mock Document Data ─── */
interface DocItem {
  id: number
  docNumber: string
  type: string
  customerName: string
  amount: number | null
  status: string
  date: string
  linkedJob: string | null
}

const MOCK_DOCS: DocItem[] = [
  { id: 1, docNumber: 'SO-2026-0042', type: 'SO', customerName: 'นายสมชาย ใจดี', amount: null, status: 'กำลังซ่อม', date: '28 เม.ย. 2026', linkedJob: 'JOB-2026-0051' },
  { id: 2, docNumber: 'QT-2026-0038', type: 'QT', customerName: 'นายสมชาย ใจดี', amount: 4885, status: 'อนุมัติแล้ว', date: '28 เม.ย. 2026', linkedJob: 'JOB-2026-0051' },
  { id: 3, docNumber: 'INV-2026-0035', type: 'INV', customerName: 'น.ส.มาลี สุขใจ', amount: 45000, status: 'รอชำระ', date: '27 เม.ย. 2026', linkedJob: 'JOB-2026-0050' },
  { id: 4, docNumber: 'RCP-2026-0031', type: 'RCP', customerName: 'นายประสิทธิ์ ดีงาม', amount: 38500, status: 'ชำระแล้ว', date: '27 เม.ย. 2026', linkedJob: 'JOB-2026-0048' },
  { id: 5, docNumber: 'DP-2026-0005', type: 'DP', customerName: 'น.ส.มาลี สุขใจ', amount: 5000, status: 'รับแล้ว', date: '26 เม.ย. 2026', linkedJob: 'JOB-2026-0050' },
  { id: 6, docNumber: 'DN-2026-0028', type: 'DN', customerName: 'นายวิชัย มั่นคง', amount: null, status: 'เซ็นแล้ว', date: '26 เม.ย. 2026', linkedJob: 'JOB-2026-0047' },
  { id: 7, docNumber: 'WR-2026-0021', type: 'WR', customerName: 'นายวิชัย มั่นคง', amount: null, status: 'มีผล', date: '26 เม.ย. 2026', linkedJob: 'JOB-2026-0047' },
  { id: 8, docNumber: 'INV-2026-0034', type: 'INV', customerName: 'ลูกค้าทั่วไป', amount: 1580, status: 'ชำระแล้ว', date: '26 เม.ย. 2026', linkedJob: null },
]

/* ─── Icons ─── */
function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

/* ─── Main Component ─── */
export function DocumentBrowserPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filteredDocs = MOCK_DOCS.filter((d) => {
    if (typeFilter && d.type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        d.docNumber.toLowerCase().includes(q) ||
        d.customerName.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ค้นหาเอกสาร</h1>
          <p className="mt-1 text-sm text-gray-500">ค้นหาเอกสารทุกประเภทในระบบ</p>
        </div>
        <Link
          to="/billing"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          ← กลับ Billing Hub
        </Link>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {DOC_TYPES.map((dt) => (
          <button
            key={dt.id}
            onClick={() => setTypeFilter(dt.id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              typeFilter === dt.id
                ? 'bg-gray-900 text-white'
                : dt.color || 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {dt.label}
          </button>
        ))}
      </div>

      {/* Search & Date Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="relative flex-1 min-w-48">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="ค้นเลขเอกสาร / ชื่อลูกค้า..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <span className="text-gray-400">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">เอกสาร</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ประเภท</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ลูกค้า</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">จำนวน</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">สถานะ</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">วันที่</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">งาน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredDocs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                  ไม่พบเอกสาร
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => {
                const typeConfig = DOC_TYPES.find((dt) => dt.id === doc.type)
                return (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <DocIcon />
                        <span className="font-medium text-blue-600 hover:underline cursor-pointer">{doc.docNumber}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', typeConfig?.color)}>
                        {typeConfig?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{doc.customerName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {doc.amount ? `฿${doc.amount.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{doc.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{doc.date}</td>
                    <td className="px-4 py-3">
                      {doc.linkedJob ? (
                        <Link to={`/billing/jobs/1`} className="text-xs text-blue-600 hover:underline">
                          {doc.linkedJob}
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
