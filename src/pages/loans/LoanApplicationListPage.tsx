import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { loanService } from '@/api/loanService'
import type { LoanApplication, LoanApplicationStatus } from '@/types/loans'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { hrService } from '@/api/hrService'
import type { FinanceCompany } from '@/types/hr'

const STATUS_CONFIG: Record<LoanApplicationStatus, { label: string; className: string }> = {
  pending: { label: 'รอผล', className: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'อนุมัติ', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'ปฏิเสธ', className: 'bg-red-100 text-red-700' },
  cancelled: { label: 'ยกเลิก', className: 'bg-gray-100 text-gray-500' },
}

const formatDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const formatMoney = (n?: number | null) =>
  n != null ? n.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '—'

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35" />
    </svg>
  )
}

export function LoanApplicationListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { permissions } = useAuthStore()

  const [items, setItems] = useState<LoanApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [financeCompanies, setFinanceCompanies] = useState<FinanceCompany[]>([])

  const search = searchParams.get('search') ?? ''
  const statusFilter = (searchParams.get('status') ?? '') as LoanApplicationStatus | ''
  const financeFilter = searchParams.get('finance_company_id') ?? ''
  const dateFrom = searchParams.get('date_from') ?? ''
  const dateTo = searchParams.get('date_to') ?? ''
  const page = Number(searchParams.get('page') ?? '1')
  const limit = 20

  const canCreate = hasPermission(permissions, 'loan_applications', 'can_create')

  const load = useCallback(() => {
    setIsLoading(true)
    loanService.getLoanApplications({
      search: search || undefined,
      status: statusFilter || undefined,
      finance_company_id: financeFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page,
      limit,
    })
      .then((res) => {
        setItems(res.data.data)
        setTotal(res.data.pagination.total)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [search, statusFilter, financeFilter, dateFrom, dateTo, page, limit])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    hrService.getFinanceCompanies()
      .then((res) => setFinanceCompanies(res.data.data))
      .catch(() => {})
  }, [])

  const setParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('page')
      return next
    })
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">สมัครสินเชื่อไฟแนนซ์</h1>
        {canCreate && (
          <Link
            to="/loan-applications/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <PlusIcon /> สร้างคำขอใหม่
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="ค้นหาชื่อ, เบอร์โทร..."
              value={search}
              onChange={(e) => setParam('search', e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setParam('status', e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">ทุกสถานะ</option>
            <option value="pending">รอผล</option>
            <option value="approved">อนุมัติ</option>
            <option value="rejected">ปฏิเสธ</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
          <select
            value={financeFilter}
            onChange={(e) => setParam('finance_company_id', e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">ทุกบริษัทไฟแนนซ์</option>
            {financeCompanies.map((fc) => (
              <option key={fc.id} value={fc.id}>{fc.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setParam('date_from', e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setParam('date_to', e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">เลขที่คำขอ</th>
                <th className="px-4 py-3 font-medium">ชื่อผู้กู้</th>
                <th className="px-4 py-3 font-medium">บริษัทไฟแนนซ์</th>
                <th className="px-4 py-3 font-medium text-right">ยอดขอกู้</th>
                <th className="px-4 py-3 font-medium">วันที่ยื่น</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-gray-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                    ไม่พบรายการ
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const cfg = STATUS_CONFIG[item.status]
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.application_no}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{item.applicant_name}</td>
                      <td className="px-4 py-3 text-gray-600">{item.finance_company?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{formatMoney(item.amount_requested)} ฿</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(item.applied_date)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.className)}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/loan-applications/${item.id}`}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                            title="ดูรายละเอียด"
                          >
                            <EyeIcon />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">ทั้งหมด {total} รายการ</p>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('page', String(p)); return n })}
                  className={cn(
                    'h-8 w-8 rounded text-xs',
                    p === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
