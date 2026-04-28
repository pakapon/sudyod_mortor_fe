import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { quotationService } from '@/api/quotationService'
import type { Quotation, QuotationStatus } from '@/types/quotation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

// ── Status / Type Config ──────────────────────────────────────────────────────
const STATUS_CONFIG: Record<QuotationStatus, { label: string; className: string }> = {
  draft:    { label: 'ร่าง',         className: 'bg-gray-100 text-gray-600' },
  sent:     { label: 'ส่งแล้ว',      className: 'bg-blue-100 text-blue-700' },
  approved: { label: 'อนุมัติแล้ว',  className: 'bg-green-100 text-green-700' },
  rejected: { label: 'ปฏิเสธ',       className: 'bg-red-100 text-red-700' },
  expired:  { label: 'หมดอายุ',      className: 'bg-yellow-100 text-yellow-700' },
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function PrintIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
}

const formatDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const formatCurrency = (n?: number | null) =>
  n != null ? n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

function getCustomerAddress(q: Quotation): string {
  const c = q.customer
  if (!c) return ''
  const parts = [c.address, c.sub_district, c.district, c.province, c.postal_code]
  return parts.filter(Boolean).join(' ')
}

function getCustomerName(q: Quotation): string {
  const c = q.customer
  if (!c) return `ลูกค้า #${q.customer_id}`
  if (c.type === 'corporate') return c.company_name || `ลูกค้า #${c.id}`
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || `ลูกค้า #${c.id}`
}

// ── Reject Modal ──────────────────────────────────────────────────────────────
interface RejectModalProps {
  isOpen: boolean
  isLoading: boolean
  onConfirm: (reason: string) => void
  onCancel: () => void
}

