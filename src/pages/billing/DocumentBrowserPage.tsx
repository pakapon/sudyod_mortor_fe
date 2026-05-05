import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wrench, Tag, ShoppingCart, List, Search, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { serviceOrderService } from '@/api/serviceOrderService'
import { quotationService } from '@/api/quotationService'
import { invoiceService } from '@/api/invoiceService'
import { depositService } from '@/api/depositService'
import { warrantyService } from '@/api/warrantyService'
import type { Warranty } from '@/types/warranty'
import { drawBillingDocCanvas } from '@/lib/documentRenderers'
import type { ServiceOrder } from '@/types/serviceOrder'
import type { Quotation } from '@/types/quotation'
import type { Invoice } from '@/types/invoice'
import type { Deposit } from '@/types/deposit'

/* ─── Flow Types ─── */
interface RepairFlow {
  so: ServiceOrder
  quotation?: Quotation
  invoice?: Invoice
  warranty?: Warranty
}
interface SaleFlow {
  quotation: Quotation
  invoices: Invoice[]
  deposits: Deposit[]
  warranties: Warranty[]
}

/* ─── Status Maps ─── */
const SO_STATUS_TH: Record<string, string> = {
  draft: 'ร่าง', pending_review: 'รอตรวจ', pending_quote: 'รอเสนอราคา', approved: 'อนุมัติ',
  in_progress: 'กำลังซ่อม', completed: 'ซ่อมเสร็จ', pending_payment: 'รอชำระ',
  pending_pickup: 'รอรับรถ', closed: 'ปิดงาน', cancelled: 'ยกเลิก',
}
const QT_STATUS_TH: Record<string, string> = {
  draft: 'ร่าง', sent: 'รอลูกค้า', approved: 'อนุมัติ', rejected: 'ปฏิเสธ', expired: 'หมดอายุ',
}
const INV_STATUS_TH: Record<string, string> = {
  draft: 'ร่าง', issued: 'รอชำระ', paid: 'ชำระแล้ว', overdue: 'เกินกำหนด', cancelled: 'ยกเลิก',
}

function soStatusColor(s: string) {
  const m: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600', pending_review: 'bg-yellow-100 text-yellow-700',
    pending_quote: 'bg-orange-100 text-orange-700', approved: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-indigo-100 text-indigo-700', completed: 'bg-teal-100 text-teal-700',
    pending_payment: 'bg-amber-100 text-amber-700', pending_pickup: 'bg-purple-100 text-purple-700',
    closed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
  }
  return m[s] ?? 'bg-gray-100 text-gray-600'
}
function qtStatusColor(s: string) {
  const m: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600', sent: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', expired: 'bg-gray-100 text-gray-500',
  }
  return m[s] ?? 'bg-gray-100 text-gray-600'
}
function invStatusColor(s: string) {
  const m: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600', issued: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-500',
  }
  return m[s] ?? 'bg-gray-100 text-gray-600'
}

