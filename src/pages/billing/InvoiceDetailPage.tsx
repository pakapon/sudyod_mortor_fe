import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { invoiceService } from '@/api/invoiceService'
import type { Invoice } from '@/types/invoice'

const STATUS_TH: Record<string, string> = {
  draft: 'ร่าง', issued: 'ออกแล้ว', paid: 'ชำระแล้ว', overdue: 'เกินกำหนด', cancelled: 'ยกเลิก',
}

const TYPE_TH: Record<string, string> = {
  service: 'ซ่อม', sale: 'ขาย', retail: 'Retail POS',
}

function customerName(c?: Invoice['customer']): string {
  if (!c) return '-'
  if (c.type === 'corporate') return c.company_name ?? '-'
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || '-'
}

function itemName(item: Invoice['items'][number]): string {
  const it = item as Invoice['items'][number] & { product?: { name?: string }; sku?: string | null }
  return it.description || it.product?.name || it.sku || '-'
}

function itemLineTotal(item: Invoice['items'][number]): number {
  const it = item as Invoice['items'][number] & { total?: number | string; subtotal?: number | string }
  return Number(it.subtotal ?? it.total ?? Number(it.quantity) * Number(it.unit_price) ?? 0)
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    invoiceService.getInvoice(Number(id))
      .then((r) => setInvoice(r.data.data ?? r.data))
      .catch(() => setError('ไม่พบข้อมูลใบแจ้งหนี้'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">กำลังโหลด...</div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-3">
        <p>{error ?? 'ไม่พบข้อมูล'}</p>
        <Link to="/billing/documents" className="text-sm text-blue-600 hover:underline">← กลับ</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/billing/documents" className="text-sm text-gray-500 hover:text-gray-700">← เอกสาร</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-900">{invoice.invoice_no}</span>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {/* Title */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 p-6">
          <div>
            <p className="text-xs text-gray-500">{TYPE_TH[invoice.type] ?? invoice.type}</p>
            <h1 className="mt-1 text-xl font-bold text-gray-900">{invoice.invoice_no}</h1>
            <p className="mt-1 text-sm text-gray-600">{customerName(invoice.customer)}</p>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
            invoice.status === 'paid' ? 'bg-green-100 text-green-700'
            : invoice.status === 'overdue' ? 'bg-red-100 text-red-700'
            : invoice.status === 'cancelled' ? 'bg-gray-100 text-gray-600'
            : 'bg-blue-100 text-blue-700'
          }`}>
            {STATUS_TH[invoice.status] ?? invoice.status}
          </span>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-4 border-b border-gray-100 p-6 sm:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500">วันที่ออก</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">{(invoice.created_at ?? '').slice(0, 10)}</p>
          </div>
          {invoice.due_date && (
            <div>
              <p className="text-xs text-gray-500">ครบกำหนด</p>
              <p className="mt-0.5 text-sm font-medium text-gray-900">{invoice.due_date.slice(0, 10)}</p>
            </div>
          )}
          {invoice.receipt && (
            <div>
              <p className="text-xs text-gray-500">เลขใบเสร็จ</p>
              <p className="mt-0.5 text-sm font-medium text-gray-900">{invoice.receipt.receipt_no}</p>
            </div>
          )}
          {invoice.branch && (
            <div>
              <p className="text-xs text-gray-500">สาขา</p>
              <p className="mt-0.5 text-sm font-medium text-gray-900">{invoice.branch.name}</p>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">รายการสินค้า/บริการ</h2>
          {(!invoice.items || invoice.items.length === 0) ? (
            <p className="py-6 text-center text-sm text-gray-400">ไม่มีรายการ</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500">
                    <th className="pb-2 text-left font-medium">#</th>
                    <th className="pb-2 text-left font-medium">รายการ</th>
                    <th className="pb-2 text-right font-medium">จำนวน</th>
                    <th className="pb-2 text-right font-medium">ราคา/หน่วย</th>
                    <th className="pb-2 text-right font-medium">รวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="py-2.5 text-gray-400">{idx + 1}</td>
                      <td className="py-2.5 text-gray-900">{itemName(item)}</td>
                      <td className="py-2.5 text-right text-gray-700">{item.quantity}</td>
                      <td className="py-2.5 text-right text-gray-700">{Number(item.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                      <td className="py-2.5 text-right font-medium text-gray-900">{itemLineTotal(item).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>ราคาก่อนภาษี</span>
                <span>{Number(invoice.subtotal).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>VAT {invoice.vat_percent}%</span>
                <span>{Number(invoice.vat_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1.5 font-semibold text-gray-900">
                <span>รวมทั้งสิ้น</span>
                <span>{Number(invoice.grand_total).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