function RejectModal({ isOpen, isLoading, onConfirm, onCancel }: RejectModalProps) {
  const [reason, setReason] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setReason('')
      setTimeout(() => inputRef.current?.focus(), 50)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">ปฏิเสธใบเสนอราคา</h3>
        <label className="mb-1 block text-sm font-medium text-gray-700">เหตุผลที่ปฏิเสธ *</label>
        <textarea
          ref={inputRef}
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="ระบุเหตุผล..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={isLoading || !reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? 'กำลังบันทึก...' : 'ยืนยันการปฏิเสธ'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { permissions } = useAuthStore()

  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const [confirmSend, setConfirmSend] = useState(false)
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)

  const canEdit = hasPermission(permissions, 'quotations', 'can_edit')
  const canApprove = hasPermission(permissions, 'quotations', 'can_approve')

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    quotationService.getQuotation(Number(id))
      .then((res) => setQuotation(res.data.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [id])

  const handleSend = async () => {
    if (!id) return
    setActionLoading(true)
    try {
      await quotationService.send(Number(id))
      const res = await quotationService.getQuotation(Number(id))
      setQuotation(res.data.data)
    } catch {
      // handled globally
    } finally {
      setActionLoading(false)
      setConfirmSend(false)
    }
  }

  const handleApprove = async () => {
    if (!id) return
    setActionLoading(true)
    try {
      await quotationService.approve(Number(id))
      const res = await quotationService.getQuotation(Number(id))
      setQuotation(res.data.data)
    } catch {
      // handled globally
    } finally {
      setActionLoading(false)
      setConfirmApprove(false)
    }
  }

  const handleReject = async (reason: string) => {
    if (!id) return
    setActionLoading(true)
    try {
      await quotationService.reject(Number(id), { reject_reason: reason })
      const res = await quotationService.getQuotation(Number(id))
      setQuotation(res.data.data)
    } catch {
      // handled globally
    } finally {
      setActionLoading(false)
      setShowRejectModal(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <p className="text-lg font-medium">ไม่พบใบเสนอราคา</p>
        <Link to="/quotations" className="mt-3 text-sm text-blue-600 hover:underline">
          กลับไปหน้ารายการ
        </Link>
      </div>
    )
  }

  const status = quotation.status

  return (
    <>
    {/* ─── Screen View ─────────────────────────────────────────── */}
    <div className="space-y-6 print:hidden">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link to="/quotations" className="mt-1 p-1.5 text-gray-400 hover:text-gray-700 print:hidden">
            <BackIcon />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{quotation.quotation_no}</h1>
              <span
                className={cn(
                  'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                  STATUS_CONFIG[status].className,
                )}
              >
                {STATUS_CONFIG[status].label}
              </span>
              <span className="inline-flex rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                {quotation.type === 'service' ? 'ซ่อมรถ' : 'ขายสินค้า'}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              ลูกค้า:{' '}
              <Link
                to={`/customers/${quotation.customer_id}`}
                className="text-blue-600 hover:underline"
              >
                {getCustomerName(quotation)}
              </Link>
              {quotation.valid_until && (
                <span className="ml-4">หมดอายุ: {formatDate(quotation.valid_until)}</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {/* Print — ทุก stage */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <PrintIcon />
            ปริ้น
          </button>

          {/* Edit — ทุก stage */}
          {canEdit && (
            <Link
              to={`/quotations/${id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <EditIcon />
              แก้ไข
            </Link>
          )}

          {/* draft → Send */}
          {status === 'draft' && canEdit && (
            <button
              onClick={() => setConfirmSend(true)}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <SendIcon />
              ส่งให้ลูกค้า
            </button>
          )}

          {/* sent → Approve + Reject */}
          {status === 'sent' && canApprove && (
            <>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <XIcon />
                ปฏิเสธ
              </button>
              <button
                onClick={() => setConfirmApprove(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                <CheckIcon />
                อนุมัติ
              </button>
            </>
          )}

          {/* approved: navigate to deposit or invoice */}
          {status === 'approved' && quotation.type === 'sale' && (
            <button
              onClick={() => navigate(`/deposits/create?quotation_id=${id}`)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              รับมัดจำ
            </button>
          )}
          {status === 'approved' && (
            <button
              onClick={() => navigate(`/invoices/create-from-qt?quotation_id=${id}`)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              สร้างใบแจ้งหนี้
            </button>
          )}
        </div>
      </div>

      {/* Section 1: รายละเอียด */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-800">รายละเอียด</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">ประเภท</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {quotation.type === 'service' ? 'ซ่อมรถ' : 'ขายสินค้า'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">ลูกค้า</dt>
            <dd className="mt-1 text-sm">
              <Link
                to={`/customers/${quotation.customer_id}`}
                className="text-blue-600 hover:underline"
              >
                {getCustomerName(quotation)}
              </Link>
            </dd>
          </div>
          {quotation.service_order && (
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">ใบสั่งซ่อมอ้างอิง</dt>
              <dd className="mt-1 text-sm">
                <Link
                  to={`/service-orders/${quotation.service_order_id}`}
                  className="text-blue-600 hover:underline"
                >
                  {quotation.service_order.so_no ||
                    quotation.service_order.so_number ||
                    `SO #${quotation.service_order_id}`}
                </Link>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">หมดอายุ</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(quotation.valid_until)}</dd>
          </div>
          {quotation.note && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase text-gray-500">หมายเหตุ</dt>
              <dd className="mt-1 text-sm text-gray-900">{quotation.note}</dd>
            </div>
          )}
          {status === 'rejected' && quotation.reject_reason && (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs font-medium uppercase text-red-500">เหตุผลที่ปฏิเสธ</dt>
              <dd className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {quotation.reject_reason}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Section 2: รายการสินค้า/บริการ */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-800">รายการสินค้า/บริการ</h2>
        {(!quotation.items || quotation.items.length === 0) ? (
          <p className="py-6 text-center text-sm text-gray-400">ไม่มีรายการ</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">ประเภท</th>
                  <th className="pb-2 pr-4">สินค้า/รายการ</th>
                  <th className="pb-2 pr-4 text-right">จำนวน</th>
                  <th className="pb-2 pr-4 text-right">ราคา/หน่วย</th>
                  <th className="pb-2 pr-4 text-right">ส่วนลด</th>
                  <th className="pb-2 text-right">รวม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {quotation.items.map((item, idx) => {
                  const lineTotal =
                    item.subtotal ?? item.quantity * item.unit_price - (item.discount ?? 0)
                  return (
                    <tr key={item.id ?? idx}>
                      <td className="py-2 pr-4 text-sm text-gray-500">{idx + 1}</td>
                      <td className="py-2 pr-4 text-sm text-gray-700">
                        {item.pricing_type === 'part' ? 'อะไหล่' : 'ค่าแรง'}
                      </td>
                      <td className="py-2 pr-4 text-sm text-gray-900">
                        {item.pricing_type === 'part'
                          ? item.product_name ?? `สินค้า #${item.product_id}`
                          : item.description ?? '—'}
                      </td>
                      <td className="py-2 pr-4 text-right text-sm text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="py-2 pr-4 text-right text-sm text-gray-700">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="py-2 pr-4 text-right text-sm text-gray-700">
                        {item.discount ? formatCurrency(item.discount) : '—'}
                      </td>
                      <td className="py-2 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(lineTotal)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals Footer */}
        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-1.5 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>ราคาก่อน VAT</span>
              <span>{formatCurrency(quotation.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>VAT ({quotation.vat_percent ?? 0}%)</span>
              <span>{formatCurrency(quotation.vat_amount)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1.5 text-base font-semibold text-gray-900">
              <span>ยอดรวมทั้งสิ้น</span>
              <span>{formatCurrency(quotation.grand_total)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Confirm Send Modal */}
      <ConfirmModal
        isOpen={confirmSend}
        title="ส่งใบเสนอราคาให้ลูกค้า"
        message={`ยืนยันการส่งใบเสนอราคา ${quotation.quotation_no} ให้ลูกค้า?`}
        confirmLabel="ส่งให้ลูกค้า"
        variant="info"
        isLoading={actionLoading}
        onConfirm={handleSend}
        onCancel={() => setConfirmSend(false)}
      />

      {/* Confirm Approve Modal */}
      <ConfirmModal
        isOpen={confirmApprove}
        title="อนุมัติใบเสนอราคา"
        message={`ยืนยันการอนุมัติใบเสนอราคา ${quotation.quotation_no}?`}
        confirmLabel="อนุมัติ"
        variant="info"
        isLoading={actionLoading}
        onConfirm={handleApprove}
        onCancel={() => setConfirmApprove(false)}
      />

      {/* Reject Modal */}
      <RejectModal
        isOpen={showRejectModal}
        isLoading={actionLoading}
        onConfirm={handleReject}
        onCancel={() => setShowRejectModal(false)}
      />
    </div>

    {/* ─── Print Document ──────────────────────────────────────────── */}
    {(() => {
      const ROWS_PER_PAGE = 10
      const items = quotation.items ?? []
      const pages: typeof items[] = []
      for (let i = 0; i < Math.max(items.length, 1); i += ROWS_PER_PAGE) {
        pages.push(items.slice(i, i + ROWS_PER_PAGE))
      }
      const isLastPage = (idx: number) => idx === pages.length - 1

      const PageHeader = () => (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '2px solid #1f2937', marginBottom: '12px' }}>
            <div>
              <p style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{quotation.branch?.name ?? '—'}</p>
              {quotation.branch?.address && (
                <p style={{ fontSize: '11px', color: '#4b5563', margin: '2px 0 0' }}>{quotation.branch.address}</p>
              )}
              {quotation.branch?.tax_id && (
                <p style={{ fontSize: '11px', color: '#4b5563', margin: '1px 0 0' }}>เลขประจำตัวผู้เสียภาษี: {quotation.branch.tax_id}</p>
              )}
              {quotation.branch?.phone && (
                <p style={{ fontSize: '11px', color: '#4b5563', margin: '1px 0 0' }}>โทร: {quotation.branch.phone}</p>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>ใบเสนอราคา</p>
              <p style={{ fontSize: '12px', margin: '4px 0 0' }}>เลขที่: {quotation.quotation_no}</p>
              <p style={{ fontSize: '12px', margin: '2px 0 0' }}>วันที่: {formatDate(quotation.created_at)}</p>
              {quotation.valid_until && (
                <p style={{ fontSize: '12px', margin: '2px 0 0' }}>วันหมดอายุ: {formatDate(quotation.valid_until)}</p>
              )}
            </div>
          </div>
          <div style={{ padding: '4px 0 10px' }}>
            <p style={{ fontSize: '10px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', margin: '0 0 4px' }}>ลูกค้า</p>
            <p style={{ fontWeight: 600, fontSize: '13px', margin: 0 }}>{getCustomerName(quotation)}</p>
            {quotation.customer?.company_branch && (
              <p style={{ fontSize: '11px', color: '#4b5563', margin: '1px 0 0' }}>สาขา: {quotation.customer.company_branch}</p>
            )}
            {getCustomerAddress(quotation) && (
              <p style={{ fontSize: '11px', color: '#4b5563', margin: '1px 0 0' }}>{getCustomerAddress(quotation)}</p>
            )}
            {quotation.customer?.tax_id && (
              <p style={{ fontSize: '11px', color: '#4b5563', margin: '1px 0 0' }}>เลขประจำตัวผู้เสียภาษี: {quotation.customer.tax_id}</p>
            )}
            {quotation.customer?.primary_phone && (
              <p style={{ fontSize: '11px', color: '#4b5563', margin: '1px 0 0' }}>โทร: {quotation.customer.primary_phone}</p>
            )}
          </div>
        </div>
      )

      return (
        <div className="hidden print:block" style={{ fontFamily: 'sans-serif', fontSize: '13px', color: '#111827' }}>
          {pages.map((pageItems, pageIdx) => (
            <div
              key={pageIdx}
              style={{
                width: '100%',
                pageBreakAfter: isLastPage(pageIdx) ? 'auto' : 'always',
                ...(isLastPage(pageIdx) && {
                  height: '262mm',
                  display: 'flex',
                  flexDirection: 'column',
                }),
              }}
            >
              <PageHeader />

              {/* Items table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1f2937', color: 'white' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', width: '28px', fontWeight: 600 }}>#</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>รายการ</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: '56px', fontWeight: 600 }}>จำนวน</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: '88px', fontWeight: 600 }}>ราคา/หน่วย</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: '76px', fontWeight: 600 }}>ส่วนลด</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: '88px', fontWeight: 600 }}>รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item, idx) => {
                    const globalIdx = pageIdx * ROWS_PER_PAGE + idx
                    const lineTotal = item.subtotal ?? (item.quantity * item.unit_price - (item.discount ?? 0))
                    const name = item.pricing_type === 'part'
                      ? item.product_name ?? `สินค้า #${item.product_id}`
                      : item.description ?? '—'
                    return (
                      <tr key={item.id ?? globalIdx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '6px 8px' }}>{globalIdx + 1}</td>
                        <td style={{ padding: '6px 8px' }}>{name}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{item.quantity}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{item.discount ? formatCurrency(item.discount) : '—'}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 500 }}>{formatCurrency(lineTotal)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Last page only: totals + signature */}
              {isLastPage(pageIdx) && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ flex: 1 }}>
                      {quotation.note && (
                        <>
                          <p style={{ fontSize: '10px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', margin: '0 0 4px' }}>หมายเหตุ</p>
                          <p style={{ fontSize: '12px', whiteSpace: 'pre-wrap', margin: 0 }}>{quotation.note}</p>
                        </>
                      )}
                    </div>
                    <div style={{ width: '210px', border: '1px solid #d1d5db' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', fontSize: '12px' }}>
                        <span>ราคาก่อน VAT</span>
                        <span>{formatCurrency(quotation.subtotal)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', fontSize: '12px', borderTop: '1px solid #e5e7eb' }}>
                        <span>VAT ({quotation.vat_percent ?? 0}%)</span>
                        <span>{formatCurrency(quotation.vat_amount)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', fontSize: '14px', fontWeight: 700, borderTop: '2px solid #1f2937' }}>
                        <span>ยอดรวมทั้งสิ้น</span>
                        <span>{formatCurrency(quotation.grand_total)}</span>
                      </div>
                    </div>
                  </div>
                  {/* Spacer pushes signature to bottom */}
                  <div style={{ flex: 1 }} />
                  <div style={{ paddingTop: '16px', borderTop: '1px solid #e5e7eb', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ textAlign: 'center', width: '180px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ borderBottom: '1px solid #9ca3af', height: '36px', marginBottom: '4px' }} />
                        <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>ลูกค้า / วันที่</p>
                      </div>
                      <div style={{ textAlign: 'center', width: '180px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ borderBottom: '1px solid #9ca3af', height: '36px', marginBottom: '4px' }} />
                        <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>ผู้อนุมัติ / วันที่</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )
    })()}
  </>
  )
}
