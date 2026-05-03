import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { customerService } from '@/api/customerService'
  import type { Customer, CustomerGrade, CustomerStatus, CustomerType } from '@/types/customer'
import { CUSTOMER_GRADE_OPTIONS, CUSTOMER_STATUS_OPTIONS, CUSTOMER_TYPE_OPTIONS } from '@/types/customer'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { ActionIconLink, ActionIconButton } from '@/components/ui/ActionIconButton'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

const GRADE_LABEL = Object.fromEntries(CUSTOMER_GRADE_OPTIONS.map((o) => [o.value, o.label])) as Record<CustomerGrade, string>
const GRADE_COLOR = Object.fromEntries(CUSTOMER_GRADE_OPTIONS.map((o) => [o.value, o.color])) as Record<CustomerGrade, string>

const STATUS_LABEL = Object.fromEntries(CUSTOMER_STATUS_OPTIONS.map((o) => [o.value, o.label])) as Record<CustomerStatus, string>
const STATUS_COLOR = Object.fromEntries(CUSTOMER_STATUS_OPTIONS.map((o) => [o.value, o.color])) as Record<CustomerStatus, string>

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

export function CustomerListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { permissions } = useAuthStore()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const search = searchParams.get('search') ?? ''
  const typeFilter = (searchParams.get('type') ?? '') as CustomerType | ''
  const statusFilter = (searchParams.get('status') ?? '') as CustomerStatus | ''
  const gradeFilter = (searchParams.get('grade') ?? '') as CustomerGrade | ''
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

  const loadCustomers = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await customerService.getCustomers({
        search: search || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        grade: gradeFilter || undefined,
        page,
        limit,
      })
      setCustomers(res.data.data || [])
      setTotal(res.data.pagination?.total ?? 0)
    } catch {
      setCustomers([])
    } finally {
      setIsLoading(false)
    }
  }, [search, typeFilter, statusFilter, gradeFilter, page])

  useEffect(() => { loadCustomers() }, [loadCustomers])

  const handleDelete = (id: number) => {
    setConfirmDeleteId(id)
  }

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    setConfirmDeleteId(null)
    setDeleteId(id)
    try {
      await customerService.deleteCustomer(id)
      loadCustomers()
    } catch {
      // interceptor handles display
    } finally {
      setDeleteId(null)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const res = await customerService.exportCustomers({
        search: search || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        grade: gradeFilter || undefined,
      })
      const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]))
      const link = document.createElement('a')
      link.href = url
      link.download = 'customers.csv'
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      // interceptor handles display
    } finally {
      setIsExporting(false)
    }
  }

  const canCreate = hasPermission(permissions, 'customers', 'can_create')
  const canEdit = hasPermission(permissions, 'customers', 'can_edit')
  const canDelete = hasPermission(permissions, 'customers', 'can_delete')
  const canExport = hasPermission(permissions, 'customers', 'can_export')

  const totalPages = Math.ceil(total / limit)
  const rowStart = (page - 1) * limit + 1
  const rowEnd = Math.min(page * limit, total)

  const getDisplayName = (c: Customer) => {
    if (c.type === 'corporate') return c.company_name ?? '—'
    return [c.first_name, c.last_name].filter(Boolean).join(' ') || '—'
  }

  const getPhone = (c: Customer) =>
    c.primary_phone ?? (c as any).phones?.find((p: any) => p.is_primary)?.number ?? (c as any).phones?.[0]?.number ?? '—'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ลูกค้า</h1>
          <p className="mt-1 text-sm text-gray-500">รายชื่อลูกค้าทั้งหมดในระบบ</p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              <DownloadIcon />
              {isExporting ? 'กำลังส่งออก...' : 'ส่งออก CSV'}
            </button>
          )}
          {canCreate && (
            <Link
              to="/customers/create"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <PlusIcon />
              สร้างลูกค้าใหม่
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="ค้นชื่อ / เบอร์โทร / รหัสลูกค้า / เลขบัตร"
              value={search}
              onChange={(e) => setParam('search', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setParam('type', e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">ประเภท (ทั้งหมด)</option>
            {CUSTOMER_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setParam('status', e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">สถานะ (ทั้งหมด)</option>
            {CUSTOMER_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={gradeFilter}
            onChange={(e) => setParam('grade', e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">เกรด (ทั้งหมด)</option>
            {CUSTOMER_GRADE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">รหัสลูกค้า</th>
                <th className="px-4 py-3 font-medium text-gray-600">ชื่อ-สกุล / ชื่อบริษัท</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">โทรศัพท์หลัก</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">เกรด</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">สถานะ</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">ยอดใช้จ่ายรวม</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">อัปเดตล่าสุด</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-gray-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    ไม่พบข้อมูลลูกค้า
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    className="cursor-pointer bg-white transition-colors hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {customer.customer_code ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{getDisplayName(customer)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{getPhone(customer)}</td>
                    <td className="px-4 py-3">
                      {customer.grade ? (
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          GRADE_COLOR[customer.grade],
                        )}>
                          {GRADE_LABEL[customer.grade]}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        STATUS_COLOR[customer.status],
                      )}>
                        {STATUS_LABEL[customer.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                      {(() => {
                        const spending =
                          customer.total_spending ??
                          (customer as any).total_amount ??
                          (customer as any).total_spent ??
                          (customer as any).total_purchase

                        return spending != null
                          ? `฿ ${Number(spending).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                          : '—'
                      })()}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {customer.updated_at
                        ? new Date(customer.updated_at).toLocaleDateString('th-TH', { dateStyle: 'short' })
                        : customer.created_at
                          ? new Date(customer.created_at).toLocaleDateString('th-TH', { dateStyle: 'short' })
                          : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {canEdit && (
                          <ActionIconLink to={`/customers/${customer.id}/edit`} title="แก้ไข" variant="edit" />
                        )}
                        {canDelete && (
                          <ActionIconButton
                            onClick={() => handleDelete(customer.id)}
                            title="ลบ"
                            variant="delete"
                            disabled={deleteId === customer.id}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <p className="text-sm text-gray-500">
            {total > 0
              ? `Showing ${rowStart.toLocaleString()}-${rowEnd.toLocaleString()} of ${total.toLocaleString()}`
              : 'ไม่พบข้อมูล'}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setParam('page', String(page - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let p: number
                if (totalPages <= 5) p = i + 1
                else if (page <= 3) p = i + 1
                else if (page >= totalPages - 2) p = totalPages - 4 + i
                else p = page - 2 + i
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setParam('page', String(p))}
                    className={cn(
                      'min-w-[32px] rounded-lg border px-2.5 py-1 text-sm',
                      p === page
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    {p}
                  </button>
                )
              })}
              {totalPages > 5 && page < totalPages - 2 && (
                <>
                  <span className="px-1 text-gray-400">...</span>
                  <button
                    type="button"
                    onClick={() => setParam('page', String(totalPages))}
                    className="min-w-[32px] rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    {totalPages}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setParam('page', String(page + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        title="ยืนยันการลบลูกค้า"
        message="คุณต้องการลบลูกค้ารายนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้"
        confirmLabel="ลบ"
        variant="danger"
        isLoading={deleteId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}