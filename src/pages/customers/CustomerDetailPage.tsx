import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { customerService } from '@/api/customerService'
import { hrService } from '@/api/hrService'
import type { Branch } from '@/types/hr'
import type {
  Customer,
  CustomerPhone,
  CustomerPhoneType,
  CustomerBillingAddress,
  CustomerBillingAddressPayload,
  CustomerVehicle,
  CustomerVehiclePayload,
  CustomerDocument,
  CustomerDocFileType,
  CustomerTimelineEvent,
  TimelineEventType,
  CustomerServiceHistory,
  CustomerPurchaseHistoryInvoice,
  CustomerWarrantyHistory,
} from '@/types/customer'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { ActionIconButton } from '@/components/ui/ActionIconButton'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

// ─── Constants ────────────────────────────────────────────────────────────────
const PHONE_TYPE_LABEL: Record<CustomerPhoneType, string> = {
  mobile: 'มือถือ',
  home: 'บ้าน',
  work: 'ที่ทำงาน',
}

const DOC_FILE_TYPE_LABEL: Record<CustomerDocFileType, string> = {
  id_card: 'บัตรประชาชน',
  house_registration: 'ทะเบียนบ้าน',
  other: 'อื่นๆ',
}

const DOC_FILE_TYPE_OPTIONS: { value: CustomerDocFileType; label: string }[] = [
  { value: 'id_card', label: 'บัตรประชาชน' },
  { value: 'house_registration', label: 'ทะเบียนบ้าน' },
  { value: 'other', label: 'อื่นๆ' },
]

const TIMELINE_EVENT_TYPE_LABEL: Record<TimelineEventType, string> = {
  call: 'โทรหา',
  appointment: 'นัดหมาย',
  note: 'บันทึก',
  other: 'อื่นๆ',
}

const PAYMENT_STATUS_CLASS: Record<string, string> = {
  'รอชำระ': 'bg-yellow-100 text-yellow-700',
  'ผ่อนอยู่': 'bg-blue-100 text-blue-700',
  'ค้างชำระ': 'bg-red-100 text-red-700',
  'ชำระครบ': 'bg-green-100 text-green-700',
  'ชำระแล้ว': 'bg-green-100 text-green-700',
}

const PURCHASE_LIMIT = 20

const EMPTY_PHONE = { type: 'mobile' as CustomerPhoneType, number: '', is_primary: false }
const EMPTY_ADDRESS: CustomerBillingAddressPayload = { label: '', address: '', province: '', district: '', sub_district: '', postal_code: '', is_default: false }
const EMPTY_VEHICLE: CustomerVehiclePayload = { plate_number: '', brand: '', model: '', year: undefined, color: '', engine_number: '', chassis_number: '', current_mileage: undefined, is_purchased_here: false, note: '' }
const EMPTY_DOC_FORM = { file_type: 'id_card' as CustomerDocFileType, file_name: '', note: '' }
const EMPTY_TIMELINE = { event_type: 'note' as TimelineEventType, event_date: '', description: '' }

type TabKey = 'profile' | 'purchase' | 'service' | 'warranty' | 'documents' | 'finance' | 'timeline'