function customerDisplayName(c?: { first_name?: string; last_name?: string; company_name?: string; type?: string }) {
  if (!c) return '—'
  if (c.type === 'corporate') return c.company_name ?? '—'
  return `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || '—'
}
type InvoiceWithFlatReceipt = Invoice & { receipt_no?: string | null; receipt_issued_at?: string | null }
function getReceiptNo(inv?: Invoice | null): string | null {
  const i = inv as InvoiceWithFlatReceipt | undefined | null
  return i?.receipt?.receipt_no ?? i?.receipt_no ?? null
}
function getReceiptIssuedAt(inv?: Invoice | null): string | null {
  const i = inv as InvoiceWithFlatReceipt | undefined | null
  return i?.receipt?.issued_at ?? i?.receipt_issued_at ?? null
}
function fmtDate(d?: string | null) {
  if (!d) return '—'
  return d.slice(0, 10)
}
function fmtAmt(n?: number | string | null): string | null {
  const num = Number(n ?? 0)
  if (!num) return null
  return `฿${num.toLocaleString('th-TH')}`
}
function matchSearch(haystack: Array<string | null | undefined>, q: string): boolean {
  if (!q) return true
  const lower = q.toLowerCase()
  return haystack.some((s) => (s ?? '').toLowerCase().includes(lower))
}

/* ─── PDF Preview Modal ─── */
type PreviewMode = 'invoice' | 'receipt' | 'quotation' | 'warranty'
interface PdfPreviewModalProps { id: number; mode: PreviewMode; onClose: () => void }

const MODE_TITLE: Record<PreviewMode, string> = {
  invoice: 'ใบแจ้งหนี้',
  receipt: 'ใบเสร็จรับเงิน',
  quotation: 'ใบเสนอราคา',
  warranty: 'ใบรับประกัน',
}

function drawWarrantyCanvas(ctx: CanvasRenderingContext2D, w: number, h: number, wr: Warranty, ownerLabel: string) {
  const pad = 72
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)
  const tx = (text: string, x: number, y: number, size: number, color = '#111827', weight = 400) => {
    ctx.font = `${weight} ${size}px sans-serif`; ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.fillText(text, x, y)
  }
  let y = 80
  tx('ใบรับประกัน', pad, y, 48, '#111827', 700); y += 60
  ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke(); y += 40
  tx('เลขที่', pad, y, 18, '#6b7280'); tx(wr.warranty_no, pad + 160, y, 18, '#111827', 600); y += 36
  tx('เจ้าของ', pad, y, 18, '#6b7280'); tx(ownerLabel, pad + 160, y, 18, '#111827', 600); y += 36
  tx('วันเริ่ม', pad, y, 18, '#6b7280'); tx(wr.start_date?.slice(0, 10) ?? '—', pad + 160, y, 18, '#111827', 600); y += 36
  tx('วันสิ้นสุด', pad, y, 18, '#6b7280'); tx(wr.end_date?.slice(0, 10) ?? '—', pad + 160, y, 18, '#111827', 600); y += 36
  if (wr.warranty_months) { tx('ระยะเวลา', pad, y, 18, '#6b7280'); tx(`${wr.warranty_months} เดือน`, pad + 160, y, 18, '#111827', 600); y += 36 }
  if (wr.warranty_km) { tx('ระยะทาง', pad, y, 18, '#6b7280'); tx(`${wr.warranty_km.toLocaleString('th-TH')} กม.`, pad + 160, y, 18, '#111827', 600); y += 36 }
  if (wr.conditions) {
    y += 20; tx('เงื่อนไขการรับประกัน', pad, y, 18, '#374151', 600); y += 32
    const lines = wr.conditions.split('\n')
    for (const line of lines) { tx(line || ' ', pad, y, 16, '#4b5563'); y += 28 }
  }
}

function PdfPreviewModal({ id, mode, onClose }: PdfPreviewModalProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const canvas = document.createElement('canvas')
    const W = 1240; const H = 1754
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) { setError('ไม่สามารถสร้าง canvas'); setLoading(false); return }

    if (mode === 'quotation') {
      quotationService.getQuotation(id)
        .then((r) => {
          const qt = (r.data.data ?? r.data) as import('@/types/quotation').Quotation
          const branch = qt.branch ?? { name: '', address: '', phone: '', tax_id: '' }
          const items = (qt.items ?? []).map((it) => ({
            name: it.description || it.product_name || '—',
            qty: Number(it.quantity),
            unit_price: Number(it.unit_price),
            discount: Number(it.discount ?? 0),
            subtotal: Number(it.subtotal ?? it.unit_price * it.quantity),
          }))
          drawBillingDocCanvas(ctx, W, H, {
            docTitle: 'ใบเสนอราคา',
            docNo: qt.quotation_no,
            docDate: fmtDate(qt.created_at),
            branch: { name: branch.name ?? '', address: branch.address ?? '', phone: branch.phone ?? '', tax_id: branch.tax_id ?? '' },
            customerName: customerDisplayName(qt.customer),
            items,
            subtotal: Number(qt.subtotal ?? 0),
            vatPercent: Number(qt.vat_percent ?? 7),
            vatAmount: Number(qt.vat_amount ?? 0),
            grandTotal: Number(qt.grand_total ?? 0),
            sigLeftLabel: 'ผู้เสนอราคา',
            sigRightLabel: 'ลูกค้า/ผู้มอบอำนาจ',
            payment: null,
          })
          setImgUrl(canvas.toDataURL('image/png'))
        })
        .catch(() => setError('ไม่สามารถโหลดข้อมูลเอกสาร'))
        .finally(() => setLoading(false))
      return
    }

    if (mode === 'warranty') {
      warrantyService.getWarranty(id)
        .then((r) => {
          const wr = (r.data.data ?? r.data) as Warranty
          drawWarrantyCanvas(ctx, W, H, wr, wr.warranty_no)
          setImgUrl(canvas.toDataURL('image/png'))
        })
        .catch(() => setError('ไม่สามารถโหลดข้อมูลเอกสาร'))
        .finally(() => setLoading(false))
      return
    }

    // invoice / receipt
    invoiceService.getInvoice(id)
      .then((r) => {
        const inv = (r.data.data ?? r.data) as Invoice
        const branch = inv.branch ?? { name: '', address: '', phone: '', tax_id: '' }
        const items = (inv.items ?? []).map((it) => ({
          name: it.description || '—',
          qty: Number(it.quantity),
          unit_price: Number(it.unit_price),
          discount: Number(it.discount ?? 0),
          subtotal: Number(it.subtotal),
        }))
        const isRcp = mode === 'receipt'
        drawBillingDocCanvas(ctx, W, H, {
          docTitle: isRcp ? 'ใบเสร็จรับเงิน' : 'ใบแจ้งหนี้',
          docNo: isRcp ? (getReceiptNo(inv) ?? `RCP-${inv.id}`) : inv.invoice_no,
          docDate: fmtDate(isRcp ? (getReceiptIssuedAt(inv) ?? inv.updated_at) : inv.created_at),
          branch: { name: branch.name ?? '', address: branch.address ?? '', phone: branch.phone ?? '', tax_id: branch.tax_id ?? '' },
          customerName: customerDisplayName(inv.customer),
          items,
          subtotal: Number(inv.subtotal),
          vatPercent: Number(inv.vat_percent ?? 7),
          vatAmount: Number(inv.vat_amount),
          grandTotal: Number(inv.grand_total),
          sigLeftLabel: isRcp ? 'ผู้รับเงิน' : 'ผู้ออกใบแจ้งหนี้',
          sigRightLabel: isRcp ? 'ผู้ชำระเงิน' : 'ลูกค้า/ผู้รับมอบอำนาจ',
          payment: isRcp && inv.payments?.[0] ? { method: inv.payments[0].method, amount: Number(inv.payments[0].amount) } : null,
        })
        setImgUrl(canvas.toDataURL('image/png'))
      })
      .catch(() => setError('ไม่สามารถโหลดข้อมูลเอกสาร'))
      .finally(() => setLoading(false))
  }, [id, mode])

  function handleDownload() {
    if (!imgUrl) return
    const a = document.createElement('a')
    a.href = imgUrl
    a.download = `${mode}-${id}.png`
    a.click()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4" onClick={onClose}>
      <div className="relative mt-8 mb-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <span className="font-semibold text-gray-800">{MODE_TITLE[mode]}</span>
          <div className="flex items-center gap-2">
            {imgUrl && (
              <button onClick={handleDownload} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                ดาวน์โหลด
              </button>
            )}
            <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100">✕ ปิด</button>
          </div>
        </div>
        <div className="flex items-center justify-center p-4">
          {loading ? (
            <div className="py-16 text-sm text-gray-400">กำลังโหลดเอกสาร...</div>
          ) : error ? (
            <div className="py-16 text-sm text-red-500">{error}</div>
          ) : imgUrl ? (
            <img src={imgUrl} alt="document preview" className="w-full rounded border border-gray-200 shadow-sm" />
          ) : null}
        </div>
      </div>
    </div>
  )
}

/* ─── Doc Tag ─── */
interface DocTagProps {
  label: string; sublabel?: string; color: string
  href?: string | null; onClick?: () => void
}
function DocTag({ label, sublabel, color, href, onClick }: DocTagProps) {
  const baseCls = cn('inline-flex flex-col items-start rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all', color)
  const content = (
    <>
      <span>{label}</span>
      {sublabel && <span className="mt-0.5 font-normal opacity-70">{sublabel}</span>}
    </>
  )
  if (onClick) return <button onClick={onClick} className={cn(baseCls, 'hover:brightness-95 cursor-pointer')}>{content}</button>
  if (href) return <Link to={href} className={cn(baseCls, 'hover:brightness-95')}>{content}</Link>
  return <span className={baseCls}>{content}</span>
}

/* ─── Repair Flow Card ─── */
function RepairFlowCard({ flow, onPreview }: { flow: RepairFlow; onPreview: (id: number, mode: PreviewMode) => void }) {
  const { so, quotation, invoice, warranty } = flow
  const hasReceipt = Boolean(getReceiptNo(invoice))
  const hasChainDocs = Boolean(quotation ?? invoice ?? warranty)
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 bg-blue-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-blue-500 shrink-0" />
          <Link to={`/billing/jobs/repair:${so.id}`} className="text-sm font-bold text-blue-700 hover:underline">{so.so_number}</Link>
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', soStatusColor(so.status))}>{SO_STATUS_TH[so.status] ?? so.status}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span className="font-medium text-gray-700">{customerDisplayName(so.customer)}</span>
          {so.vehicle && <span className="text-gray-400">{so.vehicle.plate_number}{so.vehicle.brand ? ` · ${so.vehicle.brand}` : ''}</span>}
          <span>{fmtDate(so.received_date ?? so.created_at)}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        {!hasChainDocs && <span className="text-xs italic text-gray-300">ยังไม่มีเอกสารที่ออก</span>}
        {quotation && (
          <>
            <DocTag label={quotation.quotation_no} sublabel={`QT · ${QT_STATUS_TH[quotation.status] ?? quotation.status}${fmtAmt(quotation.grand_total) ? ` · ${fmtAmt(quotation.grand_total)}` : ''}`} color="border-purple-200 bg-purple-50 text-purple-700" onClick={() => onPreview(quotation.id, 'quotation')} />
            {(invoice ?? warranty) && <span className="text-gray-300">→</span>}
          </>
        )}
        {invoice && (
          <>
            <DocTag label={invoice.invoice_no} sublabel={`INV · ${INV_STATUS_TH[invoice.status] ?? invoice.status}${fmtAmt(invoice.grand_total) ? ` · ${fmtAmt(invoice.grand_total)}` : ''}`} color={invoice.status === 'paid' ? 'border-green-200 bg-green-50 text-green-700' : 'border-orange-200 bg-orange-50 text-orange-700'} onClick={() => onPreview(invoice.id, 'invoice')} />
            {(hasReceipt || warranty) && <span className="text-gray-300">→</span>}
          </>
        )}
        {hasReceipt && invoice && (
          <>
            <DocTag label={getReceiptNo(invoice) ?? '—'} sublabel="ใบเสร็จ" color="border-green-200 bg-green-50 text-green-700" onClick={() => onPreview(invoice.id, 'receipt')} />
            {warranty && <span className="text-gray-300">→</span>}
          </>
        )}
        {warranty && (
          <DocTag label={warranty.warranty_no} sublabel={`WR · ${warranty.warranty_months ?? '—'} เดือน`} color="border-teal-200 bg-teal-50 text-teal-700" onClick={() => onPreview(warranty.id, 'warranty')} />
        )}
      </div>
    </div>
  )
}

/* ─── Sale Flow Card ─── */
function SaleFlowCard({ flow, onPreview }: { flow: SaleFlow; onPreview: (id: number, mode: PreviewMode) => void }) {
  const { quotation, invoices, deposits, warranties } = flow
  const hasAnyDoc = deposits.length > 0 || invoices.length > 0 || warranties.length > 0
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 bg-purple-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-purple-500 shrink-0" />
          <Link to={`/quotations/${quotation.id}`} className="text-sm font-bold text-purple-700 hover:underline">{quotation.quotation_no}</Link>
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', qtStatusColor(quotation.status))}>{QT_STATUS_TH[quotation.status] ?? quotation.status}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span className="font-medium text-gray-700">{customerDisplayName(quotation.customer)}</span>
          <span>{fmtDate(quotation.created_at)}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        {!hasAnyDoc && <span className="text-xs italic text-gray-300">ยังไม่มีเอกสารที่ออก</span>}
        {deposits.map((dp, i) => (
          <>
            <DocTag key={dp.id} label={dp.deposit_no} sublabel={`มัดจำ${fmtAmt(dp.amount) ? ` · ${fmtAmt(dp.amount)}` : ''}`} color="border-amber-200 bg-amber-50 text-amber-700" href={`/quotations/${quotation.id}`} />
            {(i < deposits.length - 1 || invoices.length > 0 || warranties.length > 0) && <span className="text-gray-300">→</span>}
          </>
        ))}
        {invoices.map((inv, i) => {
          const hasPaidReceipt = Boolean(getReceiptNo(inv))
          return (
            <>
              <DocTag key={inv.id} label={inv.invoice_no} sublabel={`INV · ${INV_STATUS_TH[inv.status] ?? inv.status}${fmtAmt(inv.grand_total) ? ` · ${fmtAmt(inv.grand_total)}` : ''}`} color={inv.status === 'paid' ? 'border-green-200 bg-green-50 text-green-700' : 'border-orange-200 bg-orange-50 text-orange-700'} onClick={() => onPreview(inv.id, 'invoice')} />
              {hasPaidReceipt && (
                <>
                  <span className="text-gray-300">→</span>
                  <DocTag label={getReceiptNo(inv) ?? '—'} sublabel="ใบเสร็จ" color="border-green-200 bg-green-50 text-green-700" onClick={() => onPreview(inv.id, 'receipt')} />
                </>
              )}
              {(i < invoices.length - 1 || warranties.length > 0) && <span className="text-gray-300">→</span>}
            </>
          )
        })}
        {warranties.map((wr) => (
          <DocTag key={wr.id} label={wr.warranty_no} sublabel={`WR · ${wr.warranty_months ?? '—'} เดือน`} color="border-teal-200 bg-teal-50 text-teal-700" onClick={() => onPreview(wr.id, 'warranty')} />
        ))}
      </div>
    </div>
  )
}

/* ─── POS Card ─── */
function PosCard({ invoice, onPreview }: { invoice: Invoice; onPreview: (id: number, mode: 'invoice' | 'receipt') => void }) {
  const hasReceipt = Boolean(getReceiptNo(invoice))
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-4 w-4 text-amber-500 shrink-0" />
        <button onClick={() => onPreview(invoice.id, 'invoice')} className="text-sm font-bold text-orange-700 hover:underline">{invoice.invoice_no}</button>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', invStatusColor(invoice.status))}>{INV_STATUS_TH[invoice.status] ?? invoice.status}</span>
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-600">POS</span>
        {fmtAmt(invoice.grand_total) && <span className="text-xs font-medium text-gray-700">{fmtAmt(invoice.grand_total)}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {hasReceipt && (
          <DocTag label={getReceiptNo(invoice) ?? '—'} sublabel="ใบเสร็จ" color="border-green-200 bg-green-50 text-green-700" onClick={() => onPreview(invoice.id, 'receipt')} />
        )}
        <span className="text-xs text-gray-400">{fmtDate(invoice.created_at)}</span>
      </div>
    </div>
  )
}

/* ─── All-docs type label config ─── */
const DOC_TYPE_CFG: Record<string, { label: string; color: string }> = {
  SO:  { label: 'ใบสั่งซ่อม',   color: 'bg-blue-100 text-blue-700' },
  QT:  { label: 'ใบเสนอราคา',  color: 'bg-purple-100 text-purple-700' },
  INV: { label: 'ใบแจ้งหนี้',  color: 'bg-orange-100 text-orange-700' },
  RCP: { label: 'ใบเสร็จ',     color: 'bg-green-100 text-green-700' },
  DP:  { label: 'มัดจำ',       color: 'bg-amber-100 text-amber-700' },
  WR:  { label: 'ใบรับประกัน', color: 'bg-teal-100 text-teal-700' },
}

/* ─── Main Component ─── */
type TabId = 'repair' | 'sale' | 'pos' | 'all'

const TABS: Array<{ id: TabId; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'repair', label: 'ซ่อม',    Icon: Wrench },
  { id: 'sale',   label: 'ขาย',     Icon: Tag },
  { id: 'pos',    label: 'POS',     Icon: ShoppingCart },
  { id: 'all',    label: 'ทั้งหมด', Icon: List },
]

export function DocumentBrowserPage() {
  const [tab, setTab] = useState<TabId>('repair')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [sos, setSos] = useState<ServiceOrder[]>([])
  const [qts, setQts] = useState<Quotation[]>([])
  const [invs, setInvs] = useState<Invoice[]>([])
  const [dps, setDps] = useState<Deposit[]>([])
  const [wrs, setWrs] = useState<Warranty[]>([])
  const [previewState, setPreviewState] = useState<{ id: number; mode: PreviewMode } | null>(null)
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      serviceOrderService.getServiceOrders({ page: 1, limit: 200, date_from: dateFrom || undefined, date_to: dateTo || undefined })
        .then((r) => r.data.data ?? []).catch(() => []),
      quotationService.getQuotations({ page: 1, limit: 200 })
        .then((r) => r.data.data ?? []).catch(() => []),
      invoiceService.getInvoices({ page: 1, limit: 200, date_from: dateFrom || undefined, date_to: dateTo || undefined })
        .then((r) => r.data.data ?? []).catch(() => []),
      depositService.getDeposits({ page: 1, limit: 200 })
        .then((r) => r.data.data ?? []).catch(() => []),
      warrantyService.getWarranties({ page: 1, limit: 200 })
        .then((r) => r.data.data ?? []).catch(() => []),
    ]).then(([fetchedSos, fetchedQts, fetchedInvs, fetchedDps, fetchedWrs]) => {
      if (cancelled) return
      setSos(fetchedSos)
      setQts(fetchedQts)
      setInvs(fetchedInvs)
      setDps(fetchedDps)
      setWrs(fetchedWrs)
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [dateFrom, dateTo])

  /* ─── Repair Flows ─── */
  const repairFlows = useMemo((): RepairFlow[] => (
    sos
      .sort((a, b) => (b.received_date ?? b.created_at ?? '').localeCompare(a.received_date ?? a.created_at ?? ''))
      .map((so) => ({
        so,
        quotation: qts.find((qt) => qt.service_order_id === so.id),
        invoice:   invs.find((inv) => inv.service_order_id === so.id),
        warranty:  wrs.find((wr) => wr.owner_type === 'service_order' && wr.owner_id === so.id),
      }))
  ), [sos, qts, invs, wrs])

  /* ─── Sale Flows ─── */
  const saleFlows = useMemo((): SaleFlow[] => (
    qts
      .filter((qt) => qt.type === 'sale' && !qt.service_order_id)
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .map((qt) => ({
        quotation: qt,
        invoices:  invs.filter((inv) => inv.quotation_id === qt.id),
        deposits:  dps.filter((dp) => dp.quotation_id === qt.id),
        warranties: wrs.filter((wr) => wr.owner_type === 'quotation' && wr.owner_id === qt.id),
      }))
      .filter((flow) => {
        if (!dateFrom && !dateTo) return true
        const d = flow.quotation.created_at?.slice(0, 10) ?? ''
        if (dateFrom && d < dateFrom) return false
        if (dateTo && d > dateTo) return false
        return true
      })
  ), [qts, invs, dps, wrs, dateFrom, dateTo])

  /* ─── POS ─── */
  const posFlows = useMemo((): Invoice[] => (
    invs
      .filter((inv) => inv.type === 'retail')
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  ), [invs])

  /* ─── Filtered by search ─── */
  const filteredRepair = useMemo(() => {
    if (!search) return repairFlows
    return repairFlows.filter((f) => matchSearch([
      f.so.so_number, customerDisplayName(f.so.customer),
      f.quotation?.quotation_no, f.invoice?.invoice_no,
      getReceiptNo(f.invoice), f.warranty?.warranty_no,
    ], search))
  }, [repairFlows, search])

  const filteredSale = useMemo(() => {
    if (!search) return saleFlows
    return saleFlows.filter((f) => matchSearch([
      f.quotation.quotation_no, customerDisplayName(f.quotation.customer),
      ...f.invoices.map((inv) => inv.invoice_no),
      ...f.invoices.map((inv) => getReceiptNo(inv)),
      ...f.deposits.map((dp) => dp.deposit_no),
      ...f.warranties.map((wr) => wr.warranty_no),
    ], search))
  }, [saleFlows, search])

  const filteredPos = useMemo(() => {
    if (!search) return posFlows
    return posFlows.filter((inv) => matchSearch([
      inv.invoice_no, getReceiptNo(inv), customerDisplayName(inv.customer),
    ], search))
  }, [posFlows, search])

  /* ─── "ทั้งหมด" flat list ─── */
  interface AllDocRow {
    key: string; type: string; docNo: string; customer: string
    amount: string | null; status: string; date: string
    href?: string | null; docId?: number; previewMode?: PreviewMode
  }
  const allDocs = useMemo((): AllDocRow[] => {
    const rows: AllDocRow[] = []
    sos.forEach((so) => rows.push({ key: `SO-${so.id}`, type: 'SO', docNo: so.so_number, customer: customerDisplayName(so.customer), amount: null, status: SO_STATUS_TH[so.status] ?? so.status, date: fmtDate(so.received_date ?? so.created_at), href: `/billing/jobs/repair:${so.id}` }))
    qts.forEach((qt) => rows.push({ key: `QT-${qt.id}`, type: 'QT', docNo: qt.quotation_no, customer: customerDisplayName(qt.customer), amount: fmtAmt(qt.grand_total), status: QT_STATUS_TH[qt.status] ?? qt.status, date: fmtDate(qt.created_at), docId: qt.id, previewMode: 'quotation' }))
    invs.forEach((inv) => {
      rows.push({ key: `INV-${inv.id}`, type: 'INV', docNo: inv.invoice_no, customer: customerDisplayName(inv.customer), amount: fmtAmt(inv.grand_total), status: INV_STATUS_TH[inv.status] ?? inv.status, date: fmtDate(inv.created_at), docId: inv.id, previewMode: 'invoice' })
      if (getReceiptNo(inv)) {
        rows.push({ key: `RCP-${inv.id}`, type: 'RCP', docNo: getReceiptNo(inv) ?? `RCP-${inv.id}`, customer: customerDisplayName(inv.customer), amount: fmtAmt(inv.grand_total), status: 'ออกแล้ว', date: fmtDate(getReceiptIssuedAt(inv) ?? inv.updated_at), docId: inv.id, previewMode: 'receipt' })
      }
    })
    dps.forEach((dp) => {
      const qtCustomer = dp.quotation_id ? customerDisplayName(qts.find((q) => q.id === dp.quotation_id)?.customer) : '—'
      rows.push({ key: `DP-${dp.id}`, type: 'DP', docNo: dp.deposit_no, customer: qtCustomer, amount: fmtAmt(dp.amount), status: dp.status === 'collected' ? 'รับแล้ว' : 'คืนแล้ว', date: fmtDate(dp.created_at), href: dp.quotation_id ? `/quotations/${dp.quotation_id}` : null })
    })
    wrs.forEach((wr) => {
      let wrCustomer = '—'
      if (wr.owner_type === 'service_order') wrCustomer = customerDisplayName(sos.find((s) => s.id === wr.owner_id)?.customer)
      else if (wr.owner_type === 'quotation') wrCustomer = customerDisplayName(qts.find((q) => q.id === wr.owner_id)?.customer)
      rows.push({ key: `WR-${wr.id}`, type: 'WR', docNo: wr.warranty_no, customer: wrCustomer, amount: null, status: `${wr.warranty_months ?? '—'} เดือน`, date: fmtDate(wr.start_date ?? wr.created_at), docId: wr.id, previewMode: 'warranty' })
    })
    return rows
      .filter((d) => {
        if (typeFilter && d.type !== typeFilter) return false
        const rowDate = d.date === '—' ? '' : d.date
        if (dateFrom && rowDate < dateFrom) return false
        if (dateTo && rowDate > dateTo) return false
        if (search) return matchSearch([d.docNo, d.customer], search)
        return true
      })
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  }, [sos, qts, invs, dps, wrs, typeFilter, search, dateFrom, dateTo])

  function openPreview(id: number, mode: PreviewMode) {
    setPreviewState({ id, mode })
  }

  const tabCounts: Record<TabId, number | null> = {
    repair: filteredRepair.length,
    sale:   filteredSale.length,
    pos:    filteredPos.length,
    all:    null,
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">เอกสารบิลทั้งหมด</h1>
          <p className="mt-1 text-sm text-gray-500">ดูเอกสารตาม Flow หรือค้นหาทุกประเภท</p>
        </div>
        <Link to="/billing" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"><ArrowLeft className="h-4 w-4" />กลับ Billing Hub</Link>
      </div>

      {/* Flow Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
              onClick={() => { setTab(t.id); if (t.id === 'all') setTypeFilter('') }}
              className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all',
              tab === t.id ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <t.Icon className="h-4 w-4 shrink-0" />
            {t.label}
            {!loading && tabCounts[t.id] !== null && (
              <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs font-normal">{tabCounts[t.id]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search + Date Filter */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div className="relative flex-1 min-w-40">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            <Search className="h-4 w-4" />
          </span>
          <input type="text" placeholder="ค้นหาเลขเอกสาร / ชื่อลูกค้า..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: 'วันนี้', getRange: () => { const d = new Date().toISOString().slice(0,10); return { from: d, to: d } } },
            { label: '7 วัน', getRange: () => { const to = new Date(); const from = new Date(); from.setDate(from.getDate()-6); return { from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10) } } },
            { label: '30 วัน', getRange: () => { const to = new Date(); const from = new Date(); from.setDate(from.getDate()-29); return { from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10) } } },
            { label: 'เดือนนี้', getRange: () => { const now = new Date(); const from = new Date(now.getFullYear(), now.getMonth(), 1); const to = new Date(now.getFullYear(), now.getMonth()+1, 0); return { from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10) } } },
          ].map(({ label, getRange }) => {
            const range = getRange()
            const isActive = dateFrom === range.from && dateTo === range.to
            return (
              <button key={label} type="button" onClick={() => { setDateFrom(range.from); setDateTo(range.to) }} className={cn('rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors', isActive ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50')}>{label}</button>
            )
          })}
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2 py-1">
            <span className="text-xs text-gray-400 shrink-0">จาก</span>
            <input type="date" value={dateFrom} onChange={(e) => { if (dateTo && e.target.value > dateTo) setDateTo(''); setDateFrom(e.target.value) }} className="w-32 border-0 bg-transparent text-xs text-gray-700 focus:outline-none" />
            <span className="text-gray-300">—</span>
            <span className="text-xs text-gray-400 shrink-0">ถึง</span>
            <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className="w-32 border-0 bg-transparent text-xs text-gray-700 focus:outline-none" />
          </div>
          {(dateFrom || dateTo) && (
            <button type="button" onClick={() => { setDateFrom(''); setDateTo('') }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-400 hover:border-red-300 hover:text-red-500 transition-colors">ล้าง</button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">กำลังโหลดข้อมูล...</div>
      ) : tab === 'repair' ? (
        filteredRepair.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400">ไม่พบใบสั่งซ่อม</div>
        ) : (
          <div className="space-y-3">
            {filteredRepair.map((flow) => <RepairFlowCard key={flow.so.id} flow={flow} onPreview={openPreview} />)}
          </div>
        )
      ) : tab === 'sale' ? (
        filteredSale.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400">ไม่พบใบเสนอราคา (ขาย)</div>
        ) : (
          <div className="space-y-3">
            {filteredSale.map((flow) => <SaleFlowCard key={flow.quotation.id} flow={flow} onPreview={openPreview} />)}
          </div>
        )
      ) : tab === 'pos' ? (
        filteredPos.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400">ไม่พบรายการ POS</div>
        ) : (
          <div className="space-y-2">
            {filteredPos.map((inv) => <PosCard key={inv.id} invoice={inv} onPreview={openPreview} />)}
          </div>
        )
      ) : (
        /* ─── ทั้งหมด Tab ─── */
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {[{ id: '', label: 'ทั้งหมด' }, ...Object.entries(DOC_TYPE_CFG).map(([id, v]) => ({ id, label: v.label }))].map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  typeFilter === t.id ? 'bg-gray-900 text-white' : (t.id ? DOC_TYPE_CFG[t.id]?.color : 'bg-gray-100 text-gray-600 hover:bg-gray-200'),
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allDocs.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">ไม่พบเอกสาร</td></tr>
                ) : allDocs.map((doc) => {
                  const cfg = DOC_TYPE_CFG[doc.type]
                  return (
                    <tr key={doc.key} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {doc.docId && doc.previewMode ? (
                          <button onClick={() => openPreview(doc.docId!, doc.previewMode!)} className="text-sm font-medium text-blue-600 hover:underline">{doc.docNo}</button>
                        ) : doc.href ? (
                          <Link to={doc.href} className="text-sm font-medium text-blue-600 hover:underline">{doc.docNo}</Link>
                        ) : (
                          <span className="text-sm font-medium text-gray-700">{doc.docNo}</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', cfg?.color)}>{cfg?.label ?? doc.type}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-900">{doc.customer}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{doc.amount ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{doc.status}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{doc.date}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewState && (
        <PdfPreviewModal id={previewState.id} mode={previewState.mode} onClose={() => setPreviewState(null)} />
      )}
    </div>
  )
}
