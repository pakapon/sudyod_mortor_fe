import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { serviceOrderService } from '@/api/serviceOrderService'
import { quotationService } from '@/api/quotationService'
import { invoiceService } from '@/api/invoiceService'
import { depositService } from '@/api/depositService'
import { toast } from 'react-hot-toast'
import {
  Car, Search, FileText, CheckCircle, Receipt, Wrench, CreditCard, Flag, Package, BadgeDollarSign, Check, Printer, ShoppingCart, ArrowLeft, ArrowRight, PenTool
} from 'lucide-react'
import type { ServiceOrder } from '@/types/serviceOrder'
import type { Quotation } from '@/types/quotation'
import type { Invoice } from '@/types/invoice'

/* ─── Unified Job Data (passed to StepForms) ─── */
export interface JobData {
  sourceType: 'repair' | 'sale'
  sourceId: number | null
  serviceOrder?: ServiceOrder | null
  quotation?: Quotation | null
  invoice?: { id: number; invoice_no?: string; status?: string } | null
  jobNumber: string
  flowLabel: string
  customerName: string
  customerPhone: string
  customerAddress: string
  description: string
  createdAt: string
  branch: { name: string; address: string; phone: string; tax_id: string }
  items: Array<{ id: number; name: string; qty: number; unit_price: number; discount: number; subtotal: number; pricing_type: 'part' | 'labor' }>
  subtotal: number
  vat_percent: number
  vat_amount: number
  grand_total: number
  note: string
}

/* ─── Flow Step Definitions ─── */
export interface FlowStep {
  id: string
  label: string
  role: string
  permission: { module: string; action: string }
  icon: React.ReactNode
  description: string
}

export const FLOW_STEPS: Record<string, FlowStep[]> = {
  repair: [
    { id: 'receive',    label: 'รับรถ',        role: 'หน้าร้าน / เซล / ช่าง', permission: { module: 'service_orders', action: 'can_create' }, icon: <Car className="w-5 h-5" />, description: 'กรอกข้อมูลลูกค้า + รถ + อาการ' },
    { id: 'assess',     label: 'ประเมิน',      role: 'ช่าง',                  permission: { module: 'service_orders', action: 'can_edit' },   icon: <Search className="w-5 h-5" />, description: 'ถ่ายรูปจุดเสีย + ลิสต์รายการ' },
    { id: 'quote',      label: 'เสนอราคา',     role: 'หน้าร้าน / บัญชี',      permission: { module: 'quotations', action: 'can_create' },     icon: <FileText className="w-5 h-5" />, description: 'สร้างใบเสนอราคา' },
    { id: 'approve',    label: 'อนุมัติ',      role: 'หน้าร้าน',              permission: { module: 'quotations', action: 'can_approve' },    icon: <CheckCircle className="w-5 h-5" />, description: 'ลูกค้าดู ปรับ → OK' },
    { id: 'invoice',    label: 'ออกบิล',       role: 'บัญชี',                 permission: { module: 'invoices', action: 'can_create' },       icon: <Receipt className="w-5 h-5" />, description: 'สร้างใบแจ้งหนี้' },
    { id: 'repair_wk',  label: 'ซ่อม',         role: 'ช่าง',                  permission: { module: 'service_orders', action: 'can_edit' },   icon: <Wrench className="w-5 h-5" />, description: 'มอบหมาย → ซ่อม → เสร็จ' },
    { id: 'payment',    label: 'จ่ายเงิน',     role: 'บัญชี / หน้าร้าน',      permission: { module: 'invoices', action: 'can_edit' },        icon: <CreditCard className="w-5 h-5" />, description: 'ลูกค้าจ่าย → ออกใบเสร็จ' },
    { id: 'deliver',    label: 'ส่งรถ',        role: 'ช่าง',                  permission: { module: 'invoices', action: 'can_create' },       icon: <Flag className="w-5 h-5" />, description: 'DN + เซ็น + WR + ปิดงาน' },
  ],
  sale_no_deposit: [
    { id: 'quote',     label: 'เสนอราคา',     role: 'หน้าร้าน / เซล', permission: { module: 'quotations', action: 'can_create' },  icon: <FileText className="w-5 h-5" />, description: 'เลือกลูกค้า + สินค้า' },
    { id: 'approve',   label: 'อนุมัติ',      role: 'หน้าร้าน',       permission: { module: 'quotations', action: 'can_approve' }, icon: <CheckCircle className="w-5 h-5" />, description: 'ลูกค้า OK' },
    { id: 'payment',   label: 'ชำระเงิน',     role: 'บัญชี',          permission: { module: 'invoices', action: 'can_create' },    icon: <CreditCard className="w-5 h-5" />, description: 'INV + ชำระ + RCP' },
    { id: 'deliver',   label: 'ส่งมอบ',       role: 'หน้าร้าน',       permission: { module: 'invoices', action: 'can_create' },    icon: <Package className="w-5 h-5" />, description: 'DN + WR (optional)' },
  ],
  sale_deposit: [
    { id: 'quote',     label: 'เสนอราคา',     role: 'หน้าร้าน / เซล', permission: { module: 'quotations', action: 'can_create' },  icon: <FileText className="w-5 h-5" />, description: 'QT ระบุสินค้า + ราคามัดจำ' },
    { id: 'deposit',   label: 'รับมัดจำ',     role: 'บัญชี',          permission: { module: 'invoices', action: 'can_create' },    icon: <BadgeDollarSign className="w-5 h-5" />, description: 'DP + ใบเสร็จมัดจำ' },
    { id: 'invoice',   label: 'ออกบิล',       role: 'บัญชี',          permission: { module: 'invoices', action: 'can_create' },    icon: <Receipt className="w-5 h-5" />, description: 'INV หักมัดจำ + RCP' },
    { id: 'payment',   label: 'ชำระ',         role: 'บัญชี',          permission: { module: 'invoices', action: 'can_edit' },      icon: <CreditCard className="w-5 h-5" />, description: 'จ่ายส่วนที่เหลือ + ใบเสร็จ' },
    { id: 'deliver',   label: 'ส่งมอบ',       role: 'หน้าร้าน',       permission: { module: 'invoices', action: 'can_create' },    icon: <Package className="w-5 h-5" />, description: 'DN + ถ่ายรูป + WR + ปิดงาน' },
  ],
}

