import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { serviceOrderService } from '@/api/serviceOrderService'
import { hrService } from '@/api/hrService'
import type { ServiceOrder, ServiceOrderStatus, ServiceOrderSummary } from '@/types/serviceOrder'
import type { Branch } from '@/types/hr'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'

// ── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ServiceOrderStatus, { label: string; className: string }> = {
  draft:           { label: 'ร่าง',             className: 'bg-gray-100 text-gray-600' },
  pending_review:  { label: 'รอตรวจสอบ',        className: 'bg-yellow-100 text-yellow-700' },
  pending_quote:   { label: 'รอเสนอราคา',       className: 'bg-orange-100 text-orange-700' },
  approved:        { label: 'อนุมัติแล้ว',      className: 'bg-blue-100 text-blue-700' },
  in_progress:     { label: 'กำลังซ่อม',        className: 'bg-purple-100 text-purple-700' },
  completed:       { label: 'ซ่อมเสร็จ',        className: 'bg-green-100 text-green-600' },
  pending_payment: { label: 'รอชำระ',            className: 'bg-red-100 text-red-700' },
  pending_pickup:  { label: 'รอรับรถ',           className: 'bg-pink-100 text-pink-700' },
  closed:          { label: 'ปิดงาน',            className: 'bg-green-100 text-green-800' },
  cancelled:       { label: 'ยกเลิก',            className: 'bg-gray-200 text-gray-500' },
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

function getCustomerName(so: ServiceOrder): string {
  const c = so.customer
  if (!c) return `ลูกค้า #${so.customer_id}`
  if (c.type === 'corporate') return c.company_name || `ลูกค้า #${c.id}`
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || `ลูกค้า #${c.id}`
}

function getTechnicianName(so: ServiceOrder): string {
  const t = so.technician
  if (!t) return 'ยังไม่มอบหมาย'
  return [t.first_name, t.last_name].filter(Boolean).join(' ') || `ช่าง #${t.id}`
}

const formatDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export function ServiceOrderListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { permissions } = useAuthStore()

  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [summary, setSummary] = useState<ServiceOrderSummary | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  const search = searchParams.get('search') ?? ''
  const statusFilter = (searchParams.get('status') ?? '') as ServiceOrderStatus | ''
  const branchFilter = searchParams.get('branch_id') ?? ''
  const dateFrom = searchParams.get('date_from') ?? ''
  const dateTo = searchParams.get('date_to') ?? ''
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
      const [ordersRes, summaryRes] = await Promise.all([
        serviceOrderService.getServiceOrders({
          search: search || undefined,
          status: statusFilter || undefined,
          branch_id: branchFilter ? Number(branchFilter) : undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          page,
          limit,
        }),
        serviceOrderService.getSummary(),
      ])
      setOrders(ordersRes.data.data)
      setTotal(ordersRes.data.pagination.total)
      if (summaryRes.data.success) setSummary(summaryRes.data.data)
    } catch {
      setOrders([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }, [search, statusFilter, branchFilter, dateFrom, dateTo, page])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    hrService.getBranches().then((res) => {
      if (res.data.success) setBranches(res.data.data as Branch[])
    }).catch(() => {})
  }, [])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const res = await serviceOrderService.exportServiceOrders({
        search: search || undefined,
        status: statusFilter || undefined,
        branch_id: branchFilter ? Number(branchFilter) : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      const blob = new Blob([res.data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'service-orders.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    } finally {
      setIsExporting(false)
    }
  }

  const totalPages = Math.ceil(total / limit)
  const canCreate = hasPermission(permissions, 'service_orders', 'can_create')
  const canExport = hasPermission(permissions, 'service_orders', 'can_export')

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ใบสั่งซ่อม</h1>
          <p className="mt-1 text-sm text-gray-500">จัดการใบสั่งซ่อมทั้งหมด</p>
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
              onClick={() => navigate('/service-orders/create')}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <PlusIcon />
              สร้างใบสั่งซ่อม
            </button>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      {summary && (
        <div className="grid grid-cols-5 gap-2 lg:grid-cols-10">
          {(Object.keys(STATUS_CONFIG) as ServiceOrderStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setParam('status', statusFilter === s ? '' : s)}
              className={cn(
                'rounded-lg border px-2 py-2 text-center transition-colors',
                statusFilter === s
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                  : 'border-gray-200 bg-white hover:bg-gray-50',
              )}
            >
              <div className={cn('text-lg font-bold', STATUS_CONFIG[s].className.split(' ')[1])}>
                {summary[s]}
              </div>
              <div className="mt-0.5 text-xs text-gray-500">{STATUS_CONFIG[s].label}</div>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="relative flex-1 min-w-48">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="ค้นหาเลข SO / ชื่อลูกค้า / ทะเบียนรถ..."
            value={search}
            onChange={(e) => setParam('search', e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="min-w-40">
          <select
            value={statusFilter}
            onChange={(e) => setParam('status', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">ทุกสถานะ</option>
            {(Object.keys(STATUS_CONFIG) as ServiceOrderStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>

        {branches.length > 0 && (
          <div className="min-w-40">
            <select
              value={branchFilter}
              onChange={(e) => setParam('branch_id', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">ทุกสาขา</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setParam('date_from', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-gray-400">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setParam('date_to', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">เลข SO</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ลูกค้า / ทะเบียน</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">สถานะ</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ช่าง</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">วันที่รับ</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">วันนัดรับ</th>
              <th className="relative px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                  ไม่พบใบสั่งซ่อม
                </td>
              </tr>
            ) : (
              orders.map((so) => {
                const cfg = STATUS_CONFIG[so.status]
                return (
                  <tr key={so.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/service-orders/${so.id}`} className="font-medium text-blue-600 hover:underline">
                        {so.so_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{getCustomerName(so)}</div>
                      {so.vehicle && (
                        <div className="text-xs text-gray-500">
                          {so.vehicle.plate_number}
                          {so.vehicle.brand ? ` · ${so.vehicle.brand}` : ''}
                          {so.vehicle.model ? ` ${so.vehicle.model}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', cfg.className)}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{getTechnicianName(so)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(so.received_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(so.expected_completion_date)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/service-orders/${so.id}`}
                        title="ดูรายละเอียด"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <EyeIcon />
                      </Link>
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
        <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3 border border-gray-200">
          <p className="text-sm text-gray-600">
            แสดง {(page - 1) * limit + 1}–{Math.min(page * limit, total)} จาก {total} รายการ
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setParam('page', String(page - 1))}
              disabled={page <= 1}
              className="rounded border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              ก่อนหน้า
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const p = i + 1
              return (
                <button
                  key={p}
                  onClick={() => setParam('page', String(p))}
                  className={cn(
                    'rounded border px-3 py-1.5 text-sm',
                    p === page
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-200 hover:bg-gray-50',
                  )}
                >
                  {p}
                </button>
              )
            })}
            <button
              onClick={() => setParam('page', String(page + 1))}
              disabled={page >= totalPages}
              className="rounded border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
