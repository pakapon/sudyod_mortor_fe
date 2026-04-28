import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { serviceOrderService } from '@/api/serviceOrderService'
import { hrService } from '@/api/hrService'
import { productService } from '@/api/productService'
import type { ServiceOrder, ServiceOrderItem, ServiceOrderGpsPhoto, GpsPhotoType, ServiceOrderStatus } from '@/types/serviceOrder'
import type { Employee } from '@/types/hr'
import type { Product } from '@/types/product'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

// ── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ServiceOrderStatus, { label: string; className: string }> = {
  draft:           { label: 'ร่าง',             className: 'bg-gray-100 text-gray-600' },
  pending_review:  { label: 'รอตรวจสอบ',        className: 'bg-yellow-100 text-yellow-700' },
  pending_quote:   { label: 'รอเสนอราคา',       className: 'bg-orange-100 text-orange-700' },
  approved:        { label: 'อนุมัติแล้ว',      className: 'bg-blue-100 text-blue-700' },
  in_progress:     { label: 'กำลังซ่อม',        className: 'bg-purple-100 text-purple-700' },
  completed:       { label: 'ซ่อมเสร็จ',        className: 'bg-green-100 text-green-600' },
  pending_payment: { label: 'รอชำระ',            className: 'bg-red-100 text-red-700' },
  pending_pickup:  { label: 'รอรับรถ',           className: 'bg-pink-100 text-pink-700' },
  closed:          { label: 'ปิดงาน',            className: 'bg-green-100 text-green-800' },
  cancelled:       { label: 'ยกเลิก',            className: 'bg-gray-200 text-gray-500' },
}

const GPS_PHOTO_LABELS: Record<GpsPhotoType, string> = {
  pre_intake:    'ก่อนรับรถ',
  damage_spot:   'ตำแหน่งเสียหาย',
  pre_repair:    'ก่อนซ่อม',
  pre_delivery:  'ก่อนส่งมอบ',
  delivery:      'ส่งมอบ',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const formatMoney = (n?: number | null) =>
  n != null ? n.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '—'

function getCustomerName(so: ServiceOrder): string {
  const c = so.customer
  if (!c) return `ลูกค้า #${so.customer_id}`
  if (c.type === 'corporate') return c.company_name || `ลูกค้า #${c.id}`
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || `ลูกค้า #${c.id}`
}

function getTechnicianName(so: ServiceOrder): string {
  const t = so.technician
  if (!t) return 'ยังไม่มอบหมาย'
  return [t.first_name, t.last_name].filter(Boolean).join(' ') || `ช่าง #${t.id}`
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <polyline points="15 18 9 12 15 6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} points="3 6 5 6 21 6" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" strokeWidth={2} />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" strokeWidth={2} strokeLinecap="round" />
      <line x1="6" y1="6" x2="18" y2="18" strokeWidth={2} strokeLinecap="round" />
    </svg>
  )
}

// ── Assign Technician Modal ───────────────────────────────────────────────────
interface AssignTechnicianModalProps {
  isOpen: boolean
  onClose: () => void
  onAssign: (employeeId: number) => Promise<void>
  currentTechnicianId?: number
}

