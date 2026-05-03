import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { loanService } from '@/api/loanService'
import type { LoanSearchResult, LoanApplicationStatus, StoreLoanStatus } from '@/types/loans'
import { cn } from '@/lib/utils'

const LOAN_APP_STATUS_CONFIG: Record<LoanApplicationStatus, { label: string; className: string }> = {
  pending: { label: 'รออนุมัติ', className: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'อนุมัติแล้ว', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'ไม่อนุมัติ', className: 'bg-red-100 text-red-700' },
  cancelled: { label: 'ยกเลิก', className: 'bg-gray-100 text-gray-500' },
}

const STORE_LOAN_STATUS_CONFIG: Record<StoreLoanStatus, { label: string; className: string }> = {
  active: { label: 'กำลังผ่อน', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'ชำระครบ', className: 'bg-green-100 text-green-700' },
  overdue: { label: 'ค้างชำระ', className: 'bg-red-100 text-red-700' },
  cancelled: { label: 'ยกเลิก', className: 'bg-gray-100 text-gray-500' },
}

function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35" />
    </svg>
  )
}
function ArrowRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <polyline points="9 18 15 12 9 6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function PersonIcon() {
  return (
    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" strokeWidth={2} />
    </svg>
  )
}
function ShieldIcon() {
  return (
    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
function CreditCardIcon() {
  return (
    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" strokeWidth={2} />
      <line x1="1" y1="10" x2="23" y2="10" strokeWidth={2} />
    </svg>
  )
}

export function LoanSearchPage() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<LoanSearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSearch = async () => {
    const q = query.trim()
    if (!q) return
    setIsLoading(true)
    setHasSearched(true)
    try {
      const res = await loanService.searchLoans(q)
      setResult(res.data.data)
    } catch {
      setResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
  }

  const totalFound =
    result ? (result.as_applicant?.length ?? 0) + (result.as_guarantor?.length ?? 0) + (result.store_loans?.length ?? 0) : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ค้นหาสินเชื่อ</h1>
        <p className="mt-1 text-sm text-gray-500">ค้นหาด้วยชื่อ, เบอร์โทร, เลขบัตรประชาชน, หรือเลขสัญญา</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder="พิมพ์คำค้นหา..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={isLoading || !query.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <SearchIcon />
          )}
          ค้นหา
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      )}

      {/* No results */}
      {!isLoading && hasSearched && result && totalFound === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
          <SearchIcon />
          <p className="text-sm">ไม่พบข้อมูลที่ตรงกับ &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {/* Results */}
      {!isLoading && result && totalFound > 0 && (
        <div className="space-y-8">
          {/* ผู้กู้ */}
          {(result.as_applicant?.length ?? 0) > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                <PersonIcon />
                พบในฐานะผู้กู้ ({result.as_applicant!.length})
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {result.as_applicant!.map((hit) => {
                  const app = hit.data
                  const cfg = LOAN_APP_STATUS_CONFIG[app.status]
                  return (
                    <Link
                      key={hit.id}
                      to={`/loan-applications/${app.id}`}
                      className="group flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-gray-500">{app.application_no}</span>
                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', cfg.className)}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900">{app.applicant_name}</p>
                      {app.amount_requested && (
                        <p className="text-xs text-gray-500">
                          ขอกู้ {app.amount_requested.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                        </p>
                      )}
                      <div className="flex justify-end text-indigo-500 group-hover:text-indigo-700">
                        <ArrowRightIcon />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* ผู้ค้ำ */}
          {(result.as_guarantor?.length ?? 0) > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                <ShieldIcon />
                พบในฐานะผู้ค้ำ ({result.as_guarantor!.length})
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {result.as_guarantor!.map((hit) => {
                  const item = hit.data
                  const app = item.loan_application
                  const cfg = app ? LOAN_APP_STATUS_CONFIG[app.status] : null
                  return (
                    <Link
                      key={hit.id}
                      to={app ? `/loan-applications/${app.id}` : '#'}
                      className="group flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-amber-300 hover:shadow-md transition-all"
                    >
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      {item.phone && <p className="text-xs text-gray-500">{item.phone}</p>}
                      {app && (
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-gray-400">{app.application_no}</span>
                          {cfg && (
                            <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', cfg.className)}>
                              {cfg.label}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex justify-end text-amber-500 group-hover:text-amber-700">
                        <ArrowRightIcon />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* สินเชื่อร้าน */}
          {(result.store_loans?.length ?? 0) > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                <CreditCardIcon />
                สินเชื่อร้าน ({result.store_loans!.length})
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {result.store_loans!.map((hit) => {
                  const loan = hit.data
                  const cfg = STORE_LOAN_STATUS_CONFIG[loan.status]
                  return (
                    <Link
                      key={hit.id}
                      to={`/store-loans/${loan.id}`}
                      className="group flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-gray-500">{loan.store_loan_no}</span>
                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', cfg.className)}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900">{loan.customer_name}</p>
                      <p className="text-xs text-gray-500">
                        ค่างวด {loan.monthly_payment.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿/เดือน
                      </p>
                      <div className="flex justify-end text-blue-500 group-hover:text-blue-700">
                        <ArrowRightIcon />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
