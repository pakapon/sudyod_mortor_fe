import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { stockTransferService } from '@/api/stockTransferService'
import { warehouseService } from '@/api/warehouseService'
import type { StockTransfer, StockTransferPayload } from '@/types/inventory'
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
}

interface FormValues {
  from_warehouse_id: string
  to_warehouse_id: string
  note: string
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: 'ร่าง', className: 'bg-gray-100 text-gray-600' },
  pending: { label: 'รอดำเนินการ', className: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'อนุมัติแล้ว', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'ปฏิเสธ', className: 'bg-red-100 text-red-600' },
}

export function StockTransferFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { permissions } = useAuthStore()
  const isEdit = Boolean(id)

  const [transfer, setTransfer] = useState<StockTransfer | null>(null)
  const [warehouses, setWarehouses] = useState<{ id: number; name: string }[]>([])
  const [products, setProducts] = useState<{ id: number; sku: string; name: string }[]>([])
  const [items, setItems] = useState<ItemRow[]>([{ product_id: '', qty: '' }])
  const [isLoading, setIsLoading] = useState(isEdit)
  const [isSaving, setIsSaving] = useState(false)
  const [isActioning, setIsActioning] = useState(false)

  const canCreate = hasPermission(permissions, 'stock_transfers', 'can_create')
  const canEdit = hasPermission(permissions, 'stock_transfers', 'can_edit')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { from_warehouse_id: '', to_warehouse_id: '', note: '' },
  })

  useEffect(() => {
    warehouseService.getWarehouses({ limit: 200 })
      .then((res) => setWarehouses(res.data.data ?? []))
      .catch(() => {})
    apiClient.get('/products?limit=200')
      .then((res) => setProducts(res.data?.data ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    stockTransferService.getStockTransfer(Number(id))
      .then((res) => {
        const data = res.data.data
        setTransfer(data)
        reset({
          from_warehouse_id: String(data.from_warehouse_id),
          to_warehouse_id: String(data.to_warehouse_id),
          note: data.note ?? '',
        })
        if (data.items?.length) {
          setItems(data.items.map((it) => ({
            product_id: String(it.product_id),
            qty: String(it.qty),
          })))
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [id, reset])

  const addItem = () => setItems((prev) => [...prev, { product_id: '', qty: '' }])
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))
  const updateItem = (idx: number, key: keyof ItemRow, value: string) =>
    setItems((prev) => prev.map((row, i) => i === idx ? { ...row, [key]: value } : row))

  const buildPayload = (values: FormValues): StockTransferPayload => ({
    from_warehouse_id: Number(values.from_warehouse_id),
    to_warehouse_id: Number(values.to_warehouse_id),
    note: values.note || undefined,
    items: items.filter((it) => it.product_id && it.qty).map((it) => ({
      product_id: Number(it.product_id),
      qty: Number(it.qty),
    })),
  })

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true)
    try {
      if (isEdit && transfer) {
        await stockTransferService.updateStockTransfer(transfer.id, buildPayload(values))
        navigate(`/stock-transfers/${transfer.id}`)
      } else {
        const res = await stockTransferService.createStockTransfer(buildPayload(values))
        navigate(`/stock-transfers/${res.data.data.id}`)
      }
    } catch {
      // interceptor handles display
    } finally {
      setIsSaving(false)
    }
  }

  const handleApprove = async () => {
    if (!transfer || !window.confirm('ยืนยันการอนุมัติโอนย้ายสต็อก?')) return
    setIsActioning(true)
    try {
      await stockTransferService.approveStockTransfer(transfer.id)
      window.location.reload()
    } catch {
      // interceptor handles display
    } finally {
      setIsActioning(false)
    }
  }

  const handleReject = async () => {
    if (!transfer || !window.confirm('ยืนยันการปฏิเสธ?')) return
    setIsActioning(true)
    try {
      await stockTransferService.rejectStockTransfer(transfer.id)
      window.location.reload()
    } catch {
      // interceptor handles display
    } finally {
      setIsActioning(false)
    }
  }

  const handleComplete = async () => {
    if (!transfer || !window.confirm('ยืนยันการดำเนินการโอนย้ายเสร็จสิ้น?')) return
    setIsActioning(true)
    try {
      await stockTransferService.completeStockTransfer(transfer.id)
      navigate('/stock-transfers')
    } catch {
      // interceptor handles display
    } finally {
      setIsActioning(false)
    }
  }

  const isReadonly = transfer !== null && transfer.status !== 'draft'

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 rounded bg-gray-100 animate-pulse" />
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-9 rounded bg-gray-100 animate-pulse" />))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/stock-transfers" className="text-gray-400 hover:text-gray-600"><ChevronLeftIcon /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? (transfer ? `โอนย้ายสต็อก: ${transfer.code}` : 'แก้ไขโอนย้ายสต็อก') : 'สร้างใบโอนย้าย'}
            </h1>
            {transfer && (
              <span className={cn('mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium', STATUS_LABELS[transfer.status]?.className)}>
                {STATUS_LABELS[transfer.status]?.label}
              </span>
            )}
          </div>
        </div>
        {transfer && canEdit && (
          <div className="flex gap-2">
            {transfer.status === 'draft' || transfer.status === 'pending' ? (
              <button
                type="button"
                onClick={handleApprove}
                disabled={isActioning}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                อนุมัติ
              </button>
            ) : null}
            {(transfer.status === 'draft' || transfer.status === 'pending') && (
              <button
                type="button"
                onClick={handleReject}
                disabled={isActioning}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                ปฏิเสธ
              </button>
            )}
            {transfer.status === 'approved' && (
              <button
                type="button"
                onClick={handleComplete}
                disabled={isActioning}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                ดำเนินการเสร็จสิ้น
              </button>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">ข้อมูลทั่วไป</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={lbl}>จากคลัง <span className="text-red-500">*</span></label>
              <select
                {...register('from_warehouse_id', { required: 'กรุณาเลือกคลังต้นทาง' })}
                className={cn(field, errors.from_warehouse_id && 'border-red-400')}
                disabled={isReadonly}
              >
                <option value="">— เลือกคลังต้นทาง —</option>
                {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
              </select>
              {errors.from_warehouse_id && <p className="mt-1 text-xs text-red-500">{errors.from_warehouse_id.message}</p>}
            </div>
            <div>
              <label className={lbl}>ไปคลัง <span className="text-red-500">*</span></label>
              <select
                {...register('to_warehouse_id', { required: 'กรุณาเลือกคลังปลายทาง' })}
                className={cn(field, errors.to_warehouse_id && 'border-red-400')}
                disabled={isReadonly}
              >
                <option value="">— เลือกคลังปลายทาง —</option>
                {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
              </select>
              {errors.to_warehouse_id && <p className="mt-1 text-xs text-red-500">{errors.to_warehouse_id.message}</p>}
            </div>
            <div className="sm:col-span-2">
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
              <div key={idx} className="grid grid-cols-[1fr_140px_36px] gap-2 items-end">
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

        {!isReadonly && (canCreate || canEdit) && (
          <div className="flex items-center justify-end gap-3">
            <Link to="/stock-transfers" className="rounded-lg border border-gray-200 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50">
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? 'กำลังบันทึก...' : isEdit ? 'บันทึก' : 'สร้างใบโอนย้าย'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
