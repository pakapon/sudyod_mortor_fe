import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { serviceOrderService } from '@/api/serviceOrderService'
import { quotationService } from '@/api/quotationService'
import { invoiceService } from '@/api/invoiceService'
import { depositService } from '@/api/depositService'
import { deliveryNoteService } from '@/api/deliveryNoteService'
import { toast } from 'react-hot-toast'
import {
  Car, Search, FileText, CheckCircle, Receipt, Wrench, CreditCard, Flag, Package, BadgeDollarSign, Check, Printer, ShoppingCart, ArrowLeft, ArrowRight, PenTool, Eye, Download, Link2
} from 'lucide-react'
import type { ServiceOrder } from '@/types/serviceOrder'
import type { Quotation } from '@/types/quotation'
import type { Invoice } from '@/types/invoice'
import { DocumentOutputModal } from '@/components/ui/DocumentOutputModal'
import { jsPDF } from 'jspdf'
import { drawBillingDocCanvas } from '@/lib/documentRenderers'

/* ─── Unified Job Data (passed to StepForms) ─── */
export interface JobData {
  sourceType: 'repair' | 'sale'
  sourceId: number | null
  serviceOrder?: ServiceOrder | null
  quotation?: Quotation | null
  invoice?: { id: number; invoice_no?: string; status?: Invoice['status']; grand_total?: number; balance_due?: number; paid_amount?: number } | null
  jobNumber: string
  flowLabel: string
  customerName: string
  customerPhone: string
  customerAddress: string
  description: string
  createdAt: string
  branch: { name: string; address: string; phone: string; tax_id: string }
  items: Array<{ id: number; name: string; qty: number; unit_price: number; discount: number; subtotal: number; pricing_type: 'part' | 'labor'; product_id?: number; product_variant_id?: number }>
  subtotal: number
  vat_percent: number
  vat_amount: number
  grand_total: number
  note: string
  payment?: { method: string; amount: number; reference?: string; paid_at?: string } | null
}

export interface QuotationDraft {
  items: JobData['items']
  subtotal: number
  discount: number
  vatPercent: number
  vatAmount: number
  grandTotal: number
  note?: string
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
  maxStep: number
  isFlowCompleted?: boolean
  onStepClick?: (index: number) => void
}