function AssignTechnicianModal({ isOpen, onClose, onAssign, currentTechnicianId }: AssignTechnicianModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(currentTechnicianId ?? null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setIsLoading(true)
    hrService.getEmployees()
      .then((res) => setEmployees(res.data.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setSelectedId(currentTechnicianId ?? null)
    }
  }, [isOpen, currentTechnicianId])

  const filtered = employees.filter((e) => {
    const fullName = `${e.first_name} ${e.last_name}`.toLowerCase()
    return search === '' || fullName.includes(search.toLowerCase())
  })

  const handleAssign = async () => {
    if (!selectedId) return
    setIsSaving(true)
    try {
      await onAssign(selectedId)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="font-semibold text-gray-900">มอบหมายช่าง</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XIcon /></button>
        </div>
        <div className="p-5 space-y-3">
          <input
            type="text"
            placeholder="ค้นหาชื่อช่าง..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">ไม่พบพนักงาน</p>
            ) : (
              filtered.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelectedId(e.id)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50',
                    selectedId === e.id && 'bg-blue-50',
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                    {e.first_name?.[0] ?? '?'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{e.first_name} {e.last_name}</div>
                    <div className="text-xs text-gray-500">{e.position?.name ?? ''}</div>
                  </div>
                  {selectedId === e.id && (
                    <span className="ml-auto text-blue-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            ยกเลิก
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedId || isSaving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'กำลังบันทึก...' : 'มอบหมาย'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Item Modal ────────────────────────────────────────────────────────────
interface AddItemModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (payload: { item_type: 'product' | 'service'; product_id?: number; custom_name?: string; quantity: number; unit_price: number; discount?: number }) => Promise<void>
}

function AddItemModal({ isOpen, onClose, onAdd }: AddItemModalProps) {
  const [mode, setMode] = useState<'product' | 'service'>('product')
  const [productQuery, setProductQuery] = useState('')
  const [productResults, setProductResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [customName, setCustomName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [discount, setDiscount] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setMode('product')
      setProductQuery('')
      setProductResults([])
      setSelectedProduct(null)
      setCustomName('')
      setQuantity('1')
      setUnitPrice('')
      setDiscount('')
    }
  }, [isOpen])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleProductSearch = (q: string) => {
    setProductQuery(q)
    setSelectedProduct(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 2) {
      setProductResults([])
      setIsDropdownOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await productService.getProducts({ search: q, limit: 10 })
        setProductResults(res.data.data)
        setIsDropdownOpen(true)
      } catch {
        setProductResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }

  const handleSelectProduct = (p: Product) => {
    setSelectedProduct(p)
    setProductQuery(p.name)
    setIsDropdownOpen(false)
    const sp = typeof p.pricing?.selling_price === 'number'
      ? p.pricing.selling_price
      : typeof p.pricing?.selling_price === 'string'
      ? parseFloat(p.pricing.selling_price)
      : typeof p.selling_price === 'number'
      ? p.selling_price
      : typeof p.selling_price === 'string'
      ? parseFloat(p.selling_price as string)
      : 0
    if (sp > 0) setUnitPrice(String(sp))
  }

  const handleAdd = async () => {
    const qty = parseFloat(quantity)
    const price = parseFloat(unitPrice)
    if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) return
    if (mode === 'product' && !selectedProduct) return
    if (mode === 'service' && !customName.trim()) return

    setIsSaving(true)
    try {
      await onAdd({
        item_type: mode,
        product_id: mode === 'product' ? selectedProduct?.id : undefined,
        custom_name: mode === 'service' ? customName.trim() : undefined,
        quantity: qty,
        unit_price: price,
        discount: discount ? parseFloat(discount) : undefined,
      })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="font-semibold text-gray-900">เพิ่มรายการ</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XIcon /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('product')}
              className={cn(
                'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                mode === 'product' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              สินค้า / อะไหล่
            </button>
            <button
              type="button"
              onClick={() => setMode('service')}
              className={cn(
                'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                mode === 'service' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              ค่าแรง / บริการ
            </button>
          </div>

          {/* Product search */}
          {mode === 'product' && (
            <div ref={dropdownRef} className="relative">
              <label className="mb-1 block text-sm font-medium text-gray-700">สินค้า / อะไหล่ *</label>
              <input
                type="text"
                placeholder="พิมพ์เพื่อค้นหาสินค้า..."
                value={productQuery}
                onChange={(e) => handleProductSearch(e.target.value)}
                onFocus={() => productResults.length > 0 && setIsDropdownOpen(true)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {isSearching && (
                <div className="absolute right-3 top-8 mt-1">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                </div>
              )}
              {isDropdownOpen && productResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                  {productResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={() => handleSelectProduct(p)}
                      className="flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm hover:bg-blue-50"
                    >
                      <div>
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.sku}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Service free text */}
          {mode === 'service' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">ชื่อค่าแรง / บริการ *</label>
              <input
                type="text"
                placeholder="ระบุรายการค่าแรงหรือบริการ..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">จำนวน *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">ราคาต่อหน่วย *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">ส่วนลด</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            ยกเลิก
          </button>
          <button
            onClick={handleAdd}
            disabled={isSaving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'กำลังบันทึก...' : 'เพิ่มรายการ'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── GPS Photo Lightbox ─────────────────────────────────────────────────────────
interface LightboxProps {
  src: string
  onClose: () => void
}

function Lightbox({ src, onClose }: LightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <img
        src={src}
        alt="GPS Photo"
        className="max-h-[90vh] max-w-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button onClick={onClose} className="absolute right-4 top-4 text-white hover:text-gray-300">
        <XIcon />
      </button>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
type TabKey = 'detail' | 'items' | 'gps' | 'documents' | 'audit'

export function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const soId = Number(id)
  const { permissions } = useAuthStore()

  const [so, setSo] = useState<ServiceOrder | null>(null)
  const [items, setItems] = useState<ServiceOrderItem[]>([])
  const [gpsPhotos, setGpsPhotos] = useState<ServiceOrderGpsPhoto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('detail')

  // Modals
  const [showAssign, setShowAssign] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<null | 'cancel' | 'reopen' | { transition: ServiceOrderStatus }>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)

  // GPS upload
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [uploadPhotoType, setUploadPhotoType] = useState<GpsPhotoType>('pre_intake')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Delete item confirm
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [soRes, itemsRes, photosRes] = await Promise.all([
        serviceOrderService.getServiceOrder(soId),
        serviceOrderService.getItems(soId),
        serviceOrderService.getGpsPhotos(soId),
      ])
      if (soRes.data.success) setSo(soRes.data.data)
      if (itemsRes.data.success) setItems(itemsRes.data.data)
      if (photosRes.data.success) setGpsPhotos(photosRes.data.data)
    } catch {
      setSo(null)
    } finally {
      setIsLoading(false)
    }
  }, [soId])

  useEffect(() => { loadData() }, [loadData])

  const canEdit = hasPermission(permissions, 'service_orders', 'can_edit')
  const canApprove = hasPermission(permissions, 'service_orders', 'can_approve')

  const handleTransition = async (targetStatus: ServiceOrderStatus, note?: string) => {
    setIsActionLoading(true)
    try {
      await serviceOrderService.transition(soId, { target_status: targetStatus, note })
      await loadData()
    } finally {
      setIsActionLoading(false)
      setConfirmAction(null)
    }
  }

  const handleCancel = async () => {
    setIsActionLoading(true)
    try {
      await serviceOrderService.cancel(soId)
      await loadData()
    } finally {
      setIsActionLoading(false)
      setConfirmAction(null)
    }
  }

  const handleReopen = async () => {
    setIsActionLoading(true)
    try {
      await serviceOrderService.reopen(soId)
      await loadData()
    } finally {
      setIsActionLoading(false)
      setConfirmAction(null)
    }
  }

  const handleAssign = async (technicianId: number) => {
    await serviceOrderService.assign(soId, { technician_id: technicianId })
    await loadData()
  }

  const handleAddItem = async (payload: Parameters<typeof serviceOrderService.addItem>[1]) => {
    await serviceOrderService.addItem(soId, payload)
    const res = await serviceOrderService.getItems(soId)
    if (res.data.success) setItems(res.data.data)
  }

  const handleDeleteItem = async (itemId: number) => {
    try {
      await serviceOrderService.deleteItem(soId, itemId)
      setItems((prev) => prev.filter((i) => i.id !== itemId))
    } catch {
      //
    } finally {
      setDeleteItemId(null)
    }
  }

  const handlePhotoUpload = async (file: File, photoType: GpsPhotoType, lat?: number, lng?: number) => {
    const formData = new FormData()
    formData.append('photo', file)
    formData.append('photo_type', photoType)
    if (lat != null) formData.append('latitude', String(lat))
    if (lng != null) formData.append('longitude', String(lng))
    formData.append('taken_at', new Date().toISOString())
    await serviceOrderService.uploadGpsPhoto(soId, formData)
    const res = await serviceOrderService.getGpsPhotos(soId)
    if (res.data.success) setGpsPhotos(res.data.data)
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setIsUploadingPhoto(true)
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            await handlePhotoUpload(file, uploadPhotoType, pos.coords.latitude, pos.coords.longitude)
            setIsUploadingPhoto(false)
          },
          async () => {
            await handlePhotoUpload(file, uploadPhotoType)
            setIsUploadingPhoto(false)
          },
          { timeout: 5000 },
        )
      } else {
        await handlePhotoUpload(file, uploadPhotoType)
        setIsUploadingPhoto(false)
      }
    } catch {
      setIsUploadingPhoto(false)
    }
  }

  const handleDeletePhoto = async (photoId: number) => {
    try {
      await serviceOrderService.deleteGpsPhoto(soId, photoId)
      setGpsPhotos((prev) => prev.filter((p) => p.id !== photoId))
    } catch {
      //
    }
  }

  const handleConfirmAction = () => {
    if (confirmAction === 'cancel') handleCancel()
    else if (confirmAction === 'reopen') handleReopen()
    else if (confirmAction && typeof confirmAction === 'object' && 'transition' in confirmAction) {
      handleTransition(confirmAction.transition)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!so) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-500">
        <p>ไม่พบใบสั่งซ่อม</p>
        <Link to="/service-orders" className="text-blue-600 hover:underline text-sm">กลับรายการ</Link>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[so.status]

  // ── Items summary ──────────────────────────────────────────────────────────
  const subtotal = items.reduce((s, i) => s + (i.total_price ?? 0), 0)
  const totalDiscount = items.reduce((s, i) => s + (i.discount ?? 0) * (i.quantity ?? 1), 0)

  // ── GPS photos grouped ─────────────────────────────────────────────────────
  const photosByType = (Object.keys(GPS_PHOTO_LABELS) as GpsPhotoType[]).reduce<Record<GpsPhotoType, ServiceOrderGpsPhoto[]>>(
    (acc, t) => ({ ...acc, [t]: gpsPhotos.filter((p) => p.photo_type === t) }),
    {} as Record<GpsPhotoType, ServiceOrderGpsPhoto[]>,
  )

  // ── Can items be modified ──────────────────────────────────────────────────
  const canModifyItems = canEdit && so.status !== 'closed' && so.status !== 'cancelled'
  const canDeleteItems = canEdit && so.status !== 'in_progress' && so.status !== 'completed' &&
    so.status !== 'pending_payment' && so.status !== 'pending_pickup' && so.status !== 'closed' && so.status !== 'cancelled'

  return (
    <div className="space-y-4">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Link to="/service-orders" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ChevronLeftIcon />
          กลับรายการ
        </Link>
      </div>

      {/* ── Header Card ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{so.so_number}</h1>
              <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', statusCfg.className)}>
                {statusCfg.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
              <span>
                ลูกค้า:{' '}
                <Link to={`/customers/${so.customer_id}`} className="font-medium text-blue-600 hover:underline">
                  {getCustomerName(so)}
                </Link>
              </span>
              {so.vehicle && (
                <span>
                  รถ:{' '}
                  <span className="font-medium text-gray-900">
                    {so.vehicle.plate_number}
                    {so.vehicle.brand ? ` · ${so.vehicle.brand}` : ''}
                    {so.vehicle.model ? ` ${so.vehicle.model}` : ''}
                  </span>
                </span>
              )}
              <span>
                ช่าง:{' '}
                <span className={cn('font-medium', so.technician ? 'text-gray-900' : 'text-gray-400 italic')}>
                  {getTechnicianName(so)}
                </span>
              </span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
              <span>วันที่รับ: {formatDate(so.received_date)}</span>
              <span>วันนัดรับ: {formatDate(so.expected_completion_date)}</span>
              {so.is_quick_repair && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">ซ่อมด่วน</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {canEdit && (so.status === 'draft' || so.status === 'pending_review') && (
              <Link
                to={`/service-orders/${soId}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <PencilIcon />
                แก้ไข
              </Link>
            )}

            {/* draft */}
            {so.status === 'draft' && canEdit && (
              <>
                <button
                  onClick={() => handleTransition('pending_review')}
                  disabled={isActionLoading}
                  className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
                >
                  ส่งตรวจสอบ
                </button>
                <button
                  onClick={() => setConfirmAction('cancel')}
                  disabled={isActionLoading}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  ยกเลิก
                </button>
              </>
            )}

            {/* pending_review */}
            {so.status === 'pending_review' && canApprove && (
              <>
                <button
                  onClick={() => handleTransition('pending_quote')}
                  disabled={isActionLoading}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  พร้อมเสนอราคา
                </button>
                <button
                  onClick={() => handleTransition('approved')}
                  disabled={isActionLoading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  อนุมัติด่วน
                </button>
              </>
            )}

            {/* pending_quote */}
            {so.status === 'pending_quote' && canApprove && (
              <>
                <button
                  onClick={() => handleTransition('approved')}
                  disabled={isActionLoading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  อนุมัติ
                </button>
                <button
                  onClick={() => setConfirmAction('cancel')}
                  disabled={isActionLoading}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  ยกเลิก
                </button>
              </>
            )}

            {/* approved */}
            {so.status === 'approved' && canEdit && (
              <>
                <button
                  onClick={() => setShowAssign(true)}
                  disabled={isActionLoading}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  มอบหมายช่าง
                </button>
                <button
                  onClick={() => handleTransition('in_progress')}
                  disabled={isActionLoading}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  เริ่มซ่อม
                </button>
              </>
            )}

            {/* in_progress */}
            {so.status === 'in_progress' && canEdit && (
              <button
                onClick={() => handleTransition('completed')}
                disabled={isActionLoading}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                ซ่อมเสร็จ
              </button>
            )}

            {/* completed */}
            {so.status === 'completed' && canApprove && (
              <button
                onClick={() => handleTransition('pending_payment')}
                disabled={isActionLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                รอชำระ
              </button>
            )}

            {/* pending_payment */}
            {so.status === 'pending_payment' && canApprove && (
              <button
                onClick={() => handleTransition('pending_pickup')}
                disabled={isActionLoading}
                className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-50"
              >
                รอรับรถ
              </button>
            )}

            {/* pending_pickup */}
            {so.status === 'pending_pickup' && canApprove && (
              <button
                onClick={() => handleTransition('closed')}
                disabled={isActionLoading}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              >
                ปิดงาน
              </button>
            )}

            {/* closed */}
            {so.status === 'closed' && canApprove && (
              <button
                onClick={() => setConfirmAction('reopen')}
                disabled={isActionLoading}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                เปิดงานอีกครั้ง
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Tab headers */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {(
            [
              { key: 'detail', label: 'รายละเอียด' },
              { key: 'items', label: 'รายการอะไหล่/ค่าแรง' },
              { key: 'gps', label: 'GPS Photos' },
              { key: 'documents', label: 'เอกสารที่เกี่ยวข้อง' },
              { key: 'audit', label: 'Audit Log' },
            ] as { key: TabKey; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                'whitespace-nowrap px-5 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: รายละเอียด */}
        {activeTab === 'detail' && (
          <div className="p-5 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">อาการเสีย</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{so.symptom || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">ผลการวินิจฉัย</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{so.diagnosis || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">หมายเหตุภายใน</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{so.internal_note || '—'}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">สาขา</span>
                <span className="font-medium text-gray-800">{so.branch?.name ?? `#${so.branch_id}`}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">เลขไมล์</span>
                <span className="font-medium text-gray-800">{so.mileage != null ? `${so.mileage.toLocaleString()} กม.` : '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">วันที่รับรถ</span>
                <span className="font-medium text-gray-800">{formatDate(so.received_date)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">วันนัดรับรถ</span>
                <span className="font-medium text-gray-800">{formatDate(so.expected_completion_date)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">สร้างเมื่อ</span>
                <span className="font-medium text-gray-800">{formatDate(so.created_at)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">แก้ไขล่าสุด</span>
                <span className="font-medium text-gray-800">{formatDate(so.updated_at)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab: รายการอะไหล่ */}
        {activeTab === 'items' && (
          <div className="p-5 space-y-4">
            {canModifyItems && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowAddItem(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <PlusIcon />
                  เพิ่มรายการ
                </button>
              </div>
            )}
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">รายการ</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">จำนวน</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">ราคา/หน่วย</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">ส่วนลด</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">รวม</th>
                    {canDeleteItems && <th className="relative px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={canDeleteItems ? 6 : 5} className="px-4 py-8 text-center text-sm text-gray-400">
                        ยังไม่มีรายการ
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {item.item_type === 'product' ? (item.product?.name ?? `สินค้า #${item.product_id}`) : item.custom_name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {item.item_type === 'product' ? 'อะไหล่/สินค้า' : 'ค่าแรง/บริการ'}
                            {item.is_additional && (
                              <span className="ml-2 rounded-full bg-orange-100 px-1.5 py-0.5 text-orange-700">เพิ่มเติม</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-700">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-700">{formatMoney(item.unit_price)}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-500">{item.discount ? formatMoney(item.discount) : '—'}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{formatMoney(item.total_price)}</td>
                        {canDeleteItems && (
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setDeleteItemId(item.id)}
                              title="ลบรายการ"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <TrashIcon />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {items.length > 0 && (
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={canDeleteItems ? 4 : 3} className="px-4 py-3 text-right text-sm font-medium text-gray-700">ราคารวม</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">{formatMoney(subtotal)}</td>
                      {canDeleteItems && <td />}
                    </tr>
                    {totalDiscount > 0 && (
                      <tr>
                        <td colSpan={canDeleteItems ? 4 : 3} className="px-4 py-2 text-right text-sm text-gray-500">ส่วนลดรวม</td>
                        <td className="px-4 py-2 text-right text-sm text-red-600">-{formatMoney(totalDiscount)}</td>
                        {canDeleteItems && <td />}
                      </tr>
                    )}
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Tab: GPS Photos */}
        {activeTab === 'gps' && (
          <div className="p-5 space-y-6">
            {/* Upload controls */}
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">ประเภทรูป</label>
                <select
                  value={uploadPhotoType}
                  onChange={(e) => setUploadPhotoType(e.target.value as GpsPhotoType)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {(Object.keys(GPS_PHOTO_LABELS) as GpsPhotoType[]).map((t) => (
                    <option key={t} value={t}>{GPS_PHOTO_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <CameraIcon />
                {isUploadingPhoto ? 'กำลังอัปโหลด...' : 'ถ่ายรูป / อัปโหลด'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelected}
                className="hidden"
              />
            </div>

            {/* Gallery by type */}
            {(Object.keys(GPS_PHOTO_LABELS) as GpsPhotoType[]).map((photoType) => {
              const photos = photosByType[photoType]
              if (photos.length === 0) return null
              return (
                <div key={photoType}>
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">{GPS_PHOTO_LABELS[photoType]}</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {photos.map((photo) => (
                      <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                        <img
                          src={photo.file_url}
                          alt={GPS_PHOTO_LABELS[photo.photo_type]}
                          className="h-full w-full cursor-pointer object-cover hover:opacity-90 transition-opacity"
                          onClick={() => setLightboxSrc(photo.file_url)}
                        />
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white group-hover:flex"
                          title="ลบรูป"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <line x1="18" y1="6" x2="6" y2="18" strokeWidth={2.5} strokeLinecap="round" />
                            <line x1="6" y1="6" x2="18" y2="18" strokeWidth={2.5} strokeLinecap="round" />
                          </svg>
                        </button>
                        {photo.latitude && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-center text-xs text-white">
                            {photo.latitude.toFixed(4)}, {photo.longitude?.toFixed(4)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {gpsPhotos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <CameraIcon />
                <p className="mt-2 text-sm">ยังไม่มีรูปภาพ GPS</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: เอกสารที่เกี่ยวข้อง */}
        {activeTab === 'documents' && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium text-gray-500">เอกสารที่เกี่ยวข้อง</p>
            <p className="mt-1 text-xs text-gray-400">กำลังพัฒนา — จะแสดงใบเสนอราคา, ใบแจ้งหนี้, และใบส่งมอบที่ผูกกับใบสั่งซ่อมนี้</p>
          </div>
        )}

        {/* Tab: Audit Log */}
        {activeTab === 'audit' && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-gray-500">Audit Log / ประวัติ</p>
            <p className="mt-1 text-xs text-gray-400">กำลังพัฒนา — จะแสดงประวัติการเปลี่ยนสถานะและผู้ดำเนินการ</p>
          </div>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <AssignTechnicianModal
        isOpen={showAssign}
        onClose={() => setShowAssign(false)}
        onAssign={handleAssign}
        currentTechnicianId={so.technician_id}
      />

      <AddItemModal
        isOpen={showAddItem}
        onClose={() => setShowAddItem(false)}
        onAdd={handleAddItem}
      />

      <ConfirmModal
        isOpen={confirmAction === 'cancel'}
        title="ยืนยันการยกเลิก"
        message="คุณต้องการยกเลิกใบสั่งซ่อมนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้"
        confirmLabel="ยืนยันยกเลิก"
        variant="danger"
        isLoading={isActionLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmModal
        isOpen={confirmAction === 'reopen'}
        title="เปิดงานอีกครั้ง"
        message="คุณต้องการเปิดใบสั่งซ่อมนี้อีกครั้งใช่หรือไม่?"
        confirmLabel="ยืนยัน"
        variant="warning"
        isLoading={isActionLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmModal
        isOpen={deleteItemId !== null}
        title="ลบรายการ"
        message="คุณต้องการลบรายการนี้ใช่หรือไม่?"
        confirmLabel="ลบ"
        variant="danger"
        onConfirm={() => { if (deleteItemId) handleDeleteItem(deleteItemId) }}
        onCancel={() => setDeleteItemId(null)}
      />

      {lightboxSrc && (
        <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  )
}