// ─── Icons ────────────────────────────────────────────────────────────────────
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const customerId = Number(id)

  const [activeTab, setActiveTab] = useState<TabKey>('profile')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { permissions } = useAuthStore()
  const canEdit = hasPermission(permissions, 'customers', 'can_edit')
  const canDelete = hasPermission(permissions, 'customers', 'can_delete')

  // ── Tab: Phones
  const [phones, setPhones] = useState<CustomerPhone[]>([])
  const [isLoadingPhones, setIsLoadingPhones] = useState(false)
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [phoneForm, setPhoneForm] = useState(EMPTY_PHONE)
  const [isSavingPhone, setIsSavingPhone] = useState(false)

  // ── Tab: Billing Addresses
  const [addresses, setAddresses] = useState<CustomerBillingAddress[]>([])
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [editAddress, setEditAddress] = useState<CustomerBillingAddress | null>(null)
  const [addressForm, setAddressForm] = useState<CustomerBillingAddressPayload>(EMPTY_ADDRESS)
  const [isSavingAddress, setIsSavingAddress] = useState(false)

  // ── Tab: Vehicles
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([])
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false)
  const [showVehicleModal, setShowVehicleModal] = useState(false)
  const [editVehicle, setEditVehicle] = useState<CustomerVehicle | null>(null)
  const [vehicleForm, setVehicleForm] = useState<CustomerVehiclePayload>(EMPTY_VEHICLE)
  const [isSavingVehicle, setIsSavingVehicle] = useState(false)

  // ── Tab: Documents
  const [documents, setDocuments] = useState<CustomerDocument[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const [showDocModal, setShowDocModal] = useState(false)
  const [docForm, setDocForm] = useState(EMPTY_DOC_FORM)
  const [docFile, setDocFile] = useState<File | null>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)

  // ── Tab: Timeline
  const [timeline, setTimeline] = useState<CustomerTimelineEvent[]>([])
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false)
  const [showTimelineModal, setShowTimelineModal] = useState(false)
  const [timelineForm, setTimelineForm] = useState(EMPTY_TIMELINE)
  const [isSavingTimeline, setIsSavingTimeline] = useState(false)

  // ── Tab: History
  const [serviceHistory, setServiceHistory] = useState<CustomerServiceHistory[]>([])
  const [warrantyHistory, setWarrantyHistory] = useState<CustomerWarrantyHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  // Purchase history (paginated + filterable)
  const [purchaseInvoices, setPurchaseInvoices] = useState<CustomerPurchaseHistoryInvoice[]>([])
  const [isLoadingPurchase, setIsLoadingPurchase] = useState(false)
  const [purchaseTotal, setPurchaseTotal] = useState(0)
  const [purchaseTotalAmount, setPurchaseTotalAmount] = useState(0)
  const [purchasePage, setPurchasePage] = useState(1)
  const [purchaseSearch, setPurchaseSearch] = useState('')
  const [purchaseInvoiceType, setPurchaseInvoiceType] = useState('')
  const [purchaseBranchId, setPurchaseBranchId] = useState('')
  const [purchaseDateFrom, setPurchaseDateFrom] = useState('')
  const [purchaseDateTo, setPurchaseDateTo] = useState('')
  const [expandedPurchaseRow, setExpandedPurchaseRow] = useState<string | null>(null)
  const [purchaseBranches, setPurchaseBranches] = useState<Branch[]>([])
  const [openDocMenuInvoiceNo, setOpenDocMenuInvoiceNo] = useState<string | null>(null)

  // client-side filter: invoice_no / product_name / product_sku
  const visibleInvoices = useMemo(() => {
    const q = purchaseSearch.trim().toLowerCase()
    if (!q) return purchaseInvoices
    return purchaseInvoices
      .map((inv) => {
        const invoiceMatch = inv.invoice_no.toLowerCase().includes(q)
        const matchingItems = inv.items.filter(
          (item) =>
            item.product_name?.toLowerCase().includes(q) ||
            (item.product_sku ?? '').toLowerCase().includes(q),
        )
        if (invoiceMatch) return inv
        if (matchingItems.length > 0) return { ...inv, items: matchingItems }
        return null
      })
      .filter((inv): inv is NonNullable<typeof inv> => inv !== null)
  }, [purchaseInvoices, purchaseSearch])

  // ── Load customer ─────────────────────────────────────────────────────────
  useEffect(() => {
    hrService.getBranches().then((r) => setPurchaseBranches(r.data.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    customerService.getCustomer(customerId)
      .then(({ data }) => setCustomer(data.data))
      .catch(() => navigate('/customers'))
      .finally(() => setIsLoading(false))
  }, [customerId, navigate])

  // ── Load tab data ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'profile') {
      if (phones.length === 0) loadPhones()
      if (addresses.length === 0) loadAddresses()
      if (vehicles.length === 0) loadVehicles()
    }
    if (activeTab === 'documents' && documents.length === 0) loadDocuments()
    if (activeTab === 'timeline' && timeline.length === 0) loadTimeline()
    if (activeTab === 'purchase') loadPurchaseHistory()
    if (activeTab === 'service' && serviceHistory.length === 0) loadServiceAndWarrantyHistory()
    if (activeTab === 'warranty' && warrantyHistory.length === 0) loadServiceAndWarrantyHistory()
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload purchase history when filters / page change
  useEffect(() => {
    if (activeTab !== 'purchase') return
    loadPurchaseHistory()
  }, [purchasePage, purchaseSearch, purchaseInvoiceType, purchaseBranchId, purchaseDateFrom, purchaseDateTo]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPhones = async () => {
    setIsLoadingPhones(true)
    try { setPhones((await customerService.getPhones(customerId)).data.data || []) }
    catch { setPhones([]) }
    finally { setIsLoadingPhones(false) }
  }

  const loadAddresses = async () => {
    setIsLoadingAddresses(true)
    try { setAddresses((await customerService.getBillingAddresses(customerId)).data.data || []) }
    catch { setAddresses([]) }
    finally { setIsLoadingAddresses(false) }
  }

  const loadVehicles = async () => {
    setIsLoadingVehicles(true)
    try { setVehicles((await customerService.getVehicles(customerId)).data.data || []) }
    catch { setVehicles([]) }
    finally { setIsLoadingVehicles(false) }
  }

  const loadDocuments = async () => {
    setIsLoadingDocs(true)
    try { setDocuments((await customerService.getDocuments(customerId)).data.data || []) }
    catch { setDocuments([]) }
    finally { setIsLoadingDocs(false) }
  }

  const loadTimeline = async () => {
    setIsLoadingTimeline(true)
    try { setTimeline((await customerService.getTimeline(customerId)).data.data || []) }
    catch { setTimeline([]) }
    finally { setIsLoadingTimeline(false) }
  }

  const loadServiceAndWarrantyHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const [svc, war] = await Promise.all([
        customerService.getServiceHistory(customerId),
        customerService.getWarrantyHistory(customerId),
      ])
      setServiceHistory(svc.data.data || [])
      setWarrantyHistory(war.data.data || [])
    } catch { /* ignore */ }
    finally { setIsLoadingHistory(false) }
  }

  const loadPurchaseHistory = async () => {
    setIsLoadingPurchase(true)
    try {
      const res = await customerService.getPurchaseHistory(customerId, {
        search: purchaseSearch || undefined,
        invoice_type: purchaseInvoiceType || undefined,
        branch_id: purchaseBranchId ? Number(purchaseBranchId) : undefined,
        date_from: purchaseDateFrom || undefined,
        date_to: purchaseDateTo || undefined,
        page: purchasePage,
        limit: PURCHASE_LIMIT,
      })
      setPurchaseInvoices(res.data.data || [])
      setPurchaseTotal(res.data.pagination?.total ?? 0)
      setPurchaseTotalAmount(
        (res.data.data || []).reduce((sum, inv) => sum + inv.grand_total, 0)
      )
    } catch {
      setPurchaseInvoices([])
    } finally {
      setIsLoadingPurchase(false)
    }
  }

  // ── Delete customer ───────────────────────────────────────────────────────
  const handleDeleteCustomer = async () => {
    setIsDeleting(true)
    try {
      await customerService.deleteCustomer(customerId)
      navigate('/customers')
    } catch { /* interceptor handles display */ }
    finally { setIsDeleting(false); setDeleteConfirmOpen(false) }
  }

  // ── Phone save ────────────────────────────────────────────────────────────
  const handleSavePhone = async () => {
    if (!phoneForm.number.trim()) return
    setIsSavingPhone(true)
    try {
      await customerService.addPhone(customerId, phoneForm)
      setShowPhoneModal(false)
      setPhoneForm(EMPTY_PHONE)
      await loadPhones()
    } catch { /* interceptor handles display */ }
    finally { setIsSavingPhone(false) }
  }

  const handleSetPrimary = async (phoneId: number) => {
    const prev = phones
    setPhones(phones.map((p) => ({ ...p, is_primary: p.id === phoneId })))
    try {
      await customerService.updatePhone(customerId, phoneId, { is_primary: true })
    } catch {
      setPhones(prev)
    }
  }

  const handleSetDefaultAddress = async (addressId: number) => {
    const target = addresses.find((a) => a.id === addressId)
    if (!target) return
    const prev = addresses
    setAddresses(addresses.map((a) => ({ ...a, is_default: a.id === addressId })))
    try {
      await customerService.updateBillingAddress(customerId, addressId, {
        label: target.label,
        address: target.address,
        province: target.province,
        district: target.district,
        sub_district: target.sub_district,
        postal_code: target.postal_code,
        is_default: true,
      })
    } catch {
      setAddresses(prev)
    }
  }

  const handleTogglePurchasedHere = async (vehicleId: number, current: boolean) => {
    const prev = vehicles
    setVehicles(vehicles.map((v) => v.id === vehicleId ? { ...v, is_purchased_here: !current } : v))
    try {
      await customerService.updateVehicle(customerId, vehicleId, { is_purchased_here: !current })
    } catch {
      setVehicles(prev)
    }
  }

  // ── Address save ──────────────────────────────────────────────────────────
  const handleSaveAddress = async () => {
    if (!addressForm.label || !addressForm.address) return
    setIsSavingAddress(true)
    try {
      if (editAddress) {
        await customerService.updateBillingAddress(customerId, editAddress.id, addressForm)
      } else {
        await customerService.addBillingAddress(customerId, addressForm)
      }
      setShowAddressModal(false)
      setEditAddress(null)
      setAddressForm(EMPTY_ADDRESS)
      await loadAddresses()
    } catch { /* interceptor handles display */ }
    finally { setIsSavingAddress(false) }
  }

  const openEditAddress = (a: CustomerBillingAddress) => {
    setEditAddress(a)
    setAddressForm({ label: a.label, address: a.address, province: a.province, district: a.district, sub_district: a.sub_district, postal_code: a.postal_code, is_default: a.is_default })
    setShowAddressModal(true)
  }

  // ── Vehicle save ──────────────────────────────────────────────────────────
  const handleSaveVehicle = async () => {
    if (!vehicleForm.plate_number.trim()) return
    setIsSavingVehicle(true)
    try {
      if (editVehicle) {
        await customerService.updateVehicle(customerId, editVehicle.id, vehicleForm)
      } else {
        await customerService.addVehicle(customerId, vehicleForm)
      }
      setShowVehicleModal(false)
      setEditVehicle(null)
      setVehicleForm(EMPTY_VEHICLE)
      await loadVehicles()
    } catch { /* interceptor handles display */ }
    finally { setIsSavingVehicle(false) }
  }

  const openEditVehicle = (v: CustomerVehicle) => {
    setEditVehicle(v)
    setVehicleForm({ plate_number: v.plate_number, brand: v.brand ?? '', model: v.model ?? '', year: v.year, color: v.color ?? '', engine_number: v.engine_number ?? '', chassis_number: v.chassis_number ?? '', current_mileage: v.current_mileage, is_purchased_here: v.is_purchased_here ?? false, note: v.note ?? '' })
    setShowVehicleModal(true)
  }

  // ── Document upload ───────────────────────────────────────────────────────
  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setDocFile(file)
    if (!docForm.file_name) setDocForm((prev) => ({ ...prev, file_name: file.name }))
  }

  const handleUploadDoc = async () => {
    if (!docFile) return
    setIsUploadingDoc(true)
    try {
      await customerService.uploadDocument(customerId, docFile, {
        file_type: docForm.file_type,
        file_name: docForm.file_name.trim() || undefined,
        note: docForm.note.trim() || undefined,
      })
      setShowDocModal(false)
      setDocForm(EMPTY_DOC_FORM)
      setDocFile(null)
      if (docInputRef.current) docInputRef.current.value = ''
      await loadDocuments()
    } catch { /* interceptor handles display */ }
    finally { setIsUploadingDoc(false) }
  }

  // ── Timeline save ─────────────────────────────────────────────────────────
  const handleSaveTimeline = async () => {
    if (!timelineForm.event_date || !timelineForm.description.trim()) return
    setIsSavingTimeline(true)
    try {
      await customerService.addTimelineEvent(customerId, timelineForm)
      setShowTimelineModal(false)
      setTimelineForm(EMPTY_TIMELINE)
      setTimeline([]) // force reload
      await loadTimeline()
    } catch { /* interceptor handles display */ }
    finally { setIsSavingTimeline(false) }
  }

  // ── Display helpers ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!customer) return null

  const displayName = customer.type === 'corporate'
    ? customer.company_name ?? '—'
    : [customer.prefix, customer.first_name, customer.last_name].filter(Boolean).join(' ') || '—'

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'profile', label: 'โปรไฟล์' },
    { key: 'purchase', label: 'ประวัติการซื้อ' },
    { key: 'service', label: 'ประวัติการซ่อมบำรุง' },
    { key: 'warranty', label: 'ประวัติการรับประกัน' },
    { key: 'documents', label: 'เอกสาร' },
    { key: 'finance', label: 'การเงิน/ใบเสร็จ' },
    { key: 'timeline', label: 'ไทม์ไลน์ & บันทึกเหตุการณ์' },
  ]

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link to="/customers" className="text-gray-500 hover:text-gray-900">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </Link>
          {customer.photo_url ? (
            <img src={customer.photo_url} alt={displayName} className="h-12 w-12 rounded-full object-cover border border-gray-200 flex-shrink-0" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              <span className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                customer.type === 'corporate' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700',
              )}>
                {customer.type === 'corporate' ? 'นิติบุคคล' : 'บุคคลธรรมดา'}
              </span>
            </div>
            {customer.branch?.name && (
              <p className="mt-0.5 text-sm text-gray-500">{customer.branch.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Link
              to={`/customers/${customerId}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <PencilIcon />
              แก้ไข
            </Link>
          )}
          {canDelete && (
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              ลบลูกค้า
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ═══════════════════════ TAB: โปรไฟล์ ═══════════════════════ */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* ข้อมูลหลัก */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">ข้อมูลทั่วไป</h3>
                <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                  {customer.type === 'corporate' ? (
                    <>
                      <InfoRow label="ชื่อบริษัท" value={customer.company_name} />
                      <InfoRow label="สาขา (ลูกค้า)" value={customer.company_branch} />
                      <InfoRow label="เลขประจำตัวผู้เสียภาษี" value={customer.tax_id} />
                      <InfoRow label="ผู้ติดต่อ" value={customer.contact_name} />
                      <InfoRow label="ตำแหน่ง" value={customer.contact_position} />
                    </>
                  ) : (
                    <>
                      <InfoRow label="ชื่อ-นามสกุล" value={displayName} />
                      <InfoRow label="เลขบัตรประชาชน" value={customer.id_card} />
                    </>
                  )}
                  <InfoRow label="อีเมล" value={customer.email} />
                  <InfoRow label="Line ID" value={customer.line_id} />
                  <InfoRow label="สาขาที่ดูแล" value={customer.branch?.name} />
                </dl>
              </div>

              {/* ที่อยู่ */}
              {(customer.address || customer.province) && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">ที่อยู่</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {[customer.address, customer.sub_district, customer.district, customer.province, customer.postal_code]
                      .filter(Boolean).join(' ')}
                  </p>
                </div>
              )}

              {/* หมายเหตุ */}
              {customer.note && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">หมายเหตุ</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{customer.note}</p>
                </div>
              )}

              {/* เบอร์โทรศัพท์ */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">เบอร์โทรศัพท์</h3>
                  {canEdit && (
                    <button
                      onClick={() => { setPhoneForm(EMPTY_PHONE); setShowPhoneModal(true) }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                    >
                      <PlusIcon />เพิ่มเบอร์
                    </button>
                  )}
                </div>
                {isLoadingPhones ? (
                  <LoadingSkeleton rows={3} cols={3} />
                ) : phones.length === 0 ? (
                  <EmptyState message="ยังไม่มีเบอร์โทร" />
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">ประเภท</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">หมายเลข</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">หลัก</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {phones.map((p) => (
                          <tr key={p.id}>
                            <td className="px-4 py-3 text-gray-700">{PHONE_TYPE_LABEL[p.type]}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{p.number}</td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={p.is_primary}
                                onClick={() => { if (!p.is_primary && canEdit) handleSetPrimary(p.id) }}
                                disabled={p.is_primary || !canEdit}
                                title={p.is_primary ? 'เบอร์หลักปัจจุบัน' : 'ตั้งเป็นเบอร์หลัก'}
                                className={cn(
                                  'relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200',
                                  p.is_primary ? 'bg-blue-600' : 'bg-gray-300',
                                  !p.is_primary && canEdit ? 'cursor-pointer' : 'cursor-default'
                                )}
                              >
                                <span
                                  className={cn(
                                    'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
                                    p.is_primary ? 'translate-x-4' : 'translate-x-0.5'
                                  )}
                                />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ที่อยู่ออกบิล */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">ที่อยู่ออกบิล</h3>
                  {canEdit && (
                    <button
                      onClick={() => { setEditAddress(null); setAddressForm(EMPTY_ADDRESS); setShowAddressModal(true) }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                    >
                      <PlusIcon />เพิ่มที่อยู่
                    </button>
                  )}
                </div>
                {isLoadingAddresses ? (
                  <LoadingSkeleton rows={2} cols={4} />
                ) : addresses.length === 0 ? (
                  <EmptyState message="ยังไม่มีที่อยู่ออกบิล" />
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {addresses.map((a) => (
                      <div key={a.id} className="relative rounded-lg border border-gray-200 p-4">
                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                          <span className="text-xs text-gray-500">ที่อยู่หลัก</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={a.is_default}
                            onClick={() => { if (!a.is_default && canEdit) handleSetDefaultAddress(a.id) }}
                            disabled={a.is_default || !canEdit}
                            title={a.is_default ? 'ที่อยู่หลักปัจจุบัน' : 'ตั้งเป็นที่อยู่หลัก'}
                            className={cn(
                              'relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200',
                              a.is_default ? 'bg-blue-600' : 'bg-gray-300',
                              !a.is_default && canEdit ? 'cursor-pointer' : 'cursor-default'
                            )}
                          >
                            <span
                              className={cn(
                                'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
                                a.is_default ? 'translate-x-4' : 'translate-x-0.5'
                              )}
                            />
                          </button>
                        </div>
                        <p className="font-medium text-gray-900">{a.label}</p>
                        <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                          {[a.address, a.sub_district, a.district, a.province, a.postal_code].filter(Boolean).join(' ')}
                        </p>
                        {canEdit && (
                          <button
                            onClick={() => openEditAddress(a)}
                            className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            <PencilIcon />แก้ไข
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* รถยนต์ */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">รถยนต์</h3>
                  {canEdit && (
                    <button
                      onClick={() => { setEditVehicle(null); setVehicleForm(EMPTY_VEHICLE); setShowVehicleModal(true) }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                    >
                      <PlusIcon />เพิ่มรถ
                    </button>
                  )}
                </div>
                {isLoadingVehicles ? (
                  <LoadingSkeleton rows={3} cols={4} />
                ) : vehicles.length === 0 ? (
                  <EmptyState message="ยังไม่มีข้อมูลรถ" />
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">ทะเบียน</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">ยี่ห้อ / รุ่น</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">ปี</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">สี</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">ไมล์ (กม.)</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">ซื้อจากร้าน</th>
                          {canEdit && <th className="px-4 py-3" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {vehicles.map((v) => (
                          <tr key={v.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{v.plate_number}</td>
                            <td className="px-4 py-3 text-gray-700">{[v.brand, v.model].filter(Boolean).join(' ') || '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{v.year ?? '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{v.color || '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{v.current_mileage?.toLocaleString() ?? '—'}</td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={v.is_purchased_here ?? false}
                                onClick={() => { if (canEdit) handleTogglePurchasedHere(v.id, v.is_purchased_here ?? false) }}
                                disabled={!canEdit}
                                title={v.is_purchased_here ? 'ซื้อจากร้าน' : 'ยังไม่ได้ซื้อจากร้าน'}
                                className={cn(
                                  'relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200',
                                  v.is_purchased_here ? 'bg-blue-600' : 'bg-gray-300',
                                  canEdit ? 'cursor-pointer' : 'cursor-default'
                                )}
                              >
                                <span
                                  className={cn(
                                    'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
                                    v.is_purchased_here ? 'translate-x-4' : 'translate-x-0.5'
                                  )}
                                />
                              </button>
                            </td>
                            {canEdit && (
                              <td className="px-4 py-3">
                                <ActionIconButton onClick={() => openEditVehicle(v)} title="แก้ไข" variant="edit" />
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════ TAB: เอกสาร ═══════════════════════ */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">เอกสาร</h3>
                {canEdit && (
                  <button
                    onClick={() => { setDocForm(EMPTY_DOC_FORM); setDocFile(null); setShowDocModal(true) }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                  >
                    <PlusIcon />อัปโหลด
                  </button>
                )}
              </div>
              {isLoadingDocs ? (
                <LoadingSkeleton rows={3} cols={4} />
              ) : documents.length === 0 ? (
                <EmptyState message="ยังไม่มีเอกสาร" />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">ประเภท</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">ชื่อไฟล์</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">หมายเหตุ</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">วันที่</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {documents.map((doc) => (
                        <tr key={doc.id}>
                          <td className="px-4 py-3 text-gray-700">{DOC_FILE_TYPE_LABEL[doc.file_type]}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{doc.file_name || '—'}</td>
                          <td className="px-4 py-3 text-gray-500">{doc.note || '—'}</td>
                          <td className="px-4 py-3 text-gray-500">
                            {doc.created_at ? new Date(doc.created_at).toLocaleDateString('th-TH') : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                            >
                              <DownloadIcon />ดาวน์โหลด
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════ TAB: Timeline ═══════════════════════ */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">ไทม์ไลน์ & บันทึกเหตุการณ์</h3>
                {canEdit && (
                  <button
                    onClick={() => { setTimelineForm(EMPTY_TIMELINE); setShowTimelineModal(true) }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                  >
                    <PlusIcon />เพิ่มบันทึก
                  </button>
                )}
              </div>
              {isLoadingTimeline ? (
                <LoadingSkeleton rows={4} cols={3} />
              ) : timeline.length === 0 ? (
                <EmptyState message="ยังไม่มีรายการ" />
              ) : (
                <ol className="relative border-l border-gray-200 ml-3 space-y-6">
                  {timeline.map((ev) => (
                    <li key={ev.id} className="ml-6">
                      <span className="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 ring-4 ring-white">
                        <span className="h-2 w-2 rounded-full bg-blue-600" />
                      </span>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 mr-2">
                            {TIMELINE_EVENT_TYPE_LABEL[ev.event_type]}
                          </span>
                          <time className="text-xs text-gray-400">
                            {new Date(ev.event_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </time>
                        </div>
                        {ev.created_by && (
                          <span className="text-xs text-gray-400">{ev.created_by}</span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm text-gray-700 whitespace-pre-line">{ev.description}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {/* ═══════════════════════ TAB: ประวัติการซื้อ ═══════════════════════ */}
          {activeTab === 'purchase' && (
            <div className="space-y-4">

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="ค้นหารหัสสินค้า / ชื่อสินค้า / เลขเอกสาร"
                    value={purchaseSearch}
                    onChange={(e) => { setPurchaseSearch(e.target.value); setPurchasePage(1) }}
                    className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={purchaseBranchId}
                  onChange={(e) => { setPurchaseBranchId(e.target.value); setPurchasePage(1) }}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">คลัง/สาขา (ทั้งหมด)</option>
                  {purchaseBranches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <select
                  value={purchaseInvoiceType}
                  onChange={(e) => { setPurchaseInvoiceType(e.target.value); setPurchasePage(1) }}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">ประเภท (ทั้งหมด)</option>
                  <option value="sale">ขาย</option>
                  <option value="service">ซ่อม/บริการ</option>
                </select>
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={purchaseDateFrom}
                    onChange={(e) => { setPurchaseDateFrom(e.target.value); setPurchasePage(1) }}
                    title="วันที่เริ่มต้น"
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-gray-400 text-sm">—</span>
                  <input
                    type="date"
                    value={purchaseDateTo}
                    onChange={(e) => { setPurchaseDateTo(e.target.value); setPurchasePage(1) }}
                    title="วันที่สิ้นสุด"
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Summary bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-5 py-3">
                <p className="text-sm text-gray-500">
                  {isLoadingPurchase ? (
                    <span className="inline-block h-4 w-24 animate-pulse rounded bg-gray-200" />
                  ) : (
                    <>รายการทั้งหมด <span className="ml-1 text-base font-semibold text-gray-900">{purchaseTotal.toLocaleString()}</span></>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  {isLoadingPurchase ? (
                    <span className="inline-block h-4 w-32 animate-pulse rounded bg-gray-200" />
                  ) : (
                    <>ยอดรวม <span className="ml-1 text-base font-semibold text-gray-900">
                      {purchaseTotalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                    </span></>
                  )}
                </p>
              </div>

              {isLoadingPurchase ? (
                <LoadingSkeleton rows={5} cols={8} />
              ) : purchaseInvoices.length === 0 ? (
                <EmptyState message="ไม่มีประวัติการซื้อ" />
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="w-8" />
                          <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">วันที่</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">เลขเอกสาร</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">สาขา/คลัง</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-600 whitespace-nowrap">รายการ</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600 whitespace-nowrap">ยอดรวม (บาท)</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">สถานะ</th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {visibleInvoices.map((invoice) => {
                          const isExpanded = !!purchaseSearch || expandedPurchaseRow === invoice.invoice_no
                          return (
                            <>
                              {/* ── Invoice header row ── */}
                              <tr
                                key={invoice.invoice_no}
                                className={cn('transition-colors', isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50')}
                              >
                                <td className="pl-3 pr-0 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedPurchaseRow(isExpanded ? null : invoice.invoice_no)}
                                    className="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                                    aria-label={isExpanded ? 'ซ่อนรายการ' : 'แสดงรายการ'}
                                  >
                                    <svg
                                      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                      className={cn('transition-transform duration-200', isExpanded ? 'rotate-90' : '')}
                                    >
                                      <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                  </button>
                                </td>
                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                                  {invoice.purchase_date.slice(0, 10)}
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // TODO: navigate to invoice/SO page — ยังไม่ได้สร้าง (Phase 7/8)
                                      toast('หน้ารายละเอียดเอกสารยังไม่พร้อมใช้งาน', { icon: '🚧' })
                                    }}
                                    className="font-medium text-blue-600 hover:underline whitespace-nowrap text-sm"
                                  >
                                    {invoice.invoice_no}
                                  </button>
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                                  {invoice.branch_name || '—'}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-600 text-sm">
                                  {invoice.items_count} รายการ
                                </td>
                                <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                                  {invoice.grand_total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={cn(
                                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                                    PAYMENT_STATUS_CLASS[invoice.payment_status] ?? 'bg-gray-100 text-gray-600',
                                  )}>
                                    {invoice.payment_status}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-right relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setOpenDocMenuInvoiceNo(
                                        openDocMenuInvoiceNo === invoice.invoice_no ? null : invoice.invoice_no
                                      )
                                    }}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                                    aria-label="เอกสาร"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                      <circle cx="5" cy="12" r="2" />
                                      <circle cx="12" cy="12" r="2" />
                                      <circle cx="19" cy="12" r="2" />
                                    </svg>
                                  </button>
                                  {openDocMenuInvoiceNo === invoice.invoice_no && (
                                    <div className="absolute right-0 top-8 z-20 min-w-[220px] rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                                      <p className="px-3 pb-1 pt-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">เอกสาร</p>
                                      {[
                                        { label: 'ใบแจ้งหนี้ (Invoice)', icon: '📄' },
                                        { label: 'ใบเสร็จรับเงิน/ใบกำกับภาษี', icon: '🧾' },
                                        { label: 'ใบส่งมอบสินค้า', icon: '📦' },
                                      ].map((doc) => (
                                        <button
                                          key={doc.label}
                                          type="button"
                                          onClick={() => {
                                            setOpenDocMenuInvoiceNo(null)
                                            // TODO: navigate/print — ยังไม่ได้สร้าง (Phase 8)
                                            toast(`${doc.label} — ยังไม่พร้อมใช้งาน`, { icon: '🚧' })
                                          }}
                                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                          <span>{doc.icon}</span>
                                          <span>{doc.label}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>

                              {/* ── Line item sub-rows (expanded) ── */}
                              {isExpanded && invoice.items.map((item, idx) => {
                                const isDiscount = item.item_type === 'discount'
                                const isFreeGift = item.item_type === 'free_gift'
                                const isService = item.item_type === 'service'
                                return (
                                  <tr key={item.id ?? idx} className="bg-blue-50">
                                    <td className="pl-3 pr-0" />
                                    <td colSpan={7} className="px-0 py-2">
                                      <div className="ml-6 flex items-center gap-3 border-l-2 border-blue-200 pl-4 pr-4 text-sm">
                                        <span className="w-28 shrink-0 font-mono text-xs text-gray-400">
                                          {item.product_sku || '—'}
                                        </span>
                                        <span className={cn('flex-1 font-medium', isDiscount ? 'text-red-600' : 'text-gray-800')}>
                                          {item.product_name}
                                          {item.product_category && !isDiscount && !isFreeGift && (
                                            <span className="ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500">
                                              {item.product_category}
                                            </span>
                                          )}
                                          {isService && (
                                            <span className="ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-xs bg-purple-100 text-purple-600">
                                              ค่าแรง/บริการ
                                            </span>
                                          )}
                                          {isDiscount && (
                                            <span className="ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-xs bg-red-100 text-red-600">
                                              ส่วนลด
                                            </span>
                                          )}
                                          {isFreeGift && (
                                            <span className="ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-xs bg-green-100 text-green-600">
                                              ฟรี
                                            </span>
                                          )}
                                        </span>
                                        {!isFreeGift && (
                                          <>
                                            <span className="text-gray-500 text-xs whitespace-nowrap">
                                              ×{item.quantity.toLocaleString()}
                                            </span>
                                            <span className="text-gray-400 text-xs whitespace-nowrap">
                                              @{item.unit_price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </span>
                                            {item.discount > 0 && (
                                              <span className="text-orange-500 text-xs whitespace-nowrap">
                                                -{item.discount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                              </span>
                                            )}
                                            <span className={cn('w-28 text-right font-semibold whitespace-nowrap', isDiscount ? 'text-red-600' : 'text-gray-900')}>
                                              {isFreeGift ? 'ฟรี' : `฿${item.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`}
                                            </span>
                                          </>
                                        )}
                                        {isFreeGift && (
                                          <span className="w-28 text-right text-xs text-green-600 font-semibold whitespace-nowrap">ฟรี</span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {Math.ceil(purchaseTotal / PURCHASE_LIMIT) > 1 && (
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm text-gray-500">
                        หน้า {purchasePage} / {Math.ceil(purchaseTotal / PURCHASE_LIMIT)}
                        <span className="ml-2 text-gray-400">({purchaseTotal.toLocaleString()} รายการ)</span>
                      </p>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setPurchasePage((p) => p - 1)}
                          disabled={purchasePage <= 1}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40"
                        >
                          ก่อนหน้า
                        </button>
                        <button
                          type="button"
                          onClick={() => setPurchasePage((p) => p + 1)}
                          disabled={purchasePage >= Math.ceil(purchaseTotal / PURCHASE_LIMIT)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40"
                        >
                          ถัดไป
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ═══════════════════════ TAB: ประวัติการซ่อมบำรุง ═══════════════════════ */}
          {activeTab === 'service' && (
            <div className="space-y-4">
              <h3 className="mb-3 font-medium text-gray-900">ประวัติการซ่อมบำรุง ({serviceHistory.length})</h3>
              {isLoadingHistory ? (
                <LoadingSkeleton rows={3} cols={4} />
              ) : serviceHistory.length === 0 ? (
                <EmptyState message="ไม่มีประวัติซ่อม" />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">เลข SO</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">ทะเบียน</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">สถานะ</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">วันที่</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {serviceHistory.map((s) => (
                        <tr
                          key={s.id}
                          onClick={() => navigate(`/service-orders/${s.id}`)}
                          className="cursor-pointer hover:bg-blue-50"
                        >
                          <td className="px-4 py-3 font-medium text-blue-600">{s.so_number}</td>
                          <td className="px-4 py-3 text-gray-600">{s.plate_number ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{s.status}</td>
                          <td className="px-4 py-3 text-gray-500">
                            {new Date(s.created_at).toLocaleDateString('th-TH')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════ TAB: ประวัติการรับประกัน ═══════════════════════ */}
          {activeTab === 'warranty' && (
            <div className="space-y-4">
              <h3 className="mb-3 font-medium text-gray-900">ประวัติการรับประกัน ({warrantyHistory.length})</h3>
              {isLoadingHistory ? (
                <LoadingSkeleton rows={3} cols={3} />
              ) : warrantyHistory.length === 0 ? (
                <EmptyState message="ไม่มีประวัติรับประกัน" />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">เลข WR</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">สินค้า</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">หมดอายุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {warrantyHistory.map((w) => (
                        <tr
                          key={w.id}
                          onClick={() => navigate(`/warranties/${w.id}`)}
                          className="cursor-pointer hover:bg-blue-50"
                        >
                          <td className="px-4 py-3 font-medium text-blue-600">{w.warranty_number}</td>
                          <td className="px-4 py-3 text-gray-700">{w.product_name}</td>
                          <td className="px-4 py-3 text-gray-500">
                            {new Date(w.expires_at).toLocaleDateString('th-TH')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════ TAB: การเงิน/ใบเสร็จ ═══════════════════════ */}
          {activeTab === 'finance' && (
            <EmptyState message="ยังไม่มีข้อมูลการเงิน/ใบเสร็จ" />
          )}
        </div>
      </div>

      {/* ═══════════════════════ MODAL: เพิ่มเบอร์โทร ═══════════════════════ */}
      {showPhoneModal && (
        <Modal title="เพิ่มเบอร์โทรศัพท์" onClose={() => setShowPhoneModal(false)}>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>ประเภท</label>
              <select
                value={phoneForm.type}
                onChange={(e) => setPhoneForm((p) => ({ ...p, type: e.target.value as CustomerPhoneType }))}
                className={inputClass}
              >
                {Object.entries(PHONE_TYPE_LABEL).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>หมายเลขโทรศัพท์ *</label>
              <input
                type="tel"
                value={phoneForm.number}
                onChange={(e) => setPhoneForm((p) => ({ ...p, number: e.target.value }))}
                className={inputClass}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={phoneForm.is_primary}
                onChange={(e) => setPhoneForm((p) => ({ ...p, is_primary: e.target.checked }))}
                className="h-4 w-4 rounded text-blue-600"
              />
              <span className="text-sm text-gray-700">ตั้งเป็นเบอร์หลัก</span>
            </label>
          </div>
          <ModalActions
            onCancel={() => setShowPhoneModal(false)}
            onSave={handleSavePhone}
            isSaving={isSavingPhone}
            disabled={!phoneForm.number.trim()}
          />
        </Modal>
      )}

      {/* ═══════════════════════ MODAL: ที่อยู่ออกบิล ═══════════════════════ */}
      {showAddressModal && (
        <Modal
          title={editAddress ? 'แก้ไขที่อยู่' : 'เพิ่มที่อยู่ออกบิล'}
          onClose={() => { setShowAddressModal(false); setEditAddress(null) }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>ชื่อที่อยู่ *</label>
              <input type="text" value={addressForm.label} onChange={(e) => setAddressForm((p) => ({ ...p, label: e.target.value }))} className={inputClass} placeholder="เช่น สำนักงานใหญ่" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>ที่อยู่ *</label>
              <input type="text" value={addressForm.address} onChange={(e) => setAddressForm((p) => ({ ...p, address: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ตำบล / แขวง</label>
              <input type="text" value={addressForm.sub_district} onChange={(e) => setAddressForm((p) => ({ ...p, sub_district: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>อำเภอ / เขต</label>
              <input type="text" value={addressForm.district} onChange={(e) => setAddressForm((p) => ({ ...p, district: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>จังหวัด</label>
              <input type="text" value={addressForm.province} onChange={(e) => setAddressForm((p) => ({ ...p, province: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>รหัสไปรษณีย์</label>
              <input type="text" maxLength={5} value={addressForm.postal_code} onChange={(e) => setAddressForm((p) => ({ ...p, postal_code: e.target.value }))} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addressForm.is_default}
                  onChange={(e) => setAddressForm((p) => ({ ...p, is_default: e.target.checked }))}
                  className="h-4 w-4 rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">ตั้งเป็นที่อยู่ค่าเริ่มต้น</span>
              </label>
            </div>
          </div>
          <ModalActions
            onCancel={() => { setShowAddressModal(false); setEditAddress(null) }}
            onSave={handleSaveAddress}
            isSaving={isSavingAddress}
            disabled={!addressForm.label || !addressForm.address}
          />
        </Modal>
      )}

      {/* ═══════════════════════ MODAL: รถยนต์ ═══════════════════════ */}
      {showVehicleModal && (
        <Modal
          title={editVehicle ? 'แก้ไขข้อมูลรถ' : 'เพิ่มรถยนต์'}
          onClose={() => { setShowVehicleModal(false); setEditVehicle(null) }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>เลขทะเบียน *</label>
              <input type="text" value={vehicleForm.plate_number} onChange={(e) => setVehicleForm((p) => ({ ...p, plate_number: e.target.value }))} className={inputClass} placeholder="เช่น กข 1234 กรุงเทพมหานคร" />
            </div>
            <div>
              <label className={labelClass}>ยี่ห้อ</label>
              <input type="text" value={vehicleForm.brand ?? ''} onChange={(e) => setVehicleForm((p) => ({ ...p, brand: e.target.value }))} className={inputClass} placeholder="Honda, Yamaha..." />
            </div>
            <div>
              <label className={labelClass}>รุ่น</label>
              <input type="text" value={vehicleForm.model ?? ''} onChange={(e) => setVehicleForm((p) => ({ ...p, model: e.target.value }))} className={inputClass} placeholder="Wave 110i..." />
            </div>
            <div>
              <label className={labelClass}>ปี (พ.ศ.)</label>
              <input type="number" value={vehicleForm.year ?? ''} onChange={(e) => setVehicleForm((p) => ({ ...p, year: e.target.value ? Number(e.target.value) : undefined }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>สี</label>
              <input type="text" value={vehicleForm.color ?? ''} onChange={(e) => setVehicleForm((p) => ({ ...p, color: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>เลขเครื่อง</label>
              <input type="text" value={vehicleForm.engine_number ?? ''} onChange={(e) => setVehicleForm((p) => ({ ...p, engine_number: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>เลขตัวถัง / VIN</label>
              <input type="text" value={vehicleForm.chassis_number ?? ''} onChange={(e) => setVehicleForm((p) => ({ ...p, chassis_number: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>เลขไมล์ปัจจุบัน (กม.)</label>
              <input type="number" value={vehicleForm.current_mileage ?? ''} onChange={(e) => setVehicleForm((p) => ({ ...p, current_mileage: e.target.value ? Number(e.target.value) : undefined }))} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vehicleForm.is_purchased_here ?? false}
                  onChange={(e) => setVehicleForm((p) => ({ ...p, is_purchased_here: e.target.checked }))}
                  className="h-4 w-4 rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">ซื้อจากร้านนี้</span>
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>หมายเหตุ</label>
              <textarea rows={2} value={vehicleForm.note ?? ''} onChange={(e) => setVehicleForm((p) => ({ ...p, note: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <ModalActions
            onCancel={() => { setShowVehicleModal(false); setEditVehicle(null) }}
            onSave={handleSaveVehicle}
            isSaving={isSavingVehicle}
            disabled={!vehicleForm.plate_number.trim()}
          />
        </Modal>
      )}

      {/* ═══════════════════════ MODAL: อัปโหลดเอกสาร ═══════════════════════ */}
      {showDocModal && (
        <Modal title="อัปโหลดเอกสาร" onClose={() => { setShowDocModal(false); setDocFile(null) }}>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>ไฟล์เอกสาร *</label>
              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                onChange={handleDocFileChange}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  เลือกไฟล์
                </button>
                <span className="text-sm text-gray-500 truncate max-w-[200px]">
                  {docFile ? docFile.name : 'ยังไม่ได้เลือกไฟล์'}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-400">รองรับ PDF, JPG, PNG, DOC, DOCX, XLS, XLSX</p>
            </div>
            <div>
              <label className={labelClass}>ประเภทเอกสาร *</label>
              <select
                value={docForm.file_type}
                onChange={(e) => setDocForm((p) => ({ ...p, file_type: e.target.value as CustomerDocFileType }))}
                className={inputClass}
              >
                {DOC_FILE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>ชื่อไฟล์ที่แสดง</label>
              <input
                type="text"
                value={docForm.file_name}
                onChange={(e) => setDocForm((p) => ({ ...p, file_name: e.target.value }))}
                placeholder="ถ้าไม่ระบุจะใช้ชื่อไฟล์ต้นฉบับ"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>หมายเหตุ</label>
              <input
                type="text"
                value={docForm.note}
                onChange={(e) => setDocForm((p) => ({ ...p, note: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          <ModalActions
            onCancel={() => { setShowDocModal(false); setDocFile(null) }}
            onSave={handleUploadDoc}
            isSaving={isUploadingDoc}
            saveLabel="อัปโหลด"
            disabled={!docFile}
          />
        </Modal>
      )}

      {/* ═══════════════════════ MODAL: เพิ่มบันทึก Timeline ═══════════════════════ */}
      {showTimelineModal && (
        <Modal title="เพิ่มบันทึก Timeline" onClose={() => setShowTimelineModal(false)}>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>ประเภทเหตุการณ์ *</label>
              <select
                value={timelineForm.event_type}
                onChange={(e) => setTimelineForm((p) => ({ ...p, event_type: e.target.value as TimelineEventType }))}
                className={inputClass}
              >
                {Object.entries(TIMELINE_EVENT_TYPE_LABEL).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>วันที่ / เวลา *</label>
              <input
                type="datetime-local"
                value={timelineForm.event_date}
                onChange={(e) => setTimelineForm((p) => ({ ...p, event_date: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>รายละเอียด *</label>
              <textarea
                rows={3}
                value={timelineForm.description}
                onChange={(e) => setTimelineForm((p) => ({ ...p, description: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          <ModalActions
            onCancel={() => setShowTimelineModal(false)}
            onSave={handleSaveTimeline}
            isSaving={isSavingTimeline}
            disabled={!timelineForm.event_date || !timelineForm.description.trim()}
          />
        </Modal>
      )}

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="ยืนยันการลบลูกค้า"
        message="คุณต้องการลบลูกค้ารายนี้ออกจากระบบใช่หรือไม่? ข้อมูลทั้งหมดของลูกค้าจะถูกลบและไม่สามารถย้อนกลับได้"
        confirmLabel="ลบลูกค้า"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteCustomer}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900">{value}</dd>
    </div>
  )
}

function LoadingSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((__, j) => (
            <div key={j} className="h-4 rounded bg-gray-100 animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-8 text-center text-sm text-gray-400">{message}</p>
  )
}

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
}

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

interface ModalActionsProps {
  onCancel: () => void
  onSave: () => void
  isSaving: boolean
  disabled?: boolean
  saveLabel?: string
}

function ModalActions({ onCancel, onSave, isSaving, disabled, saveLabel = 'บันทึก' }: ModalActionsProps) {
  return (
    <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        ยกเลิก
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving || disabled}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {isSaving ? 'กำลังบันทึก...' : saveLabel}
      </button>
    </div>
  )
}
