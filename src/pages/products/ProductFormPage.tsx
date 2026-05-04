import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { productService } from '@/api/productService'
import { hrService } from '@/api/hrService'
import { apiClient } from '@/api/client'
import { RichTextToolbar } from '@/components/RichTextToolbar'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import type {
  Product,
  ProductImage,
  ProductVariant,
  ProductVariantPayload,
  AttributeOption,
  ProductPayload,
  ProductType,
  BOMItem,
  ProductCompatibility,
  ProductCompatibilityPayload,
} from '@/types/product'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────
interface FormValues {
  sku: string
  name: string
  product_type: string
  brand_id: string
  category_id: string
  base_unit_id: string
  description: string
  min_quantity: string
  is_active: boolean
  vat_code: string
  vendor_id: string
  weight_grams: string
  height_cm: string
  width_cm: string
  length_cm: string
  selling_price: string
}

type BottomTabKey = 'sku' | 'bundle' | 'spare'
const BOTTOM_TABS: { key: BottomTabKey; label: string }[] = [
  { key: 'sku', label: 'รหัสสินค้า/แบบสินค้า' },
  { key: 'bundle', label: 'ชุดอะไหล่' },
  { key: 'spare', label: 'อะไหล่' },
]

// ─── Icons ───────────────────────────────────────────────────────────────────
function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
function TrashIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}
function UploadCloudIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  )
}
function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function EditPenIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function SortIcon() {
  return (
    <svg className="inline ml-1 opacity-40" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
    </svg>
  )
}

// ─── Form field styles ────────────────────────────────────────────────────────
const fieldCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
const labelCls = 'mb-1.5 block text-sm font-medium text-gray-700'

// ─── BOM Types ───────────────────────────────────────────────────────────────
interface BomComponentRow {
  sku: string
  quantity: number
}

// ─── SKU Dropdown Search ──────────────────────────────────────────────────────
function SkuSearchInput({ value, onChange, excludeProductId }: {
  value: string
  onChange: (sku: string) => void
  excludeProductId?: number
}) {
  const [query, setQuery] = useState(value)
  const [options, setOptions] = useState<{ sku: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  const doSearch = (term: string) => {
    if (!term.trim()) { setOptions([]); setOpen(false); return }
    setLoading(true)
    productService.searchVariants({ search: term, exclude_product_id: excludeProductId, limit: 20 })
      .then((res) => {
        const items: { sku: string; name: string }[] = res.data?.data ?? []
        setOptions(items)
        setOpen(true)
      })
      .catch(() => setOptions([]))
      .finally(() => setLoading(false))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    onChange(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(val), 300)
  }

  const handleSelect = (sku: string) => {
    setQuery(sku)
    onChange(sku)
    setOpen(false)
    setOptions([])
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => { if (query && options.length > 0) setOpen(true) }}
        className={fieldCls}
        placeholder="พิมพ์เพื่อค้นหา SKU"
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      )}
      {open && options.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg max-h-48 overflow-y-auto">
          {options.map((opt) => (
            <li
              key={opt.sku}
              onMouseDown={() => handleSelect(opt.sku)}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-blue-50"
            >
              <span className="font-mono text-xs font-semibold text-gray-800">{opt.sku}</span>
              <span className="truncate text-xs text-gray-500">{opt.name}</span>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && options.length === 0 && query.trim() && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-400 shadow-lg">
          ไม่พบ SKU ที่ตรงกัน
        </div>
      )}
    </div>
  )
}

