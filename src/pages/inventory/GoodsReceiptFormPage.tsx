import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { goodsReceiptService } from '@/api/goodsReceiptService'
import { purchaseOrderService } from '@/api/purchaseOrderService'
import { warehouseService } from '@/api/warehouseService'
import type { GoodsReceiptPayload, GoodsReceiptDocument, GoodsReceiptDocumentType } from '@/types/inventory'
import type { Vendor } from '@/types/inventory'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { apiClient } from '@/api/client'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { RichTextToolbar } from '@/components/RichTextToolbar'

const field = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
const lbl = 'mb-1.5 block text-sm font-medium text-gray-700'

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
  received_date: string
  notes: string
}

export function GoodsReceiptFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { permissions } = useAuthStore()
  const isEdit = Boolean(id)

  const [warehouses, setWarehouses] = useState<{ id: number; name: string }[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [products, setProducts] = useState<{ id: number; sku: string; name: string }[]>([])
  const [items, setItems] = useState<ItemRow[]>([{ product_id: '', qty: '', cost_price: '' }])
  const [documents, setDocuments] = useState<GoodsReceiptDocument[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null)
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<number | null>(null)
  const [uploadFileType, setUploadFileType] = useState<GoodsReceiptDocumentType>('invoice')
  const [uploadNote, setUploadNote] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(isEdit)
  const [isSaving, setIsSaving] = useState(false)

  const canCreate = hasPermission(permissions, 'goods_receipts', 'can_create')
  const canEdit = hasPermission(permissions, 'goods_receipts', 'can_edit')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { warehouse_id: '', vendor_id: '', reference_no: '', received_date: '', notes: '' },
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
        if (data.status !== 'draft') {
          navigate(`/goods-receipts/${id}`, { replace: true })
          return
        }
        reset({
          warehouse_id: String(data.warehouse_id),
          vendor_id: data.vendor_id ? String(data.vendor_id) : '',
          reference_no: data.reference_no ?? '',
          received_date: data.received_date ? data.received_date.slice(0, 10) : '',
          notes: data.notes ?? '',
        })
        if (data.items?.length) {
          setItems(data.items.map((it) => ({
            product_id: it.product_id != null ? String(it.product_id) : '',
            qty: it.qty != null ? String(it.qty) : '',
            cost_price: it.cost_price != null ? String(it.cost_price) : '',
          })))
        }
        setDocuments(data.documents ?? [])
      })
      .catch(() => navigate('/goods-receipts', { replace: true }))
      .finally(() => setIsLoading(false))
  }, [id, reset, navigate])

  const addItem = () => setItems((prev) => [...prev, { product_id: '', qty: '', cost_price: '' }])
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))
  const updateItem = (idx: number, key: keyof ItemRow, value: string) =>
    setItems((prev) => prev.map((row, i) => i === idx ? { ...row, [key]: value } : row))

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setIsUploading(true)
    try {
      const res = await goodsReceiptService.uploadDocument(Number(id), file, {
        file_type: uploadFileType,
        note: uploadNote || undefined,
      })
      setDocuments((prev) => [...prev, res.data.data])
      setUploadNote('')
    } catch {
      // interceptor handles display
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteDocument = (docId: number) => { setConfirmDeleteDocId(docId) }

  const handleConfirmDeleteDocument = async () => {
    if (!id || !confirmDeleteDocId) return
    const docId = confirmDeleteDocId
    setConfirmDeleteDocId(null)
    setDeletingDocId(docId)
    try {
      await goodsReceiptService.deleteDocument(Number(id), docId)
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
    } catch {
      // interceptor handles display
    } finally {
      setDeletingDocId(null)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const buildPayload = (values: FormValues): GoodsReceiptPayload => ({
    warehouse_id: Number(values.warehouse_id),
    vendor_id: values.vendor_id ? Number(values.vendor_id) : undefined,
    reference_no: values.reference_no || undefined,
    received_date: values.received_date || undefined,
    notes: values.notes || undefined,
    items: items.filter((it) => it.product_id && it.qty).map((it) => ({
      product_id: Number(it.product_id),
      qty: Number(it.qty),
      cost_price: Number(it.cost_price) || 0,
    })),
  })

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true)
    try {
      if (isEdit && id) {
        await goodsReceiptService.updateGoodsReceipt(Number(id), buildPayload(values))
        navigate(`/goods-receipts/${id}`)
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

  const backTo = isEdit ? `/goods-receipts/${id}` : '/goods-receipts'

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={backTo} className="text-gray-400 hover:text-gray-600">
          <ChevronLeftIcon />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'แก้ไขใบรับสินค้า' : 'สร้างใบรับสินค้า'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">ข้อมูลทั่วไป</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={lbl}>คลังสินค้า <span className="text-red-500">*</span></label>
              <select
                {...register('warehouse_id', { required: 'กรุณาเลือกคลัง' })}
                className={cn(field, errors.warehouse_id && 'border-red-400')}
              >
                <option value="">— เลือกคลัง —</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              {errors.warehouse_id && (
                <p className="mt-1 text-xs text-red-500">{errors.warehouse_id.message}</p>
              )}
            </div>
            <div>
              <label className={lbl}>Vendor</label>
              <select {...register('vendor_id')} className={field}>
                <option value="">— เลือก Vendor —</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>เลขอ้างอิง</label>
              <input
                {...register('reference_no')}
                className={field}
                placeholder="เช่น INV-2024-001, DO-001"
              />
            </div>
            <div>
              <label className={lbl}>วันที่รับสินค้า</label>
              <input
                type="date"
                {...register('received_date')}
                className={field}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>หมายเหตุ</label>
              <div className="overflow-hidden rounded-lg border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <RichTextToolbar />
                <textarea
                  rows={4}
                  {...register('notes')}
                  className="w-full border-0 px-3 py-2.5 text-sm text-gray-700 focus:outline-none resize-y bg-white"
                  placeholder="หมายเหตุ..."
                />
              </div>
            </div>
          </div>
        </div>

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
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                    ))}
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
                  {idx === 0 && <label className={lbl}>ราคาทุน</label>}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.cost_price}
                    onChange={(e) => updateItem(idx, 'cost_price', e.target.value)}
                    className={field}
                    placeholder="ราคาทุน"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  className={cn(
                    'flex items-center justify-center h-9 w-9 rounded-lg border border-red-200 text-red-400 hover:bg-red-50',
                    items.length === 1 && 'cursor-not-allowed opacity-30'
                  )}
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
          {items.some((r) => r.qty && r.cost_price) && (
            <div className="mt-4 flex justify-end border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-500">
                ยอดรวมโดยประมาณ{' '}
                <span className="font-semibold text-gray-900">
                  {items
                    .reduce((sum, r) => sum + (parseFloat(r.qty) || 0) * (parseFloat(r.cost_price) || 0), 0)
                    .toLocaleString('th-TH', { minimumFractionDigits: 2 })}{' '}฿
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Documents */}
        {isEdit && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">เอกสารแนบ</h2>
              <p className="mt-1 text-xs text-gray-400">อัปโหลดไฟล์จริงจาก vendor (PDF, JPG, PNG, Word, Excel) — อัปได้หลายไฟล์</p>
            </div>

            {/* Upload form */}
            <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 sm:grid-cols-[180px_1fr_auto]">
              <div>
                <label className={lbl}>ประเภทเอกสาร</label>
                <select
                  value={uploadFileType}
                  onChange={(e) => setUploadFileType(e.target.value as GoodsReceiptDocumentType)}
                  className={field}
                  disabled={isUploading}
                >
                  <option value="invoice">ใบกำกับภาษี</option>
                  <option value="delivery_note">ใบส่งของ</option>
                  <option value="receipt">ใบเสร็จรับเงิน</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>
              <div>
                <label className={lbl}>หมายเหตุ (ไม่บังคับ)</label>
                <input
                  type="text"
                  value={uploadNote}
                  onChange={(e) => setUploadNote(e.target.value)}
                  className={field}
                  placeholder="เช่น เลขที่ใบส่งของ, หมายเหตุพิเศษ"
                  disabled={isUploading}
                />
              </div>
              <div className="flex items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {isUploading ? 'กำลังอัปโหลด...' : 'เลือกไฟล์'}
                </button>
              </div>
            </div>

            {documents.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">ยังไม่มีเอกสารแนบ</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center gap-3 py-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                    </svg>
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
                    {doc.file_size && <span className="text-xs text-gray-400">{formatFileSize(doc.file_size)}</span>}
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id)}
                      disabled={deletingDocId === doc.id}
                      title="ลบไฟล์"
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-400 hover:bg-red-50 disabled:opacity-40"
                    >
                      <TrashIcon />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {(canCreate || canEdit) && (
          <div className="flex items-center justify-end gap-3">
            <Link
              to={backTo}
              className="rounded-lg border border-gray-200 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
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

      <ConfirmModal
        isOpen={confirmDeleteDocId !== null}
        title="ยืนยันการลบไฟล์"
        message="คุณต้องการลบไฟล์แนบนี้ออกใช่หรือไม่?"
        confirmLabel="ลบไฟล์"
        variant="danger"
        isLoading={deletingDocId !== null}
        onConfirm={handleConfirmDeleteDocument}
        onCancel={() => setConfirmDeleteDocId(null)}
      />
    </div>
  )
}
