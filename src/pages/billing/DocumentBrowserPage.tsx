import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { serviceOrderService } from '@/api/serviceOrderService'
import { quotationService } from '@/api/quotationService'
import { invoiceService } from '@/api/invoiceService'
import { depositService } from '@/api/depositService'
import { warrantyService } from '@/api/warrantyService'
import type { ServiceOrder } from '@/types/serviceOrder'
import type { Quotation } from '@/types/quotation'
import type { Invoice } from '@/types/invoice'
import type { Deposit } from '@/types/deposit'
import type { Warranty } from '@/types/warranty'

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

/* ─── Document Item ─── */
interface DocItem {
  id: string
  docNumber: string
  type: string
  customerName: string
  amount: number | null
  status: string
  date: string
  linkedJob: string | null
  linkPath: string | null
}

function customerName(c?: { first_name?: string; last_name?: string; company_name?: string; type?: string }) {
  if (!c) return '—'
  if (c.type === 'corporate') return c.company_name ?? '—'
  return `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || '—'
}

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

function soToDoc(so: ServiceOrder): DocItem {
  return {
    id: `SO-${so.id}`,
    docNumber: so.so_number,
    type: 'SO',
    customerName: customerName(so.customer),
    amount: null,
    status: SO_STATUS_TH[so.status] ?? so.status,
    date: (so.received_date ?? so.created_at ?? '').slice(0, 10),
    linkedJob: so.so_number,
    linkPath: `/billing/jobs/repair:${so.id}`,
  }
}
function qtToDoc(qt: Quotation): DocItem {
  const linkPath = qt.service_order_id
    ? `/billing/jobs/repair:${qt.service_order_id}`
    : `/quotations/${qt.id}`
  return {
    id: `QT-${qt.id}`,
    docNumber: qt.quotation_no,
    type: 'QT',
    customerName: customerName(qt.customer),
    amount: Number(qt.grand_total ?? 0) || null,
    status: QT_STATUS_TH[qt.status] ?? qt.status,
    date: (qt.created_at ?? '').slice(0, 10),
    linkedJob: qt.service_order?.so_number ?? qt.service_order?.so_no ?? null,
    linkPath,
  }
}
function invToDoc(inv: Invoice): DocItem {
  const linkPath = inv.service_order_id
    ? `/billing/jobs/repair:${inv.service_order_id}`
    : inv.quotation_id ? `/billing/jobs/sale:${inv.quotation_id}` : `/billing/invoices/${inv.id}`
  return {
    id: `INV-${inv.id}`,
    docNumber: inv.invoice_no,
    type: 'INV',
    customerName: customerName(inv.customer),
    amount: Number(inv.grand_total ?? 0) || null,
    status: INV_STATUS_TH[inv.status] ?? inv.status,
    date: (inv.created_at ?? '').slice(0, 10),
    linkedJob: null,
    linkPath,
  }
}
function rcpToDoc(inv: Invoice): DocItem {
  const linkPath = inv.service_order_id
    ? `/billing/jobs/repair:${inv.service_order_id}`
    : inv.quotation_id ? `/billing/jobs/sale:${inv.quotation_id}` : `/billing/invoices/${inv.id}`
  return {
    id: `RCP-${inv.id}`,
    docNumber: inv.receipt?.receipt_no ?? `RCP-${inv.id}`,
    type: 'RCP',
    customerName: customerName(inv.customer),
    amount: Number(inv.grand_total ?? 0) || null,
    status: 'ออกแล้ว',
    date: (inv.updated_at ?? inv.created_at ?? '').slice(0, 10),
    linkedJob: null,
    linkPath,
  }
}
function dpToDoc(dp: Deposit): DocItem {
  return {
    id: `DP-${dp.id}`,
    docNumber: dp.deposit_no,
    type: 'DP',
    customerName: '—',
    amount: Number(dp.amount ?? 0) || null,
    status: dp.status === 'collected' ? 'รับแล้ว' : 'คืนแล้ว',
    date: (dp.created_at ?? '').slice(0, 10),
    linkedJob: null,
    linkPath: dp.quotation_id ? `/billing/jobs/sale:${dp.quotation_id}` : null,
  }
}
function wrToDoc(wr: Warranty): DocItem {
  const linkPath = wr.owner_type === 'service_order'
    ? `/billing/jobs/repair:${wr.owner_id}`
    : `/billing/jobs/sale:${wr.owner_id}`
  return {
    id: `WR-${wr.id}`,
    docNumber: wr.warranty_no,
    type: 'WR',
    customerName: '—',
    amount: null,
    status: `${wr.warranty_months ?? '—'} เดือน`,
    date: (wr.start_date ?? wr.created_at ?? '').slice(0, 10),
    linkedJob: null,
    linkPath,
  }
}

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
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [docs, setDocs] = useState<DocItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      serviceOrderService.getServiceOrders({ page: 1, limit: 50, date_from: dateFrom || undefined, date_to: dateTo || undefined })
        .then((r) => r.data.data ?? []).catch(() => []),
      quotationService.getQuotations({ page: 1, limit: 50 })
        .then((r) => r.data.data ?? []).catch(() => []),
      invoiceService.getInvoices({ page: 1, limit: 50, date_from: dateFrom || undefined, date_to: dateTo || undefined })
        .then((r) => r.data.data ?? []).catch(() => []),
      depositService.getDeposits({ page: 1, limit: 50 })
        .then((r) => r.data.data ?? []).catch(() => []),
      warrantyService.getWarranties({ page: 1, limit: 50 })
        .then((r) => r.data.data ?? []).catch(() => []),
    ]).then(([sos, qts, invs, dps, wrs]) => {
      if (cancelled) return
      const paidInvoices = invs.filter((i) => i.status === 'paid' && i.receipt?.receipt_no)
      const merged: DocItem[] = [
        ...sos.map(soToDoc),
        ...qts.map(qtToDoc),
        ...invs.map(invToDoc),
        ...paidInvoices.map(rcpToDoc),
        ...dps.map(dpToDoc),
        ...wrs.map(wrToDoc),
      ].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
      setDocs(merged)
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [dateFrom, dateTo])

  const filteredDocs = useMemo(() => docs.filter((d) => {
    if (typeFilter && d.type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        d.docNumber.toLowerCase().includes(q) ||
        d.customerName.toLowerCase().includes(q)
      )
    }
    return true
  }), [docs, typeFilter, search])

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
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : filteredDocs.length === 0 ? (
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
                        {doc.linkPath ? (
                          <Link to={doc.linkPath} className="font-medium text-blue-600 hover:underline">
                            {doc.docNumber}
                          </Link>
                        ) : (
                          <span className="font-medium text-gray-700">{doc.docNumber}</span>
                        )}
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
                    <td className="px-4 py-3 text-sm text-gray-500">{doc.date || '—'}</td>
                    <td className="px-4 py-3">
                      {doc.linkedJob && doc.linkPath ? (
                        <Link to={doc.linkPath} className="text-xs text-blue-600 hover:underline">
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