/* ─── Stepper Component ─── */
interface FlowStepperProps {
  steps: FlowStep[]
  currentStep: number
  onStepClick?: (index: number) => void
}

export function FlowStepper({ steps, currentStep, onStepClick }: FlowStepperProps) {
  return (
    <div className="relative">
      {/* Desktop Stepper */}
      <div className="hidden lg:flex items-start">
        {steps.map((step, i) => {
          const isCompleted = i < currentStep
          const isCurrent = i === currentStep
          const isFuture = i > currentStep

          return (
            <div key={step.id} className="flex flex-1 items-start group">
              {/* Step Node */}
              <div className="flex flex-col items-center w-full">
                <div className="relative">
                  {/* Glowing effect for current step */}
                  {isCurrent && (
                    <div className="absolute inset-0 rounded-full bg-blue-400/30 blur-xl animate-pulse" />
                  )}
                  <button
                    onClick={() => onStepClick?.(i)}
                    disabled={isFuture}
                    className={cn(
                      'relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl text-sm font-semibold transition-all duration-500',
                      isCompleted && 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-indigo-400',
                      isCurrent && 'bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-xl shadow-blue-500/40 ring-4 ring-blue-500/20 scale-110',
                      isFuture && 'bg-gray-50/80 border border-gray-200 text-gray-400 backdrop-blur-sm',
                      !isFuture && 'cursor-pointer hover:scale-105 hover:shadow-lg',
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-6 h-6 animate-in zoom-in" />
                    ) : (
                      <span className={cn('transition-transform duration-300', isCurrent && 'scale-110')}>{step.icon}</span>
                    )}
                  </button>
                </div>

                {/* Label */}
                <div className="mt-4 text-center">
                  <div className={cn(
                    'text-[13px] font-semibold transition-colors duration-300',
                    isCurrent ? 'text-blue-700' : isCompleted ? 'text-indigo-800' : 'text-gray-400',
                  )}>
                    {step.label}
                  </div>
                  {isCurrent && (
                    <div className="mt-1.5 inline-flex items-center rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 px-2.5 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-100/50 shadow-sm animate-in slide-in-from-bottom-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse" />
                      {step.role}
                    </div>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {i < steps.length - 1 && (
                <div className="relative mt-7 h-1 flex-1 -mx-4 rounded-full bg-gray-100 overflow-hidden">
                  <div className={cn(
                    'absolute inset-y-0 left-0 transition-all duration-700 ease-out rounded-full',
                    i < currentStep ? 'w-full bg-gradient-to-r from-indigo-500 to-blue-500' : 'w-0'
                  )} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile Stepper (vertical - Current Step Only) */}
      <div className="lg:hidden">
        <div className="flex items-center gap-4 relative">
          <div className="relative z-10">
            <div className="absolute inset-0 rounded-full bg-blue-400/30 blur-md animate-pulse" />
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xs transition-all duration-300 bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/20">
              {steps[currentStep].icon}
            </div>
          </div>
          <div className="flex-1 bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-blue-500 mb-1 uppercase tracking-wider">
                  ขั้นตอนที่ {currentStep + 1} / {steps.length}
                </span>
                <span className="text-base text-blue-700 font-bold">
                  {steps[currentStep].label}
                </span>
              </div>
              <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-2 py-1 text-[10px] text-blue-700 font-medium shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse" />
                {steps[currentStep].role}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">{steps[currentStep].description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

import {
  ReceiveVehicleForm, AssessmentForm, QuotationForm, ApproveForm,
  InvoiceForm, RepairWorkForm, PaymentStepForm, DeliverForm, DepositForm,
} from './components/StepForms'

/* ─── Step Content — renders the correct form per step ID ─── */
function StepContent({ step, flowType, jobData, onComplete }: { step: FlowStep; flowType: string; jobData: JobData | null; onComplete: (meta?: { newId?: number; invoiceId?: number }) => void }) {
  const { permissions } = useAuthStore()
  const canPerform = hasPermission(permissions, step.permission.module, step.permission.action as any)

  const STEP_FORMS: Record<string, React.ReactNode> = {
    receive:    <ReceiveVehicleForm onComplete={onComplete} jobData={jobData} />,
    assess:     <AssessmentForm onComplete={onComplete} jobData={jobData} />,
    quote:      <QuotationForm onComplete={onComplete} jobData={jobData} />,
    approve:    <ApproveForm onComplete={onComplete} jobData={jobData} />,
    invoice:    <InvoiceForm onComplete={onComplete} jobData={jobData} />,
    repair_wk:  <RepairWorkForm onComplete={onComplete} jobData={jobData} />,
    payment:    <PaymentStepForm onComplete={onComplete} jobData={jobData} />,
    deliver:    <DeliverForm onComplete={onComplete} jobData={jobData} type={flowType === 'repair' ? 'repair' : 'sale'} />,
    deposit:    <DepositForm onComplete={onComplete} jobData={jobData} />,
  }

  return (
    <div className="relative rounded-3xl border border-gray-200/50 bg-white/70 backdrop-blur-xl p-6 sm:p-10 shadow-[0_8px_40px_rgb(0,0,0,0.04)] overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl" />
      
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between mb-10 pb-6 border-b border-gray-100/80 gap-4">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-2xl text-blue-600 border border-blue-100/50 shadow-sm ring-1 ring-white/50">
            {step.icon}
          </div>
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 bg-clip-text text-transparent tracking-tight">{step.label}</h3>
            <p className="text-sm text-gray-500 mt-1 font-medium">{step.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">ผู้รับผิดชอบ</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/50 px-3.5 py-1.5 text-xs font-semibold text-blue-700 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {step.role}
          </span>
        </div>
      </div>

      <div className="relative z-10">
        {!canPerform ? (
          <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/50 p-8 text-center shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100/50 text-amber-600 mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-amber-800">
              รอ <strong>{step.role}</strong> ดำเนินการ
            </p>
            <p className="mt-1.5 text-sm text-amber-600/80">คุณไม่มีสิทธิ์ในการจัดการขั้นตอนนี้</p>
          </div>
        ) : (
          STEP_FORMS[step.id] || <p className="text-sm text-gray-400 text-center py-8">ไม่พบฟอร์ม</p>
        )}
      </div>
    </div>
  )
}

/* ─── Print Helpers ─── */
const formatDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const formatCurrency = (n?: number | null) =>
  n != null ? n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

/* ─── Document type config for print ─── */
const STEP_DOC_CONFIG: Record<string, { title: string; noPrefix: string; noField: string }> = {
  receive:   { title: 'ใบรับรถ',       noPrefix: 'SO',  noField: 'so_no' },
  assess:    { title: 'ใบประเมิน',     noPrefix: 'ASM', noField: 'asm_no' },
  quote:     { title: 'ใบเสนอราคา',    noPrefix: 'QT',  noField: 'quotation_no' },
  approve:   { title: 'ใบเสนอราคา',    noPrefix: 'QT',  noField: 'quotation_no' },
  invoice:   { title: 'ใบแจ้งหนี้',    noPrefix: 'INV', noField: 'invoice_no' },
  repair_wk: { title: 'ใบสั่งซ่อม',    noPrefix: 'SO',  noField: 'so_no' },
  payment:   { title: 'ใบเสร็จรับเงิน', noPrefix: 'RCP', noField: 'receipt_no' },
  deliver:   { title: 'ใบส่งมอบ',      noPrefix: 'DN',  noField: 'delivery_no' },
  deposit:   { title: 'ใบรับมัดจำ',    noPrefix: 'DP',  noField: 'deposit_no' },
}

/* ─── Status → Step mapping ─── */
const SO_STATUS_STEP: Record<string, number> = {
  draft: 0, pending_review: 1, pending_quote: 2, approved: 3,
  in_progress: 5, completed: 5, pending_payment: 6, pending_pickup: 7, closed: 7,
}
const QT_STATUS_STEP_SALE: Record<string, number> = {
  draft: 0, sent: 0, approved: 1, rejected: 0,
}

function buildJobData(so: ServiceOrder | null, qt: Quotation | null, sourceType: 'repair' | 'sale', sourceId: number | null, invoice: Invoice | null = null): JobData {
  const customer = so?.customer || qt?.customer
  const cName = customer ? (customer.type === 'corporate' ? customer.company_name : `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim()) : ''
  const branch = so?.branch || qt?.branch
  const items = (qt?.items ?? so?.items ?? []).map((it, i) => ({
    id: ('id' in it ? it.id : i) as number,
    name: ('product_name' in it ? it.product_name : (it as any).custom_name ?? (it as any).product?.name) ?? '',
    qty: ('quantity' in it ? it.quantity : 1),
    unit_price: ('unit_price' in it ? it.unit_price : 0),
    discount: ('discount' in it ? (it.discount ?? 0) : 0),
    subtotal: ('subtotal' in it ? (it.subtotal ?? 0) : ('total_price' in it ? it.total_price : 0)),
    pricing_type: ('pricing_type' in it ? it.pricing_type : 'part') as 'part' | 'labor',
  }))
  return {
    sourceType, sourceId,
    serviceOrder: so, quotation: qt,
    invoice: invoice ? { id: invoice.id, invoice_no: invoice.invoice_no, status: invoice.status } : null,
    jobNumber: so?.so_number ?? qt?.quotation_no ?? '',
    flowLabel: sourceType === 'repair' ? 'ซ่อมรถ' : 'ขายสินค้า',
    customerName: cName || 'ลูกค้า',
    customerPhone: (customer as any)?.primary_phone ?? '',
    customerAddress: (customer as any)?.address ?? '',
    description: so ? `${so.vehicle?.brand ?? ''} ${so.vehicle?.model ?? ''} ${so.vehicle?.plate_number ?? ''} / ${so.symptom}`.trim() : (qt?.note ?? ''),
    createdAt: so?.created_at ?? qt?.created_at ?? new Date().toISOString(),
    branch: { name: branch?.name ?? '', address: (branch as any)?.address ?? '', phone: (branch as any)?.phone ?? '', tax_id: (branch as any)?.tax_id ?? '' },
    items,
    subtotal: qt?.subtotal ?? items.reduce((s, i) => s + i.subtotal, 0),
    vat_percent: qt?.vat_percent ?? 7,
    vat_amount: qt?.vat_amount ?? 0,
    grand_total: qt?.grand_total ?? items.reduce((s, i) => s + i.subtotal, 0),
    note: qt?.note ?? so?.internal_note ?? '',
  }
}

/* ─── Job Flow Page ─── */
export function JobFlowPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // Determine mode: create (/billing/new/repair) vs view (/billing/jobs/repair:15)
  const isCreateMode = location.pathname.startsWith('/billing/new/')
  const createFlowType = location.pathname.endsWith('/repair') ? 'repair' : 'sale'

  // Parse id param: "repair:15" → { sourceType: 'repair', sourceId: 15 }
  const parsed = !isCreateMode && id ? id.split(':') : []
  const sourceType: 'repair' | 'sale' = isCreateMode ? createFlowType as any : (parsed[0] === 'sale' ? 'sale' : 'repair')
  const sourceId = parsed[1] ? Number(parsed[1]) : null

  const [jobData, setJobData] = useState<JobData | null>(null)
  const [loading, setLoading] = useState(!isCreateMode)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [flowType, setFlowType] = useState<string>(sourceType === 'repair' ? 'repair' : 'sale_no_deposit')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Determine flow type for stepper
  const steps = FLOW_STEPS[flowType] ?? FLOW_STEPS.repair

  // Fetch real data
  useEffect(() => {
    if (isCreateMode) {
      setJobData(buildJobData(null, null, sourceType, null))
      setCurrentStep(0)
      return
    }
    if (id && !id.includes(':')) { setError('URL ไม่ถูกต้อง: กรุณาระบุประเภทงาน เช่น repair:23 หรือ sale:23'); setLoading(false); return }
    if (!sourceId) { setError('ไม่พบรหัสงาน'); setLoading(false); return }

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        if (sourceType === 'repair') {
          const { data: soRes } = await serviceOrderService.getServiceOrder(sourceId)
          const so = soRes.data
          let qt: Quotation | null = null
          try {
            const { data: qtRes } = await quotationService.getQuotations({ service_order_id: sourceId, limit: 1 })
            qt = qtRes.data?.[0] ?? null
          } catch { /* no QT yet */ }
          let inv: Invoice | null = null
          if (qt?.id) {
            try {
              const { data: invRes } = await invoiceService.getInvoices({ customer_id: so.customer_id, limit: 50 })
              inv = invRes.data?.find((i) => i.quotation_id === qt!.id) ?? null
            } catch { /* no invoice yet */ }
          }
          setJobData(buildJobData(so, qt, 'repair', sourceId, inv))
          setCurrentStep(SO_STATUS_STEP[so.status] ?? 0)
        } else {
          const { data: qtRes } = await quotationService.getQuotation(sourceId)
          const qt = qtRes.data
          let inv: Invoice | null = null
          try {
            const { data: invRes } = await invoiceService.getInvoices({ customer_id: qt.customer_id, limit: 50 })
            inv = invRes.data?.find((i) => i.quotation_id === qt.id) ?? null
          } catch { /* no invoice yet */ }
          // detect if deposit exists to determine sale_deposit vs sale_no_deposit flow
          let hasDeposit = false
          try {
            const { data: dpRes } = await depositService.getDeposits({ quotation_id: qt.id, limit: 1 })
            hasDeposit = (dpRes.data?.length ?? 0) > 0
          } catch { /* no deposits */ }
          setFlowType(hasDeposit ? 'sale_deposit' : 'sale_no_deposit')
          setJobData(buildJobData(null, qt, 'sale', sourceId, inv))
          setCurrentStep(QT_STATUS_STEP_SALE[qt.status] ?? 0)
        }
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ')
        toast.error('โหลดข้อมูลงานไม่สำเร็จ')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [sourceType, sourceId, isCreateMode, refreshTrigger])

  // Refresh data after step completion
  const handleStepComplete = (meta?: { newId?: number; invoiceId?: number }) => {
    if (isCreateMode && meta?.newId) {
      navigate(`/billing/jobs/${sourceType}:${meta.newId}`)
      return
    }
    if (meta?.invoiceId) {
      setJobData((prev) => prev ? { ...prev, invoice: { id: meta.invoiceId! } } : prev)
    }
    if (!isCreateMode) {
      setRefreshTrigger((t) => t + 1)
    }
    setCurrentStep(Math.min(steps.length - 1, currentStep + 1))
  }

  const currentStepId = steps[currentStep]?.id ?? ''
  const docConfig = STEP_DOC_CONFIG[currentStepId] ?? { title: 'เอกสาร', noPrefix: 'DOC', noField: 'doc_no' }
  const docNo = jobData?.quotation?.quotation_no ?? jobData?.serviceOrder?.so_number ?? ''

  return (
    <>
    {/* ─── Screen View ───────────────────────────────────── */}
    <div className="space-y-6 print:hidden">
      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <span className="ml-3 text-gray-500">กำลังโหลดข้อมูล...</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <button onClick={() => navigate('/billing')} className="mt-3 text-sm text-blue-600 hover:underline">← กลับหน้า Billing Hub</button>
        </div>
      )}

      {/* Back + Header */}
      {!loading && !error && (
      <>
      <div className="relative">
        {/* Background ambient glow */}
        <div className="absolute top-0 left-1/4 -ml-20 -mt-20 h-40 w-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        
        <button
          onClick={() => navigate('/billing')}
          className="group mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm group-hover:border-gray-300 group-hover:shadow transition-all">
            <ArrowLeft className="h-3.5 w-3.5" />
          </div>
          กลับไปหน้าภาพรวม
        </button>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-lg shadow-gray-900/20 ring-1 ring-white/10">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-transparent opacity-50" />
              {sourceType === 'repair' ? <PenTool className="h-6 w-6" /> : <ShoppingCart className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {isCreateMode ? 'สร้างรายการใหม่' : (jobData?.jobNumber ?? '')}
                </h1>
                <span className="inline-flex items-center rounded-full bg-blue-50/80 border border-blue-200/50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 shadow-sm backdrop-blur-sm">
                  {jobData?.flowLabel ?? (sourceType === 'repair' ? 'ซ่อมรถ' : 'ขายสินค้า')}
                </span>
              </div>
              <p className="text-sm text-gray-500 font-medium mt-1 flex items-center gap-2">
                <span className="text-gray-700">{jobData?.customerName}</span>
                {jobData?.description && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span>{jobData.description}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {jobData?.createdAt && (
              <div className="hidden sm:flex flex-col text-right mr-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">วันที่สร้าง</span>
                <span className="text-xs font-medium text-gray-600">{formatDate(jobData.createdAt)}</span>
              </div>
            )}
            {!isCreateMode && (
              <button
                onClick={() => { toast.success('เปิดหน้าต่างพิมพ์'); window.print() }}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 hover:bg-gray-50 transition-all hover:shadow"
              >
                <Printer className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
                <span>พิมพ์เอกสาร</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="rounded-3xl border border-gray-200/60 bg-white/60 backdrop-blur-md p-6 sm:px-8 shadow-sm">
        <FlowStepper
          steps={steps}
          currentStep={currentStep}
          onStepClick={(i) => { if (i <= currentStep) setCurrentStep(i) }}
        />
      </div>

      {/* Step Content */}
      <StepContent
        step={steps[currentStep]}
        flowType={flowType}
        jobData={jobData}
        onComplete={handleStepComplete}
      />

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 pb-12">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="group inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-white transition-all"
        >
          <ArrowLeft className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
          ย้อนกลับ
        </button>
        <div className="flex items-center gap-2">
          {steps.map((_, idx) => (
            <div 
              key={idx} 
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                idx === currentStep ? "w-6 bg-blue-600" : idx < currentStep ? "w-1.5 bg-indigo-300" : "w-1.5 bg-gray-200"
              )} 
            />
          ))}
        </div>
        <button
          onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
          disabled={currentStep === steps.length - 1}
          className="group inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-gray-900/20 hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/30 disabled:opacity-40 transition-all"
        >
          ถัดไป
          <ArrowRight className="h-4 w-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </button>
      </div>
      </>
      )}
    </div>

    {/* ─── Print Document ────────────────────────────────── */}
    {(() => {
      if (!jobData) return null
      const ROWS_PER_PAGE = 10
      const items = jobData.items ?? []
      const pages: typeof items[] = []
      for (let i = 0; i < Math.max(items.length, 1); i += ROWS_PER_PAGE) {
        pages.push(items.slice(i, i + ROWS_PER_PAGE))
      }
      const isLastPage = (idx: number) => idx === pages.length - 1

      const PageHeader = () => (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '2px solid #1f2937', marginBottom: '12px' }}>
            <div>
              <p style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{jobData.branch.name}</p>
              <p style={{ fontSize: '11px', color: '#4b5563', margin: '2px 0 0' }}>{jobData.branch.address}</p>
              <p style={{ fontSize: '11px', color: '#4b5563', margin: '1px 0 0' }}>เลขประจำตัวผู้เสียภาษี: {jobData.branch.tax_id}</p>
              <p style={{ fontSize: '11px', color: '#4b5563', margin: '1px 0 0' }}>โทร: {jobData.branch.phone}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>{docConfig.title}</p>
              <p style={{ fontSize: '12px', margin: '4px 0 0' }}>เลขที่: {docNo}</p>
              <p style={{ fontSize: '12px', margin: '2px 0 0' }}>วันที่: {formatDate(jobData.createdAt)}</p>
              <p style={{ fontSize: '12px', margin: '2px 0 0' }}>อ้างอิงงาน: {jobData.jobNumber}</p>
            </div>
          </div>
          {/* Customer info */}
          <div style={{ padding: '4px 0 10px' }}>
            <p style={{ fontSize: '10px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', margin: '0 0 4px' }}>ลูกค้า</p>
            <p style={{ fontWeight: 600, fontSize: '13px', margin: 0 }}>{jobData.customerName}</p>
            <p style={{ fontSize: '11px', color: '#4b5563', margin: '1px 0 0' }}>{jobData.customerAddress}</p>
            <p style={{ fontSize: '11px', color: '#4b5563', margin: '1px 0 0' }}>โทร: {jobData.customerPhone}</p>
          </div>
        </div>
      )

      return (
        <div className="hidden print:block" style={{ fontFamily: 'sans-serif', fontSize: '13px', color: '#111827' }}>
          {pages.map((pageItems, pageIdx) => (
            <div
              key={pageIdx}
              style={{
                width: '100%',
                pageBreakAfter: isLastPage(pageIdx) ? 'auto' : 'always',
                ...(isLastPage(pageIdx) && {
                  height: '262mm',
                  display: 'flex',
                  flexDirection: 'column',
                }),
              }}
            >
              <PageHeader />

              {/* Items table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1f2937', color: 'white' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', width: '28px', fontWeight: 600 }}>#</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>รายการ</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: '56px', fontWeight: 600 }}>จำนวน</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: '88px', fontWeight: 600 }}>ราคา/หน่วย</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: '76px', fontWeight: 600 }}>ส่วนลด</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: '88px', fontWeight: 600 }}>รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item, idx) => {
                    const globalIdx = pageIdx * ROWS_PER_PAGE + idx
                    const lineTotal = item.subtotal ?? (item.qty * item.unit_price - (item.discount ?? 0))
                    return (
                      <tr key={item.id ?? globalIdx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '6px 8px' }}>{globalIdx + 1}</td>
                        <td style={{ padding: '6px 8px' }}>{item.name}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{item.qty}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{item.discount ? formatCurrency(item.discount) : '—'}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 500 }}>{formatCurrency(lineTotal)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Last page only: totals + signature */}
              {isLastPage(pageIdx) && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ flex: 1 }}>
                      {jobData.note && (
                        <>
                          <p style={{ fontSize: '10px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', margin: '0 0 4px' }}>หมายเหตุ</p>
                          <p style={{ fontSize: '12px', whiteSpace: 'pre-wrap', margin: 0 }}>{jobData.note}</p>
                        </>
                      )}
                    </div>
                    <div style={{ width: '210px', border: '1px solid #d1d5db' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', fontSize: '12px' }}>
                        <span>ราคาก่อน VAT</span>
                        <span>{formatCurrency(jobData.subtotal)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', fontSize: '12px', borderTop: '1px solid #e5e7eb' }}>
                        <span>VAT ({jobData.vat_percent}%)</span>
                        <span>{formatCurrency(jobData.vat_amount)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', fontSize: '14px', fontWeight: 700, borderTop: '2px solid #1f2937' }}>
                        <span>ยอดรวมทั้งสิ้น</span>
                        <span>{formatCurrency(jobData.grand_total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Spacer pushes signature to bottom */}
                  <div style={{ flex: 1 }} />

                  {/* Signature block */}
                  <div style={{ paddingTop: '16px', borderTop: '1px solid #e5e7eb', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ textAlign: 'center', width: '180px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ borderBottom: '1px solid #9ca3af', height: '36px', marginBottom: '4px' }} />
                        <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>ลูกค้า / วันที่</p>
                      </div>
                      <div style={{ textAlign: 'center', width: '180px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ borderBottom: '1px solid #9ca3af', height: '36px', marginBottom: '4px' }} />
                        <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>ผู้อนุมัติ / วันที่</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )
    })()}
    </>
  )
}
