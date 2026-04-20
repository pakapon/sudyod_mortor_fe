import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { purchaseOrderService } from '@/api/purchaseOrderService'
import { hrService } from '@/api/hrService'
import type { PurchaseOrderPayload, Vendor } from '@/types/inventory'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { apiClient } from '@/api/client'

const field = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
const lbl = 'mb-1.5 block text-sm font-medium text-gray-700'

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

interface ItemRow {
  product_id: string
  qty: string
  cost_price: string
}

interface FormValues {
  vendor_id: string
  branch_id: string
  note: string
}

export function PurchaseOrderFormPage() {
  const navigate = useNavigate()
  const { permissions } = useAuthStore()

  const [vendors, setVendors] = useState<Vendor[]>([])
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([])
  const [products, setProducts] = useState<{ id: number; sku: string; name: string }[]>([])
  const [items, setItems] = useState<ItemRow[]>([{ product_id: '', qty: '', cost_price: '' }])
  const [isSaving, setIsSaving] = useState(false)

  const canCreate = hasPermission(permissions, 'purchase_orders', 'can_create')

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: { vendor_id: '', branch_id: '', note: '' },
  })

  useEffect(() => {
    purchaseOrderService.getVendors()
      .then((res) => setVendors(res.data.data ?? []))
      .catch(() => {})
    hrService.getBranches()
      .then((res) => setBranches(res.data.data ?? []))
      .catch(() => {})
    apiClient.get('/products?limit=200')
      .then((res) => setProducts(res.data?.data ?? []))
      .catch(() => {})
  }, [])

  const addItem = () => setItems((prev) => [...prev, { product_id: '', qty: '', cost_price: '' }])
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))
  const updateItem = (idx: number, key: keyof ItemRow, value: string) =>
    setItems((prev) => prev.map((row, i) => i === idx ? { ...row, [key]: value } : row))

  const totalAmount = items.reduce((sum, row) => {
    const qty = parseFloat(row.qty) || 0
    const price = parseFloat(row.cost_price) || 0
    return sum + qty * price
  }, 0)

  const onSubmit = async (values: FormValues) => {
    if (!canCreate) return
    const payload: PurchaseOrderPayload = {
      vendor_id: Number(values.vendor_id),
      branch_id: values.branch_id ? Number(values.branch_id) : undefined,
      note: values.note || undefined,
      items: items
        .filter((it) => it.product_id && it.qty && it.cost_price)
        .map((it) => ({
          product_id: Number(it.product_id),
          qty: Number(it.qty),
          cost_price: Number(it.cost_price),
        })),
    }
    setIsSaving(true)
    try {
      const res = await purchaseOrderService.createPurchaseOrder(payload)
      navigate(`/purchase-orders/${res.data.data.id}`)
    } catch {
      // interceptor handles display
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/purchase-orders" className="text-gray-400 hover:text-gray-600"><ChevronLeftIcon /></Link>
        <h1 className="text-2xl font-bold text-gray-900">สร้างใบสั่งซื้อ</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">ข้อมูลทั่วไป</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={lbl}>Vendor <span className="text-red-500">*</span></label>
              <select
                {...register('vendor_id', { required: 'กรุณาเลือก Vendor' })}
                className={cn(field, errors.vendor_id && 'border-red-400')}
              >
                <option value="">— เลือก Vendor —</option>
                {vendors.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
              </select>
              {errors.vendor_id && <p className="mt-1 text-xs text-red-500">{errors.vendor_id.message}</p>}
            </div>
            <div>
              <label className={lbl}>สาขา</label>
              <select {...register('branch_id')} className={field}>
                <option value="">— เลือกสาขา —</option>
                {branches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>หมายเหตุ</label>
              <input {...register('note')} className={field} placeholder="หมายเหตุ" />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">รายการสินค้า</h2>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <PlusIcon /> เพิ่มรายการ
            </button>
          </div>
          <div className="space-y-3">
            {items.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_120px_140px_36px] gap-2 items-end">
                <div>
                  {idx === 0 && <label className={lbl}>สินค้า <span className="text-red-500">*</span></label>}
                  <select
                    value={row.product_id}
                    onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                    className={field}
                    required
                  >
                    <option value="">— เลือกสินค้า —</option>
                    {products.map((p) => (<option key={p.id} value={p.id}>{p.sku} — {p.name}</option>))}
                  </select>
                </div>
                <div>
                  {idx === 0 && <label className={lbl}>จำนวน <span className="text-red-500">*</span></label>}
                  <input
                    type="number"
                    min="1"
                    value={row.qty}
                    onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                    className={field}
                    placeholder="จำนวน"
                    required
                  />
                </div>
                <div>
                  {idx === 0 && <label className={lbl}>ราคาต้นทุน <span className="text-red-500">*</span></label>}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.cost_price}
                    onChange={(e) => updateItem(idx, 'cost_price', e.target.value)}
                    className={field}
                    placeholder="ราคา"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  className={cn('flex items-center justify-center h-9 w-9 rounded-lg border border-red-200 text-red-400 hover:bg-red-50', items.length === 1 && 'opacity-30 cursor-not-allowed')}
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700">
              ยอดรวม:{' '}
              <span className="text-lg font-bold text-gray-900">
                {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
              </span>
            </p>
          </div>
        </div>

        {canCreate && (
          <div className="flex items-center justify-end gap-3">
            <Link to="/purchase-orders" className="rounded-lg border border-gray-200 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50">
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? 'กำลังสร้าง...' : 'สร้างใบสั่งซื้อ'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