// ─── Compatibility Modal ──────────────────────────────────────────────────────
function CompatibilityModal({ productId, initial, onClose, onSaved }: {
  productId: number
  initial?: ProductCompatibility | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = Boolean(initial)
  const [form, setForm] = useState<ProductCompatibilityPayload>({
    vehicle_code: initial?.vehicle_code ?? '',
    vehicle_name: initial?.vehicle_name ?? '',
    model: initial?.model ?? '',
    year_start: initial?.year_start ?? undefined,
    year_end: initial?.year_end ?? undefined,
    note: initial?.note ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const set = (k: keyof ProductCompatibilityPayload, v: string | number | undefined) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const handleSave = async () => {
    const errs: string[] = []
    if (!form.vehicle_code.trim()) errs.push('กรุณากรอกรหัสรถ')
    if (!form.vehicle_name.trim()) errs.push('กรุณากรอกชื่อยานพาหนะ')
    if (errs.length) { setErrors(errs); return }
    setSaving(true)
    setErrors([])
    const payload: ProductCompatibilityPayload = {
      vehicle_code: form.vehicle_code.trim(),
      vehicle_name: form.vehicle_name.trim(),
      ...(form.model?.trim() && { model: form.model.trim() }),
      ...(form.year_start && { year_start: Number(form.year_start) }),
      ...(form.year_end && { year_end: Number(form.year_end) }),
      ...(form.note?.trim() && { note: form.note.trim() }),
    }
    try {
      if (isEdit && initial) {
        await productService.updateProductCompatibility(productId, initial.id, payload)
      } else {
        await productService.createProductCompatibility(productId, payload)
      }
      onSaved()
    } catch {
      setErrors(['เกิดข้อผิดพลาด กรุณาตรวจสอบข้อมูลแล้วลองใหม่'])
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <h3 className="text-base font-semibold text-gray-900">{isEdit ? 'แก้ไขรุ่นรถที่รองรับ' : 'เพิ่มรุ่นรถที่รองรับ'}</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>รหัสรถ <span className="text-red-500">*</span></label>
              <input value={form.vehicle_code} onChange={(e) => set('vehicle_code', e.target.value)}
                className={cn(fieldCls, !form.vehicle_code && errors.length > 0 && 'border-red-400')}
                placeholder="เช่น CAR-001" autoComplete="off" />
            </div>
            <div>
              <label className={labelCls}>ชื่อยานพาหนะ <span className="text-red-500">*</span></label>
              <input value={form.vehicle_name} onChange={(e) => set('vehicle_name', e.target.value)}
                className={cn(fieldCls, !form.vehicle_name && errors.length > 0 && 'border-red-400')}
                placeholder="เช่น Honda City 1.5 RS" autoComplete="off" />
            </div>
          </div>

          <div>
            <label className={labelCls}>รุ่น (MODEL)</label>
            <input value={form.model ?? ''} onChange={(e) => set('model', e.target.value)}
              className={fieldCls} placeholder="เช่น City, Civic" autoComplete="off" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>ปีเริ่มผลิต</label>
              <input type="number" min="1900" max="2100" value={form.year_start ?? ''}
                onChange={(e) => set('year_start', e.target.value ? Number(e.target.value) : undefined)}
                className={fieldCls} placeholder="เช่น 2010" />
            </div>
            <div>
              <label className={labelCls}>ปีสิ้นสุด</label>
              <input type="number" min="1900" max="2100" value={form.year_end ?? ''}
                onChange={(e) => set('year_end', e.target.value ? Number(e.target.value) : undefined)}
                className={fieldCls} placeholder="เช่น 2022" />
            </div>
          </div>

          <div>
            <label className={labelCls}>เงื่อนไข</label>
            <input value={form.note ?? ''} onChange={(e) => set('note', e.target.value)}
              className={fieldCls} placeholder="เช่น เฉพาะเครื่องยนต์ 2.0" autoComplete="off" />
          </div>

          {errors.length > 0 && (
            <div className="rounded-lg bg-red-50 px-4 py-2">
              {errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
          <button type="button" disabled={saving} onClick={handleSave}
            className="flex-1 rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60">
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
          <button type="button" onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Compatibility Tab (Edit) ─────────────────────────────────────────────────
function CompatibilityTabEdit({ productId, productSku }: { productId: number; productSku: string }) {
  const [items, setItems] = useState<ProductCompatibility[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ProductCompatibility | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductCompatibility | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    productService.getProductCompatibility(productId)
      .then((res) => setItems(Array.isArray(res.data.data) ? res.data.data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [productId])

  const handleSaved = () => { setShowModal(false); setEditing(null); load() }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await productService.deleteProductCompatibility(productId, deleteTarget.id)
      setDeleteTarget(null)
      load()
    } catch { /* interceptor handles */ }
    finally { setDeleting(false) }
  }

  if (loading) return <div className="py-8 text-center text-sm text-gray-400">กำลังโหลด...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800">สามารถใช้กับ (Compatibility)</h4>
        <button type="button"
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors">
          <PlusIcon size={13} /> เพิ่ม
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center">
          <p className="text-sm text-gray-400">ยังไม่มีข้อมูลรุ่นรถที่รองรับ</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['รหัสสินค้า', 'รหัสรถ', 'ชื่อยานพาหนะ', 'รุ่น (MODEL)', 'ปีเริ่มผลิต', 'ปีสิ้นสุด', 'เงื่อนไข', ''].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-mono text-xs text-blue-600">{productSku}</td>
                  <td className="px-3 py-2.5 font-mono text-xs font-medium text-gray-800">{item.vehicle_code}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-700">{item.vehicle_name}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{item.model ?? '-'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{item.year_start ?? '-'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{item.year_end ?? '-'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[180px] truncate">{item.note ?? '-'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button type="button" title="แก้ไข"
                        onClick={() => { setEditing(item); setShowModal(true) }}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                        <EditPenIcon size={14} />
                      </button>
                      <button type="button" title="ลบ"
                        onClick={() => setDeleteTarget(item)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-600">
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <CompatibilityModal
          productId={productId}
          initial={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={handleSaved}
        />
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="ลบรุ่นรถที่รองรับ"
        message={`ยืนยันลบ "${deleteTarget?.vehicle_code} — ${deleteTarget?.vehicle_name}"? ไม่สามารถเรียกคืนได้`}
        confirmLabel="ลบ"
        variant="danger"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

// ─── BOM Modal (Add/Edit per parent_sku — replace-all) ───────────────────────
function BomModal({ productId, variants, initial, onClose, onSaved }: {
  productId: number
  variants: ProductVariant[]
  initial?: { parentSku: string; components: BomComponentRow[]; stockPolicy: 'auto' | 'manual' } | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = Boolean(initial)
  const [parentSku, setParentSku] = useState(initial?.parentSku ?? '')
  const [components, setComponents] = useState<BomComponentRow[]>(
    initial?.components.length ? initial.components : [{ sku: '', quantity: 1 }]
  )
  const [stockPolicy, setStockPolicy] = useState<'auto' | 'manual'>(initial?.stockPolicy ?? 'auto')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const addRow = () => setComponents((prev) => [...prev, { sku: '', quantity: 1 }])
  const removeRow = (i: number) => setComponents((prev) => prev.filter((_, idx) => idx !== i))
  const updateRow = (i: number, field: keyof BomComponentRow, val: string | number) =>
    setComponents((prev) => prev.map((row, idx) => idx === i ? { ...row, [field]: val } : row))

  const handleSave = async () => {
    const errs: string[] = []
    if (!parentSku.trim()) errs.push('กรุณาเลือก Parent SKU')
    const valid = components.filter((r) => r.sku.trim())
    if (valid.length === 0) errs.push('กรุณากรอก SKU ชิ้นส่วนอย่างน้อย 1 รายการ')
    if (errs.length) { setErrors(errs); return }
    setSaving(true)
    setErrors([])
    try {
      await productService.createBOMSet(productId, {
        parent_sku: parentSku.trim(),
        components: valid.map((r) => ({ sku: r.sku.trim(), quantity: r.quantity })),
        bom_stock_policy: stockPolicy,
      })
      onSaved()
    } catch {
      setErrors(['เกิดข้อผิดพลาด กรุณาตรวจสอบ SKU แล้วลองใหม่'])
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <h3 className="text-base font-semibold text-gray-900">{isEdit ? 'แก้ไขชุดอะไหล่' : 'เพิ่มชุดอะไหล่'}</h3>

          <div>
            <label className={labelCls}>Parent SKU (สินค้าชุด)</label>
            <select
              value={parentSku}
              onChange={(e) => { setParentSku(e.target.value); setErrors([]) }}
              className={cn(fieldCls, !parentSku && errors.length > 0 && 'border-red-400')}
              disabled={isEdit}
            >
              <option value="">— เลือก SKU —</option>
              {variants.map((v) => (
                <option key={v.id} value={v.sku}>{v.sku} – {v.name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-2 grid grid-cols-[1fr_6rem_1.75rem] gap-2 items-end">
              <label className={cn(labelCls, 'mb-0')}>ชิ้นส่วน (Component SKU)</label>
              <label className={cn(labelCls, 'mb-0 text-center')}>จำนวน</label>
              <div />
            </div>
            <div className="space-y-2">
              {components.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_6rem_1.75rem] gap-2 items-center">
                  <SkuSearchInput
                    value={row.sku}
                    onChange={(val) => updateRow(i, 'sku', val)}
                    excludeProductId={productId}
                  />
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    value={row.quantity}
                    onChange={(e) => updateRow(i, 'quantity', Number(e.target.value))}
                    className={cn(fieldCls, 'text-center')}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="flex items-center justify-center text-red-400 hover:text-red-600"
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addRow}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
            >
              <PlusIcon size={11} /> เพิ่มชิ้นส่วน
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label className={cn(labelCls, 'mb-0 shrink-0 w-36')}>นโยบายการตัดสต็อก</label>
            <select
              value={stockPolicy}
              onChange={(e) => setStockPolicy(e.target.value as 'auto' | 'manual')}
              className={cn(fieldCls, 'flex-1')}
            >
              <option value="auto">ตัดสต็อกอัตโนมัติ</option>
              <option value="manual">ไม่ตัดสต็อก</option>
            </select>
          </div>

          {errors.length > 0 && (
            <div className="rounded-lg bg-red-50 px-4 py-2">
              {errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex-1 rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── BOM Tab (Edit) ───────────────────────────────────────────────────────────
function BomTabEdit({ productId }: { productId: number }) {
  const [bom, setBom] = useState<BOMItem[]>([])
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<{ parentSku: string; components: BomComponentRow[]; stockPolicy: 'auto' | 'manual' } | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const loadBom = async () => {
    setLoading(true)
    try {
      const [bomRes, varRes] = await Promise.all([
        productService.getProductBOM(productId),
        productService.getProductVariants(productId),
      ])
      setBom(Array.isArray(bomRes.data.data) ? bomRes.data.data : [])
      setVariants(Array.isArray(varRes.data.data) ? varRes.data.data : [])
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { loadBom() }, [productId])

  const handleEdit = (item: BOMItem) => {
    const parentSku = item.parent_variant?.sku ?? ''
    const groupItems = bom.filter((b) => b.parent_variant_id === item.parent_variant_id)
    setEditingGroup({
      parentSku,
      components: groupItems.map((b) => ({ sku: b.child_variant?.sku ?? '', quantity: Number(b.quantity) })),
      stockPolicy: (item.parent_variant?.bom_stock_policy as 'auto' | 'manual') ?? 'auto',
    })
  }

  const handleDelete = (id: number) => {
    setConfirmDeleteId(id)
  }

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    setConfirmDeleteId(null)
    setDeletingId(id)
    try {
      await productService.deleteBOMItem(productId, id)
      setBom((prev) => prev.filter((item) => item.id !== id))
    } catch { } finally { setDeletingId(null) }
  }

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-8 w-32 rounded bg-gray-100" />
        <div className="h-32 rounded-xl bg-gray-100" />
      </div>
    )
  }

  const POLICY_LABELS: Record<string, string> = { auto: 'ตัดสต็อกอัตโนมัติ', manual: 'ไม่ตัดสต็อก' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">ชุดอะไหล่ (BOM)</h3>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          <PlusIcon size={13} /> เพิ่มชุด
        </button>
      </div>

      {bom.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
          ยังไม่มีชุดอะไหล่ — กด "+ เพิ่มชุด" เพื่อเริ่มต้น
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Parent SKU</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Component SKU</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">ชื่อชิ้นส่วน</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">จำนวน</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">หน่วย</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">นโยบาย</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bom.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-gray-800">{item.parent_variant?.sku ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.child_variant?.sku ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-900">{item.child_variant?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{Number(item.quantity).toLocaleString('th-TH')}</td>
                  <td className="px-4 py-3 text-gray-600">{item.child_variant?.unit?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{POLICY_LABELS[item.parent_variant?.bom_stock_policy ?? ''] ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button type="button" title="แก้ไขชุดนี้"
                        disabled={deletingId === item.id}
                        onClick={() => handleEdit(item)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40">
                        <EditPenIcon size={14} />
                      </button>
                      <button type="button" title="ลบชิ้นส่วน"
                        disabled={deletingId === item.id}
                        onClick={() => handleDelete(item.id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-600 disabled:opacity-40">
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <BomModal
          productId={productId}
          variants={variants}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); loadBom() }}
        />
      )}
      {editingGroup && (
        <BomModal
          productId={productId}
          variants={variants}
          initial={editingGroup}
          onClose={() => setEditingGroup(null)}
          onSaved={() => { setEditingGroup(null); loadBom() }}
        />
      )}

      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        title="ยืนยันการลบชิ้นส่วน"
        message="คุณต้องการลบรายการชิ้นส่วนนี้ใช่หรือไม่?"
        confirmLabel="ลบ"
        variant="danger"
        isLoading={deletingId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}

// ─── Variant Form Modal ───────────────────────────────────────────────────────
interface VariantFormModalProps {
  productId: number
  variant?: ProductVariant | null
  units: { id: number; name: string }[]
  attributeOptions: AttributeOption[]
  onClose: () => void
  onSaved: () => void
  onAttrOptionCreated?: (opt: AttributeOption) => void
}
function VariantFormModal({ productId, variant, units, onClose, onSaved }: VariantFormModalProps) {
  const isEdit = Boolean(variant)
  const [sku, setSku] = useState(variant?.sku ?? '')
  const [name, setName] = useState(variant?.name ?? '')
  const [costPrice, setCostPrice] = useState(variant?.cost_price != null ? String(variant.cost_price) : '')
  const [sellingPrice, setSellingPrice] = useState(variant?.selling_price != null ? String(variant.selling_price) : '')
  const [unitId, setUnitId] = useState(variant?.unit_id != null ? String(variant.unit_id) : '')
  const [unitQuantity, setUnitQuantity] = useState(variant?.unit_quantity != null ? String(variant.unit_quantity) : '1')
  const [minStock, setMinStock] = useState(variant?.min_stock != null ? String(variant.min_stock) : '0')
  const [reorderPoint, setReorderPoint] = useState(variant?.reorder_point != null ? String(variant.reorder_point) : '0')
  const [trackLot, setTrackLot] = useState(variant?.track_lot_expiry ?? false)
  const [trackSerial, setTrackSerial] = useState(variant?.track_serial ?? false)
  const [isActive, setIsActive] = useState(variant?.is_active ?? true)
  const [dimensionWidth, setDimensionWidth] = useState(variant?.dimension_width != null ? String(variant.dimension_width) : '')
  const [dimensionHeight, setDimensionHeight] = useState(variant?.dimension_height != null ? String(variant.dimension_height) : '')
  const [dimensionLength, setDimensionLength] = useState(variant?.dimension_length != null ? String(variant.dimension_length) : '')
  const [weightKg, setWeightKg] = useState(variant?.weight_kg != null ? String(variant.weight_kg) : '')
  const [attributes] = useState<Record<string, string>>(variant?.attributes ?? {})
  const [variantDesc, setVariantDesc] = useState(variant?.description ?? '')
  const [barcode, setBarcode] = useState(variant?.barcode ?? '')
  const [barcodeSecondary, setBarcodeSecondary] = useState(variant?.barcode_secondary ?? '')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSave = async () => {
    const e: Record<string, string> = {}
    if (!sku.trim()) e.sku = 'กรุณากรอก SKU'
    if (!name.trim()) e.name = 'กรุณากรอกชื่อ'
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setSaving(true)
    try {
      const payload: ProductVariantPayload = {
        sku, name,
        cost_price: costPrice ? Number(costPrice) : undefined,
        selling_price: sellingPrice ? Number(sellingPrice) : undefined,
        unit_id: unitId ? Number(unitId) : undefined,
        unit_quantity: unitQuantity ? Number(unitQuantity) : undefined,
        min_stock: minStock ? Number(minStock) : undefined,
        reorder_point: reorderPoint ? Number(reorderPoint) : undefined,
        track_lot_expiry: trackLot,
        track_serial: trackSerial,
        is_active: isActive,
        dimension_width: dimensionWidth ? Number(dimensionWidth) : undefined,
        dimension_height: dimensionHeight ? Number(dimensionHeight) : undefined,
        dimension_length: dimensionLength ? Number(dimensionLength) : undefined,
        weight_kg: weightKg ? Number(weightKg) : undefined,
        description: variantDesc.trim() || undefined,
        barcode: barcode.trim() || undefined,
        barcode_secondary: barcodeSecondary.trim() || undefined,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
      }
      if (isEdit && variant) {
        await productService.updateProductVariant(productId, variant.id, payload)
      } else {
        await productService.createProductVariant(productId, payload)
      }
      onSaved()
    } catch { } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{isEdit ? 'แก้ไขรหัสสินค้า' : 'เพิ่มรหัสสินค้าใหม่'}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><XIcon size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>SKU <span className="text-red-500">*</span></label>
              <input value={sku} onChange={(e) => setSku(e.target.value)}
                className={cn(fieldCls, errors.sku && 'border-red-400')} placeholder="เช่น BRK-001A" />
              {errors.sku && <p className="mt-1 text-xs text-red-500">{errors.sku}</p>}
            </div>
            <div>
              <label className={labelCls}>ชื่อแบบสินค้า <span className="text-red-500">*</span></label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className={cn(fieldCls, errors.name && 'border-red-400')} placeholder="เช่น 1Aผ้าเบรกหน้า Small" />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>
          </div>

          {/* Attribute inputs — plain text */}
          <div>
            <label className={labelCls}>คุณลักษณะสินค้า</label>
            <div className="overflow-hidden rounded-lg border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <RichTextToolbar />
              <textarea 
                rows={5}
                value={variantDesc}
                onChange={(e) => setVariantDesc(e.target.value)}
                className="w-full border-0 px-3 py-2.5 text-sm text-gray-700 focus:outline-none resize-y bg-white"
                placeholder="รายละเอียดสินค้า..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>ราคาทุน (บาท)</label>
              <input type="number" step="0.01" min="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className={fieldCls} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>ราคาขาย (บาท)</label>
              <input type="number" step="0.01" min="0" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className={fieldCls} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>หน่วยนับ</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={unitQuantity}
                  onChange={(e) => setUnitQuantity(e.target.value)}
                  className={cn(fieldCls, 'w-20 shrink-0 text-center')}
                  placeholder="1"
                />
                <select value={unitId} onChange={(e) => setUnitId(e.target.value)} title="หน่วยนับ" className={cn(fieldCls, 'min-w-0 flex-1')}>
                  <option value="">— เลือกหน่วย —</option>
                  {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>สต็อกขั้นต่ำ</label>
              <input type="number" min="0" value={minStock} onChange={(e) => setMinStock(e.target.value)} className={fieldCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>จุดสั่งซื้อซ้ำ (ROP)</label>
              <input type="number" min="0" value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} className={fieldCls} placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>กว้าง (ซม.)</label>
              <input type="number" step="0.1" min="0" value={dimensionWidth} onChange={(e) => setDimensionWidth(e.target.value)} className={fieldCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>สูง (ซม.)</label>
              <input type="number" step="0.1" min="0" value={dimensionHeight} onChange={(e) => setDimensionHeight(e.target.value)} className={fieldCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>ยาว (ซม.)</label>
              <input type="number" step="0.1" min="0" value={dimensionLength} onChange={(e) => setDimensionLength(e.target.value)} className={fieldCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>น้ำหนัก (กก.)</label>
              <input type="number" step="0.001" min="0" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className={fieldCls} placeholder="0.000" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>บาร์โค้ดหลัก</label>
              <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className={fieldCls} placeholder="เช่น 8851234567890" />
            </div>
            <div>
              <label className={labelCls}>บาร์โค้ดรอง</label>
              <input value={barcodeSecondary} onChange={(e) => setBarcodeSecondary(e.target.value)} className={fieldCls} placeholder="เช่น OEM code" />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={trackLot} onChange={(e) => setTrackLot(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
              <span className="text-sm text-gray-700">ติดตาม Lot / วันหมดอายุ</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={trackSerial} onChange={(e) => setTrackSerial(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
              <span className="text-sm text-gray-700">ติดตาม Serial Number</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
              <span className="text-sm text-gray-700">เปิดใช้งาน</span>
            </label>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">ยกเลิก</button>
          <button type="button" disabled={saving} onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'กำลังบันทึก...' : (isEdit ? 'อัปเดต' : 'บันทึก')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── SKU Tab (Edit mode) ──────────────────────────────────────────────────────
function SkuTabEdit({ productId, product }: { productId: number; product: Product }) {
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [attrOptions, setAttrOptions] = useState<AttributeOption[]>([])
  const [units, setUnits] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteVariantId, setConfirmDeleteVariantId] = useState<number | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [vRes, aRes] = await Promise.all([
        productService.getProductVariants(productId),
        productService.getProductAttributeOptions(productId),
      ])
      setVariants(Array.isArray(vRes.data.data) ? vRes.data.data : [])
      setAttrOptions(Array.isArray(aRes.data.data) ? aRes.data.data : [])
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => {
    apiClient.get('/product-units').then((r) => setUnits(r.data?.data || [])).catch(() => {})
    loadData()
  }, [productId])

  const handleDeleteVariant = (id: number) => {
    setConfirmDeleteVariantId(id)
  }

  const handleConfirmDeleteVariant = async () => {
    if (!confirmDeleteVariantId) return
    const id = confirmDeleteVariantId
    setConfirmDeleteVariantId(null)
    setDeletingId(id)
    try {
      await productService.deleteProductVariant(productId, id)
      setVariants((prev) => prev.filter((v) => v.id !== id))
    } catch { } finally { setDeletingId(null) }
  }

  // Build axis label map
  const axisLabels: Record<number, string> = {}
  for (const o of attrOptions) {
    if (o.label && !axisLabels[o.axis]) axisLabels[o.axis] = o.label
  }
  const axisGroups: Record<number, AttributeOption[]> = {}
  for (const o of attrOptions) {
    if (!axisGroups[o.axis]) axisGroups[o.axis] = []
    axisGroups[o.axis].push(o)
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-28 rounded-xl bg-gray-100" />
        <div className="h-40 rounded-xl bg-gray-100" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Variants Table ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">รายการรหัสสินค้า</h3>
          <button type="button"
            onClick={() => { setEditingVariant(null); setShowModal(true) }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors">
            <PlusIcon size={13} /> เพิ่มสินค้าใหม่
          </button>
        </div>

        {variants.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
            ยังไม่มีรหัสสินค้า — กด "เพิ่มสินค้าใหม่" เพื่อเริ่มต้น
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-500">รหัสสินค้า</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-500">ชื่อสินค้า <SortIcon /></th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-500">คุณลักษณะสินค้า</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-500">บาร์โค้ด (หลัก/รอง)</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-500">หน่วย</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-gray-500">ล็อต /วันหมดอายุ</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-gray-500">หมายเลขซีเรียล</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-gray-500">ขั้นต่ำ / จุดสั่งซื้อซ้ำ</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-500">มิติการขนส่งมาตรฐาน</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variants.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-medium text-gray-800">{v.sku}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{v.name}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{v.description || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                      {[v.barcode, v.barcode_secondary].filter(Boolean).join(' / ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{v.unit?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {v.track_lot_expiry ? <span className="text-blue-600"><CheckIcon /></span> : <span className="text-gray-300">–</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {v.track_serial ? <span className="text-blue-600"><CheckIcon /></span> : <span className="text-gray-300">–</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 tabular-nums">
                      {v.min_stock != null || v.reorder_point != null ? `${v.min_stock ?? 0} / ${v.reorder_point ?? 0}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {[
                        (v.dimension_width != null || v.dimension_height != null || v.dimension_length != null)
                          ? `${v.dimension_width ?? 0}×${v.dimension_height ?? 0}×${v.dimension_length ?? 0} ซม.`
                          : (v.dimensions ?? null),
                        v.weight_kg != null ? `${v.weight_kg}kg` : null,
                      ].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" title="แก้ไข"
                          disabled={deletingId === v.id}
                          onClick={() => { setEditingVariant(v); setShowModal(true) }}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40">
                          <EditPenIcon size={14} />
                        </button>
                        <button type="button" title="ลบ"
                          disabled={deletingId === v.id}
                          onClick={() => handleDeleteVariant(v.id)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-600 disabled:opacity-40">
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Info Panels ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500">หน่วย & บรรจุภัณฑ์</p>
          <div className="space-y-1.5 text-sm text-gray-700">
            <div className="flex gap-1.5"><span className="text-gray-500 shrink-0">หน่วยหลัก:</span><span className="font-medium">{product.base_unit?.name ?? product.unit?.name ?? '—'}</span></div>
            <div className="flex gap-1.5"><span className="text-gray-500 shrink-0">น้ำหนัก:</span><span className="font-medium">{product.weight_grams != null ? `${product.weight_grams} กรัม` : '—'}</span></div>
            <div className="flex gap-1.5">
              <span className="text-gray-500 shrink-0">ขนาดสินค้า:</span>
              <span className="font-medium">
                {product.width_cm && product.height_cm && product.length_cm
                  ? `${product.width_cm} × ${product.height_cm} × ${product.length_cm} ซม.`
                  : '—'}
              </span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500">การติดตามสินค้า</p>
          <div className="text-sm text-gray-600 text-xs leading-relaxed space-y-1">
            <p>Lot/EXP: {variants.some((v) => v.track_lot_expiry) ? 'On (บังคับ MFG/EXP ตอนรับเข้า)' : 'Off'}</p>
            <p>Serial/IMEI: {variants.some((v) => v.track_serial) ? 'On (เปิดแล้วต้องระบุก่อนขาย)' : 'Off'}</p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500">นโยบายสต็อก</p>
          <p className="text-xs leading-relaxed text-gray-600">
            Min / Reorder Point (ROP) ต่อ SKU<br />
            สามารถ override รายคลัง (Warehouse-level)
          </p>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <VariantFormModal
          productId={productId}
          variant={editingVariant}
          units={units}
          attributeOptions={attrOptions}
          onClose={() => { setShowModal(false); setEditingVariant(null) }}
          onSaved={() => { setShowModal(false); setEditingVariant(null); loadData() }}
        />
      )}

      <ConfirmModal
        isOpen={confirmDeleteVariantId !== null}
        title="ยืนยันการลบรหัสสินค้า"
        message="คุณต้องการลบรหัสสินค้านี้ใช่หรือไม่?"
        confirmLabel="ลบ"
        variant="danger"
        isLoading={deletingId !== null}
        onConfirm={handleConfirmDeleteVariant}
        onCancel={() => setConfirmDeleteVariantId(null)}
      />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// ProductFormPage — Edit/Create
// ══════════════════════════════════════════════════════════════════
export function ProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)
  const productId = Number(id)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<BottomTabKey>('sku')
  const [product, setProduct] = useState<Product | null>(null)
  const [images, setImages] = useState<ProductImage[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null)
  const [confirmDeleteImageId, setConfirmDeleteImageId] = useState<number | null>(null)

  const [brands, setBrands] = useState<{ id: number; name: string }[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [units, setUnits] = useState<{ id: number; name: string }[]>([])
  const [vendors, setVendors] = useState<{ id: number; name: string }[]>([])

  const [form, setForm] = useState<FormValues>({
    sku: '', name: '', product_type: 'standard', brand_id: '', category_id: '', base_unit_id: '',
    description: '', min_quantity: '0', is_active: true, vat_code: '', vendor_id: '',
    weight_grams: '', height_cm: '', width_cm: '', length_cm: '', selling_price: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({})  
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    apiClient.get('/brands').then((r) => setBrands(r.data?.data || [])).catch(() => {})
    apiClient.get('/product-categories').then((r) => setCategories(r.data?.data || [])).catch(() => {})
    apiClient.get('/product-units').then((r) => setUnits(r.data?.data || [])).catch(() => {})
    hrService.getVendors({ is_active: true, limit: 200 }).then((r) => setVendors(r.data?.data || [])).catch(() => {})

    if (isEditing && id) {
      productService.getProduct(productId).then((res) => {
        const p = res.data.data as any
        setProduct(p)
        setForm({
          sku: p.sku ?? '',
          name: p.name ?? '',
          product_type: p.product_type ?? 'standard',
          brand_id: p.brand_id != null ? String(p.brand_id) : '',
          category_id: p.category_id != null ? String(p.category_id) : '',
          base_unit_id: p.base_unit_id != null ? String(p.base_unit_id) : '',
          description: p.description ?? '',
          min_quantity: p.min_quantity != null ? String(p.min_quantity) : '0',
          is_active: p.is_active ?? true,
          vat_code: p.vat_code ?? '',
          vendor_id: p.vendor_id != null ? String(p.vendor_id) : '',
          weight_grams: p.weight_grams != null ? String(p.weight_grams) : '',
          height_cm: p.height_cm != null ? String(p.height_cm) : '',
          width_cm: p.width_cm != null ? String(p.width_cm) : '',
          length_cm: p.length_cm != null ? String(p.length_cm) : '',
          selling_price: p.selling_price != null ? String(p.selling_price) : (p.pricing_tiers?.[0]?.selling_price != null ? String(p.pricing_tiers[0].selling_price) : ''),
        })
        setTags(Array.isArray(p.tags) ? p.tags.map((t: any) => (typeof t === 'string' ? t : t.name)) : [])
        // Set images from product.images if available
        if (Array.isArray(p.images) && p.images.length > 0) {
          setImages(p.images)
        }
      }).catch(() => {})

      // Also try dedicated images endpoint (more up-to-date)
      productService.getProductImages(productId)
        .then((res) => {
          const imgs = Array.isArray(res.data.data) ? res.data.data : []
          if (imgs.length > 0) setImages(imgs)
        })
        .catch(() => {})
    }
  }, [id, isEditing, productId])

  const patchForm = (key: keyof FormValues, val: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  const handleUploadImages = async (files: File[]) => {
    setUploadingImage(true)
    try {
      await Promise.all(files.map((f) => productService.uploadProductImage(productId, f)))
      // Reload images
      try {
        const res = await productService.getProductImages(productId)
        const imgs = Array.isArray(res.data.data) ? res.data.data : []
        if (imgs.length > 0) { setImages(imgs); return }
      } catch { }
      const res2 = await productService.getProduct(productId)
      const p = res2.data.data as any
      if (Array.isArray(p.images)) setImages(p.images)
    } catch { } finally { setUploadingImage(false) }
  }

  const handleDeleteImage = (imageId: number) => {
    setConfirmDeleteImageId(imageId)
  }

  const handleConfirmDeleteImage = async () => {
    if (!confirmDeleteImageId) return
    const imageId = confirmDeleteImageId
    setConfirmDeleteImageId(null)
    setDeletingImageId(imageId)
    try {
      await productService.deleteProductImage(productId, imageId)
      setImages((prev) => prev.filter((img) => img.id !== imageId))
    } catch { } finally { setDeletingImageId(null) }
  }

  const validate = () => {
    const e: Partial<Record<keyof FormValues, string>> = {}
    if (!form.sku.trim()) e.sku = 'กรุณากรอกรหัสสินค้า'
    if (!form.name.trim()) e.name = 'กรุณากรอกชื่อสินค้า'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setIsSubmitting(true)
    try {
      const payload: ProductPayload = {
        sku: form.sku,
        name: form.name,
        type: form.product_type as ProductType,
        product_type: form.product_type,
        brand_id: form.brand_id ? Number(form.brand_id) : undefined,
        category_id: form.category_id ? Number(form.category_id) : undefined,
        base_unit_id: form.base_unit_id ? Number(form.base_unit_id) : undefined,
        description: form.description || undefined,
        min_quantity: form.min_quantity ? Number(form.min_quantity) : 0,
        is_active: form.is_active,
        vat_code: form.vat_code || undefined,
        vendor_id: form.vendor_id ? Number(form.vendor_id) : undefined,
        weight_grams: form.weight_grams ? Number(form.weight_grams) : undefined,
        height_cm: form.height_cm ? Number(form.height_cm) : undefined,
        width_cm: form.width_cm ? Number(form.width_cm) : undefined,
        length_cm: form.length_cm ? Number(form.length_cm) : undefined,
        selling_price: form.selling_price ? Number(form.selling_price) : undefined,
        tags: (() => { const all = [...tags, ...(tagInput.trim() ? [tagInput.trim()] : [])]; return all.length > 0 ? all : undefined })(),
      }
      if (isEditing && id) {
        await productService.updateProduct(productId, payload)
        navigate(`/products/${id}`)
      } else {
        const res = await productService.createProduct(payload)
        navigate(`/products/${(res.data.data as any).id}`)
      }
    } catch { } finally { setIsSubmitting(false) }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={isEditing ? `/products/${id}` : '/products'} className="text-gray-400 hover:text-gray-600">
          <ChevronLeftIcon />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">
          {isEditing ? 'แก้ไขรายละเอียดสินค้า' : 'สร้างสินค้าใหม่'}
        </h1>
      </div>

      {/* 2-column layout */}
      <div className={cn('grid grid-cols-1 gap-6', isEditing && 'lg:grid-cols-[1fr_320px]')}>

        {/* ====== LEFT: Edit Form ====== */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-gray-900">รายละเอียดสินค้า</h2>

          {/* Row 1: SKU + ชื่อ */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>รหัสสินค้า <span className="text-red-500">*</span></label>
              <input value={form.sku} onChange={(e) => patchForm('sku', e.target.value)}
                className={cn(fieldCls, errors.sku && 'border-red-400')} placeholder="เช่น PRD-00123" />
              {errors.sku && <p className="mt-1 text-xs text-red-500">{errors.sku}</p>}
            </div>
            <div>
              <label className={labelCls}>ชื่อสินค้า <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={(e) => patchForm('name', e.target.value)}
                className={cn(fieldCls, errors.name && 'border-red-400')} placeholder="ชื่อสินค้า" />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>
          </div>

          {/* Row 2: ยี่ห้อ + หมวดหมู่ + ประเภท */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>ยี่ห้อ</label>
              <select value={form.brand_id} onChange={(e) => patchForm('brand_id', e.target.value)} className={fieldCls}>
                <option value="">— เลือกยี่ห้อ —</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>หมวดหมู่</label>
              <select value={form.category_id} onChange={(e) => patchForm('category_id', e.target.value)} className={fieldCls}>
                <option value="">— เลือกหมวดหมู่ —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>ประเภทสินค้า</label>
              <select value={form.product_type} onChange={(e) => patchForm('product_type', e.target.value)} className={fieldCls}>
                <option value="standard">สินค้า (Standard)</option>
                <option value="service">บริการ (Service)</option>
                <option value="bundle">ชุด (Bundle)</option>
              </select>
            </div>
          </div>

          {/* Row 3: หน่วยนับ + ผู้จำหน่าย */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>หน่วยนับหลัก</label>
              <select value={form.base_unit_id} onChange={(e) => patchForm('base_unit_id', e.target.value)} className={fieldCls}>
                <option value="">— เลือกหน่วยนับ —</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>ผู้จำหน่าย (หลัก)</label>
              <select value={form.vendor_id} onChange={(e) => patchForm('vendor_id', e.target.value)} className={fieldCls}>
                <option value="">— เลือกผู้จำหน่าย —</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>

          {/* Row 4: สถานะ + VAT */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>สถานะ</label>
              <select value={form.is_active ? 'true' : 'false'} onChange={(e) => patchForm('is_active', e.target.value === 'true')} className={fieldCls}>
                <option value="true">เปิดใช้งาน</option>
                <option value="false">ปิดใช้งาน</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>นโยบายภาษี (VAT Code)</label>
              <select value={form.vat_code} onChange={(e) => patchForm('vat_code', e.target.value)} className={fieldCls}>
                <option value="">— เลือก —</option>
                <option value="VAT 7%">VAT 7%</option>
                <option value="VAT 0%">VAT 0%</option>
                <option value="exempt">ยกเว้น VAT</option>
              </select>
            </div>
          </div>

          {/* Row 5: ราคา + แท็ก */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>ราคา</label>
              <input type="number" step="0.01" min="0" value={form.selling_price} onChange={(e) => patchForm('selling_price', e.target.value)} className={fieldCls} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>แท็ก / คำค้นหา</label>
              <div className="min-h-[38px] rounded-lg border border-gray-200 px-2.5 py-1.5 flex flex-wrap gap-1.5 items-center focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 bg-white">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {tag}
                    <button type="button" onClick={() => setTags((prev) => prev.filter((t) => t !== tag))} className="text-blue-400 hover:text-blue-700"><XIcon size={10} /></button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                      e.preventDefault()
                      const t = tagInput.trim()
                      if (!tags.includes(t)) setTags((prev) => [...prev, t])
                      setTagInput('')
                    }
                  }}
                  onBlur={() => {
                    const t = tagInput.trim()
                    if (t) { if (!tags.includes(t)) setTags((prev) => [...prev, t]); setTagInput('') }
                  }}
                  placeholder={tags.length === 0 ? 'พิมพ์แล้วกด Enter' : ''}
                  className="flex-1 min-w-[80px] bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Row 6: ขนาด / น้ำหนัก */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>น้ำหนัก (กรัม)</label>
              <input type="number" value={form.weight_grams} onChange={(e) => patchForm('weight_grams', e.target.value)} className={fieldCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>ความสูง (ซม.)</label>
              <input type="number" value={form.height_cm} onChange={(e) => patchForm('height_cm', e.target.value)} className={fieldCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>ความกว้าง (ซม.)</label>
              <input type="number" value={form.width_cm} onChange={(e) => patchForm('width_cm', e.target.value)} className={fieldCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>ความยาว (ซม.)</label>
              <input type="number" value={form.length_cm} onChange={(e) => patchForm('length_cm', e.target.value)} className={fieldCls} placeholder="0" />
            </div>
          </div>

          {/* Row 7: คำอธิบาย */}
          <div>
            <label className={labelCls}>คำอธิบาย/คุณสมบัติของสินค้า</label>
            <div className="overflow-hidden rounded-lg border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <RichTextToolbar />
              <textarea
                value={form.description}
                onChange={(e) => patchForm('description', e.target.value)}
                rows={5}
                className="w-full border-0 px-3 py-2.5 text-sm text-gray-700 focus:outline-none resize-y bg-white"
                placeholder="รายละเอียดสินค้า..."
              />
            </div>
          </div>
        </div>

        {/* ====== RIGHT: Images Card (edit only) ====== */}
        {isEditing && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-4">
          <h2 className="text-base font-semibold text-gray-900">รูปภาพ</h2>

          {/* Drag-drop upload zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false) }}
            onDrop={(e) => {
              e.preventDefault(); setIsDragOver(false)
              const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
              if (files.length) handleUploadImages(files)
            }}
            className={cn(
              'rounded-xl border-2 border-dashed transition-colors cursor-pointer',
              isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50',
              uploadingImage && 'pointer-events-none opacity-60',
            )}
          >
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 py-5">
              <input type="file" accept="image/*" multiple className="sr-only" disabled={uploadingImage}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  if (files.length) handleUploadImages(files)
                  e.target.value = ''
                }} />
              <UploadCloudIcon />
              <span className="text-sm text-gray-500 text-center">
                {uploadingImage ? 'กำลังอัปโหลด...' : 'ลากไฟล์หรือคลิกอัปโหลด'}
              </span>
              <span className="text-xs text-gray-400">รองรับหลายไฟล์พร้อมกัน</span>
            </label>
          </div>

          {/* Scrollable gallery — all images */}
          {images.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-gray-500">คลังภาพ ({images.length} รูป)</p>
              <div className="overflow-y-auto max-h-80 rounded-xl border border-gray-100">
                <div className="grid grid-cols-3 gap-1.5 p-1.5">
                  {images.map((img, i) => (
                    <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                      <img src={img.image_url} alt={`รูป ${i + 1}`} className="h-full w-full object-cover" />
                      {i === 0 && (
                        <span className="absolute left-1 top-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white leading-none">หลัก</span>
                      )}
                      <button type="button" onClick={() => handleDeleteImage(img.id)} disabled={deletingImageId === img.id}
                        className="absolute right-1 top-1 hidden group-hover:flex items-center justify-center rounded-full bg-red-500 w-6 h-6 text-white shadow disabled:opacity-60">
                        <TrashIcon size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {images.length === 0 && !uploadingImage && (
            <p className="text-center text-xs text-gray-400">ยังไม่มีรูปภาพ</p>
          )}
        </div>
        )}
      </div>

      {/* ====== Bottom Tabs Section (edit only) ====== */}
      {isEditing && (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex px-4">
            {BOTTOM_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'border-b-2 px-5 py-3.5 text-sm font-medium transition-colors',
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700',
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-5">
          {activeTab === 'sku' && isEditing && product && (
            <SkuTabEdit productId={productId} product={product} />
          )}
          {activeTab === 'sku' && !isEditing && (
            <div className="py-8 text-center text-sm text-gray-400">กรุณาบันทึกสินค้าก่อน เพื่อจัดการรหัสสินค้า/แบบสินค้า</div>
          )}
          {activeTab === 'bundle' && isEditing && product && (
            <BomTabEdit productId={productId} />
          )}
          {activeTab === 'bundle' && !isEditing && (
            <div className="py-8 text-center text-sm text-gray-400">กรุณาบันทึกสินค้าก่อน เพื่อจัดการชุดอะไหล่</div>
          )}
          {activeTab === 'spare' && isEditing && product && (
            <CompatibilityTabEdit productId={productId} productSku={form.sku} />
          )}
          {activeTab === 'spare' && !isEditing && (
            <div className="py-8 text-center text-sm text-gray-400">กรุณาบันทึกสินค้าก่อน เพื่อจัดการรุ่นที่รองรับ</div>
          )}
        </div>
      </div>
      )}

      {/* ====== Action Bar ====== */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
        <Link
          to={isEditing ? `/products/${id}` : '/products'}
          className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ยกเลิก
        </Link>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit}
          className="rounded-lg bg-blue-600 px-8 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>

      <ConfirmModal
        isOpen={confirmDeleteImageId !== null}
        title="ยืนยันการลบรูปภาพ"
        message="คุณต้องการลบรูปภาพนี้ออกใช่หรือไม่?"
        confirmLabel="ลบรูป"
        variant="danger"
        isLoading={deletingImageId !== null}
        onConfirm={handleConfirmDeleteImage}
        onCancel={() => setConfirmDeleteImageId(null)}
      />
    </div>
  )
}
