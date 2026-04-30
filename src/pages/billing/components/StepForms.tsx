import { useState } from 'react'
import { cn } from '@/lib/utils'

/* ─── Receive Vehicle Step ─── */
export function ReceiveVehicleForm({ onComplete }: { onComplete: () => void }) {
  const [form, setForm] = useState({ plate: '', brand: '', model: '', color: '', symptom: '', customerName: '', customerPhone: '' })
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="ชื่อลูกค้า" value={form.customerName} onChange={(v) => set('customerName', v)} placeholder="นายสมชาย ใจดี" />
        <Field label="เบอร์โทร" value={form.customerPhone} onChange={(v) => set('customerPhone', v)} placeholder="089-xxx-xxxx" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="ทะเบียน" value={form.plate} onChange={(v) => set('plate', v)} placeholder="กข-1234" />
        <Field label="ยี่ห้อ" value={form.brand} onChange={(v) => set('brand', v)} placeholder="Toyota" />
        <Field label="รุ่น" value={form.model} onChange={(v) => set('model', v)} placeholder="Camry" />
        <Field label="สี" value={form.color} onChange={(v) => set('color', v)} placeholder="ขาว" />
      </div>
      <Field label="อาการ / หมายเหตุ" value={form.symptom} onChange={(v) => set('symptom', v)} placeholder="เปลี่ยนหม้อน้ำ, น้ำมันรั่ว..." multiline />
      <ActionButton onClick={onComplete}>✅ รับรถเรียบร้อย → ส่งประเมิน</ActionButton>
    </div>
  )
}

/* ─── Assessment Step ─── */
export function AssessmentForm({ onComplete }: { onComplete: () => void }) {
  const [items, setItems] = useState([{ name: 'หม้อน้ำ', issue: 'แตก / รั่ว', qty: 1 }])
  const [note, setNote] = useState('')
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
      <ActionButton onClick={onComplete}>📋 ส่งประเมินเรียบร้อย → เสนอราคา</ActionButton>
    </div>
  )
}

/* ─── Quotation Step ─── */
export function QuotationForm({ onComplete }: { onComplete: () => void }) {
  const [items, setItems] = useState([
    { name: 'หม้อน้ำ Toyota Camry (OEM)', price: 3500, qty: 1 },
    { name: 'น้ำยาหล่อเย็น 4L', price: 450, qty: 1 },
    { name: 'ค่าแรงเปลี่ยนหม้อน้ำ', price: 800, qty: 1 },
  ])
  const [discount, setDiscount] = useState(0)
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const vat = Math.round((subtotal - discount) * 0.07)
  const total = subtotal - discount + vat

  return (
    <div className="space-y-4">
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
      <ActionButton onClick={onComplete}>📤 ส่งใบเสนอราคาให้ลูกค้า</ActionButton>
    </div>
  )
}

/* ─── Approve Step ─── */
export function ApproveForm({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">สรุปใบเสนอราคา QT-2026-0038</h4>
        <div className="space-y-1 text-sm text-blue-700">
          <div className="flex justify-between"><span>หม้อน้ำ Toyota Camry (OEM) × 1</span><span>฿3,500</span></div>
          <div className="flex justify-between"><span>น้ำยาหล่อเย็น 4L × 1</span><span>฿450</span></div>
          <div className="flex justify-between"><span>ค่าแรงเปลี่ยนหม้อน้ำ × 1</span><span>฿800</span></div>
          <div className="flex justify-between border-t border-blue-300 pt-1 font-bold"><span>รวม (VAT 7%)</span><span>฿5,083</span></div>
        </div>
      </div>
      <div className="flex gap-3">
        <button className="flex-1 rounded-lg border border-red-300 bg-red-50 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100">❌ ลูกค้าไม่อนุมัติ</button>
        <button onClick={onComplete} className="flex-1 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 shadow-sm">✅ ลูกค้าอนุมัติ</button>
      </div>
    </div>
  )
}

/* ─── Invoice Step ─── */
export function InvoiceForm({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm space-y-2">
        <div className="flex justify-between"><span className="text-gray-500">อ้างอิง QT</span><span className="font-medium">QT-2026-0038</span></div>
        <div className="flex justify-between"><span className="text-gray-500">ลูกค้า</span><span className="font-medium">นายสมชาย ใจดี</span></div>
        <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold"><span>ยอดใบแจ้งหนี้</span><span className="text-blue-600">฿5,083</span></div>
      </div>
      <ActionButton onClick={onComplete}>🧾 สร้างใบแจ้งหนี้ INV</ActionButton>
    </div>
  )
}

/* ─── Repair Work Step ─── */
export function RepairWorkForm({ onComplete }: { onComplete: () => void }) {
  const [tasks, setTasks] = useState([
    { name: 'ถอดหม้อน้ำเก่า', done: true },
    { name: 'ติดตั้งหม้อน้ำใหม่', done: true },
    { name: 'เติมน้ำยาหล่อเย็น', done: false },
    { name: 'ทดสอบระบบ', done: false },
  ])
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
      <ActionButton onClick={onComplete} disabled={!tasks.every((t) => t.done)}>🔧 ซ่อมเสร็จ → รอจ่ายเงิน</ActionButton>
    </div>
  )
}

/* ─── Payment Step ─── */
export function PaymentStepForm({ onComplete, total = 5083 }: { onComplete: () => void; total?: number }) {
  const [method, setMethod] = useState<'cash' | 'transfer' | 'card'>('cash')
  const [received, setReceived] = useState('')
  const change = method === 'cash' && received ? Number(received) - total : 0
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
      <ActionButton onClick={onComplete}>💳 ยืนยันชำระ + ออกใบเสร็จ</ActionButton>
    </div>
  )
}

/* ─── Deliver / Close Step ─── */
export function DeliverForm({ onComplete, type = 'repair' }: { onComplete: () => void; type?: string }) {
  const [dnSigned, setDnSigned] = useState(false)
  const [wrCreated, setWrCreated] = useState(false)
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
      <ActionButton onClick={onComplete} disabled={!dnSigned}>🏁 ปิดงาน</ActionButton>
    </div>
  )
}

/* ─── Deposit Step ─── */
export function DepositForm({ onComplete }: { onComplete: () => void }) {
  const [amount, setAmount] = useState(5000)
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm">
        <p className="text-amber-800 font-medium mb-2">💰 รับมัดจำ</p>
        <label className="text-xs text-amber-700">จำนวนเงินมัดจำ</label>
        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-amber-300 px-3 py-2 text-right text-lg font-bold focus:border-amber-500 focus:outline-none" />
      </div>
      <ActionButton onClick={onComplete}>💰 ออกใบมัดจำ + ใบเสร็จ</ActionButton>
    </div>
  )
}

/* ─── Shared Components ─── */
function Field({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
      )}
    </div>
  )
}

function ActionButton({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
      {children}
    </button>
  )
}