export function FlowStepper({ steps, currentStep, maxStep, isFlowCompleted = false, onStepClick }: FlowStepperProps) {
  return (
    <div className="relative">
      {/* Desktop Stepper */}
      <div className="hidden lg:flex items-start">
        {steps.map((step, i) => {
          const isCompleted = isFlowCompleted ? i <= maxStep : i < maxStep
          const isCurrent = !isFlowCompleted && i === currentStep
          const isFuture = i > maxStep

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
                    disabled={i > maxStep}
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
                    i < maxStep ? 'w-full bg-gradient-to-r from-indigo-500 to-blue-500' : 'w-0'
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
function StepContent({ step, flowType, jobData, onComplete, isPastStep, onGoToStep, onQuoteDraftChange, onPrintInvoiceDocument, onPrintDN, onPrintWR, onWarrantyMonthsChange }: {
  step: FlowStep
  flowType: string
  jobData: JobData | null
  onComplete: (meta?: { newId?: number; invoiceId?: number }) => void
  isPastStep: boolean
  onGoToStep: (stepId: string) => void
  onQuoteDraftChange: (draft: QuotationDraft | null) => void
  onPrintInvoiceDocument?: (invoiceId: number, docType: 'invoice' | 'receipt') => void
  onPrintDN?: () => void
  onPrintWR?: () => void
  onWarrantyMonthsChange?: (months: number) => void
}) {
  const { permissions } = useAuthStore()
  const canPerform = hasPermission(permissions, step.permission.module, step.permission.action as any)
  const canApproveQt = hasPermission(permissions, 'quotations', 'can_approve')

  const STEP_FORMS: Record<string, React.ReactNode> = {
    receive:    <ReceiveVehicleForm onComplete={onComplete} jobData={jobData} />,
    assess:     <AssessmentForm onComplete={onComplete} jobData={jobData} />,
    quote:      <QuotationForm onComplete={onComplete} jobData={jobData} onDraftChange={onQuoteDraftChange} />,
    approve:    <ApproveForm onComplete={onComplete} jobData={jobData} />,
    invoice:    <InvoiceForm onComplete={onComplete} jobData={jobData} />,
    repair_wk:  <RepairWorkForm onComplete={onComplete} jobData={jobData} />,
    payment:    <PaymentStepForm onComplete={onComplete} jobData={jobData} onViewInvoice={(invoiceId) => { window.location.assign(`/billing/invoices/${invoiceId}`) }} onPrintInvoiceDocument={onPrintInvoiceDocument} />,
    deliver:    <DeliverForm onComplete={onComplete} jobData={jobData} type={flowType === 'repair' ? 'repair' : 'sale'} onPrintDN={onPrintDN} onPrintWR={onPrintWR} onWarrantyMonthsChange={onWarrantyMonthsChange} />,
    deposit:    <DepositForm onComplete={onComplete} jobData={jobData} />,
  }

  return (
    <div className="relative rounded-3xl border border-gray-200/50 bg-white/70 backdrop-blur-xl p-6 sm:p-10 shadow-[0_8px_40px_rgb(0,0,0,0.04)]">
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
        ) : isPastStep ? (
          <>
            <div className="pointer-events-none select-none opacity-60">
              {STEP_FORMS[step.id] || <p className="text-sm text-gray-400 text-center py-8">ไม่พบฟอร์ม</p>}
            </div>
            {/* Past-step action banner */}
            {flowType === 'repair' && step.id === 'quote' && !['completed', 'pending_payment', 'pending_pickup', 'closed'].includes(jobData?.serviceOrder?.status ?? '') ? (
              <div className="mt-6 rounded-2xl border border-blue-200/60 bg-blue-50/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-blue-800">ส่งกลับให้ช่างประเมิน</p>
                  <p className="text-xs text-blue-600 mt-0.5">ยกเลิกใบเสนอราคาและส่งกลับให้ช่างประเมินใหม่</p>
                </div>
                <button
                  onClick={() => onGoToStep('assess')}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-all whitespace-nowrap"
                >
                  <ArrowLeft className="h-4 w-4" /> ส่งกลับช่างประเมิน
                </button>
              </div>
            ) : step.id === 'approve' && canApproveQt && jobData?.serviceOrder?.status === 'pending_quote' ? (
              <div className="mt-6 rounded-2xl border border-amber-200/60 bg-amber-50/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-amber-800">ยกเลิกและแก้ไขใบเสนอราคา</p>
                  <p className="text-xs text-amber-600 mt-0.5">ย้อนกลับไปแก้ไขใบเสนอราคาก่อนอนุมัติ</p>
                </div>
                <button
                  onClick={() => onGoToStep('quote')}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-600/20 hover:bg-amber-700 transition-all whitespace-nowrap"
                >
                  <ArrowLeft className="h-4 w-4" /> แก้ไขใบเสนอราคา
                </button>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-gray-200/60 bg-gray-50/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">ขั้นตอนนี้ดำเนินการเสร็จสิ้นแล้ว</p>
                    <p className="text-xs text-gray-500 mt-0.5">ไม่สามารถแก้ไขย้อนหลังได้</p>
                  </div>
                </div>
              </div>
            )}
          </>
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

const toNumber = (value: unknown, fallback = 0): number => {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

const cleanDocumentNote = (raw?: string | null): string => {
  const text = (raw ?? '')
    .replace(/\[CHECKLIST_TEMPLATE_START\][\s\S]*?\[CHECKLIST_TEMPLATE_END\]/g, '')
    .replace(/\[CHECKLIST_RESULT_START\][\s\S]*?\[CHECKLIST_RESULT_END\]/g, '')
    .trim()
  return text
}


function drawWarrantyDocCanvas(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  opts: {
    docNo: string; docDate: string
    branch: { name: string; address: string; phone: string; tax_id: string }
    customerName: string; customerPhone?: string
    vehicle?: { brand?: string; model?: string; plate?: string; mileage?: number }
    items: Array<{ name: string; qty: number; pricing_type: string }>
    note?: string
    warrantyMonths?: number
  }
) {
  const pad = 72; const right = w - pad; let y = 64
  const tx = (text: string, x: number, yy: number, size: number, color = '#111827', weight = 400, align: CanvasTextAlign = 'left') => {
    ctx.font = `${weight} ${size}px sans-serif`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(text, x, yy); ctx.textAlign = 'left'
  }
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)
  tx(opts.branch.name || 'บริษัท', pad, y + 28, 26, '#111827', 700)
  tx(opts.branch.address || '', pad, y + 54, 15, '#4b5563')
  tx(`เลขประจำตัวผู้เสียภาษี ${opts.branch.tax_id || '-'}`, pad, y + 74, 15, '#4b5563')
  tx(`โทร: ${opts.branch.phone || '-'}`, pad, y + 94, 15, '#4b5563')
  tx('ใบรับประกัน', right, y + 32, 38, '#111827', 700, 'right')
  tx(`เลขที่   ${opts.docNo}`, right, y + 62, 18, '#374151', 500, 'right')
  tx(`วันที่   ${opts.docDate}`, right, y + 86, 18, '#374151', 500, 'right')
  y += 140
  ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(right, y); ctx.stroke(); y += 28
  tx('ลูกค้า', pad, y, 14, '#9ca3af', 600); y += 22
  tx(opts.customerName, pad, y, 22, '#111827', 700); y += 28
  if (opts.customerPhone) { tx(`โทร ${opts.customerPhone}`, pad, y, 15, '#4b5563'); y += 22 }
  y += 16
  if (opts.vehicle) {
    tx('ข้อมูลรถ', pad, y, 14, '#9ca3af', 600); y += 22
    const veh = opts.vehicle
    tx([veh.brand, veh.model].filter(Boolean).join(' ') || '-', pad, y, 18, '#111827', 600); y += 26
    if (veh.plate) tx(`ทะเบียน: ${veh.plate}`, pad, y, 15, '#4b5563')
    if (veh.mileage) tx(`เลขไมล์: ${veh.mileage.toLocaleString()} กม.`, pad + 320, y, 15, '#4b5563')
    y += 26
  }
  y += 16
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(right, y); ctx.stroke(); y += 20
  tx('รายการที่รับประกัน', pad, y, 16, '#111827', 700); y += 28
  const wItems = opts.items.filter((it) => it.pricing_type === 'part')
  const showItems = wItems.length > 0 ? wItems : opts.items
  showItems.slice(0, 15).forEach((item, i) => {
    tx(`${i + 1}. ${item.name || '-'}`, pad + 20, y, 16, '#374151'); y += 26
  })
  y += 20
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(right, y); ctx.stroke(); y += 20
  tx('เงื่อนไขการรับประกัน', pad, y, 16, '#111827', 700); y += 30
  const terms = [
    `1. รับประกันคุณภาพอะไหล่และค่าแรง ระยะเวลา ${opts.warrantyMonths ?? 3} เดือน นับจากวันรับรถ`,
    '2. ไม่รับประกันกรณีเกิดอุบัติเหตุ การดัดแปลง หรือการใช้งานผิดวัตถุประสงค์',
    '3. การรับประกันไม่ครอบคลุมชิ้นส่วนที่สึกหรอตามปกติ (ยาง, เบรก, น้ำมัน)',
    '4. ต้องนำรถเข้ารับการตรวจสอบและซ่อมที่ร้านเดิมเท่านั้น',
    '5. กรุณาเก็บใบรับประกันนี้ไว้เป็นหลักฐาน',
  ]
  terms.forEach((term) => { tx(term, pad, y, 15, '#4b5563'); y += 26 })
  if (opts.note) { y += 14; tx('หมายเหตุ', pad, y, 14, '#9ca3af', 600); y += 22; tx(opts.note, pad, y, 15, '#4b5563') }
  // Signature — always at bottom
  const sigY = h - 210
  ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 1; ctx.beginPath()
  ctx.moveTo(pad + 20, sigY); ctx.lineTo(pad + 310, sigY)
  ctx.moveTo(right - 310, sigY); ctx.lineTo(right - 20, sigY); ctx.stroke()
  tx('ลูกค้าผู้รับการรับประกัน', pad + 165, sigY + 28, 15, '#6b7280', 400, 'center')
  tx('วันที่ ____________________', pad + 165, sigY + 52, 14, '#9ca3af', 400, 'center')
  tx(`ในนาม ${opts.customerName}`, pad + 165, sigY + 78, 13, '#374151', 400, 'center')
  tx('ผู้รับรองการรับประกัน', right - 165, sigY + 28, 15, '#6b7280', 400, 'center')
  tx('วันที่ ____________________', right - 165, sigY + 52, 14, '#9ca3af', 400, 'center')
  tx(`ในนาม ${opts.branch.name}`, right - 165, sigY + 78, 13, '#374151', 400, 'center')
  tx('Sudyod Motor', w / 2, h - 30, 13, '#d1d5db', 400, 'center')
}

function drawDNCanvas(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  opts: {
    docNo: string; docDate: string
    branch: { name: string; address: string; phone: string; tax_id: string }
    customerName: string; customerPhone?: string
    vehicle?: { brand?: string; model?: string; plate?: string; mileage?: number }
    items: Array<{ name: string; qty: number; unit_price: number; subtotal: number; pricing_type: string }>
    note?: string
  }
) {
  const pad = 72; const right = w - pad; let y = 64
  const tx = (text: string, x: number, yy: number, size: number, color = '#111827', weight = 400, align: CanvasTextAlign = 'left') => {
    ctx.font = `${weight} ${size}px sans-serif`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(text, x, yy); ctx.textAlign = 'left'
  }
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)
  // Header
  tx(opts.branch.name || 'บริษัท', pad, y + 28, 26, '#111827', 700)
  tx(opts.branch.address || '', pad, y + 54, 15, '#4b5563')
  tx(`เลขประจำตัวผู้เสียภาษี ${opts.branch.tax_id || '-'}`, pad, y + 74, 15, '#4b5563')
  tx(`โทร: ${opts.branch.phone || '-'}`, pad, y + 94, 15, '#4b5563')
  tx('ใบส่งมอบ', right, y + 32, 38, '#111827', 700, 'right')
  tx(`เลขที่   ${opts.docNo}`, right, y + 62, 18, '#374151', 500, 'right')
  tx(`วันที่   ${opts.docDate}`, right, y + 86, 18, '#374151', 500, 'right')
  y += 140
  ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(right, y); ctx.stroke(); y += 28
  // Customer
  tx('ลูกค้า', pad, y, 14, '#9ca3af', 600); y += 22
  tx(opts.customerName, pad, y, 22, '#111827', 700); y += 28
  if (opts.customerPhone) { tx(`โทร ${opts.customerPhone}`, pad, y, 15, '#4b5563'); y += 22 }
  y += 16
  // Vehicle
  if (opts.vehicle) {
    tx('ข้อมูลรถ', pad, y, 14, '#9ca3af', 600); y += 22
    const veh = opts.vehicle
    tx([veh.brand, veh.model].filter(Boolean).join(' ') || '-', pad, y, 18, '#111827', 600); y += 26
    if (veh.plate) tx(`ทะเบียน: ${veh.plate}`, pad, y, 15, '#4b5563')
    if (veh.mileage) tx(`เลขไมล์: ${veh.mileage.toLocaleString()} กม.`, pad + 320, y, 15, '#4b5563')
    y += 26
  }
  y += 16
  // Items table
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(right, y); ctx.stroke(); y += 16
  tx('รายการ', pad, y, 15, '#111827', 700)
  tx('จำนวน', right - 340, y, 15, '#111827', 700, 'right')
  tx('ราคา/หน่วย', right - 200, y, 15, '#111827', 700, 'right')
  tx('รวม', right, y, 15, '#111827', 700, 'right')
  y += 8
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(right, y); ctx.stroke(); y += 20
  opts.items.slice(0, 20).forEach((item) => {
    tx(item.name || '-', pad, y, 15, '#374151')
    tx(String(item.qty), right - 340, y, 15, '#374151', 400, 'right')
    tx(item.unit_price.toFixed(2), right - 200, y, 15, '#374151', 400, 'right')
    tx(item.subtotal.toFixed(2), right, y, 15, '#374151', 400, 'right')
    y += 26
  })
  y += 10
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(right, y); ctx.stroke(); y += 20
  if (opts.note) { tx('หมายเหตุ', pad, y, 14, '#9ca3af', 600); y += 22; tx(opts.note, pad, y, 15, '#4b5563'); y += 28 }
  // Conditions
  y += 16
  tx('ข้าพเจ้าได้รับสินค้า/รถคืนในสภาพที่สมบูรณ์ถูกต้องครบถ้วนตามรายการข้างต้น', pad, y, 15, '#374151'); y += 26
  // Signatures
  const sigY = h - 210
  ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 1; ctx.beginPath()
  ctx.moveTo(pad + 20, sigY); ctx.lineTo(pad + 310, sigY)
  ctx.moveTo(right - 310, sigY); ctx.lineTo(right - 20, sigY); ctx.stroke()
  tx('ผู้รับสินค้า / ลูกค้า', pad + 165, sigY + 28, 15, '#6b7280', 400, 'center')
  tx('วันที่ ____________________', pad + 165, sigY + 52, 14, '#9ca3af', 400, 'center')
  tx(`ในนาม ${opts.customerName}`, pad + 165, sigY + 78, 13, '#374151', 400, 'center')
  tx('ผู้ส่งมอบ', right - 165, sigY + 28, 15, '#6b7280', 400, 'center')
  tx('วันที่ ____________________', right - 165, sigY + 52, 14, '#9ca3af', 400, 'center')
  tx(`ในนาม ${opts.branch.name}`, right - 165, sigY + 78, 13, '#374151', 400, 'center')
  tx('Sudyod Motor', w / 2, h - 30, 13, '#d1d5db', 400, 'center')
}

const crc32Table = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    c = crc32Table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function writeUint32LE(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true)
}

function writeUint16LE(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value & 0xffff, true)
}

async function buildSingleFileZip(fileName: string, fileBlob: Blob): Promise<Blob> {
  const fileBytes = new Uint8Array(await fileBlob.arrayBuffer())
  const fileNameBytes = new TextEncoder().encode(fileName)
  const fileCrc32 = crc32(fileBytes)

  const localHeaderSize = 30 + fileNameBytes.length
  const centralHeaderSize = 46 + fileNameBytes.length
  const eocdSize = 22
  const totalSize = localHeaderSize + fileBytes.length + centralHeaderSize + eocdSize

  const out = new Uint8Array(totalSize)
  const view = new DataView(out.buffer)
  let offset = 0

  // Local file header
  writeUint32LE(view, offset, 0x04034b50); offset += 4
  writeUint16LE(view, offset, 20); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint32LE(view, offset, fileCrc32); offset += 4
  writeUint32LE(view, offset, fileBytes.length); offset += 4
  writeUint32LE(view, offset, fileBytes.length); offset += 4
  writeUint16LE(view, offset, fileNameBytes.length); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  out.set(fileNameBytes, offset); offset += fileNameBytes.length
  out.set(fileBytes, offset); offset += fileBytes.length

  const centralDirectoryOffset = offset

  // Central directory file header
  writeUint32LE(view, offset, 0x02014b50); offset += 4
  writeUint16LE(view, offset, 20); offset += 2
  writeUint16LE(view, offset, 20); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint32LE(view, offset, fileCrc32); offset += 4
  writeUint32LE(view, offset, fileBytes.length); offset += 4
  writeUint32LE(view, offset, fileBytes.length); offset += 4
  writeUint16LE(view, offset, fileNameBytes.length); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint32LE(view, offset, 0); offset += 4
  writeUint32LE(view, offset, 0); offset += 4
  out.set(fileNameBytes, offset); offset += fileNameBytes.length

  // End of central directory record
  writeUint32LE(view, offset, 0x06054b50); offset += 4
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 1); offset += 2
  writeUint16LE(view, offset, 1); offset += 2
  writeUint32LE(view, offset, centralHeaderSize); offset += 4
  writeUint32LE(view, offset, centralDirectoryOffset); offset += 4
  writeUint16LE(view, offset, 0)

  return new Blob([out], { type: 'application/zip' })
}

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
  draft: 0, pending_review: 1, pending_quote: 2, approved: 4,
  in_progress: 5, completed: 5, pending_payment: 6, pending_pickup: 7, closed: 7,
}
const QT_STATUS_STEP_SALE: Record<string, number> = {
  draft: 1, sent: 1, approved: 1, rejected: 0,
}

function buildJobData(so: ServiceOrder | null, qt: Quotation | null, sourceType: 'repair' | 'sale', sourceId: number | null, invoice: Invoice | null = null, latestPayment?: { method: string; amount: number; reference?: string; paid_at?: string } | null): JobData {
  const customer = so?.customer || qt?.customer
  const cName = customer ? (customer.type === 'corporate' ? customer.company_name : `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim()) : ''
  const branch = so?.branch || qt?.branch
  const items = (qt?.items ?? so?.items ?? []).map((it, i) => {
    const qty = toNumber('quantity' in it ? it.quantity : 1, 1)
    const unitPrice = toNumber('unit_price' in it ? it.unit_price : 0, 0)
    const discount = toNumber('discount' in it ? (it.discount ?? 0) : 0, 0)
    const computedLineTotal = qty * unitPrice - discount
    return {
      id: ('id' in it ? it.id : i) as number,
      name: ('product_name' in it ? it.product_name : (it as any).custom_name ?? (it as any).description ?? (it as any).variant?.name ?? (it as any).product?.name) ?? '',
      qty,
      unit_price: unitPrice,
      discount,
      subtotal: toNumber(
        'subtotal' in it ? (it.subtotal ?? null)
          : ('total_price' in it ? it.total_price : ('total' in it ? (it as any).total : null)),
        computedLineTotal,
      ),
      pricing_type: ('pricing_type' in it ? it.pricing_type : 'part') as 'part' | 'labor',
      product_id: ('product_id' in it ? it.product_id : undefined) as number | undefined,
      product_variant_id: ('product_variant_id' in it ? (it as any).product_variant_id : undefined) as number | undefined,
    }
  })
  const subtotal = toNumber(qt?.subtotal, items.reduce((s, i) => s + toNumber(i.subtotal), 0))
  const vatPercent = toNumber(qt?.vat_percent, 7)
  const vatAmount = toNumber(qt?.vat_amount, Math.round(subtotal * vatPercent / 100))
  const grandTotal = toNumber(qt?.grand_total, subtotal + vatAmount)
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
    subtotal,
    vat_percent: vatPercent,
    vat_amount: vatAmount,
    grand_total: grandTotal,
    note: cleanDocumentNote(qt?.note ?? so?.internal_note ?? ''),
    payment: latestPayment ?? null,
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
  const [maxStep, setMaxStep] = useState(0)
  const [flowType, setFlowType] = useState<string>(sourceType === 'repair' ? 'repair' : 'sale_no_deposit')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [quotationDraft, setQuotationDraft] = useState<QuotationDraft | null>(null)
  const [hasSignedDeliveryNote, setHasSignedDeliveryNote] = useState(false)

  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false)
  const [isGeneratingSlip, setIsGeneratingSlip] = useState(false)
  const [slipDocType, setSlipDocType] = useState<'receive' | 'assess' | 'quote' | 'invoice' | 'receipt' | 'warranty' | 'dn'>('receive')
  const [slipImageUrl, setSlipImageUrl] = useState<string | null>(null)
  const [slipPdfBlob, setSlipPdfBlob] = useState<Blob | null>(null)
  const [slipPdfUrl, setSlipPdfUrl] = useState<string | null>(null)
  const [warrantyMonthsForDoc, setWarrantyMonthsForDoc] = useState(3)

  // Determine flow type for stepper
  const steps = FLOW_STEPS[flowType] ?? FLOW_STEPS.repair

  // Fetch real data
  useEffect(() => {
    if (isCreateMode) {
      setJobData(buildJobData(null, null, sourceType, null))
      setCurrentStep(0)
      setMaxStep(0)
      setHasSignedDeliveryNote(false)
      return
    }
    if (id && !id.includes(':')) { setError('URL ไม่ถูกต้อง: กรุณาระบุประเภทงาน เช่น repair:23 หรือ sale:23'); setLoading(false); return }
    if (!sourceId) { setError('ไม่พบรหัสงาน'); setLoading(false); return }

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      setHasSignedDeliveryNote(false)
      try {
        if (sourceType === 'repair') {
          const { data: soRes } = await serviceOrderService.getServiceOrder(sourceId)
          const so = soRes.data
          let qt: Quotation | null = null
          try {
            const { data: qtRes } = await quotationService.getQuotations({ service_order_id: sourceId, limit: 1 })
            qt = qtRes.data?.[0] ?? null
            if (qt?.id) {
              const { data: qtDetailRes } = await quotationService.getQuotation(qt.id)
              qt = qtDetailRes.data
            }
          } catch { /* no QT yet */ }
          let inv: Invoice | null = null
          let latestPayment: { method: string; amount: number; reference?: string; paid_at?: string } | null = null
          if (qt?.id) {
            try {
              const { data: invRes } = await invoiceService.getInvoices({ customer_id: so.customer_id, limit: 50 })
              inv = invRes.data?.find((i) => i.quotation_id === qt.id) ?? null
            } catch { /* no invoice yet */ }
          }
          if (inv?.id) {
            try {
              const { data: pmtRes } = await invoiceService.getPayments(inv.id)
              const pmts = pmtRes.data ?? []
              if (pmts.length > 0) {
                const p = pmts[pmts.length - 1]
                latestPayment = { method: p.method, amount: p.amount, reference: p.reference, paid_at: p.paid_at }
              }
            } catch { /* no payments yet */ }
          }
          setJobData(buildJobData(so, qt, 'repair', sourceId, inv, latestPayment))
          let repairStep = so.status === 'draft' ? 1 : (SO_STATUS_STEP[so.status] ?? 0)
          if (so.status === 'pending_quote' && qt) {
            if (qt.status === 'sent') repairStep = 3
            else if (qt.status === 'approved') repairStep = inv ? 5 : 4
            else repairStep = 2
          } else if (so.status === 'approved') {
            repairStep = inv ? 5 : 4
          }
          // If invoice is already paid, advance past the payment step
          if (inv?.status === 'paid' && repairStep <= 6) repairStep = 7
          setMaxStep(repairStep)
          setCurrentStep(repairStep)
        } else {
          const { data: qtRes } = await quotationService.getQuotation(sourceId)
          const qt = qtRes.data
          let inv: Invoice | null = null
          let saleLatestPayment: { method: string; amount: number; reference?: string; paid_at?: string } | null = null
          try {
            const { data: invRes } = await invoiceService.getInvoices({ customer_id: qt.customer_id, limit: 50 })
            inv = invRes.data?.find((i) => i.quotation_id === qt.id) ?? null
          } catch { /* no invoice yet */ }
          if (inv?.id) {
            try {
              const { data: pmtRes } = await invoiceService.getPayments(inv.id)
              const pmts = pmtRes.data ?? []
              if (pmts.length > 0) {
                const p = pmts[pmts.length - 1]
                saleLatestPayment = { method: p.method, amount: p.amount, reference: p.reference, paid_at: p.paid_at }
              }
            } catch { /* no payments yet */ }
          }
          // detect if deposit exists to determine sale_deposit vs sale_no_deposit flow
          let hasDeposit = false
          try {
            const { data: dpRes } = await depositService.getDeposits({ quotation_id: qt.id, limit: 1 })
            hasDeposit = (dpRes.data?.length ?? 0) > 0
          } catch { /* no deposits */ }
          const saleFlowType = hasDeposit ? 'sale_deposit' : 'sale_no_deposit'
          setFlowType(saleFlowType)
          let signedDnExists = false
          try {
            const { data: dnRes } = await deliveryNoteService.getDeliveryNotes({ owner_type: 'quotation', owner_id: qt.id, limit: 10 })
            const rows = dnRes.data ?? []
            signedDnExists = rows.some((dn) => Boolean(dn.signed_at))
          } catch { /* no delivery notes yet */ }
          setHasSignedDeliveryNote(signedDnExists)
          setJobData(buildJobData(null, qt, 'sale', sourceId, inv, saleLatestPayment))
          let saleStep = QT_STATUS_STEP_SALE[qt.status] ?? 0
          // advance to deliver (step 2) once invoice is paid
          if (inv?.status === 'paid' && saleStep <= 1) saleStep = 2
          if (signedDnExists) {
            saleStep = (FLOW_STEPS[saleFlowType]?.length ?? 1) - 1
          }
          setMaxStep(saleStep)
          setCurrentStep(saleStep)
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

  useEffect(() => {
    return () => {
      if (slipImageUrl) {
        URL.revokeObjectURL(slipImageUrl)
      }
      if (slipPdfUrl) {
        URL.revokeObjectURL(slipPdfUrl)
      }
    }
  }, [slipImageUrl, slipPdfUrl])

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
    if (sourceType === 'sale' && currentStep === steps.length - 1) {
      setHasSignedDeliveryNote(true)
    }
    setQuotationDraft(null)
    const nextStep = Math.min(steps.length - 1, currentStep + 1)
    setMaxStep(nextStep)
    setCurrentStep(nextStep)
  }

  const generateReceiveSlipImage = async () => {
    if (!jobData) return null
    setIsGeneratingSlip(true)
    try {
      const width = 1240
      const height = 1754
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('สร้างภาพไม่สำเร็จ')

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)

      const pad = 72
      const contentWidth = width - pad * 2
      let y = pad

      const drawText = (text: string, x: number, yPos: number, size: number, color = '#111827', weight = 400) => {
        ctx.font = `${weight} ${size}px sans-serif`
        ctx.fillStyle = color
        ctx.fillText(text, x, yPos)
      }

      const drawWrap = (text: string, x: number, yPos: number, maxWidth: number, lineHeight: number, size = 24, color = '#374151', weight = 400) => {
        ctx.font = `${weight} ${size}px sans-serif`
        ctx.fillStyle = color
        const words = text.replace(/\s+/g, ' ').trim().split(' ')
        let line = ''
        let lineY = yPos
        for (let i = 0; i < words.length; i += 1) {
          const test = line ? `${line} ${words[i]}` : words[i]
          if (ctx.measureText(test).width > maxWidth && line) {
            ctx.fillText(line, x, lineY)
            line = words[i]
            lineY += lineHeight
          } else {
            line = test
          }
        }
        if (line) ctx.fillText(line, x, lineY)
        return lineY
      }

      const soNo = jobData.serviceOrder?.so_number ?? jobData.jobNumber ?? '-'
      const createdDate = formatDate(jobData.createdAt)
      const vehicle = jobData.serviceOrder?.vehicle
      const vehicleName = `${vehicle?.brand ?? ''} ${vehicle?.model ?? ''}`.trim() || '-'
      const plateNo = vehicle?.plate_number || '-'
      const symptom = jobData.serviceOrder?.symptom || jobData.description || '-'

      const left = pad
      const right = width - pad

      // Header: close to sample style (left company, right document title)
      drawText(jobData.branch.name || 'สุดยอดมอเตอร์', left, y + 4, 30, '#111827', 700)
      drawText(jobData.branch.address || '-', left, y + 30, 16, '#4b5563', 500)
      drawText(`เลขประจำตัวผู้เสียภาษี: ${jobData.branch.tax_id || '-'}`, left, y + 52, 16, '#4b5563', 500)
      drawText(`โทร: ${jobData.branch.phone || '-'}`, left, y + 74, 16, '#4b5563', 500)

      drawText('ใบรับรถ', right - 180, y + 10, 46, '#111827', 700)
      drawText(`เลขที่: ${soNo}`, right - 330, y + 44, 20, '#374151', 500)
      drawText(`วันที่: ${createdDate}`, right - 330, y + 70, 20, '#374151', 500)
      drawText(`อ้างอิงงาน: ${jobData.jobNumber || '-'}`, right - 330, y + 96, 20, '#374151', 500)

      y += 118
      ctx.strokeStyle = '#1f2937'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(left, y)
      ctx.lineTo(right, y)
      ctx.stroke()

      // Customer section
      y += 36
      drawText('ลูกค้า', left, y, 17, '#6b7280', 700)
      y += 28
      drawText(jobData.customerName || '-', left, y, 24, '#111827', 700)
      y += 30
      y = drawWrap(jobData.customerAddress || '-', left, y, contentWidth, 24, 17, '#4b5563', 400) + 24
      drawText(`โทร: ${jobData.customerPhone || '-'}`, left, y, 17, '#4b5563', 500)

      // Vehicle section (table-like)
      y += 42
      drawText('ข้อมูลรถที่นำมาฝาก', left, y, 17, '#6b7280', 700)
      y += 20

      const rowH = 58
      const labelW = 230
      const valueX = left + labelW + 16
      const tableW = contentWidth

      const drawRow = (rowY: number, label: string, value: string, isLast = false) => {
        ctx.fillStyle = '#f9fafb'
        ctx.fillRect(left, rowY, labelW, rowH)
        ctx.strokeStyle = '#d1d5db'
        ctx.lineWidth = 1
        ctx.strokeRect(left, rowY, tableW, rowH)
        ctx.beginPath()
        ctx.moveTo(left + labelW, rowY)
        ctx.lineTo(left + labelW, rowY + rowH)
        ctx.stroke()
        drawText(label, left + 16, rowY + 36, 18, '#374151', 600)
        drawText(value || '-', valueX, rowY + 36, 21, '#111827', 500)
        if (isLast) {
          ctx.beginPath()
          ctx.moveTo(left, rowY + rowH)
          ctx.lineTo(right, rowY + rowH)
          ctx.stroke()
        }
      }

      drawRow(y, 'รุ่นรถ', vehicleName)
      y += rowH
      drawRow(y, 'ทะเบียน', plateNo)
      y += rowH
      drawRow(y, 'เลขไมล์', jobData.serviceOrder?.mileage != null ? String(jobData.serviceOrder.mileage) : '-', true)
      y += rowH

      // Symptom section
      y += 28
      drawText('อาการแจ้งซ่อม', left, y, 17, '#6b7280', 700)
      y += 16
      ctx.strokeStyle = '#d1d5db'
      ctx.lineWidth = 1
      ctx.strokeRect(left, y, tableW, 170)
      drawWrap(symptom, left + 16, y + 38, tableW - 32, 28, 19, '#374151', 400)

      // Terms / notes
      y += 210
      drawText('หมายเหตุ', left, y, 17, '#6b7280', 700)
      y += 20
      drawWrap('ลูกค้านำรถมาฝากไว้ที่ร้านเรียบร้อยแล้ว กรุณาเก็บเอกสารฉบับนี้ไว้เพื่อใช้แสดงตอนรับรถคืน', left, y + 8, contentWidth, 24, 17, '#4b5563', 400)

      // Signature area
      const signY = height - 230
      ctx.strokeStyle = '#9ca3af'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(left + 40, signY)
      ctx.lineTo(left + 360, signY)
      ctx.moveTo(right - 360, signY)
      ctx.lineTo(right - 40, signY)
      ctx.stroke()

      drawText('ลูกค้า / วันที่', left + 135, signY + 30, 16, '#6b7280', 500)
      drawText('ผู้รับรถ / วันที่', right - 255, signY + 30, 16, '#6b7280', 500)

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (!b) {
            reject(new Error('สร้างไฟล์ภาพไม่สำเร็จ'))
            return
          }
          resolve(b)
        }, 'image/png', 1)
      })

      const pngDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result ?? ''))
        reader.onerror = () => reject(new Error('แปลงรูปเป็น PDF ไม่สำเร็จ'))
        reader.readAsDataURL(blob)
      })

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      pdf.addImage(pngDataUrl, 'PNG', 0, 0, pageW, pageH, undefined, 'FAST')
      const pdfBlob = pdf.output('blob')

      if (slipImageUrl) {
        URL.revokeObjectURL(slipImageUrl)
      }
      if (slipPdfUrl) {
        URL.revokeObjectURL(slipPdfUrl)
      }
      const newUrl = URL.createObjectURL(blob)
      const newPdfUrl = URL.createObjectURL(pdfBlob)
      setSlipDocType('receive')
      setSlipImageUrl(newUrl)
      setSlipPdfBlob(pdfBlob)
      setSlipPdfUrl(newPdfUrl)
      setIsSlipModalOpen(true)
      return { imageBlob: blob, pdfBlob, imageUrl: newUrl, pdfUrl: newPdfUrl }
    } catch (e: any) {
      toast.error(e?.message ?? 'ไม่สามารถสร้างเอกสารรูปภาพได้')
      return null
    } finally {
      setIsGeneratingSlip(false)
    }
  }

  const saveAndOpenSlip = async (
    canvas: HTMLCanvasElement,
    docType: 'receive' | 'assess' | 'quote' | 'invoice' | 'receipt' | 'warranty' | 'dn',
  ) => {
    const blob = await new Promise<Blob>((res, rej) => {
      canvas.toBlob((b) => { if (!b) { rej(new Error('สร้างไฟล์ภาพไม่สำเร็จ')); return }; res(b) }, 'image/png', 1)
    })
    const dataUrl = await new Promise<string>((res, rej) => {
      const reader = new FileReader()
      reader.onload = () => res(String(reader.result ?? ''))
      reader.onerror = () => rej(new Error('แปลงรูปเป็น PDF ไม่สำเร็จ'))
      reader.readAsDataURL(blob)
    })
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true })
    const pageW = pdf.internal.pageSize.getWidth(); const pageH = pdf.internal.pageSize.getHeight()
    pdf.addImage(dataUrl, 'PNG', 0, 0, pageW, pageH, undefined, 'FAST')
    const pdfBlob = pdf.output('blob')
    if (slipImageUrl) URL.revokeObjectURL(slipImageUrl)
    if (slipPdfUrl) URL.revokeObjectURL(slipPdfUrl)
    const newUrl = URL.createObjectURL(blob); const newPdfUrl = URL.createObjectURL(pdfBlob)
    setSlipDocType(docType); setSlipImageUrl(newUrl); setSlipPdfBlob(pdfBlob); setSlipPdfUrl(newPdfUrl); setIsSlipModalOpen(true)
    return { imageBlob: blob, pdfBlob, imageUrl: newUrl, pdfUrl: newPdfUrl }
  }

  const generateQuotationSlipImage = async () => {
    if (!jobData) return null
    setIsGeneratingSlip(true)
    try {
      const w = 1240; const h = 1754
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('สร้างภาพไม่สำเร็จ')
      const draftItems = quotationDraft?.items ?? jobData.items
      const vatPercent = toNumber(quotationDraft?.vatPercent ?? jobData.vat_percent, 7)
      const afterDiscount = quotationDraft
        ? toNumber(quotationDraft.subtotal - quotationDraft.discount)
        : toNumber(jobData.subtotal)
      const vat = quotationDraft
        ? toNumber(quotationDraft.vatAmount)
        : toNumber(jobData.vat_amount, Math.round(afterDiscount * vatPercent / 100))
      const grand = quotationDraft
        ? toNumber(quotationDraft.grandTotal)
        : toNumber(jobData.grand_total, afterDiscount + vat)
      drawBillingDocCanvas(ctx, w, h, {
        docTitle: 'ใบเสนอราคา',
        docNo: jobData.quotation?.quotation_no ?? '-',
        docDate: formatDate(jobData.createdAt),
        docRef: jobData.jobNumber || undefined,
        branch: jobData.branch,
        customerName: jobData.customerName,
        customerAddress: jobData.customerAddress || undefined,
        customerPhone: jobData.customerPhone || undefined,
        items: draftItems,
        subtotal: afterDiscount, vatPercent, vatAmount: vat, grandTotal: grand,
        note: quotationDraft?.note || jobData.note || undefined,
        sigLeftLabel: 'ผู้สั่งซื้อสินค้า', sigRightLabel: 'ผู้อนุมัติ',
      })
      return await saveAndOpenSlip(canvas, 'quote')
    } catch (e: any) {
      toast.error(e?.message ?? 'ไม่สามารถสร้างเอกสารรูปภาพได้')
      return null
    } finally { setIsGeneratingSlip(false) }
  }

  const generateInvoiceSlipImage = async () => {
    if (!jobData) return null
    setIsGeneratingSlip(true)
    try {
      const w = 1240; const h = 1754
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('สร้างภาพไม่สำเร็จ')
      const afterDiscount = toNumber(jobData.subtotal)
      const vatPercent = toNumber(jobData.vat_percent, 7)
      const vat = toNumber(jobData.vat_amount, Math.round(afterDiscount * vatPercent / 100))
      const grand = toNumber(jobData.grand_total, afterDiscount + vat)
      drawBillingDocCanvas(ctx, w, h, {
        docTitle: 'ใบแจ้งหนี้',
        docNo: jobData.invoice?.invoice_no ?? '-',
        docDate: formatDate(jobData.createdAt),
        docRef: jobData.quotation?.quotation_no || undefined,
        branch: jobData.branch,
        customerName: jobData.customerName,
        customerAddress: jobData.customerAddress || undefined,
        customerPhone: jobData.customerPhone || undefined,
        items: jobData.items,
        subtotal: afterDiscount, vatPercent, vatAmount: vat, grandTotal: grand,
        note: jobData.note || undefined,
        sigLeftLabel: 'ผู้เรียกเก็บ', sigRightLabel: 'ผู้อนุมัติ',
      })
      return await saveAndOpenSlip(canvas, 'invoice')
    } catch (e: any) {
      toast.error(e?.message ?? 'ไม่สามารถสร้างเอกสารรูปภาพได้')
      return null
    } finally { setIsGeneratingSlip(false) }
  }

  const generateReceiptSlipImage = async () => {
    if (!jobData) return null
    setIsGeneratingSlip(true)
    try {
      const w = 1240; const h = 1754
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('สร้างภาพไม่สำเร็จ')
      const afterDiscount = toNumber(jobData.subtotal)
      const vatPercent = toNumber(jobData.vat_percent, 7)
      const vat = toNumber(jobData.vat_amount, Math.round(afterDiscount * vatPercent / 100))
      const grand = toNumber(jobData.grand_total, afterDiscount + vat)
      drawBillingDocCanvas(ctx, w, h, {
        docTitle: 'ใบกำกับภาษี/ใบเสร็จรับเงิน',
        docSubTitle: 'ต้นฉบับ',
        docNo: jobData.invoice?.invoice_no ?? '-',
        docDate: formatDate(jobData.createdAt),
        docRef: jobData.quotation?.quotation_no || undefined,
        branch: jobData.branch,
        customerName: jobData.customerName,
        customerAddress: jobData.customerAddress || undefined,
        customerPhone: jobData.customerPhone || undefined,
        items: jobData.items,
        subtotal: afterDiscount, vatPercent, vatAmount: vat, grandTotal: grand,
        note: jobData.note || undefined,
        sigLeftLabel: 'ผู้จ่ายเงิน', sigRightLabel: 'ผู้รับเงิน',
        payment: jobData.payment ?? undefined,
      })
      return await saveAndOpenSlip(canvas, 'receipt')
    } catch (e: any) {
      toast.error(e?.message ?? 'ไม่สามารถสร้างเอกสารรูปภาพได้')
      return null
    } finally { setIsGeneratingSlip(false) }
  }

  const generateInvoiceDocumentById = async (invoiceId: number, docType: 'invoice' | 'receipt') => {
    if (!jobData) return null
    setIsGeneratingSlip(true)
    try {
      const { data } = await invoiceService.getInvoice(invoiceId)
      const invoice = data.data ?? data
      const latestPayment = invoice.payments && invoice.payments.length > 0
        ? [...invoice.payments].sort((left, right) => new Date(right.paid_at).getTime() - new Date(left.paid_at).getTime())[0]
        : undefined
      const canvas = document.createElement('canvas')
      const w = 1240
      const h = 1754
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('สร้างภาพไม่สำเร็จ')

      drawBillingDocCanvas(ctx, w, h, {
        docTitle: docType === 'receipt' ? 'ใบกำกับภาษี/ใบเสร็จรับเงิน' : 'ใบแจ้งหนี้',
        docSubTitle: docType === 'receipt' ? 'ต้นฉบับ' : undefined,
        docNo: invoice.invoice_no ?? '-',
        docDate: formatDate(invoice.updated_at ?? invoice.created_at ?? jobData.createdAt),
        docRef: jobData.quotation?.quotation_no || undefined,
        branch: {
          name: invoice.branch?.name ?? jobData.branch.name,
          address: invoice.branch?.address ?? jobData.branch.address,
          phone: invoice.branch?.phone ?? jobData.branch.phone,
          tax_id: invoice.branch?.tax_id ?? jobData.branch.tax_id,
        },
        customerName: invoice.customer?.type === 'corporate'
          ? (invoice.customer.company_name ?? jobData.customerName)
          : [invoice.customer?.first_name, invoice.customer?.last_name].filter(Boolean).join(' ') || jobData.customerName,
        customerAddress: jobData.customerAddress || undefined,
        customerPhone: jobData.customerPhone || undefined,
        items: (invoice.items ?? []).map((item) => ({
          id: item.id,
          name: item.description,
          qty: Number(item.quantity ?? 0),
          unit_price: Number(item.unit_price ?? 0),
          discount: Number(item.discount ?? 0),
          subtotal: Number(item.subtotal ?? 0),
          pricing_type: 'part' as const,
        })),
        subtotal: toNumber(invoice.subtotal),
        vatPercent: toNumber(invoice.vat_percent, 7),
        vatAmount: toNumber(invoice.vat_amount),
        grandTotal: toNumber(invoice.grand_total),
        note: jobData.note || undefined,
        sigLeftLabel: docType === 'receipt' ? 'ผู้จ่ายเงิน' : 'ผู้เรียกเก็บ',
        sigRightLabel: docType === 'receipt' ? 'ผู้รับเงิน' : 'ผู้อนุมัติ',
        payment: docType === 'receipt' && latestPayment
          ? {
              method: latestPayment.method,
              amount: Number(latestPayment.amount ?? 0),
              reference: latestPayment.reference,
            }
          : undefined,
      })

      return await saveAndOpenSlip(canvas, docType)
    } catch (e: any) {
      toast.error(e?.message ?? 'ไม่สามารถสร้างเอกสารรูปภาพได้')
      return null
    } finally {
      setIsGeneratingSlip(false)
    }
  }

  const generateWarrantySlipImage = async () => {
    if (!jobData) return null
    setIsGeneratingSlip(true)
    try {
      const w = 1240; const h = 1754
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('สร้างภาพไม่สำเร็จ')
      const veh = jobData.serviceOrder?.vehicle
      const vehicle = veh ? { brand: veh.brand, model: veh.model, plate: veh.plate_number, mileage: jobData.serviceOrder?.mileage } : undefined
      drawWarrantyDocCanvas(ctx, w, h, {
        docNo: jobData.serviceOrder?.so_number ?? jobData.jobNumber ?? '-',
        docDate: formatDate(jobData.createdAt),
        branch: jobData.branch,
        customerName: jobData.customerName,
        customerPhone: jobData.customerPhone || undefined,
        vehicle,
        items: jobData.items,
        note: jobData.note || undefined,
        warrantyMonths: warrantyMonthsForDoc,
      })
      return await saveAndOpenSlip(canvas, 'warranty')
    } catch (e: any) {
      toast.error(e?.message ?? 'ไม่สามารถสร้างเอกสารรูปภาพได้')
      return null
    } finally { setIsGeneratingSlip(false) }
  }

  const generateDNSlipImage = async () => {
    if (!jobData) return null
    setIsGeneratingSlip(true)
    try {
      const w = 1240; const h = 1754
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('สร้างภาพไม่สำเร็จ')
      const veh = jobData.serviceOrder?.vehicle
      const vehicle = veh ? { brand: veh.brand, model: veh.model, plate: veh.plate_number, mileage: jobData.serviceOrder?.mileage } : undefined
      drawDNCanvas(ctx, w, h, {
        docNo: jobData.serviceOrder?.so_number ?? jobData.jobNumber ?? '-',
        docDate: formatDate(jobData.createdAt),
        branch: jobData.branch,
        customerName: jobData.customerName,
        customerPhone: jobData.customerPhone || undefined,
        vehicle,
        items: jobData.items,
        note: jobData.note || undefined,
      })
      return await saveAndOpenSlip(canvas, 'dn')
    } catch (e: any) {
      toast.error(e?.message ?? 'ไม่สามารถสร้างเอกสารรูปภาพได้')
      return null
    } finally { setIsGeneratingSlip(false) }
  }

  const generateAssessSlipImage = async () => {
    if (!jobData) return null
    setIsGeneratingSlip(true)
    try {
      const width = 1240
      const height = 1754
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('สร้างภาพไม่สำเร็จ')

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)

      const pad = 72
      const right = width - pad
      let y = pad
      const items = jobData.items ?? []

      const drawText = (text: string, x: number, yPos: number, size: number, color = '#111827', weight = 400) => {
        ctx.font = `${weight} ${size}px sans-serif`
        ctx.fillStyle = color
        ctx.fillText(text, x, yPos)
      }

      drawText(jobData.branch.name || 'สุดยอดมอเตอร์', pad, y + 4, 30, '#111827', 700)
      drawText(jobData.branch.address || '-', pad, y + 30, 16, '#4b5563', 500)
      drawText(`โทร: ${jobData.branch.phone || '-'}`, pad, y + 52, 16, '#4b5563', 500)

      drawText('ใบประเมิน/รายการซ่อม', right - 380, y + 10, 36, '#111827', 700)
      drawText(`อ้างอิงงาน: ${jobData.jobNumber || '-'}`, right - 380, y + 54, 20, '#374151', 500)
      drawText(`วันที่: ${formatDate(jobData.createdAt)}`, right - 380, y + 80, 20, '#374151', 500)

      y += 110
      ctx.strokeStyle = '#1f2937'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(pad, y)
      ctx.lineTo(right, y)
      ctx.stroke()

      y += 38
      drawText('ลูกค้า', pad, y, 17, '#6b7280', 700)
      y += 28
      drawText(jobData.customerName || '-', pad, y, 24, '#111827', 700)
      y += 30
      drawText(`โทร: ${jobData.customerPhone || '-'}`, pad, y, 17, '#4b5563', 500)
      const so = jobData.serviceOrder
      if (so) {
        drawText(`รถ: ${so.vehicle?.brand ?? ''} ${so.vehicle?.model ?? ''} ${so.vehicle?.plate_number ?? ''}`.trim(), right - 500, y, 17, '#4b5563', 500)
      }

      // Items table
      y += 44
      const tableX = pad
      const tableW = width - pad * 2
      const col = [70, 700, 170, 200]
      const rowH = 46

      ctx.fillStyle = '#f3f4f6'
      ctx.fillRect(tableX, y, tableW, rowH)
      ctx.strokeStyle = '#d1d5db'
      ctx.lineWidth = 1
      ctx.strokeRect(tableX, y, tableW, rowH)
      drawText('#', tableX + 22, y + 30, 18, '#374151', 600)
      drawText('รายการ', tableX + col[0] + 12, y + 30, 18, '#374151', 600)
      drawText('จำนวน', tableX + col[0] + col[1] + 12, y + 30, 18, '#374151', 600)
      drawText('ราคา/หน่วย', tableX + col[0] + col[1] + col[2] + 12, y + 30, 18, '#374151', 600)

      y += rowH
      items.slice(0, 16).forEach((item, idx) => {
        ctx.strokeRect(tableX, y, tableW, rowH)
        drawText(String(idx + 1), tableX + 22, y + 30, 18, '#111827', 500)
        drawText(item.name || '-', tableX + col[0] + 12, y + 30, 18, '#111827', 500)
        drawText(String(item.qty ?? 0), tableX + col[0] + col[1] + 12, y + 30, 18, '#111827', 500)
        drawText(Number(item.unit_price ?? 0).toLocaleString(), tableX + col[0] + col[1] + col[2] + 12, y + 30, 18, '#111827', 500)
        y += rowH
      })

      // Checklist section
      const note = so?.internal_note ?? ''
      const checklistItems: { name: string; checked: boolean; status: string }[] = []
      const resultMatch = note.match(/\[CHECKLIST_RESULT_START\]([\s\S]*?)\[CHECKLIST_RESULT_END\]/)
      if (resultMatch) {
        for (const line of resultMatch[1].split('\n')) {
          const m = line.match(/^\d+\.\s+\[(✓|○)\]\s+(.+?)\s+:\s+([^—\n]+?)(?:\s+—\s+(.*))?$/)
          if (m) checklistItems.push({ checked: m[1] === '✓', name: m[2].trim(), status: m[3].trim() })
        }
      }

      if (checklistItems.length > 0) {
        y += 20
        drawText('ผลตรวจสภาพรถ', pad, y, 22, '#111827', 700)
        y += 32
        const chRowH = 36
        ctx.fillStyle = '#f3f4f6'
        ctx.fillRect(tableX, y, tableW, chRowH)
        ctx.strokeStyle = '#d1d5db'
        ctx.lineWidth = 1
        ctx.strokeRect(tableX, y, tableW, chRowH)
        drawText('รายการ', tableX + 12, y + 24, 16, '#374151', 600)
        drawText('ผล', tableX + 800, y + 24, 16, '#374151', 600)
        drawText('สถานะ', tableX + 1000, y + 24, 16, '#374151', 600)
        y += chRowH
        checklistItems.slice(0, 12).forEach((it) => {
          ctx.strokeRect(tableX, y, tableW, chRowH)
          drawText(it.name, tableX + 12, y + 24, 16, '#111827', 500)
          drawText(it.checked ? '✓' : '○', tableX + 800, y + 24, 16, it.checked ? '#16a34a' : '#9ca3af', 700)
          drawText(it.status, tableX + 1000, y + 24, 16, '#374151', 500)
          y += chRowH
        })
      }

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (!b) { reject(new Error('สร้างไฟล์ภาพไม่สำเร็จ')); return }
          resolve(b)
        }, 'image/png', 1)
      })

      const pngDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result ?? ''))
        reader.onerror = () => reject(new Error('แปลงรูปเป็น PDF ไม่สำเร็จ'))
        reader.readAsDataURL(blob)
      })

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      pdf.addImage(pngDataUrl, 'PNG', 0, 0, pageW, pageH, undefined, 'FAST')
      const pdfBlob = pdf.output('blob')

      if (slipImageUrl) URL.revokeObjectURL(slipImageUrl)
      if (slipPdfUrl) URL.revokeObjectURL(slipPdfUrl)
      const newUrl = URL.createObjectURL(blob)
      const newPdfUrl = URL.createObjectURL(pdfBlob)
      setSlipDocType('assess')
      setSlipImageUrl(newUrl)
      setSlipPdfBlob(pdfBlob)
      setSlipPdfUrl(newPdfUrl)
      setIsSlipModalOpen(true)
      return { imageBlob: blob, pdfBlob, imageUrl: newUrl, pdfUrl: newPdfUrl }
    } catch (e: any) {
      toast.error(e?.message ?? 'ไม่สามารถสร้างเอกสารรูปภาพได้')
      return null
    } finally {
      setIsGeneratingSlip(false)
    }
  }

  const handleViewSlip = async () => {
    if (!slipImageUrl) {
      await generateReceiveSlipImage()
      return
    }
    window.open(slipImageUrl, '_blank', 'noopener,noreferrer')
  }

  const handleDownloadZip = async () => {
    try {
      let pdfBlob = slipPdfBlob
      if (!pdfBlob) {
        const generated = await generateReceiveSlipImage()
        pdfBlob = generated?.pdfBlob ?? null
      }
      if (!pdfBlob) return
      const soNo = jobData?.serviceOrder?.so_number ?? jobData?.jobNumber ?? 'receive-slip'
      const zipBlob = await buildSingleFileZip(`${soNo}-receive-slip.pdf`, pdfBlob)
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${soNo}-receive-slip.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('ดาวน์โหลด ZIP เรียบร้อย')
    } catch {
      toast.error('ดาวน์โหลด ZIP ไม่สำเร็จ')
    }
  }

  const handleCopyImageLink = async () => {
    const invId = jobData?.invoice?.id
    if (!invId) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/billing/invoices/${invId}`)
      toast.success('คัดลอกลิงก์แล้ว')
    } catch {
      toast.error('คัดลอกลิงก์ไม่สำเร็จ')
    }
  }

  const handleCopyPdfLink = async () => {
    const invId = jobData?.invoice?.id
    if (!invId) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/billing/invoices/${invId}`)
      toast.success('คัดลอกลิงก์แล้ว')
    } catch {
      toast.error('คัดลอกลิงก์ไม่สำเร็จ')
    }
  }

  const currentStepId = steps[currentStep]?.id ?? ''
  const isFlowCompleted = (sourceType === 'repair' && jobData?.serviceOrder?.status === 'closed') || (sourceType === 'sale' && hasSignedDeliveryNote)
  const printStepId = currentStepId
  const headerDocType: 'receive' | 'assess' | 'quote' | 'invoice' | 'receipt' | 'warranty' =
    currentStepId === 'quote' || currentStepId === 'approve' || currentStepId === 'deposit' ? 'quote'
      : currentStepId === 'assess' ? 'assess'
      : currentStepId === 'invoice' ? 'invoice'
      : currentStepId === 'payment'
        ? (jobData?.invoice?.status === 'paid' ? 'receipt' : 'invoice')
      : currentStepId === 'deliver' ? 'warranty'
      : 'receive'

  const handleOpenHeaderDocument = () => {
    if (headerDocType === 'quote') { void generateQuotationSlipImage(); return }
    if (headerDocType === 'assess') { void generateAssessSlipImage(); return }
    if (headerDocType === 'invoice') { void generateInvoiceSlipImage(); return }
    if (headerDocType === 'receipt') { void generateReceiptSlipImage(); return }
    if (headerDocType === 'warranty') { void generateWarrantySlipImage(); return }
    void generateReceiveSlipImage()
  }

  const docConfig = STEP_DOC_CONFIG[printStepId] ?? { title: 'เอกสาร', noPrefix: 'DOC', noField: 'doc_no' }
  const docNo = printStepId === 'receive'
    ? (jobData?.serviceOrder?.so_number ?? jobData?.jobNumber ?? '')
    : (jobData?.quotation?.quotation_no ?? jobData?.serviceOrder?.so_number ?? '')

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
            {!isCreateMode && currentStepId !== 'deliver' && (
              <button
                onClick={handleOpenHeaderDocument}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 hover:bg-gray-50 transition-all hover:shadow"
              >
                <Printer className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
                <span>{isGeneratingSlip ? 'กำลังสร้างเอกสาร...' : ({ receive: 'เอกสารใบรับรถ', assess: 'เอกสารใบประเมิน', quote: 'เอกสารใบเสนอราคา', invoice: 'เอกสารใบแจ้งหนี้', receipt: 'เอกสารใบเสร็จ', warranty: 'เอกสารใบรับประกัน' } as Record<string, string>)[headerDocType] ?? 'เอกสาร'}</span>
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
          maxStep={maxStep}
          isFlowCompleted={isFlowCompleted}
          onStepClick={(i) => { if (i <= maxStep) setCurrentStep(i) }}
        />
      </div>

      {/* Step Content */}
      <StepContent
        step={steps[currentStep]}
        flowType={flowType}
        jobData={jobData}
        onComplete={handleStepComplete}
        isPastStep={isFlowCompleted || currentStep < maxStep}
        onGoToStep={(stepId) => {
          const idx = steps.findIndex((s) => s.id === stepId)
          if (idx >= 0) setCurrentStep(idx)
        }}
        onQuoteDraftChange={setQuotationDraft}
        onPrintInvoiceDocument={generateInvoiceDocumentById}
        onPrintDN={() => { void generateDNSlipImage() }}
        onPrintWR={() => { void generateWarrantySlipImage() }}
        onWarrantyMonthsChange={(m) => setWarrantyMonthsForDoc(m)}
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
                idx === currentStep ? "w-6 bg-blue-600" : idx < maxStep ? "w-1.5 bg-indigo-300" : "w-1.5 bg-gray-200"
              )} 
            />
          ))}
        </div>
        <button
          onClick={() => setCurrentStep(Math.min(maxStep, currentStep + 1))}
          disabled={currentStep >= maxStep}
          className="group inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-gray-900/20 hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/30 disabled:opacity-40 transition-all"
        >
          ถัดไป
          <ArrowRight className="h-4 w-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </button>
      </div>
      <DocumentOutputModal
        isOpen={isSlipModalOpen}
        title={({ receive: 'ใบรับรถ', assess: 'ใบประเมิน', quote: 'ใบเสนอราคา', invoice: 'ใบแจ้งหนี้', receipt: 'ใบเสร็จรับเงิน', warranty: 'ใบรับประกัน' } as Record<string, string>)[slipDocType] + ' (รูปภาพ A4)'}
        subtitle="เลือกการใช้งานเอกสาร"
        previewUrl={slipImageUrl}
        previewAlt={`${slipDocType}-a4`}
        onClose={() => setIsSlipModalOpen(false)}
        actions={[
          {
            key: 'view',
            label: '1. ดูหน้าเต็ม',
            description: 'เปิดแท็บใหม่แสดงรูปเต็มขนาด A4',
            icon: <Eye className="h-4 w-4" />,
            onClick: () => { void handleViewSlip() },
            tone: 'blue',
          },
          {
            key: 'zip',
            label: '2. ดาวน์โหลด ZIP',
            description: 'ดาวน์โหลดไฟล์ ZIP ที่มีไฟล์ PDF ' + (({ receive: 'ใบรับรถ', assess: 'ใบประเมิน', quote: 'ใบเสนอราคา', invoice: 'ใบแจ้งหนี้', receipt: 'ใบเสร็จรับเงิน', warranty: 'ใบรับประกัน' } as Record<string, string>)[slipDocType] ?? 'เอกสาร'),
            icon: <Download className="h-4 w-4" />,
            onClick: () => { void handleDownloadZip() },
            tone: 'green',
          },
          {
            key: 'share',
            label: '3. คัดลอกลิงก์รูป',
            description: 'คัดลอกลิงก์ไฟล์รูปภาพเอกสาร',
            icon: <Link2 className="h-4 w-4" />,
            onClick: () => { void handleCopyImageLink() },
            tone: 'amber',
          },
          {
            key: 'share-pdf',
            label: '4. คัดลอกลิงก์ PDF',
            description: 'คัดลอกลิงก์ไฟล์ PDF เอกสาร',
            icon: <Link2 className="h-4 w-4" />,
            onClick: () => { void handleCopyPdfLink() },
            tone: 'amber',
          },
        ]}
        footerText="ลิงก์ public แบบเดาไม่ได้ต้องมี endpoint ฝั่ง backend สำหรับออก share token ของเอกสาร"
        footerLinks={[
          ...(slipImageUrl ? [{ label: 'รูปภาพ', url: slipImageUrl }] : []),
          ...(slipPdfUrl ? [{ label: 'PDF', url: slipPdfUrl }] : []),
        ]}
      />
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
          {jobData.serviceOrder?.vehicle && (
            <div style={{ padding: '2px 0 10px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', margin: '0 0 4px' }}>ข้อมูลรถที่รับฝาก</p>
              <p style={{ fontWeight: 600, fontSize: '13px', margin: 0 }}>
                {(jobData.serviceOrder.vehicle.brand ?? '').trim()} {(jobData.serviceOrder.vehicle.model ?? '').trim()}
              </p>
              <p style={{ fontSize: '11px', color: '#4b5563', margin: '1px 0 0' }}>
                ทะเบียน: {jobData.serviceOrder.vehicle.plate_number || '—'}
              </p>
              <p style={{ fontSize: '11px', color: '#4b5563', margin: '1px 0 0' }}>
                อาการแจ้งซ่อม: {jobData.serviceOrder.symptom || '—'}
              </p>
            </div>
          )}
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
