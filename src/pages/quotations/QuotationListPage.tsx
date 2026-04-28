import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { quotationService } from '@/api/quotationService'
import type { Quotation, QuotationStatus, QuotationType } from '@/types/quotation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'

// ── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<QuotationStatus, { label: string; className: string }> = {
  draft:    { label: 'ร่าง',         className: 'bg-gray-100 text-gray-600' },
  sent:     { label: 'ส่งแล้ว',      className: 'bg-blue-100 text-blue-700' },
  approved: { label: 'อนุมัติแล้ว',  className: 'bg-green-100 text-green-700' },
  rejected: { label: 'ปฏิเสธ',       className: 'bg-red-100 text-red-700' },
  expired:  { label: 'หมดอายุ',      className: 'bg-yellow-100 text-yellow-700' },
}

const TYPE_LABELS: Record<QuotationType, string> = {
  service: 'ซ่อมรถ',
  sale: 'ขายสินค้า',
}

// ── Icons ─────────────────────────────────────────────────────────────────────
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

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function getCustomerName(q: Quotation): string {
  const c = q.customer
  if (!c) return `ลูกค้า #${q.customer_id}`
  if (c.type === 'corporate') return c.company_name || `ลูกค้า #${c.id}`
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || `ลูกค้า #${c.id}`
}

const formatDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const formatCurrency = (n?: number | null) =>
  n != null ? n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

// ── Component ─────────────────────────────────────────────────────────────────
export function QuotationListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { permissions } = useAuthStore()

  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  const search = searchParams.get('search') ?? ''
  const statusFilter = (searchParams.get('status') ?? '') as QuotationStatus | ''
  const typeFilter = (searchParams.get('type') ?? '') as QuotationType | ''
  const branchFilter = searchParams.get('branch_id') ?? ''
  const page = Number(searchParams.get('page') ?? '1')
  const limit = 20

  const setParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page') next.delete('page')
      return next
    })
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await quotationService.getQuotations({
        search: search || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        branch_id: branchFilter ? Number(branchFilter) : undefined,
        page,
        limit,
      })
      setQuotations(res.data.data)
      setTotal(res.data.pagination.total)
    } catch {
      setQuotations([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }, [search, statusFilter, typeFilter, branchFilter, page])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const res = await quotationService.exportQuotations({
        search: search || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        branch_id: branchFilter ? Number(branchFilter) : undefined,
      })
      const blob = new Blob([res.data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'quotations.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    } finally {
      setIsExporting(false)
    }
  }

  const totalPages = Math.ceil(total / limit)
  const canCreate = hasPermission(permissions, 'quotations', 'can_create')
  const canExport = hasPermission(permissions, 'quotations', 'can_export')

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ใบเสนอราคา</h1>
          <p className="mt-1 text-sm text-gray-500">จัดการใบเสนอราคาทั้งหมด</p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <DownloadIcon />
              {isExporting ? 'กำลังส่งออก...' : 'ส่งออก'}
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => navigate('/quotations/create')}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <PlusIcon />
              สร้างใบเสนอราคา
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="ค้นหาเลขที่, ชื่อลูกค้า..."
              value={search}
              onChange={(e) => setParam('search', e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setParam('status', e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">สถานะ (ทั้งหมด)</option>
            {(Object.keys(STATUS_CONFIG) as QuotationStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setParam('type', e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">ประเภท (ทั้งหมด)</option>
            <option value="service">ซ่อมรถ</option>
            <option value="sale">ขายสินค้า</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  เลขที่
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  ประเภท
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  ลูกค้า
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  ยอดรวม
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  สถานะ
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  หมดอายุ
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                    กำลังโหลด...
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                    ไม่พบรายการใบเสนอราคา
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr
                    key={q.id}
                    onClick={() => navigate(`/quotations/${q.id}`)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-mono text-sm font-medium text-gray-900">{q.quotation_no}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="text-sm text-gray-700">{TYPE_LABELS[q.type]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">{getCustomerName(q)}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(q.grand_total)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                          STATUS_CONFIG[q.status].className,
                        )}
                      >
                        {STATUS_CONFIG[q.status].label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="text-sm text-gray-600">{formatDate(q.valid_until)}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link
                        to={`/quotations/${q.id}`}
                        title="ดูรายละเอียด"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <EyeIcon />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-sm text-gray-500">
              รายการ {(page - 1) * limit + 1}–{Math.min(page * limit, total)} จาก {total}
            </p>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setParam('page', String(page - 1))}
                className="rounded border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                ก่อนหน้า
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setParam('page', String(page + 1))}
                className="rounded border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
