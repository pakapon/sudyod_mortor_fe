import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { stockTransferService } from '@/api/stockTransferService'
import type { StockTransfer, StockTransferStatus } from '@/types/inventory'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

const STATUS_CONFIG: Record<StockTransferStatus, { label: string; className: string }> = {
  draft: { label: 'ร่าง', className: 'bg-gray-100 text-gray-700' },
  approved: { label: 'อนุมัติแล้ว', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'เสร็จสิ้น', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ยกเลิก', className: 'bg-red-100 text-red-700' },
}
const FALLBACK_STATUS = { label: '-', className: 'bg-gray-100 text-gray-500' }

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  )
}

const formatDateTime = (s?: string | null) =>
  s
    ? new Date(s).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

const formatPerson = (p?: { first_name: string; last_name: string } | null) =>
  p ? `${p.first_name} ${p.last_name}`.trim() : '—'

export function StockTransferDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { permissions } = useAuthStore()

  const [data, setData] = useState<StockTransfer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isApproving, setIsApproving] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const [approveOpen, setApproveOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const canEdit = hasPermission(permissions, 'stock_transfers', 'can_edit')
  const canApprove = hasPermission(permissions, 'stock_transfers', 'can_approve')
  const canCancel = hasPermission(permissions, 'stock_transfers', 'can_approve')

  const reload = useRef<() => void>(() => {})

  useEffect(() => {
    if (!id) return
    const load = () => {
      setIsLoading(true)
      stockTransferService.getStockTransfer(Number(id))
        .then((res) => setData(res.data.data))
        .catch(() => navigate('/stock-transfers', { replace: true }))
        .finally(() => setIsLoading(false))
    }
    reload.current = load
    load()
  }, [id, navigate])

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await stockTransferService.approveStockTransfer(Number(id))
      reload.current()
    } catch {
      // interceptor handles display
    } finally {
      setIsApproving(false)
      setApproveOpen(false)
    }
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      await stockTransferService.completeStockTransfer(Number(id))
      reload.current()
    } catch {
      // interceptor handles display
    } finally {
      setIsCompleting(false)
      setCompleteOpen(false)
    }
  }

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      await stockTransferService.cancelStockTransfer(Number(id), cancelReason || undefined)
      reload.current()
    } catch {
      // interceptor handles display
    } finally {
      setIsCancelling(false)
      setCancelOpen(false)
      setCancelReason('')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 rounded bg-gray-100 animate-pulse" />
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 rounded bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const statusCfg = STATUS_CONFIG[data.status] ?? FALLBACK_STATUS
  const isDraft = data.status === 'draft'
  const isApproved = data.status === 'approved'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/stock-transfers" className="text-gray-400 hover:text-gray-600">
            <ChevronLeftIcon />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ใบโอนย้ายสต็อก</h1>
            <p className="font-mono text-xs text-gray-500">{data.transfer_no}</p>
          </div>
          <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', statusCfg.className)}>
            {statusCfg.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isDraft && canEdit && (
            <Link
              to={`/stock-transfers/${data.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <PencilIcon /> แก้ไข
            </Link>
          )}
          {isDraft && canApprove && (
            <button
              type="button"
              onClick={() => setApproveOpen(true)}
              className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              อนุมัติ
            </button>
          )}
          {isApproved && canApprove && (
            <button
              type="button"
              onClick={() => setCompleteOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              ดำเนินการเสร็จสิ้น
            </button>
          )}
          {(isDraft || isApproved) && canCancel && (
            <button
              type="button"
              onClick={() => { setCancelReason(''); setCancelOpen(true) }}
              className="rounded-lg border border-red-200 px-4 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              ยกเลิก
            </button>
          )}
        </div>
      </div>

      {/* General info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">ข้อมูลทั่วไป</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">สาขา</dt>
            <dd className="mt-0.5 text-sm text-gray-900">
              {data.branch?.name ?? (data.branch_id ? `#${data.branch_id}` : '—')}
            </dd>
          </div>
          <div />
          <div>
            <dt className="text-xs text-gray-500">จากคลัง</dt>
            <dd className="mt-0.5 text-sm text-gray-900">
              {data.from_warehouse?.name ?? (data.from_warehouse_id ? `#${data.from_warehouse_id}` : '—')}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">ไปคลัง</dt>
            <dd className="mt-0.5 text-sm text-gray-900">
              {data.to_warehouse?.name ?? (data.to_warehouse_id ? `#${data.to_warehouse_id}` : '—')}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-gray-500">เหตุผล / หมายเหตุ</dt>
            <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-line">
              {data.reason || <span className="text-gray-400">—</span>}
            </dd>
          </div>
        </dl>
      </div>

      {/* Items */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">รายการสินค้า</h2>
        {!data.items?.length ? (
          <p className="py-6 text-center text-sm text-gray-400">ไม่มีรายการสินค้า</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">SKU</th>
                  <th className="px-4 py-2 font-medium">สินค้า</th>
                  <th className="px-4 py-2 font-medium text-right">จำนวน</th>
                  <th className="px-4 py-2 font-medium">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-4 py-2 font-mono text-xs text-gray-600">{it.product?.sku ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-900">{it.product?.name ?? `#${it.product_id}`}</td>
                    <td className="px-4 py-2 text-right text-gray-900">
                      {Number(it.quantity).toLocaleString('th-TH')} {it.product?.unit?.name ?? ''}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{it.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">ประวัติการดำเนินการ</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-xs text-gray-500">สร้างโดย</dt>
            <dd className="mt-0.5 text-gray-900">{formatPerson(data.created_by)}</dd>
            <dd className="text-xs text-gray-400">{formatDateTime(data.created_at)}</dd>
          </div>
          {data.approved_at && (
            <div>
              <dt className="text-xs text-gray-500">อนุมัติโดย</dt>
              <dd className="mt-0.5 text-gray-900">{formatPerson(data.approved_by)}</dd>
              <dd className="text-xs text-gray-400">{formatDateTime(data.approved_at)}</dd>
            </div>
          )}
          {data.completed_at && (
            <div>
              <dt className="text-xs text-gray-500">เสร็จสิ้นโดย</dt>
              <dd className="mt-0.5 text-gray-900">{formatPerson(data.completed_by)}</dd>
              <dd className="text-xs text-gray-400">{formatDateTime(data.completed_at)}</dd>
            </div>
          )}
          {data.cancelled_at && (
            <div>
              <dt className="text-xs text-gray-500">ยกเลิกเมื่อ</dt>
              <dd className="mt-0.5 text-gray-900">—</dd>
              <dd className="text-xs text-gray-400">{formatDateTime(data.cancelled_at)}</dd>
            </div>
          )}
        </dl>
      </div>

      <ConfirmModal
        isOpen={approveOpen}
        title="ยืนยันการอนุมัติ"
        message="คุณต้องการอนุมัติใบโอนย้ายสต็อกนี้ใช่หรือไม่?"
        confirmLabel="อนุมัติ"
        variant="info"
        isLoading={isApproving}
        onConfirm={handleApprove}
        onCancel={() => setApproveOpen(false)}
      />

      <ConfirmModal
        isOpen={completeOpen}
        title="ยืนยันการดำเนินการเสร็จสิ้น"
        message="คุณต้องการยืนยันว่าการโอนย้ายสต็อกเสร็จสิ้นแล้วใช่หรือไม่?"
        confirmLabel="ยืนยัน"
        variant="info"
        isLoading={isCompleting}
        onConfirm={handleComplete}
        onCancel={() => setCompleteOpen(false)}
      />

      <ConfirmModal
        isOpen={cancelOpen}
        title="ยืนยันการยกเลิก"
        message="คุณต้องการยกเลิกใบโอนย้ายสต็อกนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้"
        confirmLabel="ยกเลิกใบโอนย้าย"
        variant="danger"
        isLoading={isCancelling}
        onConfirm={handleCancel}
        onCancel={() => { setCancelOpen(false); setCancelReason('') }}
      />
    </div>
  )
}
