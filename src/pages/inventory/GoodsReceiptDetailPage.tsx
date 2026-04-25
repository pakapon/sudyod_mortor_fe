import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { goodsReceiptService } from '@/api/goodsReceiptService'
import type { GoodsReceipt, GoodsReceiptDocument, GoodsReceiptDocumentType, GoodsReceiptStatus } from '@/types/inventory'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<GoodsReceiptStatus, { label: string; className: string }> = {
  draft: { label: 'ร่าง', className: 'bg-gray-100 text-gray-700' },
  approved: { label: 'รับแล้ว', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ยกเลิก', className: 'bg-red-100 text-red-700' },
}
const FALLBACK_STATUS = { label: '-', className: 'bg-gray-100 text-gray-500' }

const fileTypeLabel = (t: string) => {
  switch (t) {
    case 'invoice': return 'ใบกำกับภาษี'
    case 'delivery_note': return 'ใบส่งของ'
    case 'receipt': return 'ใบเสร็จรับเงิน'
    default: return 'อื่นๆ'
  }
}
const fileTypeBadge = (t: string) => {
  switch (t) {
    case 'invoice': return 'bg-blue-50 text-blue-700'
    case 'delivery_note': return 'bg-emerald-50 text-emerald-700'
    case 'receipt': return 'bg-amber-50 text-amber-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

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
function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

const formatDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const formatDateTime = (s?: string | null) =>
  s
    ? new Date(s).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

const formatFileSize = (bytes?: number) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatPerson = (p?: { first_name: string; last_name: string } | null) =>
  p ? `${p.first_name} ${p.last_name}`.trim() : '—'

export function GoodsReceiptDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { permissions } = useAuthStore()

  const [data, setData] = useState<GoodsReceipt | null>(null)
  const [documents, setDocuments] = useState<GoodsReceiptDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isApproving, setIsApproving] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const canEdit = hasPermission(permissions, 'goods_receipts', 'can_edit')
  const canApprove = hasPermission(permissions, 'goods_receipts', 'can_approve')
  const canCancel = hasPermission(permissions, 'goods_receipts', 'can_cancel')

  const reload = useRef<() => void>(() => {})

  useEffect(() => {
    if (!id) return
    const load = () => {
      setIsLoading(true)
      goodsReceiptService.getGoodsReceipt(Number(id))
        .then((res) => {
          setData(res.data.data)
          setDocuments(res.data.data.documents ?? [])
        })
        .catch(() => navigate('/goods-receipts', { replace: true }))
        .finally(() => setIsLoading(false))
    }
    reload.current = load
    load()
  }, [id, navigate])

  const handleApprove = async () => {
    if (!id || !window.confirm('ยืนยันการอนุมัติใบรับสินค้านี้?')) return
    setIsApproving(true)
    try {
      await goodsReceiptService.approveGoodsReceipt(Number(id))
      reload.current()
    } catch {
      // interceptor handles display
    } finally {
      setIsApproving(false)
    }
  }

  const handleCancel = async () => {
    if (!id) return
    const note = window.prompt('เหตุผลในการยกเลิก (ไม่บังคับ)') ?? undefined
    if (note === null) return
    setIsCancelling(true)
    try {
      await goodsReceiptService.cancelGoodsReceipt(Number(id), note || undefined)
      reload.current()
    } catch {
      // interceptor handles display
    } finally {
      setIsCancelling(false)
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
  const totalAmount = (data.items ?? []).reduce(
    (sum, it) => sum + (Number(it.qty) || 0) * (Number(it.cost_price) || 0),
    0,
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/goods-receipts" className="text-gray-400 hover:text-gray-600">
            <ChevronLeftIcon />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ใบรับสินค้า</h1>
            <p className="font-mono text-xs text-gray-500">{data.receipt_no}</p>
          </div>
          <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', statusCfg.className)}>
            {statusCfg.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isDraft && canEdit && (
            <Link
              to={`/goods-receipts/${data.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <PencilIcon /> แก้ไข
            </Link>
          )}
          {isDraft && canApprove && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={isApproving}
              className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {isApproving ? 'กำลังอนุมัติ...' : 'อนุมัติ'}
            </button>
          )}
          {isDraft && canCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isCancelling}
              className="rounded-lg border border-red-200 px-4 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {isCancelling ? 'กำลังยกเลิก...' : 'ยกเลิก'}
            </button>
          )}
        </div>
      </div>

      {/* General info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">ข้อมูลทั่วไป</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">คลังสินค้า</dt>
            <dd className="mt-0.5 text-sm text-gray-900">
              {data.warehouse?.name ?? (data.warehouse_id ? `#${data.warehouse_id}` : '—')}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Vendor</dt>
            <dd className="mt-0.5 text-sm text-gray-900">
              {data.vendor?.name ?? (data.vendor_id ? `#${data.vendor_id}` : '—')}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">เลขอ้างอิง</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{data.reference_no || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">วันที่รับสินค้า</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{formatDate(data.received_date)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-gray-500">หมายเหตุ</dt>
            <dd
              className="prose prose-sm mt-0.5 max-w-none text-sm text-gray-900"
              dangerouslySetInnerHTML={{ __html: data.notes || '<span class="text-gray-400">—</span>' }}
            />
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
                  <th className="px-4 py-2 font-medium text-right">ราคาทุน</th>
                  <th className="px-4 py-2 font-medium text-right">รวม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((it) => {
                  const sub = (Number(it.qty) || 0) * (Number(it.cost_price) || 0)
                  return (
                    <tr key={it.id}>
                      <td className="px-4 py-2 font-mono text-xs text-gray-600">{it.product?.sku ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-900">{it.product?.name ?? `#${it.product_id}`}</td>
                      <td className="px-4 py-2 text-right text-gray-900">
                        {Number(it.qty).toLocaleString('th-TH')} {it.product?.unit?.name ?? ''}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700">
                        {Number(it.cost_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">
                        {sub.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td colSpan={4} className="px-4 py-3 text-right text-sm text-gray-500">ยอดรวม</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">เอกสารแนบ</h2>
        {documents.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">ไม่มีเอกสารแนบ</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 py-2">
                <FileIcon />
                <span className={cn('inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium', fileTypeBadge(doc.file_type))}>
                  {fileTypeLabel(doc.file_type)}
                </span>
                <div className="flex-1 min-w-0">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm text-blue-600 hover:underline"
                  >
                    {doc.file_name}
                  </a>
                  {doc.note && <p className="truncate text-xs text-gray-400">{doc.note}</p>}
                </div>
                {doc.file_size != null && <span className="text-xs text-gray-400">{formatFileSize(doc.file_size)}</span>}
              </li>
            ))}
          </ul>
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
          <div>
            <dt className="text-xs text-gray-500">รับสินค้าโดย</dt>
            <dd className="mt-0.5 text-gray-900">
              {typeof data.received_by === 'object' ? formatPerson(data.received_by) : data.received_by ? `#${data.received_by}` : '—'}
            </dd>
            <dd className="text-xs text-gray-400">{formatDateTime(data.received_at)}</dd>
          </div>
          {data.status === 'approved' && (
            <div>
              <dt className="text-xs text-gray-500">อนุมัติโดย</dt>
              <dd className="mt-0.5 text-gray-900">{formatPerson(data.approved_by)}</dd>
              <dd className="text-xs text-gray-400">{formatDateTime(data.approved_at)}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}
