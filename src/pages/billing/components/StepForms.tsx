import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import {
  Check, ClipboardList, Send, X, Receipt, Wrench, CreditCard,
  Banknote, Package, ShieldCheck, Flag, Coins, Camera,
  Loader2, Trash2, Plus, FileText, ArrowRight, UserSearch, Search,
  ChevronDown, AlertTriangle, CheckCircle2, User, Phone, Hash, Car, Palette
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { serviceOrderService } from '@/api/serviceOrderService'
import { quotationService } from '@/api/quotationService'
import { customerService } from '@/api/customerService'
import { invoiceService } from '@/api/invoiceService'
import { depositService } from '@/api/depositService'
import { deliveryNoteService } from '@/api/deliveryNoteService'
import { warrantyService } from '@/api/warrantyService'
import { inventoryService } from '@/api/inventoryService'
import { vehicleInspectionService } from '@/api/vehicleInspectionService'
import { hrService } from '@/api/hrService'
import type { JobData, QuotationDraft } from '../JobFlowPage'
import type { Invoice, PaymentMethod } from '@/types/invoice'
import type { InventoryItem } from '@/types/inventory'
import type { VehicleInspectionChecklist } from '@/types/vehicleInspection'
import type { ServiceOrderGpsPhoto } from '@/types/serviceOrder'
import { INSPECTION_STATUS_OPTIONS } from '@/types/vehicleInspection'

type QItemMode = 'product' | 'custom'
interface QItem {
  mode: QItemMode
  product_id?: number
  product_variant_id?: number
  name: string
  price: number
  qty: number
  pricing_type: 'part' | 'labor'
  stock?: number
}

type StepCompleteMeta = { newId?: number; invoiceId?: number }
type FormProps = {
  onComplete: (meta?: StepCompleteMeta) => void
  jobData?: JobData | null
  onDraftChange?: (draft: QuotationDraft | null) => void
  onViewInvoice?: (invoiceId: number) => void
  onPrintInvoiceDocument?: (invoiceId: number, docType: 'invoice' | 'receipt') => void
}
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const formatMoney = (value: number) => roundMoney(Number(value || 0)).toLocaleString('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const getInvoiceBillingAmount = (invoice?: Partial<Invoice> | null) =>
  roundMoney(Number(invoice?.grand_total ?? invoice?.balance_due ?? 0))
const getInvoiceOutstandingAmount = (invoice?: Partial<Invoice> | null) => {
  const dueBase = Number(invoice?.balance_due ?? invoice?.grand_total ?? 0)
  const paid = Number(invoice?.paid_amount ?? 0)
  return roundMoney(Math.max(0, dueBase - paid))
}

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

  // Customer search autocomplete
  const [customerResults, setCustomerResults] = useState<Array<{ id: number; full_name: string; phone: string | null }>>([])
  const [pickedCustomerId, setPickedCustomerId] = useState<number | null>(null)
  const customerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [brandResults, setBrandResults] = useState<Array<{ id: number; name: string }>>([])
  const [pickedBrandId, setPickedBrandId] = useState<number | null>(null)
  const brandDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [inspectionTemplates, setInspectionTemplates] = useState<VehicleInspectionChecklist[]>([])
  const [selectedChecklistId, setSelectedChecklistId] = useState<number | null>(null)
  const [selectedChecklist, setSelectedChecklist] = useState<VehicleInspectionChecklist | null>(null)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)

  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoadingTemplates(true)
      try {
        const { data } = await vehicleInspectionService.getChecklists({ page: 1, limit: 100, is_active: true })
        setInspectionTemplates(data.data ?? [])
      } catch {
        setInspectionTemplates([])
      } finally {
        setIsLoadingTemplates(false)
      }
    }
    loadTemplates()
  }, [])

  useEffect(() => {
    if (!selectedChecklistId) {
      setSelectedChecklist(null)
      return
    }
    const loadChecklist = async () => {
      try {
        const { data } = await vehicleInspectionService.getChecklist(selectedChecklistId)
        setSelectedChecklist(data.data)
      } catch {
        setSelectedChecklist(null)
      }
    }
    loadChecklist()
  }, [selectedChecklistId])

  const buildChecklistNote = () => {
    if (!selectedChecklist) return ''
    const items = selectedChecklist.items ?? []
    const checklistTitle = [selectedChecklist.vehicle_type, selectedChecklist.brand, selectedChecklist.model, selectedChecklist.year ? String(selectedChecklist.year) : null]
      .filter(Boolean)
      .join(' / ')
    const itemLines = items.length > 0
      ? items.map((it, idx) => `${idx + 1}. ${it.name}`).join('\n')
      : '-'
    return [
      '[CHECKLIST_TEMPLATE_START]',
      `แม่แบบตรวจสอบรถ: ${checklistTitle}`,
      'รายการตรวจสอบ:',
      itemLines,
      '[CHECKLIST_TEMPLATE_END]',
    ].join('\n')
  }

  const mergeChecklistToNote = (original?: string | null) => {
    const clean = (original ?? '').replace(/\n?\[CHECKLIST_TEMPLATE_START\][\s\S]*?\[CHECKLIST_TEMPLATE_END\]\n?/g, '').trim()
    const checklistNote = buildChecklistNote()
    if (!checklistNote) return clean
    return clean ? `${clean}\n\n${checklistNote}` : checklistNote
  }

  const searchCustomers = (q: string) => {
    set('customerName', q)
    setPickedCustomerId(null)
    if (customerDebounceRef.current) clearTimeout(customerDebounceRef.current)
    if (q.trim().length < 2) { setCustomerResults([]); return }
    customerDebounceRef.current = setTimeout(async () => {
      try {
        const { data } = await customerService.getCustomers({ search: q, limit: 10 })
        setCustomerResults(data.data.map((c: any) => ({
          id: c.id,
          full_name: c.full_name ?? c.company_name ?? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() ?? `#${c.id}`,
          phone: c.phones?.[0]?.number ?? c.phone ?? null,
        })))
      } catch { setCustomerResults([]) }
    }, 300)
  }

  const pickCustomer = (c: { id: number; full_name: string; phone: string | null }) => {
    setForm((p) => ({ ...p, customerName: c.full_name, customerPhone: c.phone ?? p.customerPhone }))
    setPickedCustomerId(c.id)
    setCustomerResults([])
  }

  const searchBrands = (q: string) => {
    set('brand', q)
    setPickedBrandId(null)
    if (brandDebounceRef.current) clearTimeout(brandDebounceRef.current)
    if (q.trim().length < 1) { setBrandResults([]); return }
    brandDebounceRef.current = setTimeout(async () => {
      try {
        const { data } = await hrService.getBrands({ search: q, limit: 10, is_active: true })
        setBrandResults((data.data ?? []).map((b) => ({ id: b.id, name: b.name })))
      } catch {
        setBrandResults([])
      }
    }, 300)
  }

  const pickBrand = (b: { id: number; name: string }) => {
    set('brand', b.name)
    setPickedBrandId(b.id)
    setBrandResults([])
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      if (!selectedChecklistId) {
        toast.error('กรุณาเลือกแม่แบบรายการตรวจสอบรถ')
        return
      }
      if (so?.id) {
        await serviceOrderService.updateServiceOrder(so.id, {
          internal_note: mergeChecklistToNote(so.internal_note),
        })
        await serviceOrderService.transition(so.id, { status: 'pending_review' })
        toast.success('ยืนยันรับรถเรียบร้อย')
        onComplete()
        return
      }
      if (!form.customerName.trim() || !form.plate.trim() || !form.symptom.trim()) {
        toast.error('กรุณากรอกชื่อลูกค้า, ทะเบียน และอาการ')
        return
      }
      let customerId: number | null = pickedCustomerId
      if (!customerId && form.customerPhone.trim()) {
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
      await serviceOrderService.updateServiceOrder(soRes.data.id, {
        internal_note: mergeChecklistToNote(''),
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
    <div className="space-y-6 relative">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <ClipboardList className="h-24 w-24" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-40">
        <div className="relative z-50 flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">ชื่อลูกค้า</label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={form.customerName}
              onChange={(e) => searchCustomers(e.target.value)}
              placeholder="ค้นหาหรือพิมพ์ชื่อลูกค้า"
              disabled={!!so}
              className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
            />
            {pickedCustomerId && (
              <button
                type="button"
                onClick={() => { setPickedCustomerId(null); setForm((p) => ({ ...p, customerName: '', customerPhone: '' })) }}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {customerResults.length > 0 && (
              <ul className="absolute left-0 top-full z-[300] mt-1 w-full max-h-48 overflow-auto rounded-lg border border-gray-200 bg-white shadow-xl text-sm divide-y divide-gray-100">
                {customerResults.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => pickCustomer(c)}
                      className="flex items-center w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-gray-800">{c.full_name}</span>
                      {c.phone && <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{c.phone}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <Field label="เบอร์โทร" value={form.customerPhone} onChange={(v) => set('customerPhone', v)} placeholder="089-xxx-xxxx" disabled={!!so} icon={<Phone className="h-4 w-4 text-gray-400" />} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-30">
        <Field label="ทะเบียน" value={form.plate} onChange={(v) => set('plate', v)} placeholder="กข-1234" disabled={!!so} icon={<Hash className="h-4 w-4 text-gray-400" />} />
        <div className="relative z-40 flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">ยี่ห้อ</label>
          <div className="relative">
            <Car className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={form.brand}
              onChange={(e) => searchBrands(e.target.value)}
              placeholder="ค้นหาหรือพิมพ์ยี่ห้อ"
              disabled={!!so}
              className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
            />
            {pickedBrandId && !so && (
              <button
                type="button"
                onClick={() => { setPickedBrandId(null); set('brand', '') }}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {brandResults.length > 0 && !so && (
              <ul className="absolute left-0 top-full z-[400] mt-1 w-full max-h-48 overflow-auto rounded-lg border border-gray-200 bg-white shadow-xl text-sm divide-y divide-gray-100">
                {brandResults.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => pickBrand(b)}
                      className="flex items-center w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-gray-800">{b.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <Field label="รุ่น" value={form.model} onChange={(v) => set('model', v)} placeholder="Camry" disabled={!!so} icon={<Car className="h-4 w-4 text-gray-400" />} />
        <Field label="สี" value={form.color} onChange={(v) => set('color', v)} placeholder="ขาว" disabled={!!so} icon={<Palette className="h-4 w-4 text-gray-400" />} />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white/70 p-4 relative z-10 space-y-3">
        <label className="text-sm font-semibold text-gray-700">แม่แบบรายการตรวจสอบรถ</label>
        <div className="relative">
          <ClipboardList className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          <select
            value={selectedChecklistId ?? ''}
            onChange={(e) => setSelectedChecklistId(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
          >
            <option value="">{isLoadingTemplates ? 'กำลังโหลดแม่แบบ...' : 'เลือกแม่แบบสำหรับช่าง'}</option>
            {inspectionTemplates.map((tpl) => {
              const label = [tpl.vehicle_type, tpl.brand, tpl.model, tpl.year ? String(tpl.year) : null].filter(Boolean).join(' / ')
              const count = tpl.items_count ?? tpl.items?.length ?? 0
              return <option key={tpl.id} value={tpl.id}>{`${label} (${count} รายการ)`}</option>
            })}
          </select>
        </div>
        {selectedChecklist?.items?.length ? (
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
            <p className="text-xs font-semibold text-blue-700 mb-1">รายการที่ช่างต้องเช็ค</p>
            <ul className="space-y-1">
              {selectedChecklist.items.slice(0, 8).map((it) => (
                <li key={it.id} className="text-xs text-blue-900">• {it.name}</li>
              ))}
              {selectedChecklist.items.length > 8 && (
                <li className="text-xs text-blue-700">... และอีก {selectedChecklist.items.length - 8} รายการ</li>
              )}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="relative z-10">
        <Field label="อาการ / หมายเหตุ" value={form.symptom} onChange={(v) => set('symptom', v)} placeholder="เปลี่ยนหม้อน้ำ, น้ำมันรั่ว..." multiline />
      </div>
      <div className="pt-4 relative z-10">
        <ActionButton onClick={handleSubmit} loading={isSubmitting}>
          <Check className="h-5 w-5" /> รับรถเรียบร้อย <ArrowRight className="h-4 w-4 ml-1 opacity-70" /> ส่งประเมิน
        </ActionButton>
      </div>
    </div>
  )
}

/* ─── Assessment Step ─── */
type ChecklistResultItem = { name: string; checked: boolean; status: string; reason: string }
type AssessItem = { id?: number; name: string; issue: string; qty: number; unit_price?: number; product_id?: number; product_variant_id?: number }
type PersistedAssessPhoto = { id: number; url: string }

function parseChecklistFromNote(note?: string | null): ChecklistResultItem[] {
  if (!note) return []
  const resultMatch = note.match(/\[CHECKLIST_RESULT_START\]([\s\S]*?)\[CHECKLIST_RESULT_END\]/)
  if (resultMatch) {
    const items: ChecklistResultItem[] = []
    for (const line of resultMatch[1].split('\n')) {
      const m = line.match(/^\d+\.\s+\[(✓|○)\]\s+(.+?)\s+:\s+([^—\n]+?)(?:\s+—\s+(.*))?$/)
      if (m) {
        items.push({
          checked: m[1] === '✓',
          name: m[2].trim(),
          status: m[3].trim(),
          reason: m[4]?.trim() ?? '',
        })
      }
    }
    if (items.length > 0) return items
  }
  const match = note.match(/\[CHECKLIST_TEMPLATE_START\]([\s\S]*?)\[CHECKLIST_TEMPLATE_END\]/)
  if (!match) return []
  const items: ChecklistResultItem[] = []
  for (const line of match[1].split('\n')) {
    const m = line.match(/^\d+\.\s+(.+)$/)
    if (m) items.push({ name: m[1].trim(), checked: false, status: 'ปกติ', reason: '' })
  }
  return items
}

function buildChecklistResultNote(checkItems: ChecklistResultItem[], original?: string | null): string {
  const clean = (original ?? '')
    .replace(/\n?\[CHECKLIST_RESULT_START\][\s\S]*?\[CHECKLIST_RESULT_END\]\n?/g, '')
    .trim()
  if (!checkItems.length) return clean
  const lines = checkItems
    .map((it, i) => `${i + 1}. [${it.checked ? '✓' : '○'}] ${it.name} : ${it.status}${it.reason.trim() ? ` — ${it.reason.trim()}` : ''}`)
    .join('\n')
  const block = `[CHECKLIST_RESULT_START]\nผลตรวจสภาพรถ:\n${lines}\n[CHECKLIST_RESULT_END]`
  return clean ? `${clean}\n\n${block}` : block
}

export function AssessmentForm({ onComplete, jobData }: FormProps) {
  const { employee } = useAuthStore()
  const serviceOrderItems = jobData?.serviceOrder?.items ?? []
  const persistedItems = serviceOrderItems.length > 0 ? serviceOrderItems : (jobData?.items ?? [])
  const mapPersistedAssessItem = (it: any): AssessItem => ({
    id: it.id,
    name: it.variant?.name ?? it.product?.name ?? it.name ?? it.custom_name ?? '',
    issue: it.issue ?? it.notes ?? '',
    qty: it.qty ?? it.quantity ?? 1,
    unit_price: Number(it.unit_price ?? 0),
    product_id: it.product_id,
    product_variant_id: it.product_variant_id,
  })
  const initialPersistedPhotos: PersistedAssessPhoto[] = (((jobData?.serviceOrder as any)?.gpsPhotos ?? (jobData?.serviceOrder as any)?.gps_photos ?? []) as any[])
      .map((photo: any) => ({ id: Number(photo.id), url: photo.photo_url ?? photo.file_url ?? '' }))
    .filter((photo) => photo.id > 0 && photo.url)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [items, setItems] = useState<AssessItem[]>(
    persistedItems.length
      ? persistedItems.map(mapPersistedAssessItem)
      : [{ name: '', issue: '', qty: 1 }],
  )
  const [note, setNote] = useState(jobData?.note ?? '')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([])
  const [persistedPhotos, setPersistedPhotos] = useState<PersistedAssessPhoto[]>(initialPersistedPhotos)
  const [deletingPhotoIds, setDeletingPhotoIds] = useState<number[]>([])
  const photoPreviewUrlsRef = useRef<string[]>([])
  const noteTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [checklistItems, setChecklistItems] = useState<ChecklistResultItem[]>(() =>
    parseChecklistFromNote(jobData?.serviceOrder?.internal_note),
  )

  const setCheckItem = (i: number, patch: Partial<ChecklistResultItem>) =>
    setChecklistItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  // ── Inventory search per row (repair items table) ──
  const [invSearch, setInvSearch] = useState<string[]>(items.map((it) => it.name))
  const [invResults, setInvResults] = useState<InventoryItem[][]>(items.map(() => []))
  const [activeInvRow, setActiveInvRow] = useState<number | null>(null)
  const invDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleInvSearch = (rowIdx: number, q: string) => {
    const ns = [...invSearch]; ns[rowIdx] = q; setInvSearch(ns)
    const ni = [...items]; ni[rowIdx] = { ...ni[rowIdx], name: q, product_id: undefined, product_variant_id: undefined }; setItems(ni)
    setActiveInvRow(rowIdx)
    if (invDebounceRef.current) clearTimeout(invDebounceRef.current)
    if (!q.trim()) { const nr = [...invResults]; nr[rowIdx] = []; setInvResults(nr); return }
    invDebounceRef.current = setTimeout(async () => {
      try {
        const res = await inventoryService.getInventory({ search: q, limit: 10, branch_id: employee?.branch_id })
        const nr = [...invResults]; nr[rowIdx] = res.data.data ?? []; setInvResults(nr)
      } catch { const nr = [...invResults]; nr[rowIdx] = []; setInvResults(nr) }
    }, 300)
  }

  const handleSelectInvItem = (rowIdx: number, inv: InventoryItem) => {
    const n = [...items]
    n[rowIdx] = {
      ...n[rowIdx],
      product_id: inv.product_id,
      product_variant_id: inv.product_variant_id,
      name: inv.variant?.name ?? inv.product?.name ?? '',
      unit_price: Number(inv.variant?.selling_price ?? 0),
    }
    setItems(n)
    const ns = [...invSearch]; ns[rowIdx] = n[rowIdx].name; setInvSearch(ns)
    const nr = [...invResults]; nr[rowIdx] = []; setInvResults(nr)
    setActiveInvRow(null)
  }

  const addRepairItem = () => {
    setItems((prev) => [...prev, { name: '', issue: '', qty: 1 }])
    setInvSearch((prev) => [...prev, ''])
    setInvResults((prev) => [...prev, []])
  }

  const removeRepairItem = (i: number) => {
    setItems((prev) => prev.filter((_, j) => j !== i))
    setInvSearch((prev) => prev.filter((_, j) => j !== i))
    setInvResults((prev) => prev.filter((_, j) => j !== i))
  }

  const resizeNoteTextarea = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  const handlePhotoChange = (files: File[]) => {
    photoPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    const nextUrls = files.map((file) => URL.createObjectURL(file))
    photoPreviewUrlsRef.current = nextUrls
    setPhotoPreviewUrls(nextUrls)
    setPhotos(files)
  }

  const removeSelectedPhoto = (idx: number) => {
    const nextPhotos = photos.filter((_, photoIdx) => photoIdx !== idx)
    handlePhotoChange(nextPhotos)
  }

  const removePersistedPhoto = async (photoId: number) => {
    const soId = jobData?.serviceOrder?.id
    if (!soId) return
    setDeletingPhotoIds((prev) => [...prev, photoId])
    try {
      await serviceOrderService.deleteGpsPhoto(soId, photoId)
      setPersistedPhotos((prev) => prev.filter((photo) => photo.id !== photoId))
      toast.success('ลบรูปเรียบร้อย')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'ลบรูปไม่สำเร็จ')
    } finally {
      setDeletingPhotoIds((prev) => prev.filter((id) => id !== photoId))
    }
  }

  useEffect(() => () => {
    photoPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  useEffect(() => {
    resizeNoteTextarea(noteTextareaRef.current)
  }, [note])

  useEffect(() => {
    setChecklistItems(parseChecklistFromNote(jobData?.serviceOrder?.internal_note))
    setNote(jobData?.note ?? '')
    setPersistedPhotos(initialPersistedPhotos)
    const nextItems = persistedItems.length
      ? persistedItems.map(mapPersistedAssessItem)
      : [{ name: '', issue: '', qty: 1 }]
    setItems(nextItems)
    setInvSearch(nextItems.map((it) => it.name))
    setInvResults(nextItems.map(() => []))
  }, [jobData?.note, jobData?.serviceOrder?.internal_note, JSON.stringify(persistedItems), JSON.stringify(initialPersistedPhotos)])


  const handleSubmit = async () => {
    if (isSubmitting) return
    const soId = jobData?.serviceOrder?.id
    if (!soId) { toast.error('ไม่พบข้อมูลใบสั่งซ่อม'); return }

    const emptyChecklistName = checklistItems.some((it) => !it.name.trim())
    if (emptyChecklistName) {
      toast.error('กรุณากรอกชื่อรายการตรวจให้ครบทุกข้อ')
      return
    }

    const uncheckedChecklist = checklistItems.some((it) => !it.checked)
    if (uncheckedChecklist) {
      toast.error('กรุณาตรวจเช็กรายการตรวจสภาพรถให้ครบทุกข้อก่อนส่งประเมิน')
      return
    }

    const invalidRepairItem = items.find((it) => it.name.trim() && !it.product_id)
    if (invalidRepairItem) {
      toast.error('กรุณาเลือกรายการซ่อมจากสินค้าในรายการค้นหาให้ครบก่อนส่งประเมิน')
      return
    }

    setIsSubmitting(true)
    try {
      if (checklistItems.length > 0) {
        const newNote = buildChecklistResultNote(checklistItems, jobData?.serviceOrder?.internal_note)
        await serviceOrderService.updateServiceOrder(soId, { internal_note: newNote })
      }
      const savedIds: { product_id?: number; product_variant_id?: number; newId: number }[] = []
      for (const item of items.filter((it) => it.name.trim() && !it.id)) {
        const res = await serviceOrderService.addItem(soId, {
          item_type: 'product',
          product_id: item.product_id,
          product_variant_id: item.product_variant_id,
          quantity: item.qty,
          unit_price: Number(item.unit_price ?? 0),
          pricing_type: 'part',
          notes: item.issue || undefined,
        })
        if (res.data.data?.id) {
          savedIds.push({ product_id: item.product_id, product_variant_id: item.product_variant_id, newId: res.data.data.id })
        }
      }
      if (savedIds.length > 0) {
        setItems((prev) => prev.map((item) => {
          if (item.id) return item
          const match = savedIds.find(
            (s) => s.product_id === item.product_id && (s.product_variant_id ?? null) === (item.product_variant_id ?? null),
          )
          return match ? { ...item, id: match.newId } : item
        }))
      }
      if (photos.length > 0) {
        const status = jobData?.serviceOrder?.status
        const gpsTypeByStatus: Record<string, string> = {
          draft: 'pre_intake',
          pending_review: 'damage_spot',
          pending_quote: 'damage_spot',
          approved: 'pre_repair',
          in_progress: 'pre_repair',
          completed: 'pre_delivery',
          pending_pickup: 'delivery',
        }
        const gpsPhotoType = gpsTypeByStatus[status ?? ''] ?? 'damage_spot'

        let lat: number
        let lng: number
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          })
          lat = pos.coords.latitude
          lng = pos.coords.longitude
        } catch (e) {
          toast.error('ไม่สามารถระบุตำแหน่ง GPS ได้ กรุณาอนุญาตตำแหน่งแล้วลองใหม่อีกครั้ง')
          return
        }
        const formatICT = () => {
          const d = new Date()
          return new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 19)
        }
        for (const file of photos) {
          const formData = new FormData()
          formData.append('photo', file)
          formData.append('type', gpsPhotoType)
          formData.append('latitude', lat.toString())
          formData.append('longitude', lng.toString())
          formData.append('taken_at', formatICT())
          await serviceOrderService.uploadGpsPhoto(soId, formData)
        }
      }
      const currentStatus = jobData?.serviceOrder?.status
      if (currentStatus === 'draft') {
        await serviceOrderService.transition(soId, { status: 'pending_review' })
        await serviceOrderService.transition(soId, { status: 'pending_quote' })
      } else if (currentStatus === 'pending_review') {
        await serviceOrderService.transition(soId, { status: 'pending_quote' })
      } else if (currentStatus !== 'pending_quote') {
        toast.error('สถานะใบงานไม่ถูกต้องสำหรับการส่งประเมิน')
        return
      }
      toast.success('ส่งประเมินเรียบร้อย')
      onComplete()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'เกิดข้อผิดพลาดในการบันทึกข้อมูล/อัปโหลดรูป')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Checklist Section */}
      {/* Checklist Section */}
      <div className="rounded-xl border border-gray-200 overflow-visible shadow-sm bg-white">
        <div className="flex flex-col gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/60 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">รายการตรวจสภาพรถ</span>
            {checklistItems.length > 0 && (
              <span className="text-xs text-gray-400">({checklistItems.filter((it) => it.checked).length}/{checklistItems.length} รายการ)</span>
            )}
          </div>
        </div>
        {checklistItems.length === 0 && (
          <div className="py-6 text-center text-sm text-gray-400">ยังไม่มีรายการ — กด &ldquo;เพิ่มรายการตรวจ&rdquo; เพื่อเริ่มต้น</div>
        )}
        {/* Desktop */}
        {checklistItems.length > 0 && (
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 w-10">✓</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">รายการ</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600 w-36">สถานะ</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">สาเหตุ / เหตุผล</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {checklistItems.map((it, i) => {
                  const statusOpt = INSPECTION_STATUS_OPTIONS.find((o) => o.value === it.status)
                  return (
                    <tr key={i} className={cn('group transition-colors', it.checked ? 'bg-white' : 'bg-gray-50/40')}>
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={it.checked}
                          onChange={(e) => setCheckItem(i, { checked: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={it.name}
                          onChange={(e) => setCheckItem(i, { name: e.target.value })}
                          placeholder="ชื่อรายการ"
                          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={it.status}
                          onChange={(e) => setCheckItem(i, { status: e.target.value })}
                          className={cn('w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20', statusOpt?.color ?? 'bg-white text-gray-700')}
                        >
                          {INSPECTION_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={it.reason}
                          onChange={(e) => setCheckItem(i, { reason: e.target.value })}
                          placeholder="ระบุสาเหตุ (ถ้ามี)"
                          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        />
                      </td>
                      <td className="px-2 text-center">
                        <button
                          type="button"
                          onClick={() => setChecklistItems((prev) => prev.filter((_, j) => j !== i))}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {/* Mobile */}
        {checklistItems.length > 0 && (
          <div className="md:hidden divide-y divide-gray-100">
            {checklistItems.map((it, i) => {
              const statusOpt = INSPECTION_STATUS_OPTIONS.find((o) => o.value === it.status)
              return (
                <div key={i} className={cn('p-3 space-y-2.5', it.checked ? 'bg-white' : 'bg-gray-50/40')}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">รายการตรวจ {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => setChecklistItems((prev) => prev.filter((_, j) => j !== i))}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
                      title="ลบรายการ"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-[auto,1fr] items-center gap-2">
                    <input
                      type="checkbox"
                      checked={it.checked}
                      onChange={(e) => setCheckItem(i, { checked: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                    />
                    <input
                      type="text"
                      value={it.name}
                      onChange={(e) => setCheckItem(i, { name: e.target.value })}
                      placeholder="ชื่อรายการ"
                      className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-medium text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                  <select
                    value={it.status}
                    onChange={(e) => setCheckItem(i, { status: e.target.value })}
                    className={cn('w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium focus:outline-none', statusOpt?.color ?? 'bg-white')}
                  >
                    {INSPECTION_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={it.reason}
                    onChange={(e) => setCheckItem(i, { reason: e.target.value })}
                    placeholder="สาเหตุ / เหตุผล (ถ้ามี)"
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
              )
            })}
          </div>
        )}
        <button
          type="button"
          onClick={() => setChecklistItems((prev) => [...prev, { name: '', checked: false, status: 'ปกติ', reason: '' }])}
          className="flex w-full items-center justify-center gap-1.5 border-t border-gray-200 bg-gray-50/50 px-4 py-3 text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> เพิ่มรายการตรวจ
        </button>
      </div>

      {/* Repair Items Table */}
      <div className="rounded-xl border border-gray-200 overflow-visible shadow-sm bg-white">
        <div className="hidden md:block">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-200"><tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">รายการ</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">อาการ</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 w-24">จำนวน</th>
              <th className="w-12" />
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it, i) => (
                <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                  <td className={cn('px-4 py-3', activeInvRow === i && 'relative z-20')}>
                    <div className="relative">
                      <Wrench className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                      <input
                        className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        value={invSearch[i] || it.name}
                        onChange={(e) => handleInvSearch(i, e.target.value)}
                        onFocus={() => setActiveInvRow(i)}
                        onBlur={() => setTimeout(() => { if (activeInvRow === i) setActiveInvRow(null) }, 150)}
                        placeholder="พิมพ์ค้นหาสินค้า..."
                        autoComplete="off"
                      />
                      {activeInvRow === i && invResults[i]?.length > 0 && (
                        <ul className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                          {invResults[i].map((inv) => (
                            <li
                              key={`${inv.product_id}-${inv.product_variant_id}`}
                              onMouseDown={() => handleSelectInvItem(i, inv)}
                              className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 transition-colors"
                            >
                              <span className="font-medium text-gray-800">{inv.variant?.name ?? inv.product?.name}</span>
                              <span className="text-xs text-gray-400 ml-2 shrink-0">คงเหลือ {inv.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <AlertTriangle className="absolute left-3 top-2.5 h-4 w-4 text-amber-400" />
                      <input className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" value={it.issue} onChange={(e) => { const n = [...items]; n[i].issue = e.target.value; setItems(n) }} placeholder="เช่น แตก/รั่ว" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center"><input type="number" className="w-16 rounded-lg border border-gray-200 px-2 py-2 text-sm text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" value={it.qty} onChange={(e) => { const n = [...items]; n[i].qty = Number(e.target.value); setItems(n) }} /></td>
                  <td className="px-2 text-center">
                    <button onClick={() => removeRepairItem(i)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors md:opacity-0 md:group-hover:opacity-100">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y divide-gray-100">
          {items.map((it, i) => (
            <div key={i} className="p-4 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-500">รายการ</label>
                  <button
                    type="button"
                    onClick={() => removeRepairItem(i)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
                    title="ลบรายการ"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative">
                  <Wrench className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                  <input
                    className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={invSearch[i] || it.name}
                    onChange={(e) => handleInvSearch(i, e.target.value)}
                    onFocus={() => setActiveInvRow(i)}
                    onBlur={() => setTimeout(() => { if (activeInvRow === i) setActiveInvRow(null) }, 150)}
                    placeholder="พิมพ์ค้นหาสินค้า..."
                    autoComplete="off"
                  />
                  {activeInvRow === i && invResults[i]?.length > 0 && (
                    <ul className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                      {invResults[i].map((inv) => (
                        <li
                          key={`${inv.product_id}-${inv.product_variant_id}`}
                          onMouseDown={() => handleSelectInvItem(i, inv)}
                          className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 transition-colors"
                        >
                          <span className="font-medium text-gray-800">{inv.variant?.name ?? inv.product?.name}</span>
                          <span className="text-xs text-gray-400 ml-2 shrink-0">คงเหลือ {inv.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,96px]">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">อาการ</label>
                  <div className="relative">
                    <AlertTriangle className="absolute left-3 top-2.5 h-4 w-4 text-amber-400" />
                    <input className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" value={it.issue} onChange={(e) => { const n = [...items]; n[i].issue = e.target.value; setItems(n) }} placeholder="เช่น แตก/รั่ว" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">จำนวน</label>
                  <input type="number" className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" value={it.qty} onChange={(e) => { const n = [...items]; n[i].qty = Number(e.target.value); setItems(n) }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addRepairItem} className="flex w-full items-center justify-center gap-1.5 border-t border-gray-200 bg-gray-50/50 px-4 py-3 text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> เพิ่มรายการซ่อม
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/30 px-3 py-6 text-center text-sm font-medium text-blue-600 transition-all hover:border-blue-400 hover:bg-blue-50 group">
          <div className="p-3 bg-blue-100 text-blue-500 rounded-full group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all">
            <Camera className="h-6 w-6" />
          </div>
          <span className="leading-relaxed">
            ถ่ายรูปจุดเสีย / แนบไฟล์อ้างอิง
            {photos.length > 0 && <span className="text-emerald-600 font-bold ml-1">({photos.length} รูป)</span>}
          </span>
          <input
            type="file"
            multiple
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handlePhotoChange(Array.from(e.target.files ?? []))}
          />
        </label>
        {(photoPreviewUrls.length > 0 || persistedPhotos.length > 0) && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {persistedPhotos.map((photo, idx) => (
              <div key={`persisted-${photo.id}`} className="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => void removePersistedPhoto(photo.id)}
                  disabled={deletingPhotoIds.includes(photo.id)}
                  className="absolute right-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingPhotoIds.includes(photo.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                </button>
                <img src={photo.url} alt={`persisted-preview-${idx + 1}`} className="h-20 w-full rounded object-contain bg-gray-50" />
              </div>
            ))}
            {photoPreviewUrls.map((url, idx) => (
              <div key={`local-${url}-${idx}`} className="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => removeSelectedPhoto(idx)}
                  className="absolute right-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <img src={url} alt={`preview-${idx + 1}`} className="h-20 w-full rounded object-contain bg-gray-50" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">หมายเหตุช่าง</label>
        <div className="relative">
          <textarea
            ref={noteTextareaRef}
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
              resizeNoteTextarea(e.currentTarget)
            }}
            placeholder="รายละเอียดเพิ่มเติมที่พบ..."
            rows={3}
            className="w-full rounded-xl border border-gray-200 bg-white/50 px-4 py-2.5 text-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 resize-none overflow-hidden shadow-sm"
          />
        </div>
      </div>

      <div className="pt-4">
        <ActionButton onClick={handleSubmit} loading={isSubmitting}>
          <ClipboardList className="h-5 w-5" /> ส่งประเมินเรียบร้อย <ArrowRight className="h-4 w-4 ml-1 opacity-70" /> เสนอราคา
        </ActionButton>
      </div>
    </div>
  )
}

/* ─── Quotation Step ─── */
export function QuotationForm({ onComplete, jobData, onDraftChange }: FormProps) {
  const { employee } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [items, setItems] = useState<QItem[]>(
    jobData?.items.length
      ? jobData.items.map((it) => ({
          mode: it.product_id ? ('product' as QItemMode) : ('custom' as QItemMode),
          product_id: it.product_id,
          product_variant_id: it.product_variant_id,
          name: it.name,
          price: it.unit_price,
          qty: it.qty,
          pricing_type: it.product_id ? it.pricing_type : 'labor',
        }))
      : [{ mode: 'custom' as QItemMode, name: '', price: 0, qty: 1, pricing_type: 'labor' as const }],
  )
  const [discount, setDiscount] = useState(roundMoney((jobData?.items ?? []).reduce((sum, it) => sum + Number(it.discount ?? 0), 0)))
  const subtotal = roundMoney(items.reduce((s, i) => s + i.price * i.qty, 0))
  const afterDiscount = roundMoney(subtotal - discount)
  const vat = roundMoney(afterDiscount * 0.07)
  const total = roundMoney(afterDiscount + vat)
  const existingCustomerId = jobData?.serviceOrder?.customer_id ?? jobData?.quotation?.customer_id ?? null
  const needsCustomerPick = !existingCustomerId
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Array<{ id: number; full_name: string; phone: string | null }>>([])
  const [pickedCustomer, setPickedCustomer] = useState<{ id: number; full_name: string } | null>(null)
  const [custMode, setCustMode] = useState<'search' | 'new'>('search')
  const [newCustForm, setNewCustForm] = useState({
    type: 'personal' as 'personal' | 'corporate',
    firstName: '',
    lastName: '',
    phone: '',
    companyName: '',
    taxId: '',
    idCard: '',
    address: '',
    companyBranch: '',
    contactName: '',
  })
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)
  const custSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // inventory search state per row
  const [invSearch, setInvSearch] = useState<string[]>(items.map((it) => (it.mode === 'product' ? it.name : '')))
  const [invResults, setInvResults] = useState<InventoryItem[][]>(items.map(() => []))
  const [activeInvRow, setActiveInvRow] = useState<number | null>(null)
  const [priceInputs, setPriceInputs] = useState<string[]>(items.map((it) => String(it.price ?? 0)))
  const invDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const generateCustomerCode = () => {
    const d = new Date()
    const pad = (v: number) => String(v).padStart(2, '0')
    const ts = `${String(d.getFullYear()).slice(-2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
    const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
    return `CU${ts}${rand}`
  }

  const searchCustomers = (q: string) => {
    setCustomerSearch(q)
    if (custSearchRef.current) clearTimeout(custSearchRef.current)
    if (q.trim().length < 2) { setCustomerResults([]); return }
    custSearchRef.current = setTimeout(async () => {
      try {
        const { data } = await customerService.getCustomers({ search: q, limit: 10 })
        setCustomerResults(data.data.map((c: any) => ({
          id: c.id,
          full_name: c.full_name ?? c.company_name ?? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() ?? `#${c.id}`,
          phone: c.phone ?? c.phones?.[0]?.phone ?? null,
        })))
      } catch { setCustomerResults([]) }
    }, 300)
  }

  const handleCreateNewCustomer = async () => {
    if (newCustForm.type === 'personal' && !newCustForm.firstName.trim()) {
      toast.error('กรุณากรอกชื่อ')
      return
    }
    if (newCustForm.type === 'corporate' && !newCustForm.companyName.trim()) {
      toast.error('กรุณากรอกชื่อบริษัท/ร้าน')
      return
    }
    if (!employee?.branch_id) { toast.error('ไม่พบข้อมูลสาขา'); return }
    setIsCreatingCustomer(true)
    try {
      const isCorporate = newCustForm.type === 'corporate'
      const normalizedFirstName = isCorporate ? newCustForm.companyName.trim() : newCustForm.firstName.trim()
      let created: any = null
      let lastErr: any = null
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const payload: import('@/types/customer').CustomerPayload = {
          type: newCustForm.type,
          customer_code: generateCustomerCode(),
          branch_id: employee.branch_id,
          first_name: normalizedFirstName,
          last_name: isCorporate ? undefined : (newCustForm.lastName.trim() || undefined),
          company_name: isCorporate ? newCustForm.companyName.trim() : undefined,
          tax_id: newCustForm.taxId.trim() || undefined,
          id_card: !isCorporate ? (newCustForm.idCard.trim() || undefined) : undefined,
          address: newCustForm.address.trim() || undefined,
          company_branch: isCorporate ? (newCustForm.companyBranch.trim() || undefined) : undefined,
          contact_name: isCorporate ? (newCustForm.contactName.trim() || undefined) : undefined,
          phones: newCustForm.phone.trim() ? [{ type: 'mobile', number: newCustForm.phone.trim(), is_primary: true }] : [],
        }
        try {
          const { data: res } = await customerService.createCustomer(payload)
          created = res.data
          break
        } catch (err: any) {
          lastErr = err
          const msg = String(err?.response?.data?.message ?? err?.message ?? '').toLowerCase()
          const isDuplicateCode = msg.includes('customer_code') || msg.includes('idx_customers_customer_code') || msg.includes('duplicate') || msg.includes('1062')
          if (!isDuplicateCode) {
            throw err
          }
        }
      }
      if (!created) {
        throw lastErr ?? new Error('create customer failed')
      }
      const full = (created.company_name ?? `${created.first_name ?? ''} ${created.last_name ?? ''}`.trim()) || `#${created.id}`
      setPickedCustomer({ id: created.id, full_name: full })
      setCustomerResults([])
      setCustomerSearch('')
      setCustMode('search')
      setNewCustForm({
        type: 'personal',
        firstName: '',
        lastName: '',
        phone: '',
        companyName: '',
        taxId: '',
        idCard: '',
        address: '',
        companyBranch: '',
        contactName: '',
      })
      toast.success(`สร้างลูกค้า "${full}" เรียบร้อย`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'สร้างลูกค้าไม่สำเร็จ')
    } finally {
      setIsCreatingCustomer(false)
    }
  }

  const handleInvSearch = (rowIdx: number, q: string) => {
    const newSearch = [...invSearch]
    newSearch[rowIdx] = q
    setInvSearch(newSearch)
    setActiveInvRow(rowIdx)
    if (invDebounceRef.current) clearTimeout(invDebounceRef.current)
    if (!q.trim()) { const nr = [...invResults]; nr[rowIdx] = []; setInvResults(nr); return }
    invDebounceRef.current = setTimeout(async () => {
      try {
        const res = await inventoryService.getInventory({ search: q, limit: 10, branch_id: employee?.branch_id })
        const nr = [...invResults]; nr[rowIdx] = res.data.data ?? []; setInvResults(nr)
      } catch { const nr = [...invResults]; nr[rowIdx] = []; setInvResults(nr) }
    }, 300)
  }

  const handleSelectInvItem = (rowIdx: number, inv: InventoryItem) => {
    const n = [...items]
    n[rowIdx] = {
      ...n[rowIdx],
      product_id: inv.product_id,
      product_variant_id: inv.product_variant_id,
      name: inv.variant?.name ?? inv.product?.name ?? '',
      price: Number(inv.variant?.selling_price ?? 0),
      stock: Number(inv.quantity ?? 0),
    }
    setItems(n)
    const np = [...priceInputs]
    np[rowIdx] = String(Number(inv.variant?.selling_price ?? 0))
    setPriceInputs(np)
    const ns = [...invSearch]; ns[rowIdx] = n[rowIdx].name; setInvSearch(ns)
    const nr = [...invResults]; nr[rowIdx] = []; setInvResults(nr)
    setActiveInvRow(null)
  }

  const addItem = () => {
    setItems([...items, { mode: 'custom', name: '', price: 0, qty: 1, pricing_type: 'labor' }])
    setPriceInputs([...priceInputs, '0'])
    setInvSearch([...invSearch, ''])
    setInvResults([...invResults, []])
  }

  const removeItem = (i: number) => {
    setItems(items.filter((_, j) => j !== i))
    setPriceInputs(priceInputs.filter((_, j) => j !== i))
    setInvSearch(invSearch.filter((_, j) => j !== i))
    setInvResults(invResults.filter((_, j) => j !== i))
  }

  useEffect(() => {
    if (!onDraftChange) return
    const mappedItems = items
      .filter((it) => it.name.trim())
      .map((it, idx) => {
        const itemDiscount = idx === 0 ? discount : 0

        return {
        id: idx,
        name: it.name,
        qty: Number(it.qty ?? 0),
        unit_price: Number(it.price ?? 0),
        discount: itemDiscount,
        subtotal: Number(it.qty ?? 0) * Number(it.price ?? 0) - itemDiscount,
        pricing_type: (it.mode === 'product' ? 'part' : 'labor') as 'part' | 'labor',
        product_id: it.mode === 'product' ? it.product_id : undefined,
        product_variant_id: it.mode === 'product' ? it.product_variant_id : undefined,
      }})

    onDraftChange({
      items: mappedItems,
      subtotal,
      discount,
      vatPercent: 7,
      vatAmount: vat,
      grandTotal: total,
      note: jobData?.note ?? '',
    })
  }, [items, discount, subtotal, vat, total, jobData?.note, onDraftChange])

  useEffect(() => {
    return () => {
      onDraftChange?.(null)
    }
  }, [onDraftChange])

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
        items: items.filter((it) => it.name.trim()).map((it, idx) => ({
          quantity: Number(it.qty ?? 0),
          unit_price: Number(it.price ?? 0),
          pricing_type: it.mode === 'product' ? 'part' : 'labor',
          product_id: it.mode === 'product' ? (it.product_id ?? null) : null,
          product_variant_id: it.mode === 'product' ? (it.product_variant_id ?? null) : null,
          description: it.name,
          discount: idx === 0 ? discount : 0,
        })),
      })
      toast.success('สร้างใบเสนอราคาเรียบร้อย')
      onDraftChange?.(null)
      onComplete(jobData?.sourceType === 'sale' && !jobData.sourceId ? { newId: qtRes.data.id } : undefined)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      {needsCustomerPick && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm relative z-20 overflow-visible">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 mb-3">
            <UserSearch className="h-4 w-4" /> 
            เลือกลูกค้า {pickedCustomer ? <span className="font-normal text-blue-600">· {pickedCustomer.full_name}</span> : <span className="font-normal text-gray-500">(บังคับ)</span>}
          </div>
          {!pickedCustomer && (
            <div className="space-y-3">
              {/* Tab switcher */}
              <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
                <button
                  type="button"
                  onClick={() => setCustMode('search')}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all ${
                    custMode === 'search' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Search className="h-3.5 w-3.5" />
                  ค้นหาลูกค้าเดิม
                </button>
                <button
                  type="button"
                  onClick={() => setCustMode('new')}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all ${
                    custMode === 'new' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="text-sm leading-none">+</span>
                  ลูกค้าใหม่
                </button>
              </div>

              {/* Tab 1 — ค้นหาลูกค้าเดิม */}
              {custMode === 'search' && (
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    value={customerSearch}
                    onChange={(e) => searchCustomers(e.target.value)}
                    placeholder="ชื่อ / เบอร์โทร / บัตรประชาชน"
                    className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
                  />
                  {customerSearch.trim().length >= 2 && (
                    <ul className="absolute left-0 top-full z-50 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white shadow-xl text-sm divide-y divide-gray-100">
                      {customerResults.length === 0 ? (
                        <li className="px-4 py-3">
                          <p className="text-gray-400 text-xs mb-1.5">ไม่พบลูกค้าในระบบ</p>
                          <button
                            type="button"
                            onClick={() => {
                              const parts = customerSearch.trim().split(' ')
                              setNewCustForm((p) => ({
                                ...p,
                                type: 'personal',
                                firstName: parts[0] ?? '',
                                lastName: parts.slice(1).join(' ') ?? '',
                              }))
                              setCustMode('new')
                              setCustomerResults([])
                            }}
                            className="text-xs text-blue-600 font-semibold hover:underline"
                          >
                            + สร้างลูกค้าใหม่
                          </button>
                        </li>
                      ) : (
                        customerResults.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => { setPickedCustomer({ id: c.id, full_name: c.full_name }); setCustomerResults([]); setCustomerSearch('') }}
                              className="flex items-center w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                            >
                              <span className="font-medium text-gray-800">{c.full_name}</span>
                              {c.phone && <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{c.phone}</span>}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              )}

              {/* Tab 2 — ลูกค้าใหม่ */}
              {custMode === 'new' && (
                <div className="space-y-2.5 rounded-lg border border-gray-200 bg-white p-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">ประเภทลูกค้า <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewCustForm((p) => ({ ...p, type: 'personal' }))}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${newCustForm.type === 'personal' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      >
                        บุคคลธรรมดา
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCustForm((p) => ({ ...p, type: 'corporate' }))}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${newCustForm.type === 'corporate' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      >
                        นิติบุคคล
                      </button>
                    </div>
                  </div>

                  {newCustForm.type === 'personal' ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">ชื่อ <span className="text-red-500">*</span></label>
                        <input
                          value={newCustForm.firstName}
                          onChange={(e) => setNewCustForm((p) => ({ ...p, firstName: e.target.value }))}
                          placeholder="ชื่อ"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">นามสกุล</label>
                        <input
                          value={newCustForm.lastName}
                          onChange={(e) => setNewCustForm((p) => ({ ...p, lastName: e.target.value }))}
                          placeholder="นามสกุล (ถ้ามี)"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">เลขบัตรประชาชน</label>
                        <input
                          value={newCustForm.idCard}
                          onChange={(e) => setNewCustForm((p) => ({ ...p, idCard: e.target.value }))}
                          placeholder="13 หลัก (ถ้ามี)"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">เบอร์โทร</label>
                        <input
                          value={newCustForm.phone}
                          onChange={(e) => setNewCustForm((p) => ({ ...p, phone: e.target.value }))}
                          placeholder="เบอร์โทร"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">ชื่อบริษัท / ร้าน <span className="text-red-500">*</span></label>
                        <input
                          value={newCustForm.companyName}
                          onChange={(e) => setNewCustForm((p) => ({ ...p, companyName: e.target.value }))}
                          placeholder="ชื่อบริษัท / ร้าน"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">เลขผู้เสียภาษี</label>
                        <input
                          value={newCustForm.taxId}
                          onChange={(e) => setNewCustForm((p) => ({ ...p, taxId: e.target.value }))}
                          placeholder="13 หลัก (ถ้ามี)"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">สาขาของลูกค้า</label>
                        <input
                          value={newCustForm.companyBranch}
                          onChange={(e) => setNewCustForm((p) => ({ ...p, companyBranch: e.target.value }))}
                          placeholder="เช่น สำนักงานใหญ่"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">ชื่อผู้ติดต่อ</label>
                        <input
                          value={newCustForm.contactName}
                          onChange={(e) => setNewCustForm((p) => ({ ...p, contactName: e.target.value }))}
                          placeholder="ชื่อผู้ติดต่อ (ถ้ามี)"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">เบอร์โทร</label>
                        <input
                          value={newCustForm.phone}
                          onChange={(e) => setNewCustForm((p) => ({ ...p, phone: e.target.value }))}
                          placeholder="เบอร์โทร"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">ที่อยู่สำหรับออกเอกสาร</label>
                    <input
                      value={newCustForm.address}
                      onChange={(e) => setNewCustForm((p) => ({ ...p, address: e.target.value }))}
                      placeholder="ที่อยู่ (ถ้ามี)"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateNewCustomer}
                    disabled={isCreatingCustomer || (newCustForm.type === 'personal' ? !newCustForm.firstName.trim() : !newCustForm.companyName.trim())}
                    className="w-full rounded-lg bg-blue-600 text-white text-sm font-semibold py-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isCreatingCustomer ? 'กำลังสร้าง...' : 'สร้างลูกค้าและเลือก'}
                  </button>
                </div>
              )}
            </div>
          )}
          {pickedCustomer && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs">✓</span>
                <span className="font-medium text-gray-800">{pickedCustomer.full_name}</span>
              </div>
              <button type="button" onClick={() => { setPickedCustomer(null); setCustMode('search') }} className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">เปลี่ยน</button>
            </div>
          )}
        </div>
      )}
      <div className="rounded-xl border border-gray-200 overflow-visible shadow-sm bg-white">
        <div className="hidden md:block">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-200"><tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-36">ประเภท</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">รายการ</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 w-32">ราคา</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 w-24">จำนวน</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 w-32">รวม</th>
              <th className="w-12" />
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it, i) => (
                <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 align-top">
                    <div className="relative">
                      <select
                        value={it.mode}
                        onChange={(e) => {
                          const nextMode = e.target.value as QItemMode
                          const n = [...items]
                          n[i] = {
                            ...n[i],
                            mode: nextMode,
                            product_id: undefined,
                            product_variant_id: undefined,
                            name: '',
                            price: 0,
                            stock: undefined,
                            pricing_type: nextMode === 'product' ? 'part' : 'labor',
                          }
                          setItems(n)
                          const np = [...priceInputs]
                          np[i] = '0'
                          setPriceInputs(np)
                          const ns = [...invSearch]; ns[i] = ''; setInvSearch(ns)
                          const nr = [...invResults]; nr[i] = []; setInvResults(nr)
                        }}
                        className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 pr-8 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      >
                        <option value="product">สินค้า (catalog)</option>
                        <option value="custom">อื่นๆ (พิมพ์เอง)</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </td>
                  <td className={cn('px-4 py-3 align-top', activeInvRow === i && 'relative z-20')}>
                    {it.mode === 'product' ? (
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                        <input
                          className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                          placeholder="พิมพ์ค้นหาสินค้า..."
                          value={invSearch[i] || it.name}
                          onChange={(e) => handleInvSearch(i, e.target.value)}
                          onFocus={() => setActiveInvRow(i)}
                          onBlur={() => setTimeout(() => { if (activeInvRow === i) setActiveInvRow(null) }, 150)}
                          autoComplete="off"
                        />
                        {activeInvRow === i && !!invSearch[i]?.trim() && (
                          <ul className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                            {invResults[i]?.length ? invResults[i].map((inv) => (
                              <li
                                key={`${inv.product_id}-${inv.product_variant_id}`}
                                onMouseDown={(e) => { e.preventDefault(); handleSelectInvItem(i, inv) }}
                                className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 transition-colors"
                              >
                                <span className="font-medium text-gray-800">{inv.variant?.name ?? inv.product?.name ?? `#${inv.id}`}</span>
                                <span className="text-xs text-gray-400 ml-2 shrink-0">คงเหลือ {inv.quantity}</span>
                              </li>
                            )) : <li className="px-3 py-2 text-xs text-gray-400">ไม่พบสินค้า</li>}
                          </ul>
                        )}
                        {it.stock !== undefined && (
                          <div className="text-xs font-medium text-gray-500 mt-1 flex items-center gap-1">
                            <Package className="h-3 w-3" /> คงเหลือ: <span className={it.stock > 0 ? 'text-green-600' : 'text-red-500'}>{it.stock}</span> ชิ้น
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        placeholder="พิมพ์รายการ..."
                        value={it.name}
                        onChange={(e) => { const n = [...items]; n[i] = { ...n[i], name: e.target.value }; setItems(n) }}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      type="number"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      value={priceInputs[i] ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value
                        const np = [...priceInputs]
                        np[i] = raw
                        setPriceInputs(np)

                        if (raw === '') {
                          const n = [...items]
                          n[i] = { ...n[i], price: 0 }
                          setItems(n)
                          return
                        }

                        if (raw === '-' || raw === '.' || raw === '-.') {
                          return
                        }

                        const parsed = Number(raw)
                        if (!Number.isFinite(parsed)) {
                          return
                        }

                        const n = [...items]
                        n[i] = { ...n[i], price: parsed }
                        setItems(n)
                      }}
                    />
                  </td>
                  <td className="px-4 py-3 text-center align-top">
                    <input
                      type="number"
                      className="w-16 rounded-lg border border-gray-200 px-2 py-2 text-sm text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      value={it.qty}
                      onChange={(e) => { const n = [...items]; n[i] = { ...n[i], qty: Number(e.target.value) }; setItems(n) }}
                    />
                  </td>
                  <td className="px-4 py-3 align-top text-right font-semibold text-gray-800">฿{(it.price * it.qty).toLocaleString()}</td>
                  <td className="px-2 text-center">
                    <button onClick={() => removeItem(i)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors md:opacity-0 md:group-hover:opacity-100">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y divide-gray-100">
          {items.map((it, i) => (
            <div key={i} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-500">รายการสินค้า</label>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
                  title="ลบรายการ"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">ประเภท</label>
                <div className="relative">
                  <select
                    value={it.mode}
                    onChange={(e) => {
                      const nextMode = e.target.value as QItemMode
                      const n = [...items]
                      n[i] = {
                        ...n[i],
                        mode: nextMode,
                        product_id: undefined,
                        product_variant_id: undefined,
                        name: '',
                        price: 0,
                        stock: undefined,
                        pricing_type: nextMode === 'product' ? 'part' : 'labor',
                      }
                      setItems(n)
                      const np = [...priceInputs]
                      np[i] = '0'
                      setPriceInputs(np)
                      const ns = [...invSearch]; ns[i] = ''; setInvSearch(ns)
                      const nr = [...invResults]; nr[i] = []; setInvResults(nr)
                    }}
                    className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 pr-8 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  >
                    <option value="product">สินค้า (catalog)</option>
                    <option value="custom">อื่นๆ (พิมพ์เอง)</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className={cn('space-y-1', activeInvRow === i && 'relative z-20')}>
                <label className="text-xs font-semibold text-gray-500">รายการ</label>
                {it.mode === 'product' ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                    <input
                      className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      value={invSearch[i] || it.name}
                      onChange={(e) => handleInvSearch(i, e.target.value)}
                      onFocus={() => setActiveInvRow(i)}
                      onBlur={() => setTimeout(() => { if (activeInvRow === i) setActiveInvRow(null) }, 150)}
                      placeholder="พิมพ์ค้นหาสินค้า..."
                      autoComplete="off"
                    />
                    {activeInvRow === i && !!invSearch[i]?.trim() && (
                      <ul className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                        {invResults[i]?.length ? invResults[i].map((inv) => (
                          <li
                            key={`${inv.product_id}-${inv.product_variant_id}`}
                            onMouseDown={(e) => { e.preventDefault(); handleSelectInvItem(i, inv) }}
                            className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 transition-colors"
                          >
                            <span className="font-medium text-gray-800">{inv.variant?.name ?? inv.product?.name ?? `#${inv.id}`}</span>
                            <span className="text-xs text-gray-400 ml-2 shrink-0">คงเหลือ {inv.quantity}</span>
                          </li>
                        )) : <li className="px-3 py-2 text-xs text-gray-400">ไม่พบสินค้า</li>}
                      </ul>
                    )}
                    {it.stock !== undefined && (
                      <p className="mt-1 text-xs text-gray-500">คงเหลือ {it.stock} ชิ้น</p>
                    )}
                  </div>
                ) : (
                  <input
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="พิมพ์รายการ..."
                    value={it.name}
                    onChange={(e) => { const n = [...items]; n[i] = { ...n[i], name: e.target.value }; setItems(n) }}
                  />
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">ราคา</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={priceInputs[i] ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value
                      const np = [...priceInputs]
                      np[i] = raw
                      setPriceInputs(np)

                      if (raw === '') {
                        const n = [...items]
                        n[i] = { ...n[i], price: 0 }
                        setItems(n)
                        return
                      }

                      if (raw === '-' || raw === '.' || raw === '-.') return
                      const parsed = Number(raw)
                      if (!Number.isFinite(parsed)) return

                      const n = [...items]
                      n[i] = { ...n[i], price: parsed }
                      setItems(n)
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">จำนวน</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={it.qty}
                    onChange={(e) => { const n = [...items]; n[i] = { ...n[i], qty: Number(e.target.value) }; setItems(n) }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">รวม</label>
                  <div className="h-[38px] rounded-lg border border-gray-200 bg-gray-50 px-2 flex items-center justify-end text-sm font-semibold text-gray-800">
                    ฿{(it.price * it.qty).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addItem} className="flex w-full items-center justify-center gap-1.5 border-t border-gray-200 bg-gray-50/50 px-4 py-3 text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> เพิ่มรายการ
        </button>
      </div>
      <div className="flex justify-end pt-2">
        <div className="w-72 space-y-2 text-sm bg-gray-50/80 p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">ราคาสินค้า/บริการ</span><span className="font-semibold text-gray-700">฿{formatMoney(subtotal)}</span></div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-medium">ส่วนลด</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1 text-gray-400 font-medium">฿</span>
              <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-24 rounded-lg border border-gray-200 pl-6 pr-2 py-1 text-sm text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
            </div>
          </div>
          <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">VAT 7%</span><span className="font-semibold text-gray-700">฿{formatMoney(vat)}</span></div>
          <div className="flex justify-between items-center border-t border-gray-200 pt-3 mt-1 text-base font-bold"><span>รวมทั้งสิ้น</span><span className="text-blue-600 text-lg">฿{formatMoney(total)}</span></div>
        </div>
      </div>
      <div className="pt-2">
        <ActionButton onClick={handleSubmit} loading={isSubmitting}>
          <Send className="h-4 w-4" /> ส่งใบเสนอราคาให้ลูกค้า
        </ActionButton>
      </div>
    </div>
  )
}

/* ─── Approve Step ─── */
export function ApproveForm({ onComplete, jobData }: FormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
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
    if (!rejectReason.trim()) { toast.error('กรุณาระบุเหตุผลที่ไม่อนุมัติ'); return }
    setIsSubmitting(true)
    try {
      await quotationService.reject(qt.id, { reject_reason: rejectReason.trim() })
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
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <FileText className="h-24 w-24" />
        </div>
        <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
          <Receipt className="h-4 w-4" /> สรุปใบเสนอราคา <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-mono">{qtNo}</span>
        </h4>
        <div className="space-y-2.5 text-sm text-gray-700 relative z-10">
          {items.length > 0 ? (
            items.map((it, i) => {
              const lineName = ('name' in it ? it.name : (it.product_name ?? it.description ?? '')) || '—'
              const lineQty = Number('qty' in it ? it.qty : it.quantity)
              const lineUnitPrice = Number(('unit_price' in it ? (it as any).unit_price : 0) ?? 0)
              const lineDiscount = Number(((it as any).discount ?? 0))
              const lineAmountRaw = ('subtotal' in it ? it.subtotal : ((it as any).total ?? (lineQty * lineUnitPrice - lineDiscount))) as number | string
              const lineAmount = Number(lineAmountRaw)
              return (
                <div key={i} className="flex justify-between items-start">
                  <span className="font-medium pr-4">{lineName} <span className="text-gray-400 font-normal">× {Number.isFinite(lineQty) ? lineQty : 0}</span></span>
                  <span className="whitespace-nowrap font-medium text-gray-900">฿{(Number.isFinite(lineAmount) ? lineAmount : (lineQty * lineUnitPrice - lineDiscount)).toLocaleString()}</span>
                </div>
              )
            })
          ) : (
            <p className="text-gray-500 text-xs italic">ไม่มีรายการ</p>
          )}
          <div className="flex justify-between border-t border-blue-200 pt-3 mt-2 font-bold text-base">
            <span className="text-blue-900">รวม (VAT 7%)</span><span className="text-blue-700">฿{grandTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>
      {showRejectInput && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 space-y-3 shadow-sm">
          <label className="text-xs font-semibold text-red-800 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> เหตุผลที่ไม่อนุมัติ *
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="ระบุเหตุผล..."
            className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all resize-none shadow-sm"
          />
          <div className="flex gap-3 pt-1">
            <div className="flex-1">
              <ActionButton variant="secondary" onClick={() => { setShowRejectInput(false); setRejectReason('') }} disabled={isSubmitting}>
                ยกเลิก
              </ActionButton>
            </div>
            <div className="flex-1">
              <ActionButton variant="danger" onClick={handleReject} disabled={isSubmitting || !rejectReason.trim()} loading={isSubmitting}>
                ยืนยันไม่อนุมัติ
              </ActionButton>
            </div>
          </div>
        </div>
      )}
      {!showRejectInput && (
        <div className="flex gap-4 pt-2">
          <button onClick={() => setShowRejectInput(true)} disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3.5 text-sm font-semibold text-red-700 hover:bg-red-100 hover:border-red-300 transition-all disabled:opacity-50">
            <X className="h-5 w-5" /> ลูกค้าไม่อนุมัติ
          </button>
          <div className="flex-1">
            <ActionButton onClick={handleApprove} disabled={isSubmitting} loading={isSubmitting}>
              <CheckCircle2 className="h-5 w-5" /> ลูกค้าอนุมัติ
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Invoice Step ─── */
export function InvoiceForm({ onComplete, jobData }: FormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const qt = jobData?.quotation
  const quoteItems = (qt?.items?.length
    ? qt.items.map((it, idx) => ({
        id: it.id ?? idx,
        name: it.description ?? it.product_name ?? it.variant?.name ?? '-',
        qty: Number(it.quantity ?? 0),
        unitPrice: Number(it.unit_price ?? 0),
        discount: Number(it.discount ?? 0),
        lineTotal: Number(it.subtotal ?? (Number(it.quantity ?? 0) * Number(it.unit_price ?? 0) - Number(it.discount ?? 0))),
        pricingType: it.pricing_type,
      }))
    : (jobData?.items ?? []).map((it) => ({
        id: it.id,
        name: it.name,
        qty: Number(it.qty ?? 0),
        unitPrice: Number(it.unit_price ?? 0),
        discount: Number(it.discount ?? 0),
        lineTotal: Number(it.subtotal ?? (Number(it.qty ?? 0) * Number(it.unit_price ?? 0) - Number(it.discount ?? 0))),
        pricingType: it.pricing_type,
      })))
  const itemsSubtotal = quoteItems.reduce((sum, it) => sum + it.qty * it.unitPrice, 0)
  const itemsDiscount = quoteItems.reduce((sum, it) => sum + it.discount, 0)
  const beforeVat = quoteItems.reduce((sum, it) => sum + it.lineTotal, 0)
  const vatPercent = Number(qt?.vat_percent ?? jobData?.vat_percent ?? 7)
  const vatAmount = Number(qt?.vat_amount ?? jobData?.vat_amount ?? Math.round(beforeVat * (vatPercent / 100)))
  const grandTotal = Number(qt?.grand_total ?? jobData?.grand_total ?? (beforeVat + vatAmount))
  const vehicle = [jobData?.serviceOrder?.vehicle?.brand, jobData?.serviceOrder?.vehicle?.model].filter(Boolean).join(' / ')
  const plateNo = jobData?.serviceOrder?.vehicle?.plate_number ?? '—'
  const quoteDate = qt?.created_at ?? jobData?.createdAt

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
    <div className="space-y-6">
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Receipt className="h-24 w-24" />
        </div>
        <h4 className="text-sm font-semibold text-indigo-800 mb-4 flex items-center gap-2">
          <Receipt className="h-4 w-4" /> สรุปก่อนออกใบแจ้งหนี้
        </h4>
        <div className="relative z-10 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-indigo-100 bg-white/80 p-3 text-sm">
              <div className="text-xs text-indigo-600 font-semibold mb-2">ข้อมูลเอกสาร</div>
              <div className="space-y-1.5 text-gray-700">
                <div className="flex items-center justify-between"><span className="text-gray-500">อ้างอิง QT</span><span className="font-semibold text-gray-900 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">{qt?.quotation_no ?? '—'}</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-500">เลขที่งาน</span><span className="font-medium text-gray-900">{jobData?.jobNumber || '—'}</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-500">วันที่เอกสาร</span><span className="font-medium text-gray-900">{quoteDate ? new Date(quoteDate).toLocaleDateString('th-TH') : '—'}</span></div>
              </div>
            </div>
            <div className="rounded-lg border border-indigo-100 bg-white/80 p-3 text-sm">
              <div className="text-xs text-indigo-600 font-semibold mb-2">ข้อมูลลูกค้า / รถ</div>
              <div className="space-y-1.5 text-gray-700">
                <div className="flex items-center justify-between gap-2"><span className="text-gray-500">ลูกค้า</span><span className="font-medium text-gray-900 text-right">{jobData?.customerName ?? '—'}</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-500">เบอร์โทร</span><span className="font-medium text-gray-900">{jobData?.customerPhone || '—'}</span></div>
                <div className="flex items-center justify-between gap-2"><span className="text-gray-500">รถ</span><span className="font-medium text-gray-900 text-right">{vehicle || '—'}</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-500">ทะเบียน</span><span className="font-medium text-gray-900">{plateNo}</span></div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-indigo-100 bg-white/90 overflow-hidden">
            <div className="px-3 py-2 bg-indigo-50/80 border-b border-indigo-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-700">รายการที่ใช้สร้างใบแจ้งหนี้</span>
              <span className="text-xs text-indigo-600">{quoteItems.length} รายการ</span>
            </div>
            <div>
              <table className="w-full text-xs">
                <thead className="bg-white sticky top-0 z-10">
                  <tr className="text-gray-500 border-b border-indigo-100">
                    <th className="px-3 py-2 text-left font-semibold">รายการ</th>
                    <th className="px-2 py-2 text-center font-semibold w-16">จำนวน</th>
                    <th className="px-2 py-2 text-right font-semibold w-24">ราคา/หน่วย</th>
                    <th className="px-2 py-2 text-right font-semibold w-24">มูลค่า</th>
                  </tr>
                </thead>
                <tbody>
                  {quoteItems.map((item) => (
                    <tr key={item.id} className="border-b border-indigo-50 last:border-b-0">
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-gray-800">{item.name}</div>
                        <div className="text-[11px] text-gray-500">{item.pricingType === 'labor' ? 'ค่าแรง' : 'อะไหล่/สินค้า'}</div>
                      </td>
                      <td className="px-2 py-2.5 text-center text-gray-700">{item.qty.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-right text-gray-700">฿{item.unitPrice.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-right font-semibold text-gray-900">฿{item.lineTotal.toLocaleString()}</td>
                    </tr>
                  ))}
                  {quoteItems.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-gray-500">ไม่พบรายการจากใบเสนอราคา</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ml-auto w-full max-w-sm rounded-lg border border-indigo-200 bg-white p-3 text-sm space-y-1.5">
            <div className="flex items-center justify-between text-gray-600"><span>ยอดรวมรายการ</span><span>฿{itemsSubtotal.toLocaleString()}</span></div>
            <div className="flex items-center justify-between text-gray-600"><span>ส่วนลดรวม</span><span>฿{itemsDiscount.toLocaleString()}</span></div>
            <div className="flex items-center justify-between text-gray-700"><span>ยอดก่อน VAT</span><span className="font-medium">฿{beforeVat.toLocaleString()}</span></div>
            <div className="flex items-center justify-between text-gray-700"><span>VAT {vatPercent}%</span><span className="font-medium">฿{vatAmount.toLocaleString()}</span></div>
            <div className="flex justify-between items-center border-t border-indigo-200 pt-2 mt-1 text-base font-bold"><span>ยอดใบแจ้งหนี้สุทธิ</span><span className="text-indigo-600 text-lg">฿{grandTotal.toLocaleString()}</span></div>
          </div>
        </div>
      </div>
      <ActionButton onClick={handleSubmit} loading={isSubmitting} variant="primary">
        <Receipt className="h-5 w-5" /> สร้างใบแจ้งหนี้ (INV)
      </ActionButton>
    </div>
  )
}

/* ─── Repair Work Step ─── */
export function RepairWorkForm({ onComplete, jobData }: FormProps) {
  const { employee } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([])
  const photoPreviewUrlsRef = useRef<string[]>([])
  const [existingPhotos, setExistingPhotos] = useState<ServiceOrderGpsPhoto[]>([])
  type RepairTask = { name: string; reason: string; done: boolean }
  type UsedPart = { name: string; symptom: string; qty: number }

  const REPAIR_DONE_STATUSES = ['completed', 'pending_payment', 'pending_pickup', 'closed']
  const isRepairDone = REPAIR_DONE_STATUSES.includes(jobData?.serviceOrder?.status ?? '')

  const buildRepairTasksFromAssessment = (allDone = false) => {
    const checklist = parseChecklistFromNote(jobData?.serviceOrder?.internal_note)
    const mapped = checklist.map((cl) => ({
      name: cl.name,
      reason: cl.reason.trim(),
      done: allDone,
    }))

    return mapped
  }

  const buildUsedPartsFromAssessment = () => {
    const sourceItems = (jobData?.serviceOrder?.items?.length
      ? jobData.serviceOrder.items
      : (jobData?.items ?? [])) as Array<any>

    return sourceItems
      .map((it) => {
        const name = (it.variant?.name ?? it.product?.name ?? it.name ?? it.custom_name ?? '').trim()
        const symptom = (it.issue ?? it.notes ?? '').trim()
        const qty = Number(it.quantity ?? it.qty ?? 1)
        if (!name) return null
        return {
          name,
          symptom,
          qty,
        }
      })
      .filter((it): it is UsedPart => Boolean(it))
  }

  const [tasks, setTasks] = useState<RepairTask[]>(() => buildRepairTasksFromAssessment(isRepairDone))
  const [usedParts, setUsedParts] = useState<UsedPart[]>(buildUsedPartsFromAssessment)

  useEffect(() => {
    setTasks(buildRepairTasksFromAssessment(isRepairDone))
    setUsedParts(buildUsedPartsFromAssessment())
  }, [JSON.stringify(jobData?.serviceOrder?.items ?? []), JSON.stringify(jobData?.items ?? []), jobData?.serviceOrder?.internal_note, isRepairDone])

  useEffect(() => {
    const soId = jobData?.serviceOrder?.id
    if (!soId) return
    serviceOrderService.getGpsPhotos(soId).then((res) => {
      const repairTypes = ['pre_repair', 'pre_delivery']
      const filtered = (res.data.data ?? []).filter((p: ServiceOrderGpsPhoto) => repairTypes.includes(p.type))
      setExistingPhotos(filtered)
    }).catch(() => {})
  }, [jobData?.serviceOrder?.id])

  const allDone = isRepairDone || tasks.every((t) => t.done)

  const handlePhotoChange = (files: File[]) => {
    photoPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    const nextUrls = files.map((file) => URL.createObjectURL(file))
    photoPreviewUrlsRef.current = nextUrls
    setPhotoPreviewUrls(nextUrls)
    setPhotos(files)
  }

  const removeSelectedPhoto = (idx: number) => {
    const nextPhotos = photos.filter((_, photoIdx) => photoIdx !== idx)
    handlePhotoChange(nextPhotos)
  }

  useEffect(() => () => {
    photoPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const handleSubmit = async () => {
    if (isSubmitting) return
    const soId = jobData?.serviceOrder?.id
    if (!soId) { toast.error('ไม่พบข้อมูลใบสั่งซ่อม'); return }
    setIsSubmitting(true)
    try {
      const soDetail = await serviceOrderService.getServiceOrder(soId)
      let currentStatus = soDetail.data.data.status
      let technicianId = soDetail.data.data.technician_id

      if (currentStatus === 'pending_quote') {
        if (jobData?.quotation?.status !== 'approved') {
          toast.error('ใบเสนอราคายังไม่อนุมัติ ไม่สามารถเริ่มงานซ่อมได้')
          return
        }
        await serviceOrderService.transition(soId, { status: 'approved' })
        const afterApprove = await serviceOrderService.getServiceOrder(soId)
        currentStatus = afterApprove.data.data.status
        technicianId = afterApprove.data.data.technician_id
      }

      if (currentStatus === 'approved') {
        if (!technicianId) {
          if (!employee?.id) {
            toast.error('ไม่พบข้อมูลช่างผู้รับผิดชอบ กรุณาเข้าสู่ระบบใหม่')
            return
          }
          await serviceOrderService.assign(soId, { technician_id: employee.id })
          technicianId = employee.id
        }
        await serviceOrderService.transition(soId, { status: 'in_progress' })
        currentStatus = 'in_progress'
      }

      if (currentStatus !== 'in_progress' && currentStatus !== 'completed') {
        toast.error('สถานะใบงานยังไม่พร้อมสำหรับการปิดงานซ่อม')
        return
      }
      
      // Upload repair photos
      if (photos.length > 0) {
        const gpsPhotoTypeByStatus: Record<string, string> = {
          in_progress: 'pre_repair',
          completed: 'pre_delivery',
          pending_pickup: 'delivery',
        }
        const gpsPhotoType = gpsPhotoTypeByStatus[currentStatus ?? ''] ?? 'pre_repair'

        let lat: number
        let lng: number
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          })
          lat = pos.coords.latitude
          lng = pos.coords.longitude
        } catch (e) {
          toast.error('ไม่สามารถระบุตำแหน่ง GPS ได้ กรุณาอนุญาตตำแหน่งแล้วลองใหม่อีกครั้ง')
          return
        }

        const formatICT = () => {
          const d = new Date()
          return new Date(d.getTime() + (7 * 60 * 60 * 1000)).toISOString().slice(0, 19)
        }

        for (const file of photos) {
          const formData = new FormData()
          formData.append('photo', file)
          formData.append('type', gpsPhotoType)
          formData.append('latitude', lat.toString())
          formData.append('longitude', lng.toString())
          formData.append('taken_at', formatICT())
          
          await serviceOrderService.uploadGpsPhoto(soId, formData)
        }
      }

      if (currentStatus === 'in_progress') {
        await serviceOrderService.transition(soId, { status: 'completed' })
        currentStatus = 'completed'
      }

      if (currentStatus === 'completed') {
        await serviceOrderService.transition(soId, { status: 'pending_payment' })
      }
      toast.success('ซ่อมเสร็จเรียบร้อย')
      onComplete()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'เกิดข้อผิดพลาดในการอัปโหลดรูป/สถานะ')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
        <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-200 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Wrench className="h-4 w-4 text-gray-500" /> รายการซ่อม
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50/70 text-gray-600">
              <tr>
                <th className="w-12 px-4 py-2.5 text-left">✓</th>
                <th className="px-4 py-2.5 text-left">รายการซ่อม</th>
                <th className="px-4 py-2.5 text-left">สาเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/60">
                  <td className="px-4 py-3 align-middle">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={(e) => {
                        const n = [...tasks]
                        n[i].done = e.target.checked
                        setTasks(n)
                      }}
                      className="h-5 w-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className={cn('px-4 py-3 font-medium', t.done ? 'line-through text-gray-400' : 'text-gray-800')}>{t.name}</td>
                  <td className={cn('px-4 py-3', t.done ? 'text-gray-400' : 'text-gray-700')}>{t.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
        <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-200 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Wrench className="h-4 w-4 text-gray-500" /> ของที่ใช้ซ่อม
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50/70 text-gray-600">
              <tr>
                <th className="px-4 py-2.5 text-left">รายการ</th>
                <th className="px-4 py-2.5 text-left">อาการ</th>
                <th className="w-24 px-4 py-2.5 text-right">จำนวน</th>
              </tr>
            </thead>
            <tbody>
              {usedParts.map((item, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/60">
                  <td className="px-4 py-3 text-gray-800">{item.name}</td>
                  <td className="px-4 py-3 text-gray-700">{item.symptom}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">{item.qty}</td>
                </tr>
              ))}
              {usedParts.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">ยังไม่มีรายการของที่ใช้ซ่อม</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {existingPhotos.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-200 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Camera className="h-4 w-4 text-gray-500" /> รูปที่อัปโหลดแล้ว ({existingPhotos.length})
          </div>
          <div className="p-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {existingPhotos.map((photo) => (
              <div key={photo.id} className="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-1">
                <img src={photo.photo_url} alt={`repair-${photo.type}-${photo.id}`} className="h-20 w-full rounded object-contain bg-gray-50" />
              </div>
            ))}
          </div>
        </div>
      )}

      <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 py-6 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:border-gray-400 hover:text-gray-700 transition-all cursor-pointer w-full group">
        <div className={cn("p-3 rounded-full shadow-sm transition-all", photos.length > 0 ? "bg-amber-100 text-amber-600 group-hover:bg-amber-200" : "bg-white text-gray-400 group-hover:scale-110 group-hover:text-gray-600")}>
          <Camera className="h-6 w-6" />
        </div>
        <span>
          ถ่ายรูปงานซ่อม / อัปเดตสถานะ
          {photos.length > 0 && <span className="text-amber-600 font-bold ml-1">({photos.length} รูป)</span>}
        </span>
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          onChange={(e) => handlePhotoChange(Array.from(e.target.files ?? []))}
        />
      </label>

      {photoPreviewUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photoPreviewUrls.map((url, idx) => (
            <div key={`${url}-${idx}`} className="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-1">
              <button
                type="button"
                onClick={() => removeSelectedPhoto(idx)}
                className="absolute right-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <img src={url} alt={`repair-preview-${idx + 1}`} className="h-20 w-full rounded object-contain bg-gray-50" />
            </div>
          ))}
        </div>
      )}
      
      <div className="pt-2">
        <ActionButton onClick={handleSubmit} loading={isSubmitting} disabled={!allDone}>
          <CheckCircle2 className="h-5 w-5" /> ซ่อมเสร็จเรียบร้อย <ArrowRight className="h-4 w-4 ml-1 opacity-70" /> รอจ่ายเงิน
        </ActionButton>
      </div>
    </div>
  )
}

/* ─── Payment Step ─── */
export function PaymentStepForm({ onComplete, jobData, onViewInvoice, onPrintInvoiceDocument }: FormProps) {
  const isSale = jobData?.sourceType === 'sale'
  const quotationId = jobData?.quotation?.id ?? null
  const quotationStatus = jobData?.quotation?.status
  const qtTotal = roundMoney(Number(jobData?.grand_total ?? jobData?.quotation?.grand_total ?? 0))

  // ── Multi-invoice state (sale flow) ──────────────────────────────────────
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createMode, setCreateMode] = useState<'amount' | 'percent'>('amount')
  const [partialAmount, setPartialAmount] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  // ── Single-invoice state (repair flow + payment form) ────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false)
  const invoiceId = isSale ? selectedInvoice?.id ?? null : (jobData?.invoice?.id ?? null)
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount')
  const [discountInput, setDiscountInput] = useState('')
  const [received, setReceived] = useState('')
  const [reference, setReference] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const activeInvoice = isSale ? selectedInvoice : jobData?.invoice ?? null
  const total = roundMoney(
    activeInvoice
      ? getInvoiceOutstandingAmount(activeInvoice)
      : Number(jobData?.grand_total ?? 0),
  )
  const discountRaw = Number(discountInput || 0)
  const discountAmount = roundMoney(discountType === 'percent'
    ? Math.min(total, Math.max(0, (total * discountRaw) / 100))
    : Math.min(total, Math.max(0, discountRaw)))
  const netTotal = roundMoney(Math.max(0, total - discountAmount))
  const receivedAmount = roundMoney(Number(received || 0))
  const change = roundMoney(method === 'cash' && received ? receivedAmount - netTotal : 0)

  // ── Load invoices for sale QT ─────────────────────────────────────────────
  const loadInvoices = useCallback(async () => {
    if (!quotationId) return
    setLoadingInvoices(true)
    try {
      const res = await invoiceService.getInvoices({ quotation_id: quotationId, limit: 50 })
      // Filter locally to ensure only this QT's invoices are shown (double-safety)
      const all = res.data.data ?? []
      setInvoices(all.filter((i) => i.quotation_id === quotationId))
    } catch {
      // silent
    } finally {
      setLoadingInvoices(false)
    }
  }, [quotationId])

  useEffect(() => {
    if (isSale && quotationId) {
      loadInvoices()
    }
  }, [isSale, quotationId, loadInvoices])

  // ── Auto-send & approve QT before creating invoice ────────────────────────
  const ensureQtApproved = async () => {
    if (!quotationId) throw new Error('ไม่พบใบเสนอราคา')

    let currentStatus = quotationStatus

    if (currentStatus === 'draft') {
      try {
        await quotationService.send(quotationId)
        currentStatus = 'sent'
      } catch {
        // Continue to re-check latest status from server
      }
    }

    if (currentStatus !== 'approved') {
      try {
        await quotationService.approve(quotationId)
      } catch (err) {
        const { data } = await quotationService.getQuotation(quotationId)
        if (data?.data?.status !== 'approved') {
          throw err
        }
      }
    }
  }

  // ── Create partial invoice ────────────────────────────────────────────────
  const handleCreateInvoice = async () => {
    if (isCreating) return
    const amount = createAmount
    if (createMode === 'percent') {
      if (!partialAmount || createPercent <= 0 || createPercent > 100) {
        toast.error('กรุณาระบุเปอร์เซ็นต์ระหว่าง 0.01 - 100')
        return
      }
    } else if (!amount || amount <= 0) {
      toast.error('กรุณาระบุจำนวนเงิน')
      return
    }
    const totalInvoiced = roundMoney(invoices.filter(i => i.status !== 'cancelled').reduce((s, i) => s + getInvoiceBillingAmount(i), 0))
    const remaining = roundMoney(qtTotal - totalInvoiced)
    if (amount > remaining + 0.01) { toast.error(`ยอดเกินคงเหลือ ฿${formatMoney(remaining)}`); return }
    setIsCreating(true)
    try {
      if (invoices.length === 0) {
        await ensureQtApproved()
      }
      const { data: invRes } = await invoiceService.createFromQuotation({
        quotation_id: quotationId!,
        override_amount: amount,
      })
      await invoiceService.issue(invRes.data.id)
      toast.success('สร้างใบแจ้งหนี้เรียบร้อย')
      setShowCreateForm(false)
      setCreateMode('amount')
      setPartialAmount('')
      await loadInvoices()
      // Auto-select the new invoice for payment
      setSelectedInvoice({ ...invRes.data, balance_due: amount, grand_total: amount } as Invoice)
      setMethod('cash')
      setDiscountInput('')
      setReceived('')
      setReference('')
      setConfirmed(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'สร้างใบแจ้งหนี้ไม่สำเร็จ')
    } finally {
      setIsCreating(false)
    }
  }

  // ── Pay selected invoice ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (isSubmitting) return
    const payInvoiceId = isSale ? selectedInvoice?.id : invoiceId
    if (!payInvoiceId) { toast.error('ไม่พบใบแจ้งหนี้'); return }
    if (method === 'cash' && received && receivedAmount < netTotal) { toast.error('จำนวนเงินรับไม่พอ'); return }
    if (!confirmed) { toast.error('กรุณาตรวจสอบข้อมูลก่อนออกใบเสร็จ'); return }
    setIsSubmitting(true)
    try {
      const refParts = [reference.trim()]
      if (discountAmount > 0) refParts.push(`discount:${discountAmount.toFixed(2)}`)
      await invoiceService.addPayment(payInvoiceId, {
        amount: netTotal,
        method,
        paid_at: new Date().toISOString(),
        reference: refParts.filter(Boolean).join(' | ') || undefined,
      })
      await invoiceService.issueReceipt(payInvoiceId)
      if (!isSale) {
        const soId = jobData?.serviceOrder?.id
        if (soId) await serviceOrderService.transition(soId, { status: 'pending_pickup' })
      }
      toast.success('ชำระเงินและออกใบเสร็จเรียบร้อย')
      if (isSale) {
        setSelectedInvoice(null)
        await loadInvoices()
      } else {
        onComplete()
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── REPAIR FLOW: single invoice path ──────────────────────────────────────
  if (!isSale) {
    if (!invoiceId) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center space-y-3">
          <p className="text-amber-800 font-medium">⚠️ ยังไม่มีใบแจ้งหนี้</p>
          <p className="text-sm text-amber-600">กรุณาออกใบแจ้งหนี้จากหน้าใบเสนอราคา</p>
        </div>
      )
    }
    const invoiceStatus = jobData?.invoice?.status
    if (invoiceStatus === 'paid') {
      const payment = (jobData as any)?.payment
      const methodLabels: Record<string, string> = { cash: 'เงินสด', transfer: 'โอนเงิน', credit_card: 'บัตรเครดิต', cheque: 'เช็ค' }
      return (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
            <p className="text-emerald-800 font-semibold text-lg">✅ ชำระเงินเรียบร้อยแล้ว</p>
            <p className="text-sm text-emerald-600 mt-1">ออกใบเสร็จรับเงินสำเร็จ</p>
          </div>
          {payment && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">วิธีชำระเงิน</span><span className="font-medium">{methodLabels[payment.method] ?? payment.method}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">จำนวนชำระ</span><span className="font-semibold text-emerald-700">฿{Number(payment.amount).toLocaleString()}</span></div>
              {payment.reference && (
                <div className="flex justify-between"><span className="text-gray-500">เลขอ้างอิง</span><span>{payment.reference.replace(/\s*\|\s*discount:[0-9.]+/g, '').trim() || '-'}</span></div>
              )}
            </div>
          )}
        </div>
      )
    }
    if (invoiceStatus && invoiceStatus !== 'issued') {
      const statusLabel: Record<string, string> = { draft: 'ร่าง (ยังไม่ออกบิล)', paid: 'ชำระแล้ว', overdue: 'เกินกำหนด', cancelled: 'ยกเลิก' }
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-amber-800 font-medium">⚠️ ใบแจ้งหนี้ยังไม่พร้อมชำระ</p>
          <p className="text-sm text-amber-600 mt-1">สถานะปัจจุบัน: {statusLabel[invoiceStatus] ?? invoiceStatus}</p>
        </div>
      )
    }
    // Repair payment form (single invoice)
    return <SingleInvoicePaymentUI total={total} netTotal={netTotal} discountAmount={discountAmount} change={change} method={method} setMethod={setMethod} discountType={discountType} setDiscountType={setDiscountType} discountInput={discountInput} setDiscountInput={setDiscountInput} received={received} setReceived={setReceived} reference={reference} setReference={setReference} confirmed={confirmed} setConfirmed={setConfirmed} handleSubmit={handleSubmit} isSubmitting={isSubmitting} receivedAmount={receivedAmount} />
  }

  // ── SALE FLOW: multi-invoice path ─────────────────────────────────────────
  const activeInvoices = invoices.filter(i => i.status !== 'cancelled')
  const totalInvoiced = roundMoney(activeInvoices.reduce((s, i) => s + getInvoiceBillingAmount(i), 0))
  const totalPaid = roundMoney(activeInvoices.reduce((s, i) => s + Number(i.paid_amount ?? 0), 0))
  const remaining = roundMoney(Math.max(0, qtTotal - totalInvoiced))
  const allPaid = qtTotal > 0 && totalPaid >= qtTotal - 0.01
  const createInputValue = Number(partialAmount || 0)
  const createPercent = createMode === 'percent'
    ? roundMoney(Math.min(100, Math.max(0, createInputValue)))
    : roundMoney(remaining > 0 ? (Math.max(0, createInputValue) / remaining) * 100 : 0)
  const createAmount = createMode === 'percent'
    ? roundMoney(remaining * (createPercent / 100))
    : roundMoney(Math.max(0, createInputValue))
  const remainingAfterCreate = roundMoney(Math.max(0, remaining - createAmount))

  const switchCreateMode = (mode: 'amount' | 'percent') => {
    if (mode === createMode) return

    const nextValue = mode === 'percent'
      ? (createAmount > 0 && remaining > 0 ? String(roundMoney((createAmount / remaining) * 100)) : '100')
      : (createAmount > 0 ? String(createAmount) : String(remaining))

    setCreateMode(mode)
    setPartialAmount(nextValue)
  }

  // Payment form for selected invoice
  if (selectedInvoice) {
    const selInv = invoices.find(i => i.id === selectedInvoice.id) ?? selectedInvoice
    if (selInv.status === 'paid') {
      return (
        <div className="space-y-4">
          <button type="button" onClick={() => setSelectedInvoice(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            ← กลับรายการใบแจ้งหนี้
          </button>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
            <p className="text-emerald-800 font-semibold text-lg">✅ ชำระเงินเรียบร้อยแล้ว</p>
            <p className="text-sm text-emerald-600 mt-1">{selInv.invoice_no} — ออกใบเสร็จสำเร็จ</p>
          </div>
          <ActionButton onClick={() => setSelectedInvoice(null)} variant="secondary">
            กลับรายการใบแจ้งหนี้
          </ActionButton>
        </div>
      )
    }
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setSelectedInvoice(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          ← กลับรายการใบแจ้งหนี้
        </button>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
          <span className="font-semibold text-gray-700">{selInv.invoice_no}</span>
          <span className="ml-2 text-gray-500">ยอดค้าง ฿{formatMoney(getInvoiceOutstandingAmount(selInv))}</span>
        </div>
        <SingleInvoicePaymentUI total={total} netTotal={netTotal} discountAmount={discountAmount} change={change} method={method} setMethod={setMethod} discountType={discountType} setDiscountType={setDiscountType} discountInput={discountInput} setDiscountInput={setDiscountInput} received={received} setReceived={setReceived} reference={reference} setReference={setReference} confirmed={confirmed} setConfirmed={setConfirmed} handleSubmit={handleSubmit} isSubmitting={isSubmitting} receivedAmount={receivedAmount} />
      </div>
    )
  }

  // Invoice list view
  const statusLabel: Record<string, string> = { draft: 'ร่าง', issued: 'รอชำระ', paid: 'ชำระแล้ว', overdue: 'เกินกำหนด', cancelled: 'ยกเลิก' }
  const statusColor: Record<string, string> = { draft: 'text-gray-500 bg-gray-100', issued: 'text-blue-700 bg-blue-50', paid: 'text-emerald-700 bg-emerald-50', overdue: 'text-red-700 bg-red-50', cancelled: 'text-gray-400 bg-gray-50' }

  return (
    <div className="space-y-5">
      {/* QT summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-700">ยอดใบเสนอราคารวม</span>
          <span className="font-bold text-gray-900">฿{formatMoney(qtTotal)}</span>
        </div>
        <div className="flex items-center justify-between text-gray-500">
          <span>ออกใบแจ้งหนี้แล้ว</span>
          <span>฿{formatMoney(totalInvoiced)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 pt-2">
          <span className="font-semibold text-gray-700">คงเหลือ</span>
          <span className={cn('font-bold', remaining > 0 ? 'text-amber-600' : 'text-emerald-600')}>
            ฿{formatMoney(remaining)}
          </span>
        </div>
      </div>

      {/* Invoice list */}
      {loadingInvoices ? (
        <div className="py-6 text-center text-sm text-gray-400">กำลังโหลด...</div>
      ) : invoices.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-700">
          ยังไม่มีใบแจ้งหนี้ — กรุณาสร้างใบแจ้งหนี้เพื่อรับชำระเงิน
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-600">รายการใบแจ้งหนี้</p>
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-gray-800">{inv.invoice_no}</p>
                <p className="text-xs text-gray-500">฿{formatMoney(getInvoiceBillingAmount(inv))}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onViewInvoice?.(inv.id)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                >
                  ดูบิล
                </button>
                <button
                  type="button"
                  onClick={() => onPrintInvoiceDocument?.(inv.id, inv.status === 'paid' ? 'receipt' : 'invoice')}
                  className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                >
                  {inv.status === 'paid' ? 'พิมพ์ใบเสร็จ' : 'พิมพ์บิล'}
                </button>
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', statusColor[inv.status] ?? 'text-gray-500 bg-gray-100')}>
                  {statusLabel[inv.status] ?? inv.status}
                </span>
                {inv.status === 'issued' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInvoice(inv)
                      setMethod('cash')
                      setDiscountInput('')
                      setReceived('')
                      setReference('')
                      setConfirmed(false)
                    }}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    ชำระเงิน
                  </button>
                )}
                {inv.status === 'paid' && (
                  <span className="text-xs text-emerald-600 font-medium">✅ มีใบเสร็จ</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create invoice form */}
      {showCreateForm ? (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 border-b border-blue-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-900">สร้างใบแจ้งหนี้บางส่วน</p>
              <p className="mt-1 text-xs text-blue-700">เลือกระบุเป็นจำนวนเงินหรือเปอร์เซ็นต์ของยอดคงเหลือได้ทันที</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-white/90 px-3 py-2 text-right shadow-sm">
              <div className="text-[11px] font-medium uppercase tracking-wide text-blue-500">ยอดคงเหลือที่ออกบิลได้</div>
              <div className="text-lg font-bold text-blue-900">฿{formatMoney(remaining)}</div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.95fr)]">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">รูปแบบการสร้างใบแจ้งหนี้</label>
                <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-blue-100 bg-white p-1.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => switchCreateMode('amount')}
                    className={cn(
                      'rounded-xl px-4 py-3 text-sm font-semibold transition-all',
                      createMode === 'amount'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-blue-700 hover:bg-blue-50'
                    )}
                  >
                    ระบุเป็นเงินบาท
                  </button>
                  <button
                    type="button"
                    onClick={() => switchCreateMode('percent')}
                    className={cn(
                      'rounded-xl px-4 py-3 text-sm font-semibold transition-all',
                      createMode === 'percent'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-blue-700 hover:bg-blue-50'
                    )}
                  >
                    ระบุเป็นเปอร์เซ็นต์
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  {createMode === 'amount' ? 'จำนวนเงินที่ต้องการสร้าง' : 'เปอร์เซ็นต์ของยอดคงเหลือ'}
                </label>
                <div className="mt-2 relative">
                  <span className="absolute left-4 top-3 text-sm font-semibold text-gray-400">{createMode === 'amount' ? '฿' : '%'}</span>
                  <input
                    type="number"
                    min={0}
                    max={createMode === 'amount' ? remaining : 100}
                    step="0.01"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder={createMode === 'amount' ? `สูงสุด ฿${formatMoney(remaining)}` : 'เช่น 25, 50, 75'}
                    className="w-full rounded-2xl border border-blue-100 bg-white px-11 py-3 text-base font-semibold text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {createMode === 'amount'
                    ? 'ระบบจะสร้าง INV ตามจำนวนเงินบาทที่ระบุ'
                    : 'ระบบจะคำนวณเป็นเงินบาทจากเปอร์เซ็นต์ของยอดคงเหลือ'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[100, 70, 50, 30].map((pct) => {
                  const shortcutAmount = roundMoney(remaining * pct / 100)
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setPartialAmount(createMode === 'amount' ? String(shortcutAmount) : String(pct))}
                      className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
                    >
                      {createMode === 'amount' ? `฿${formatMoney(shortcutAmount)}` : `${pct}%`}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => setPartialAmount(createMode === 'amount' ? String(remaining) : '100')}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100"
                >
                  ทั้งหมด {createMode === 'amount' ? `฿${formatMoney(remaining)}` : '100%'}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
              <div className="text-sm font-semibold text-gray-800">สรุปก่อนสร้างใบแจ้งหนี้</div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between text-gray-600">
                  <span>ยอดคงเหลือก่อนสร้าง</span>
                  <span className="font-semibold text-gray-900">฿{formatMoney(remaining)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span>รูปแบบที่เลือก</span>
                  <span className="font-semibold text-gray-900">{createMode === 'amount' ? 'จำนวนเงิน' : 'เปอร์เซ็นต์'}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span>ค่าที่ระบุ</span>
                  <span className="font-semibold text-gray-900">{createMode === 'amount' ? `฿${formatMoney(createInputValue)}` : `${formatMoney(createPercent)}%`}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 text-blue-900">
                  <span className="font-medium">ยอดที่จะสร้าง INV</span>
                  <span className="text-lg font-bold">฿{formatMoney(createAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span>คงเหลือหลังสร้าง</span>
                  <span className="font-semibold text-gray-900">฿{formatMoney(remainingAfterCreate)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <ActionButton onClick={handleCreateInvoice} loading={isCreating} variant="primary" className="flex-1">
              <CheckCircle2 className="h-4 w-4" /> ยืนยันสร้างใบแจ้งหนี้
            </ActionButton>
            <button type="button" onClick={() => { setShowCreateForm(false); setCreateMode('amount'); setPartialAmount('') }}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              ยกเลิก
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {remaining > 0.01 && (
            <ActionButton onClick={() => { setShowCreateForm(true); setCreateMode('amount'); setPartialAmount(String(remaining)) }} variant="secondary">
              + สร้างใบแจ้งหนี้ (คงเหลือ ฿{formatMoney(remaining)})
            </ActionButton>
          )}
          {allPaid && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center space-y-3">
              <p className="text-emerald-800 font-semibold">✅ ชำระครบทุกใบแจ้งหนี้เรียบร้อย</p>
              <ActionButton onClick={() => onComplete()} variant="primary" className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                <CheckCircle2 className="h-4 w-4" /> ไปขั้นตอนถัดไป
              </ActionButton>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Shared: Single Invoice Payment UI ─── */
function SingleInvoicePaymentUI({
  total, netTotal, discountAmount, change, method, setMethod, discountType, setDiscountType,
  discountInput, setDiscountInput, received, setReceived, reference, setReference,
  confirmed, setConfirmed, handleSubmit, isSubmitting, receivedAmount,
}: {
  total: number; netTotal: number; discountAmount: number; change: number
  method: PaymentMethod; setMethod: (m: PaymentMethod) => void
  discountType: 'amount' | 'percent'; setDiscountType: (t: 'amount' | 'percent') => void
  discountInput: string; setDiscountInput: (v: string) => void
  received: string; setReceived: (v: string) => void
  reference: string; setReference: (v: string) => void
  confirmed: boolean; setConfirmed: (v: boolean) => void
  handleSubmit: () => void; isSubmitting: boolean; receivedAmount: number
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-6 text-center shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Banknote className="h-24 w-24" />
        </div>
        <p className="text-sm font-semibold text-emerald-800 mb-1 relative z-10 flex items-center justify-center gap-2">
          <Banknote className="h-4 w-4" /> ยอดที่ต้องชำระ
        </p>
        <span className="text-4xl font-black text-emerald-600 tracking-tight relative z-10 drop-shadow-sm">฿{formatMoney(netTotal)}</span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:w-40">
            <label className="text-sm font-semibold text-gray-700">ประเภทส่วนลด</label>
            <select value={discountType} onChange={(e) => setDiscountType(e.target.value as 'amount' | 'percent')}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
              <option value="amount">บาท</option>
              <option value="percent">เปอร์เซ็นต์</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-semibold text-gray-700">ส่วนลด</label>
            <div className="mt-1 relative">
              <span className="absolute left-3 top-2.5 text-gray-400 text-sm">{discountType === 'amount' ? '฿' : '%'}</span>
              <input type="number" min={0} value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} placeholder="0"
                className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
          </div>
        </div>
        <div className="grid gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
          <div className="flex items-center justify-between text-gray-600"><span>ยอดใบแจ้งหนี้</span><span>฿{formatMoney(total)}</span></div>
          <div className="flex items-center justify-between text-gray-600"><span>ส่วนลด</span><span>-฿{formatMoney(discountAmount)}</span></div>
          <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-800"><span>ยอดสุทธิที่รับชำระ</span><span>฿{formatMoney(netTotal)}</span></div>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <CreditCard className="h-4 w-4" /> เลือกช่องทางชำระเงิน
        </label>
        <div className="grid grid-cols-3 gap-3">
          {([['cash', '💵', 'เงินสด'], ['transfer', '🏦', 'โอนเงิน'], ['credit_card', '💳', 'บัตรเครดิต']] as const).map(([v, ico, lbl]) => (
            <button key={v} onClick={() => setMethod(v)}
              className={cn('flex flex-col items-center justify-center gap-2 rounded-xl border-2 py-4 text-sm font-bold transition-all',
                method === v ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm scale-[1.02]' : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-200')}>
              <span className="text-2xl mb-1">{ico}</span>{lbl}
            </button>
          ))}
        </div>
      </div>

      {method === 'cash' && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <label className="text-sm font-semibold text-gray-700">รับเงินมา (บาท)</label>
          <div className="relative">
            <span className="absolute left-4 top-3 text-gray-400 font-bold">฿</span>
            <input type="number" value={received} onChange={(e) => setReceived(e.target.value)} placeholder={String(netTotal)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 py-3 text-right text-xl font-bold focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" />
          </div>
          {receivedAmount >= netTotal && (
            <div className="flex justify-between items-center rounded-lg bg-green-50 p-3 border border-green-100">
              <span className="text-sm font-medium text-green-800">เงินทอน</span>
              <span className="text-lg font-bold text-green-600">฿{formatMoney(change)}</span>
            </div>
          )}
        </div>
      )}

      {(method === 'transfer' || method === 'credit_card' || method === 'cheque') && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-2">
          <label className="text-sm font-semibold text-gray-700">เลขอ้างอิงการชำระ (ถ้ามี)</label>
          <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="เช่น TRX123456"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
        </div>
      )}

      <label className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
        <span className="text-sm text-blue-800">ตรวจสอบข้อมูลครบแล้ว: วิธีชำระเงิน, ส่วนลด, ยอดสุทธิ ก่อนออกใบเสร็จ</span>
      </label>

      <div className="pt-2">
        <ActionButton onClick={handleSubmit} loading={isSubmitting} disabled={!confirmed} variant="primary" className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/25">
          <CheckCircle2 className="h-5 w-5" /> ยืนยันชำระเงิน & ออกใบเสร็จ
        </ActionButton>
      </div>
    </div>
  )
}

/* ─── Deliver / Close Step ─── */
export function DeliverForm({ onComplete, jobData, type = 'repair', onPrintDN, onPrintWR, onWarrantyMonthsChange }: FormProps & { type?: string; onPrintDN?: () => void; onPrintWR?: () => void; onWarrantyMonthsChange?: (months: number) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dnSigned, setDnSigned] = useState(false)
  const [wrCreated, setWrCreated] = useState(false)
  const [warrantyMonths, setWarrantyMonths] = useState(3)
  const [deliveryPhotos, setDeliveryPhotos] = useState<File[]>([])
  const [existingDeliveryPhotos, setExistingDeliveryPhotos] = useState<ServiceOrderGpsPhoto[]>([])
  const [existingDnId, setExistingDnId] = useState<number | null>(null)
  const [jobCompleted, setJobCompleted] = useState(false)
  const deliveryPhotoServiceOrderId = jobData?.serviceOrder?.id ?? jobData?.quotation?.service_order_id ?? jobData?.quotation?.service_order?.id

  const loadDeliveryPhotos = useCallback(async (serviceOrderId?: number, deliveryNoteId?: number) => {
    if (serviceOrderId) {
      try {
        const res = await serviceOrderService.getGpsPhotos(serviceOrderId)
        const filtered = (res.data.data ?? [])
          .map((p: any) => ({
            ...p,
            type: p.type ?? p.photo_type,
            photo_url: p.photo_url ?? p.file_url,
          }))
          .filter((p: any) => p.type === 'delivery' && p.photo_url)
        setExistingDeliveryPhotos(filtered)
      } catch {
        setExistingDeliveryPhotos([])
      }
    } else if (deliveryNoteId) {
      try {
        const res = await deliveryNoteService.getGpsPhotos(deliveryNoteId)
        const filtered = (res.data.data ?? [])
          .map((p: any) => ({
            ...p,
            type: p.type ?? p.photo_type,
            photo_url: p.photo_url ?? p.file_url,
          }))
          .filter((p: any) => p.photo_url)
        setExistingDeliveryPhotos(filtered)
      } catch {
        setExistingDeliveryPhotos([])
      }
    } else {
      setExistingDeliveryPhotos([])
    }
  }, [])

  useEffect(() => {
    void loadDeliveryPhotos(deliveryPhotoServiceOrderId, existingDnId ?? undefined)
  }, [deliveryPhotoServiceOrderId, existingDnId, loadDeliveryPhotos])

  useEffect(() => {
    const soStatus = jobData?.serviceOrder?.status
    const isRepair = type === 'repair'
    const ownerType = isRepair ? 'service_order' : 'quotation'
    const ownerId = isRepair ? jobData?.serviceOrder?.id : jobData?.quotation?.id

    if (soStatus === 'closed') {
      setDnSigned(true)
    }

    if (!ownerId) {
      return
    }

    const loadData = async () => {
      try {
        // Check for existing DN
        const dnRes = await deliveryNoteService.getDeliveryNotes({ owner_type: ownerType, owner_id: ownerId, limit: 10 })
        const dns = (dnRes.data as any)?.data ?? []
        if (dns.length > 0) {
          const latestDn = [...dns].sort((a: any, b: any) => (b.id ?? 0) - (a.id ?? 0))[0]
          setExistingDnId(latestDn.id)
          if (latestDn.signed_at) {
            setDnSigned(true)
            if (!isRepair) {
              setJobCompleted(true)
            }
          }
        }
      } catch {
        // ignore
      }

      try {
        const { data } = await warrantyService.getWarranties({ owner_type: ownerType, owner_id: ownerId, page: 1, limit: 10 })
        const rows = data.data ?? []
        if (rows.length === 0) {
          return
        }
        const latest = [...rows].sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0]
        setWrCreated(true)
        const months = Math.max(1, Number(latest.warranty_months ?? 3))
        setWarrantyMonths(months)
        onWarrantyMonthsChange?.(months)
      } catch {
        // ignore and keep current form defaults
      }
    }

    void loadData()
  }, [jobData?.quotation?.id, jobData?.serviceOrder?.id, jobData?.serviceOrder?.status, onWarrantyMonthsChange, type])

  const handleSubmit = async () => {
    if (isSubmitting) return
    const soId = deliveryPhotoServiceOrderId
    const qtId = jobData?.quotation?.id
    const isRepair = type === 'repair'

    if (isRepair && !soId) { toast.error('ไม่พบข้อมูลใบสั่งซ่อม'); return }
    if (!isRepair && !qtId) { toast.error('ไม่พบใบเสนอราคา'); return }

    if (deliveryPhotos.length === 0 && existingDeliveryPhotos.length === 0) {
      toast.error('กรุณาถ่ายรูปส่งมอบก่อนปิดงาน')
      return
    }

    const ownerType = isRepair ? 'service_order' : 'quotation'
    const ownerId = isRepair ? soId! : qtId!
    const customerId = isRepair
      ? jobData?.serviceOrder?.customer_id
      : jobData?.quotation?.customer_id

    if (!customerId || customerId <= 0) {
      toast.error('ไม่พบข้อมูลลูกค้า ไม่สามารถสร้างใบส่งมอบได้')
      return
    }

    setIsSubmitting(true)
    try {
      if (isRepair && soId) {
        const soDetail = await serviceOrderService.getServiceOrder(soId)
        const currentStatus = soDetail.data.data.status
        if (currentStatus === 'pending_payment') {
          await serviceOrderService.transition(soId, { status: 'pending_pickup' })
        }
      }

      if (soId && deliveryPhotos.length > 0) {
        let lat: number
        let lng: number
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          })
          lat = pos.coords.latitude
          lng = pos.coords.longitude
        } catch (e) {
          toast.error('ไม่สามารถระบุตำแหน่ง GPS ได้ กรุณาอนุญาตตำแหน่งแล้วลองใหม่อีกครั้ง')
          return
        }

        const formatICT = () => {
          const d = new Date()
          return new Date(d.getTime() + (7 * 60 * 60 * 1000)).toISOString().slice(0, 19)
        }

        for (const file of deliveryPhotos) {
          const formData = new FormData()
          formData.append('photo', file)
          formData.append('type', 'delivery')
          formData.append('latitude', lat.toString())
          formData.append('longitude', lng.toString())
          formData.append('taken_at', formatICT())
          
          await serviceOrderService.uploadGpsPhoto(soId, formData)
        }
        await loadDeliveryPhotos(soId, undefined)
      }

      const dnId = existingDnId ?? (await deliveryNoteService.create({ owner_type: ownerType, owner_id: ownerId, customer_id: customerId })).data.data.id

      if (deliveryPhotos.length > 0 && !soId) {
        let lat: number
        let lng: number
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          })
          lat = pos.coords.latitude
          lng = pos.coords.longitude
        } catch (e) {
          toast.error('ไม่สามารถระบุตำแหน่ง GPS ได้ กรุณาอนุญาตตำแหน่งแล้วลองใหม่อีกครั้ง')
          return
        }

        const formatICT = () => {
          const d = new Date()
          return new Date(d.getTime() + (7 * 60 * 60 * 1000)).toISOString().slice(0, 19)
        }

        for (const file of deliveryPhotos) {
          const formData = new FormData()
          formData.append('photo', file)
          formData.append('latitude', lat.toString())
          formData.append('longitude', lng.toString())
          formData.append('taken_at', formatICT())
          
          await deliveryNoteService.uploadGpsPhoto(dnId, formData)
        }
        await loadDeliveryPhotos(undefined, dnId)
      }
      if (!existingDnId) {
        await deliveryNoteService.sign(dnId, { signed_by: jobData?.customerName ?? 'ลูกค้า', signed_at: new Date().toISOString() })
      }
      if (wrCreated) {
        await warrantyService.create({
          owner_type: ownerType, owner_id: ownerId,
          warranty_months: warrantyMonths, start_date: new Date().toISOString().split('T')[0],
        })
      }
      if (isRepair && soId) {
        await serviceOrderService.transition(soId, { status: 'closed' })
      }
      toast.success('ปิดงานเรียบร้อย')
      if (!isRepair) {
        setJobCompleted(true)
        setExistingDnId(dnId)
      }
      onComplete()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      {jobCompleted && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <Flag className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">ปิดงานเรียบร้อยแล้ว</p>
            <p className="text-xs text-green-600 mt-0.5">ใบส่งมอบออกและเซ็นแล้ว งานนี้เสร็จสมบูรณ์</p>
          </div>
        </div>
      )}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
        <label className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors group">
          <div className="relative flex items-center justify-center">
            <input type="checkbox" checked={dnSigned} onChange={(e) => setDnSigned(e.target.checked)} className="peer h-5 w-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 transition-all" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Package className="h-4 w-4 text-gray-500" /> ใบส่งมอบ (DN)</span>
            <p className="text-xs text-gray-500 mt-0.5">ลูกค้าตรวจสอบและเซ็นรับ{type === 'repair' ? 'รถ' : 'สินค้า'}เรียบร้อย</p>
          </div>
        </label>
        
        <div className="px-5 py-4 hover:bg-gray-50 transition-colors group">
          <label className="flex items-center gap-4 cursor-pointer">
            <div className="relative flex items-center justify-center">
              <input type="checkbox" checked={wrCreated} onChange={(e) => setWrCreated(e.target.checked)} className="peer h-5 w-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 transition-all" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-semibold text-gray-900 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gray-500" /> ใบรับประกัน (WR)</span>
              <p className="text-xs text-gray-500 mt-0.5">ออกใบรับประกันงานซ่อม / สินค้า (ถ้ามี)</p>
            </div>
          </label>
          {wrCreated && (
            <div className="mt-3 ml-9 p-3 bg-white rounded-lg border border-gray-200 shadow-sm flex items-center gap-3">
              <label className="text-xs font-medium text-gray-700">ระยะเวลารับประกัน:</label>
              <div className="relative flex items-center">
                <input
                  type="number" min={1} max={120} value={warrantyMonths} onChange={(e) => { const m = Math.max(1, Number(e.target.value)); setWarrantyMonths(m); onWarrantyMonthsChange?.(m) }}
                  className="w-20 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-center focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="ml-2 text-xs text-gray-500 font-medium">เดือน</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* DN + WR Print Buttons */}
      {(onPrintDN || onPrintWR) && (
        <div className="flex gap-2">
          {onPrintDN && (
            <button
              type="button"
              onClick={onPrintDN}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all"
            >
              <FileText className="h-4 w-4" /> พิมพ์ DN
            </button>
          )}
          {onPrintWR && (
            <button
              type="button"
              onClick={onPrintWR}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 hover:bg-green-100 hover:border-green-300 transition-all"
            >
              <FileText className="h-4 w-4" /> พิมพ์ WR
            </button>
          )}
        </div>
      )}

      {/* Photo upload + previews */}
      <div className="space-y-3">
        {existingDeliveryPhotos.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-200 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Camera className="h-4 w-4 text-gray-500" /> รูปส่งมอบที่อัปโหลดแล้ว ({existingDeliveryPhotos.length})
            </div>
            <div className="p-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {existingDeliveryPhotos.map((photo) => (
                <div key={photo.id} className="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-1">
                  <img src={photo.photo_url} alt={`delivery-${photo.id}`} className="h-20 w-full rounded object-contain bg-gray-50" />
                </div>
              ))}
            </div>
          </div>
        )}
        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 py-5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:border-gray-400 hover:text-gray-700 transition-all cursor-pointer w-full group">
          <div className={cn("p-3 rounded-full shadow-sm transition-all", deliveryPhotos.length > 0 ? "bg-green-100 text-green-600 group-hover:bg-green-200" : "bg-white text-gray-400 group-hover:scale-110 group-hover:text-gray-600")}>
            <Camera className="h-6 w-6" />
          </div>
          <span>ถ่ายรูปส่งมอบ / เซ็นเอกสาร {deliveryPhotos.length > 0 && <span className="text-green-600 font-bold ml-1">+เพิ่มรูป</span>}</span>
          <input type="file" multiple accept="image/*" capture="environment" className="hidden" onChange={(e) => setDeliveryPhotos(prev => [...prev, ...Array.from(e.target.files ?? [])])} />
        </label>
        {deliveryPhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {deliveryPhotos.map((file, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                <img src={URL.createObjectURL(file)} alt={`รูป ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setDeliveryPhotos(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="pt-2">
        <ActionButton onClick={handleSubmit} loading={isSubmitting} disabled={jobCompleted || !dnSigned}>
          <Flag className="h-5 w-5" /> {jobCompleted ? 'ปิดงานแล้ว' : 'ปิดงานสมบูรณ์'}
        </ActionButton>
      </div>
    </div>
  )
}

/* ─── Deposit Step ─── */
export function DepositForm({ onComplete, jobData }: FormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [amount, setAmount] = useState(jobData?.grand_total ? Math.round(jobData.grand_total * 0.3) : 5000)
  const [method, setMethod] = useState<'cash' | 'transfer' | 'credit_card'>('cash')

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
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-6 text-center shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Coins className="h-24 w-24" />
        </div>
        <p className="text-sm font-semibold text-amber-800 mb-3 relative z-10 flex items-center justify-center gap-2">
          <Coins className="h-4 w-4" /> ยอดรับมัดจำ
        </p>
        <div className="relative z-10 w-2/3 mx-auto">
          <span className="absolute left-4 top-3.5 text-amber-600/50 font-bold text-xl">฿</span>
          <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full rounded-xl border-2 border-amber-300 bg-white/80 pl-10 pr-4 py-3 text-right text-2xl font-black text-amber-600 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition-all shadow-inner" />
        </div>
      </div>
      
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <CreditCard className="h-4 w-4" /> เลือกช่องทางรับเงิน
        </label>
        <div className="grid grid-cols-3 gap-3">
          {([['cash', '💵', 'เงินสด'], ['transfer', '🏦', 'โอนเงิน'], ['credit_card', '💳', 'บัตรเครดิต']] as const).map(([v, ico, lbl]) => (
            <button key={v} onClick={() => setMethod(v)}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-xl border-2 py-4 text-sm font-bold transition-all',
                method === v ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm scale-[1.02]' : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-200',
              )}>
              <span className="text-2xl mb-1">{ico}</span>{lbl}
            </button>
          ))}
        </div>
      </div>
      
      <div className="pt-2">
        <ActionButton onClick={handleSubmit} loading={isSubmitting} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25 text-white">
          <Receipt className="h-5 w-5" /> ออกใบมัดจำ & ใบเสร็จ
        </ActionButton>
      </div>
    </div>
  )
}

/* ─── Shared Components ─── */
function Field({ label, value, onChange, placeholder, multiline, disabled, icon }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; multiline?: boolean; disabled?: boolean; icon?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-3 pointer-events-none">{icon}</div>}
        {multiline ? (
          <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
            disabled={disabled}
            className={cn("w-full rounded-xl border border-gray-200 bg-white/50 py-2.5 text-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 resize-none disabled:bg-gray-50 disabled:text-gray-500 shadow-sm", icon ? "pl-10 pr-4" : "px-4")} />
        ) : (
          <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
            disabled={disabled}
            className={cn("w-full rounded-xl border border-gray-200 bg-white/50 py-2.5 text-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-gray-50 disabled:text-gray-500 shadow-sm", icon ? "pl-10 pr-4" : "px-4")} />
        )}
      </div>
    </div>
  )
}

function ActionButton({ onClick, children, disabled, loading, variant = 'primary', className }: {
  onClick: () => void; children: React.ReactNode; disabled?: boolean; loading?: boolean; variant?: 'primary' | 'secondary' | 'danger'; className?: string
}) {
  const baseStyles = "w-full rounded-xl py-3.5 text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/25 shadow-md",
    secondary: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm",
    danger: "bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700 hover:shadow-lg hover:shadow-red-500/25 shadow-md",
  }
  return (
    <button onClick={onClick} disabled={disabled || loading} className={cn(baseStyles, variants[variant], className)}>
      {loading && <Loader2 className="h-5 w-5 animate-spin" />}
      {!loading && children}
    </button>
  )
}
