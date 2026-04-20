import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { goodsReceiptService } from '@/api/goodsReceiptService'
import { purchaseOrderService } from '@/api/purchaseOrderService'
import { warehouseService } from '@/api/warehouseService'
import type { GoodsReceipt, GoodsReceiptPayload } from '@/types/inventory'
import type { Vendor } from '@/types/inventory'
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
  warehouse_id: string
  vendor_id: string
  reference_no: string
  note: string
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: 'ร่าง', className: 'bg-gray-100 text-gray-600' },
  received: { label: 'รับแล้ว', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ยกเลิก', className: 'bg-red-100 text-red-600' },
}

export function GoodsReceiptFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { permissions } = useAuthStore()
  const isEdit = Boolean(id)

  const [receipt, setReceipt] = useState<GoodsReceipt | null>(null)
  const [warehouses, setWarehouses] = useState<{ id: number; name: string }[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [products, setProducts] = useState<{ id: number; sku: string; name: string }[]>([])
  const [items, setItems] = useState<ItemRow[]>([{ product_id: '', qty: '', cost_price: '' }])
  const [isLoading, setIsLoading] = useState(isEdit)
  const [isSaving, setIsSaving] = useState(false)
  const [isActioning, setIsActioning] = useState(false)

  const canCreate = hasPermission(permissions, 'goods_receipts', 'can_create')
  const canEdit = hasPermission(permissions, 'goods_receipts', 'can_edit')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { warehouse_id: '', vendor_id: '', reference_no: '', note: '' },
  })

  useEffect(() => {
    warehouseService.getWarehouses({ limit: 200 })
      .then((res) => setWarehouses(res.data.data ?? []))
      .catch(() => {})
    purchaseOrderService.getVendors()
      .then((res) => setVendors(res.data.data ?? []))
      .catch(() => {})
    apiClient.get('/products?limit=200')
      .then((res) => setProducts(res.data?.data ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    goodsReceiptService.getGoodsReceipt(Number(id))
      .then((res) => {
        const data = res.data.data
        setReceipt(data)
        reset({
          warehouse_id: String(data.warehouse_id),
          vendor_id: data.vendor_id ? String(data.vendor_id) : '',
          reference_no: data.reference_no ?? '',
          note: data.note ?? '',
        })
        if (data.items?.length) {
          setItems(data.items.map((it) => ({
            product_id: String(it.product_id),
            qty: String(it.qty),
            cost_price: String(it.cost_price),
          })))
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [id, reset])

  const addItem = () => setItems((prev) => [...prev, { product_id: '', qty: '', cost_price: '' }])
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))
  const updateItem = (idx: number, key: keyof ItemRow, value: string) =>
    setItems((prev) => prev.map((row, i) => i === idx ? { ...row, [key]: value } : row))

  const buildPayload = (values: FormValues): GoodsReceiptPayload => ({
    warehouse_id: Number(values.warehouse_id),
    vendor_id: values.vendor_id ? Number(values.vendor_id) : undefined,
    reference_no: values.reference_no || undefined,
    note: values.note || undefined,
    items: items.filter((it) => it.product_id && it.qty).map((it) => ({
      product_id: Number(it.product_id),
      qty: Number(it.qty),
      cost_price: Number(it.cost_price) || 0,
    })),
  })

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true)
    try {
      if (isEdit && receipt) {
        await goodsReceiptService.updateGoodsReceipt(receipt.id, buildPayload(values))
        navigate(`/goods-receipts/${receipt.id}`)
      } else {
        const res = await goodsReceiptService.createGoodsReceipt(buildPayload(values))
        navigate(`/goods-receipts/${res.data.data.id}`)
      }
    } catch {
      // interceptor handles display
    } finally {
      setIsSaving(false)
    }
  }

  const handleApprove = async () => {
    if (!receipt || !window.confirm('ยืนยันการรับสินค้า?')) return
    setIsActioning(true)
    try {
      await goodsReceiptService.approveGoodsReceipt(receipt.id)
      navigate(`/goods-receipts/${receipt.id}`, { replace: true })
      window.location.reload()
    } catch {
      // interceptor handles display
    } finally {
      setIsActioning(false)
    }
  }

  const handleCancel = async () => {
    if (!receipt || !window.confirm('ยืนยันการยกเลิกใบรับสินค้านี้?')) return
    setIsActioning(true)
    try {
      await goodsReceiptService.cancelGoodsReceipt(receipt.id)
      navigate('/goods-receipts')
    } catch {
      // interceptor handles display
    } finally {
      setIsActioning(false)
    }
  }

  const isReadonly = receipt?.status !== 'draft' && Boolean(receipt)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 rounded bg-gray-100 animate-pulse" />
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (<div key={i} className="h-9 rounded bg-gray-100 animate-pulse" />))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/goods-receipts" className="text-gray-400 hover:text-gray-600"><ChevronLeftIcon /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? (receipt ? `ใบรับสินค้า: ${receipt.code}` : 'แก้ไขใบรับสินค้า') : 'สร้างใบรับสินค้า'}
            </h1>
            {receipt && (
              <span className={cn('mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium', STATUS_LABELS[receipt.status]?.className)}>
                {STATUS_LABELS[receipt.status]?.label}
              </span>
            )}
          </div>
        </div>
        {receipt?.status === 'draft' && (
          <div className="flex gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={isActioning}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                {isActioning ? 'กำลังดำเนินการ...' : 'รับสินค้า'}
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isActioning}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                ยกเลิก
              </button>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Main fields */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">ข้อมูลทั่วไป</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={lbl}>คลังสินค้า <span className="text-red-500">*</span></label>
              <select
                {...register('warehouse_id', { required: 'กรุณาเลือกคลัง' })}
                className={cn(field, errors.warehouse_id && 'border-red-400')}
                disabled={isReadonly}
              >
                <option value="">— เลือกคลัง —</option>
                {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
              </select>
              {errors.warehouse_id && <p className="mt-1 text-xs text-red-500">{errors.warehouse_id.message}</p>}
            </div>
            <div>
              <label className={lbl}>Vendor</label>
              <select
                {...register('vendor_id')}
                className={field}
                disabled={isReadonly}
              >
                <option value="">— เลือก Vendor —</option>
                {vendors.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
              </select>
            </div>
            <div>
              <label className={lbl}>เลขอ้างอิง</label>
              <input
                {...register('reference_no')}
                className={field}
                placeholder="เช่น PO-2024-001"
                disabled={isReadonly}
              />
            </div>
            <div>
              <label className={lbl}>หมายเหตุ</label>
              <input {...register('note')} className={field} placeholder="หมายเหตุ" disabled={isReadonly} />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">รายการสินค้า</h2>
            {!isReadonly && (
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <PlusIcon /> เพิ่มรายการ
              </button>
            )}
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
                    disabled={isReadonly}
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
                    disabled={isReadonly}
                  />
                </div>
                <div>
                  {idx === 0 && <label className={lbl}>ราคาทุน</label>}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.cost_price}
                    onChange={(e) => updateItem(idx, 'cost_price', e.target.value)}
                    className={field}
                    placeholder="ราคาทุน"
                    disabled={isReadonly}
                  />
                </div>
                {!isReadonly && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    className={cn('flex items-center justify-center h-9 w-9 rounded-lg border border-red-200 text-red-400 hover:bg-red-50', items.length === 1 && 'opacity-30 cursor-not-allowed')}
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        {!isReadonly && (canCreate || canEdit) && (
          <div className="flex items-center justify-end gap-3">
            <Link to="/goods-receipts" className="rounded-lg border border-gray-200 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50">
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? 'กำลังบันทึก...' : isEdit ? 'บันทึก' : 'สร้างใบรับสินค้า'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
