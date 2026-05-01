import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { serviceOrderService } from '@/api/serviceOrderService'
import { quotationService } from '@/api/quotationService'
import { customerService } from '@/api/customerService'
import { invoiceService } from '@/api/invoiceService'
import { depositService } from '@/api/depositService'
import { deliveryNoteService } from '@/api/deliveryNoteService'
import { warrantyService } from '@/api/warrantyService'
import type { JobData } from '../JobFlowPage'
import type { PaymentMethod } from '@/types/invoice'

type StepCompleteMeta = { newId?: number; invoiceId?: number }
type FormProps = { onComplete: (meta?: StepCompleteMeta) => void; jobData?: JobData | null }

/* ─── Receive Vehicle Step ─── */
export function ReceiveVehicleForm({ onComplete, jobData }: FormProps) {
  const { employee } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const so = jobData?.serviceOrder
  const [form, setForm] = useState({
    customerName: jobData?.customerName ?? '',
    customerPhone: jobData?.customerPhone ?? '',
    plate: so?.vehicle?.plate_number ?? '',
    brand: so?.vehicle?.brand ?? '',
    model: so?.vehicle?.model ?? '',
    color: '',
    symptom: so?.symptom ?? '',
  })
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      if (so?.id) {
        await serviceOrderService.transition(so.id, { target_status: 'pending_review' })
        toast.success('ยืนยันรับรถเรียบร้อย')
        onComplete()
        return
      }
      if (!form.customerName.trim() || !form.plate.trim() || !form.symptom.trim()) {
        toast.error('กรุณากรอกชื่อลูกค้า, ทะเบียน และอาการ')
        return
      }
      let customerId: number | null = null
      if (form.customerPhone.trim()) {
        try {
          const { data: res } = await customerService.getCustomers({ search: form.customerPhone, limit: 1 })
          if (res.data?.[0]) customerId = res.data[0].id
        } catch { /* ไม่พบ → สร้างใหม่ */ }
      }
      if (!customerId) {
        const nameParts = form.customerName.trim().split(' ')
        const { data: custRes } = await customerService.createCustomer({
          type: 'personal',
          first_name: nameParts[0],
          last_name: nameParts.slice(1).join(' ') || '-',
          branch_id: employee?.branch_id ?? 1,
          phones: form.customerPhone
            ? [{ type: 'mobile' as const, number: form.customerPhone, is_primary: true }]
            : undefined,
        })
        customerId = custRes.data.id
      }
      let vehicleId: number | undefined
      if (form.plate.trim()) {
        const { data: vRes } = await customerService.addVehicle(customerId, {
          plate_number: form.plate.trim(),
          brand: form.brand || undefined,
          model: form.model || undefined,
          color: form.color || undefined,
        })
        vehicleId = vRes.data.id
      }
      const { data: soRes } = await serviceOrderService.createServiceOrder({
        customer_id: customerId,
        vehicle_id: vehicleId,
        branch_id: employee?.branch_id ?? 1,
        symptom: form.symptom,
        received_date: new Date().toISOString().split('T')[0],
      })
      toast.success('รับรถเรียบร้อย')
      onComplete({ newId: soRes.data.id })
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="ชื่อลูกค้า" value={form.customerName} onChange={(v) => set('customerName', v)} placeholder="นายสมชาย ใจดี" disabled={!!so} />
        <Field label="เบอร์โทร" value={form.customerPhone} onChange={(v) => set('customerPhone', v)} placeholder="089-xxx-xxxx" disabled={!!so} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="ทะเบียน" value={form.plate} onChange={(v) => set('plate', v)} placeholder="กข-1234" disabled={!!so} />
        <Field label="ยี่ห้อ" value={form.brand} onChange={(v) => set('brand', v)} placeholder="Toyota" disabled={!!so} />
        <Field label="รุ่น" value={form.model} onChange={(v) => set('model', v)} placeholder="Camry" disabled={!!so} />
        <Field label="สี" value={form.color} onChange={(v) => set('color', v)} placeholder="ขาว" disabled={!!so} />
      </div>
      <Field label="อาการ / หมายเหตุ" value={form.symptom} onChange={(v) => set('symptom', v)} placeholder="เปลี่ยนหม้อน้ำ, น้ำมันรั่ว..." multiline />
      <ActionButton onClick={handleSubmit} loading={isSubmitting}>✅ รับรถเรียบร้อย → ส่งประเมิน</ActionButton>
    </div>
  )
}

/* ─── Assessment Step ─── */
export function AssessmentForm({ onComplete, jobData }: FormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [items, setItems] = useState(
    jobData?.items.length
      ? jobData.items.map((it) => ({ name: it.name, issue: '', qty: it.qty }))
      : [{ name: 'หม้อน้ำ', issue: 'แตก / รั่ว', qty: 1 }],
  )
  const [note, setNote] = useState(jobData?.note ?? '')

  const handleSubmit = async () => {
    if (isSubmitting) return
    const soId = jobData?.serviceOrder?.id
    if (!soId) { toast.error('ไม่พบข้อมูลใบสั่งซ่อม'); return }
    setIsSubmitting(true)
    try {
      for (const item of items.filter((it) => it.name.trim())) {
        await serviceOrderService.addItem(soId, { item_type: 'service', custom_name: item.name, quantity: item.qty, unit_price: 0 })
      }
      await serviceOrderService.transition(soId, { target_status: 'pending_quote', note: note || undefined })
      toast.success('ส่งประเมินเรียบร้อย')
      onComplete()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50"><tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">รายการ</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">อาการ</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-20">จำนวน</th>
            <th className="w-10" />
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((it, i) => (
              <tr key={i}>
                <td className="px-3 py-2"><input className="w-full rounded border border-gray-200 px-2 py-1 text-sm" value={it.name} onChange={(e) => { const n = [...items]; n[i].name = e.target.value; setItems(n) }} /></td>
                <td className="px-3 py-2"><input className="w-full rounded border border-gray-200 px-2 py-1 text-sm" value={it.issue} onChange={(e) => { const n = [...items]; n[i].issue = e.target.value; setItems(n) }} /></td>
                <td className="px-3 py-2 text-center"><input type="number" className="w-14 rounded border border-gray-200 px-2 py-1 text-sm text-center" value={it.qty} onChange={(e) => { const n = [...items]; n[i].qty = Number(e.target.value); setItems(n) }} /></td>
                <td className="px-1"><button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-lg">×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => setItems([...items, { name: '', issue: '', qty: 1 }])} className="w-full border-t border-gray-200 bg-gray-50 px-3 py-2 text-xs text-blue-600 hover:bg-gray-100">+ เพิ่มรายการ</button>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 cursor-pointer flex-1">
          📷 ถ่ายรูปจุดเสีย (แนบไฟล์)
          <input type="file" multiple accept="image/*" className="hidden" />
        </label>
      </div>
      <Field label="หมายเหตุช่าง" value={note} onChange={setNote} placeholder="รายละเอียดเพิ่มเติม..." multiline />
      <ActionButton onClick={handleSubmit} loading={isSubmitting}>📋 ส่งประเมินเรียบร้อย → เสนอราคา</ActionButton>
    </div>
  )
}

/* ─── Quotation Step ─── */
export function QuotationForm({ onComplete, jobData }: FormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [items, setItems] = useState(
    jobData?.items.length
      ? jobData.items.map((it) => ({ name: it.name, price: it.unit_price, qty: it.qty }))
      : [
          { name: 'หม้อน้ำ Toyota Camry (OEM)', price: 3500, qty: 1 },
          { name: 'น้ำยาหล่อเย็น 4L', price: 450, qty: 1 },
          { name: 'ค่าแรงเปลี่ยนหม้อน้ำ', price: 800, qty: 1 },
        ],
  )
  const [discount, setDiscount] = useState(0)
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const vat = Math.round((subtotal - discount) * 0.07)
  const total = subtotal - discount + vat
  const existingCustomerId = jobData?.serviceOrder?.customer_id ?? jobData?.quotation?.customer_id ?? null
  const needsCustomerPick = !existingCustomerId
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Array<{ id: number; full_name: string; phone: string | null }>>([])
  const [pickedCustomer, setPickedCustomer] = useState<{ id: number; full_name: string } | null>(null)
  const searchCustomers = async (q: string) => {
    setCustomerSearch(q)
    if (q.trim().length < 2) { setCustomerResults([]); return }
    try {
      const { data } = await customerService.getCustomers({ search: q, limit: 10 })
      setCustomerResults(data.data.map((c: any) => ({
        id: c.id,
        full_name: c.full_name ?? c.company_name ?? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() ?? `#${c.id}`,
        phone: c.phone ?? c.phones?.[0]?.phone ?? null,
      })))
    } catch { setCustomerResults([]) }
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    const customerId = existingCustomerId ?? pickedCustomer?.id
    if (!customerId) { toast.error('กรุณาเลือกลูกค้า'); return }
    setIsSubmitting(true)
    try {
      const { data: qtRes } = await quotationService.createQuotation({
        customer_id: customerId,
        type: jobData?.sourceType === 'repair' ? 'service' : 'sale',
        service_order_id: jobData?.serviceOrder?.id,
        validity_days: 30,
        vat_percent: 7,
        items: items.filter((it) => it.name.trim()).map((it) => ({
          quantity: it.qty, unit_price: it.price, pricing_type: 'part' as const, description: it.name, discount: 0,
        })),
      })
      await quotationService.send(qtRes.data.id)
      toast.success('ส่งใบเสนอราคาเรียบร้อย')
      onComplete(jobData?.sourceType === 'sale' && !jobData.sourceId ? { newId: qtRes.data.id } : undefined)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {needsCustomerPick && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="text-sm font-medium text-gray-700 mb-2">เลือกลูกค้า {pickedCustomer ? `· ${pickedCustomer.full_name}` : '(บังคับ)'}</div>
          {!pickedCustomer && (
            <>
              <input
                value={customerSearch}
                onChange={(e) => searchCustomers(e.target.value)}
                placeholder="ค้นหาลูกค้าด้วยชื่อ / เบอร์โทร"
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              />
              {customerResults.length > 0 && (
                <ul className="mt-2 max-h-40 overflow-auto rounded border border-gray-200 bg-white text-sm">
                  {customerResults.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => { setPickedCustomer({ id: c.id, full_name: c.full_name }); setCustomerResults([]); setCustomerSearch('') }}
                        className="block w-full px-3 py-2 text-left hover:bg-gray-50"
                      >{c.full_name} {c.phone ? `· ${c.phone}` : ''}</button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {pickedCustomer && (
            <button type="button" onClick={() => setPickedCustomer(null)} className="text-xs text-blue-600 hover:underline">เปลี่ยนลูกค้า</button>
          )}
        </div>
      )}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50"><tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">รายการ</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-28">ราคา</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-20">จำนวน</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-28">รวม</th>
            <th className="w-10" />
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((it, i) => (
              <tr key={i}>
                <td className="px-3 py-2"><input className="w-full rounded border border-gray-200 px-2 py-1 text-sm" value={it.name} onChange={(e) => { const n = [...items]; n[i].name = e.target.value; setItems(n) }} /></td>
                <td className="px-3 py-2"><input type="number" className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-right" value={it.price} onChange={(e) => { const n = [...items]; n[i].price = Number(e.target.value); setItems(n) }} /></td>
                <td className="px-3 py-2 text-center"><input type="number" className="w-14 rounded border border-gray-200 px-2 py-1 text-sm text-center" value={it.qty} onChange={(e) => { const n = [...items]; n[i].qty = Number(e.target.value); setItems(n) }} /></td>
                <td className="px-3 py-2 text-right font-medium">฿{(it.price * it.qty).toLocaleString()}</td>
                <td className="px-1"><button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-lg">×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => setItems([...items, { name: '', price: 0, qty: 1 }])} className="w-full border-t border-gray-200 bg-gray-50 px-3 py-2 text-xs text-blue-600 hover:bg-gray-100">+ เพิ่มรายการ</button>
      </div>
      <div className="flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">ราคาสินค้า/บริการ</span><span>฿{subtotal.toLocaleString()}</span></div>
          <div className="flex justify-between items-center"><span className="text-gray-500">ส่วนลด</span>
            <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-24 rounded border border-gray-200 px-2 py-0.5 text-sm text-right" />
          </div>
          <div className="flex justify-between"><span className="text-gray-500">VAT 7%</span><span>฿{vat.toLocaleString()}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-1 text-base font-bold"><span>รวมทั้งสิ้น</span><span className="text-blue-600">฿{total.toLocaleString()}</span></div>
        </div>
      </div>
      <ActionButton onClick={handleSubmit} loading={isSubmitting}>📤 ส่งใบเสนอราคาให้ลูกค้า</ActionButton>
    </div>
  )
}

/* ─── Approve Step ─── */
export function ApproveForm({ onComplete, jobData }: FormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const qt = jobData?.quotation

  const handleApprove = async () => {
    if (isSubmitting) return
    if (!qt?.id) { toast.error('ไม่พบใบเสนอราคา'); return }
    setIsSubmitting(true)
    try {
      await quotationService.approve(qt.id)
      toast.success('อนุมัติใบเสนอราคาเรียบร้อย')
      onComplete()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (isSubmitting) return
    if (!qt?.id) { toast.error('ไม่พบใบเสนอราคา'); return }
    setIsSubmitting(true)
    try {
      await quotationService.reject(qt.id, { reject_reason: 'ลูกค้าไม่อนุมัติ' })
      toast.success('ปฏิเสธใบเสนอราคาแล้ว')
      onComplete()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setIsSubmitting(false)
    }
  }

  const items = qt?.items ?? jobData?.items ?? []
  const grandTotal = qt?.grand_total ?? jobData?.grand_total ?? 0
  const qtNo = qt?.quotation_no ?? '—'

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">สรุปใบเสนอราคา {qtNo}</h4>
        <div className="space-y-1 text-sm text-blue-700">
          {items.length > 0 ? (
            items.map((it, i) => (
              <div key={i} className="flex justify-between">
                <span>{'name' in it ? it.name : (it.product_name ?? it.description ?? '')} × {'qty' in it ? it.qty : it.quantity}</span>
                <span>฿{('subtotal' in it ? it.subtotal : 0)?.toLocaleString()}</span>
              </div>
            ))
          ) : (
            <p className="text-blue-500 text-xs">ไม่มีรายการ</p>
          )}
          <div className="flex justify-between border-t border-blue-300 pt-1 font-bold">
            <span>รวม (VAT 7%)</span><span>฿{grandTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={handleReject} disabled={isSubmitting}
          className="flex-1 rounded-lg border border-red-300 bg-red-50 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-40">
          ❌ ลูกค้าไม่อนุมัติ
        </button>
        <button onClick={handleApprove} disabled={isSubmitting}
          className="flex-1 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 shadow-sm disabled:opacity-40">
          {isSubmitting ? '⏳ กำลังดำเนินการ...' : '✅ ลูกค้าอนุมัติ'}
        </button>
      </div>
    </div>
  )
}

/* ─── Invoice Step ─── */
export function InvoiceForm({ onComplete, jobData }: FormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const qt = jobData?.quotation
  const grandTotal = qt?.grand_total ?? jobData?.grand_total ?? 0

  const handleSubmit = async () => {
    if (isSubmitting) return
    if (!qt?.id) { toast.error('ไม่พบใบเสนอราคา'); return }
    setIsSubmitting(true)
    try {
      const { data: invRes } = await invoiceService.createFromQuotation({ quotation_id: qt.id })
      await invoiceService.issue(invRes.data.id)
      toast.success('สร้างใบแจ้งหนี้เรียบร้อย')
      onComplete({ invoiceId: invRes.data.id })
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm space-y-2">
        <div className="flex justify-between"><span className="text-gray-500">อ้างอิง QT</span><span className="font-medium">{qt?.quotation_no ?? '—'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">ลูกค้า</span><span className="font-medium">{jobData?.customerName ?? '—'}</span></div>
        <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold"><span>ยอดใบแจ้งหนี้</span><span className="text-blue-600">฿{grandTotal.toLocaleString()}</span></div>
      </div>
      <ActionButton onClick={handleSubmit} loading={isSubmitting}>🧾 สร้างใบแจ้งหนี้ INV</ActionButton>
    </div>
  )
}

/* ─── Repair Work Step ─── */
export function RepairWorkForm({ onComplete, jobData }: FormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tasks, setTasks] = useState([
    { name: 'ถอดหม้อน้ำเก่า', done: false },
    { name: 'ติดตั้งหม้อน้ำใหม่', done: false },
    { name: 'เติมน้ำยาหล่อเย็น', done: false },
    { name: 'ทดสอบระบบ', done: false },
  ])
  const allDone = tasks.every((t) => t.done)

  const handleSubmit = async () => {
    if (isSubmitting) return
    const soId = jobData?.serviceOrder?.id
    if (!soId) { toast.error('ไม่พบข้อมูลใบสั่งซ่อม'); return }
    setIsSubmitting(true)
    try {
      if (jobData?.serviceOrder?.status === 'approved') {
        await serviceOrderService.transition(soId, { target_status: 'in_progress' })
      }
      await serviceOrderService.transition(soId, { target_status: 'completed' })
      toast.success('ซ่อมเสร็จเรียบร้อย')
      onComplete()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
        {tasks.map((t, i) => (
          <label key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={t.done} onChange={(e) => { const n = [...tasks]; n[i].done = e.target.checked; setTasks(n) }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className={cn('text-sm', t.done && 'line-through text-gray-400')}>{t.name}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 cursor-pointer flex-1">
          📷 ถ่ายรูปงานซ่อม
          <input type="file" multiple accept="image/*" className="hidden" />
        </label>
      </div>
      <ActionButton onClick={handleSubmit} loading={isSubmitting} disabled={!allDone}>🔧 ซ่อมเสร็จ → รอจ่ายเงิน</ActionButton>
    </div>
  )
}

/* ─── Payment Step ─── */
export function PaymentStepForm({ onComplete, jobData }: FormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const invoiceId = jobData?.invoice?.id ?? null
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [received, setReceived] = useState('')
  const total = jobData?.grand_total ?? 0
  const change = method === 'cash' && received ? Number(received) - total : 0

  const handleSubmit = async () => {
    if (isSubmitting) return
    if (!invoiceId) { toast.error('ไม่พบใบแจ้งหนี้'); return }
    setIsSubmitting(true)
    try {
      await invoiceService.addPayment(invoiceId, { amount: total, method, paid_at: new Date().toISOString() })
      await invoiceService.issueReceipt(invoiceId)
      toast.success('ชำระเงินและออกใบเสร็จเรียบร้อย')
      onComplete()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center py-2"><span className="text-3xl font-bold text-blue-600">฿{total.toLocaleString()}</span><p className="text-sm text-gray-500 mt-1">ยอดที่ต้องชำระ</p></div>
      <div className="grid grid-cols-3 gap-2">
        {([['cash', '💵', 'เงินสด'], ['transfer', '🏦', 'โอน'], ['card', '💳', 'บัตร']] as const).map(([v, ico, lbl]) => (
          <button key={v} onClick={() => setMethod(v)}
            className={cn('flex flex-col items-center gap-1 rounded-xl border-2 py-3 text-sm font-medium transition-all',
              method === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
            <span className="text-xl">{ico}</span>{lbl}
          </button>
        ))}
      </div>
      {method === 'cash' && (
        <div>
          <label className="text-xs font-medium text-gray-500">รับเงินมา</label>
          <input type="number" value={received} onChange={(e) => setReceived(e.target.value)} placeholder={String(total)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-right text-xl font-bold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          {Number(received) >= total && <p className="mt-1 text-right text-sm font-semibold text-green-600">ทอน: ฿{change.toLocaleString()}</p>}
        </div>
      )}
      <ActionButton onClick={handleSubmit} loading={isSubmitting}>💳 ยืนยันชำระ + ออกใบเสร็จ</ActionButton>
    </div>
  )
}

/* ─── Deliver / Close Step ─── */
export function DeliverForm({ onComplete, jobData, type = 'repair' }: FormProps & { type?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dnSigned, setDnSigned] = useState(false)
  const [wrCreated, setWrCreated] = useState(false)

  const handleSubmit = async () => {
    if (isSubmitting) return
    const soId = jobData?.serviceOrder?.id
    if (!soId) { toast.error('ไม่พบข้อมูลใบสั่งซ่อม'); return }
    setIsSubmitting(true)
    try {
      const { data: dnRes } = await deliveryNoteService.create({ owner_type: 'service_order', owner_id: soId })
      await deliveryNoteService.sign(dnRes.data.id, { signed_by: jobData?.customerName ?? 'ลูกค้า' })
      if (wrCreated) {
        await warrantyService.create({
          owner_type: 'service_order', owner_id: soId,
          warranty_months: 3, start_date: new Date().toISOString().split('T')[0],
        })
      }
      await serviceOrderService.transition(soId, { target_status: 'closed' })
      toast.success('ปิดงานเรียบร้อย')
      onComplete()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 cursor-pointer">
        <input type="checkbox" checked={dnSigned} onChange={(e) => setDnSigned(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
        <div><span className="text-sm font-medium text-gray-900">📦 ใบส่งมอบ (DN)</span><p className="text-xs text-gray-500">ลูกค้าเซ็นรับ{type === 'repair' ? 'รถ' : 'สินค้า'}</p></div>
      </label>
      <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 cursor-pointer">
        <input type="checkbox" checked={wrCreated} onChange={(e) => setWrCreated(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
        <div><span className="text-sm font-medium text-gray-900">🛡️ ใบรับประกัน (WR)</span><p className="text-xs text-gray-500">ออกใบรับประกัน (ถ้ามี)</p></div>
      </label>
      <label className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 cursor-pointer">
        📷 ถ่ายรูปส่งมอบ
        <input type="file" multiple accept="image/*" className="hidden" />
      </label>
      <ActionButton onClick={handleSubmit} loading={isSubmitting} disabled={!dnSigned}>🏁 ปิดงาน</ActionButton>
    </div>
  )
}

/* ─── Deposit Step ─── */
export function DepositForm({ onComplete, jobData }: FormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [amount, setAmount] = useState(jobData?.grand_total ? Math.round(jobData.grand_total * 0.3) : 5000)
  const [method, setMethod] = useState<'cash' | 'transfer' | 'card'>('cash')

  const handleSubmit = async () => {
    if (isSubmitting) return
    const qtId = jobData?.quotation?.id
    if (!qtId) { toast.error('ไม่พบใบเสนอราคา'); return }
    if (amount <= 0) { toast.error('กรุณากรอกจำนวนเงินมัดจำ'); return }
    setIsSubmitting(true)
    try {
      await depositService.create({ quotation_id: qtId, amount, payment_method: method })
      toast.success('รับมัดจำเรียบร้อย')
      onComplete()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm">
        <p className="text-amber-800 font-medium mb-3">💰 รับมัดจำ</p>
        <label className="text-xs text-amber-700">จำนวนเงินมัดจำ</label>
        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-amber-300 px-3 py-2 text-right text-lg font-bold focus:border-amber-500 focus:outline-none" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {([['cash', '💵', 'เงินสด'], ['transfer', '🏦', 'โอน'], ['card', '💳', 'บัตร']] as const).map(([v, ico, lbl]) => (
          <button key={v} onClick={() => setMethod(v)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl border-2 py-3 text-sm font-medium transition-all',
              method === v ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50',
            )}>
            <span className="text-xl">{ico}</span>{lbl}
          </button>
        ))}
      </div>
      <ActionButton onClick={handleSubmit} loading={isSubmitting}>💰 ออกใบมัดจำ + ใบเสร็จ</ActionButton>
    </div>
  )
}

/* ─── Shared Components ─── */
function Field({ label, value, onChange, placeholder, multiline, disabled }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; multiline?: boolean; disabled?: boolean
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
          disabled={disabled}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none disabled:bg-gray-50 disabled:text-gray-500" />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          disabled={disabled}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500" />
      )}
    </div>
  )
}

function ActionButton({ onClick, children, disabled, loading }: {
  onClick: () => void; children: React.ReactNode; disabled?: boolean; loading?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
      {loading ? '⏳ กำลังดำเนินการ...' : children}
    </button>
  )
}
