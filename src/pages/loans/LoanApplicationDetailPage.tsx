import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { loanService } from '@/api/loanService'
import type {
  LoanApplication,
  LoanApplicationStatus,
  Guarantor,
  LoanDocument,
  LoanDocumentType,
} from '@/types/loans'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

// ── Status ────────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<LoanApplicationStatus, { label: string; className: string }> = {
  pending: { label: 'รอผล', className: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'อนุมัติ', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'ปฏิเสธ', className: 'bg-red-100 text-red-700' },
  cancelled: { label: 'ยกเลิก', className: 'bg-gray-100 text-gray-500' },
}

// ── Document helpers ──────────────────────────────────────────────────────────
const DOC_TYPE_LABELS: Record<LoanDocumentType, string> = {
  id_card: 'บัตรประชาชน',
  bank_statement: 'สเตทเม้นท์บัญชี',
  salary_slip: 'สลิปเงินเดือน',
  house_registration: 'ทะเบียนบ้าน',
  vehicle_registration: 'ทะเบียนรถ',
  other: 'อื่นๆ',
}

const formatDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const formatMoney = (n?: number | null) =>
  n != null ? n.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '—'

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
function UploadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  )
}
function FileIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} points="14 2 14 8 20 8" />
    </svg>
  )
}
function XIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" strokeWidth={2} strokeLinecap="round" />
      <line x1="6" y1="6" x2="18" y2="18" strokeWidth={2} strokeLinecap="round" />
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

// ── Staged file type ──────────────────────────────────────────────────────────
interface StagedFile {
  file: File
  doc_type: LoanDocumentType
  uploading: boolean
  error: string | null
}

export function LoanApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { permissions } = useAuthStore()
  const loanId = Number(id)

  const [loan, setLoan] = useState<LoanApplication | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'detail' | 'guarantors' | 'documents'>('detail')

  // ── Actions state ──────────────────────────────────────────────────────────
  const [showApprovePanel, setShowApprovePanel] = useState(false)
  const [showRejectPanel, setShowRejectPanel] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ type: 'approve' | 'reject' | 'cancel' } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [approveForm, setApproveForm] = useState({
    amount_approved: '', approved_date: '', loan_amount: '',
    interest_rate: '', term_months: '', monthly_payment: '', note: '',
  })

  // ── Guarantor state ────────────────────────────────────────────────────────
  const [addingGuarantor, setAddingGuarantor] = useState(false)
  const [guarantorForm, setGuarantorForm] = useState({ name: '', phone: '', id_card: '', relationship: '' })
  const [savingGuarantor, setSavingGuarantor] = useState(false)
  const [deletingGuarantorId, setDeletingGuarantorId] = useState<number | null>(null)

  // ── Document state ─────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState<LoanDocument[]>([])
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canEdit = hasPermission(permissions, 'loan_applications', 'can_edit')
  const canApprove = hasPermission(permissions, 'loan_applications', 'can_approve') || canEdit

  const load = () => {
    setIsLoading(true)
    Promise.all([
      loanService.getLoanApplication(loanId),
      loanService.getLoanDocuments(loanId),
    ])
      .then(([loanRes, docsRes]) => {
        setLoan(loanRes.data.data)
        setDocuments(docsRes.data.data)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { load() }, [loanId])

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    setActionLoading(true)
    try {
      await loanService.approveLoanApplication(loanId, {
        amount_approved: approveForm.amount_approved ? Number(approveForm.amount_approved) : undefined,
        approved_date: approveForm.approved_date || undefined,
        loan_amount: approveForm.loan_amount ? Number(approveForm.loan_amount) : undefined,
        interest_rate: approveForm.interest_rate ? Number(approveForm.interest_rate) : undefined,
        term_months: approveForm.term_months ? Number(approveForm.term_months) : undefined,
        monthly_payment: approveForm.monthly_payment ? Number(approveForm.monthly_payment) : undefined,
        note: approveForm.note || undefined,
      })
      setShowApprovePanel(false)
      setConfirmModal(null)
      load()
    } catch {
      //
    } finally {
      setActionLoading(false)
    }
  }

  // ── Reject ─────────────────────────────────────────────────────────────────
  const handleReject = async () => {
    setActionLoading(true)
    try {
      await loanService.rejectLoanApplication(loanId, rejectNote || undefined)
      setShowRejectPanel(false)
      setConfirmModal(null)
      load()
    } catch {
      //
    } finally {
      setActionLoading(false)
    }
  }

  // ── Cancel ─────────────────────────────────────────────────────────────────
  const handleCancel = async () => {
    setActionLoading(true)
    try {
      await loanService.cancelLoanApplication(loanId)
      setConfirmModal(null)
      load()
    } catch {
      //
    } finally {
      setActionLoading(false)
    }
  }

  // ── Add Guarantor ──────────────────────────────────────────────────────────
  const handleAddGuarantor = async () => {
    if (!guarantorForm.name.trim()) return
    setSavingGuarantor(true)
    try {
      await loanService.addGuarantor(loanId, {
        name: guarantorForm.name.trim(),
        phone: guarantorForm.phone || undefined,
        id_card: guarantorForm.id_card || undefined,
        relationship: guarantorForm.relationship || undefined,
      })
      setGuarantorForm({ name: '', phone: '', id_card: '', relationship: '' })
      setAddingGuarantor(false)
      load()
    } catch {
      //
    } finally {
      setSavingGuarantor(false)
    }
  }

  // ── Delete Guarantor ───────────────────────────────────────────────────────
  const handleDeleteGuarantor = async (gId: number) => {
    setDeletingGuarantorId(gId)
    try {
      await loanService.deleteGuarantor(loanId, gId)
      load()
    } catch {
      //
    } finally {
      setDeletingGuarantorId(null)
    }
  }

  // ── Document upload ────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setStagedFiles((prev) => [
      ...prev,
      ...files.map((f) => ({ file: f, doc_type: 'other' as LoanDocumentType, uploading: false, error: null })),
    ])
    e.target.value = ''
  }

  const updateStagedType = (index: number, doc_type: LoanDocumentType) => {
    setStagedFiles((prev) => prev.map((s, i) => (i === index ? { ...s, doc_type } : s)))
  }

  const removeStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadAll = async () => {
    const pending = stagedFiles.filter((s) => !s.uploading)
    if (!pending.length) return
    for (let i = 0; i < stagedFiles.length; i++) {
      const s = stagedFiles[i]
      if (s.uploading) continue
      setStagedFiles((prev) => prev.map((x, j) => (j === i ? { ...x, uploading: true, error: null } : x)))
      try {
        const res = await loanService.uploadLoanDocument(loanId, s.file, { document_type: s.doc_type })
        setDocuments((prev) => [...prev, res.data.data])
        setStagedFiles((prev) => prev.filter((_, j) => j !== i))
      } catch {
        setStagedFiles((prev) => prev.map((x, j) => (j === i ? { ...x, uploading: false, error: 'อัพโหลดไม่สำเร็จ' } : x)))
      }
    }
  }

  const handleDeleteDoc = async (docId: number) => {
    setDeletingDocId(docId)
    try {
      await loanService.deleteLoanDocument(loanId, docId)
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
    } catch {
      //
    } finally {
      setDeletingDocId(null)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!loan) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-gray-500">ไม่พบข้อมูลคำขอสินเชื่อ</p>
        <Link to="/loan-applications" className="text-sm text-blue-600 hover:underline">กลับรายการ</Link>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[loan.status] ?? STATUS_CONFIG.pending
  const isPending = loan.status === 'pending'
  const guarantors = loan.guarantors ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/loan-applications" className="p-1.5 text-gray-400 hover:text-gray-700">
            <ChevronLeftIcon />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{loan.application_no}</h1>
              <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', statusCfg.className)}>
                {statusCfg.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              ยื่นเมื่อ {formatDate(loan.applied_date)} &middot; สร้างโดย {loan.created_by ? `${loan.created_by.first_name ?? ''} ${loan.created_by.last_name ?? ''}`.trim() : '—'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {isPending && canEdit && (
            <button
              type="button"
              onClick={() => setConfirmModal({ type: 'cancel' })}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              ยกเลิกคำขอ
            </button>
          )}
          {isPending && canEdit && (
            <Link
              to={`/loan-applications/${loanId}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <PencilIcon /> แก้ไข
            </Link>
          )}
          {isPending && canApprove && (
            <>
              <button
                type="button"
                onClick={() => { setShowRejectPanel((p) => !p); setShowApprovePanel(false) }}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                ปฏิเสธ
              </button>
              <button
                type="button"
                onClick={() => { setShowApprovePanel((p) => !p); setShowRejectPanel(false) }}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                อนุมัติ
              </button>
            </>
          )}
        </div>
      </div>

      {/* Approve panel */}
      {showApprovePanel && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-4">
          <h3 className="font-semibold text-green-800">ข้อมูลการอนุมัติ</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {([
              { key: 'amount_approved', label: 'ยอดอนุมัติ', type: 'number' },
              { key: 'approved_date', label: 'วันที่อนุมัติ', type: 'date' },
              { key: 'loan_amount', label: 'วงเงินสินเชื่อ', type: 'number' },
              { key: 'interest_rate', label: 'อัตราดอกเบี้ย (%)', type: 'number' },
              { key: 'term_months', label: 'จำนวนงวด (เดือน)', type: 'number' },
              { key: 'monthly_payment', label: 'ค่างวด/เดือน', type: 'number' },
            ] as { key: keyof typeof approveForm; label: string; type: string }[]).map(({ key, label, type }) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-green-800">{label}</label>
                <input
                  type={type}
                  value={approveForm[key]}
                  onChange={(e) => setApproveForm((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                />
              </div>
            ))}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-sm font-medium text-green-800">หมายเหตุ</label>
              <textarea
                rows={2}
                value={approveForm.note}
                onChange={(e) => setApproveForm((p) => ({ ...p, note: e.target.value }))}
                className="w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowApprovePanel(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">ยกเลิก</button>
            <button type="button" onClick={() => setConfirmModal({ type: 'approve' })} className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700">ยืนยันอนุมัติ</button>
          </div>
        </div>
      )}

      {/* Reject panel */}
      {showRejectPanel && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-4">
          <h3 className="font-semibold text-red-800">เหตุผลการปฏิเสธ</h3>
          <textarea
            rows={3}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="กรุณาระบุเหตุผล..."
            className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowRejectPanel(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">ยกเลิก</button>
            <button type="button" onClick={() => setConfirmModal({ type: 'reject' })} className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700">ยืนยันปฏิเสธ</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {([
            { key: 'detail', label: 'รายละเอียด' },
            { key: 'guarantors', label: `ผู้ค้ำ (${guarantors.length})` },
            { key: 'documents', label: `เอกสารแนบ (${documents.length})` },
          ] as { key: typeof activeTab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={cn(
                'whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors',
                activeTab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: รายละเอียด */}
      {activeTab === 'detail' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <dl>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">ชื่อผู้กู้</dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">{loan.applicant_name}</dd>
            </dl>
            <dl>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">เบอร์โทรศัพท์</dt>
              <dd className="mt-1 text-sm text-gray-700">{loan.applicant_phone ?? '—'}</dd>
            </dl>
            <dl>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">เลขบัตรประชาชน</dt>
              <dd className="mt-1 text-sm text-gray-700">{loan.applicant_id_card ?? '—'}</dd>
            </dl>
            <dl>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">สาขา</dt>
              <dd className="mt-1 text-sm text-gray-700">{loan.branch?.name ?? '—'}</dd>
            </dl>
            <dl>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">บริษัทไฟแนนซ์</dt>
              <dd className="mt-1 text-sm text-gray-700">{loan.finance_company?.name ?? '—'}</dd>
            </dl>
            <dl>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">วันที่ยื่น</dt>
              <dd className="mt-1 text-sm text-gray-700">{formatDate(loan.applied_date)}</dd>
            </dl>
            <dl>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">ยอดขอกู้</dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">{formatMoney(loan.amount_requested)} ฿</dd>
            </dl>
            <dl>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">เงินดาวน์</dt>
              <dd className="mt-1 text-sm text-gray-700">{formatMoney(loan.down_payment)} ฿</dd>
            </dl>
            {loan.customer && (
              <dl>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">ลูกค้า</dt>
                <dd className="mt-1 text-sm text-gray-700">
                  {loan.customer.first_name ?? ''} {loan.customer.last_name ?? ''}
                </dd>
              </dl>
            )}
          </div>

          {/* Approval info */}
          {loan.status === 'approved' && (
            <>
              <hr className="border-gray-100" />
              <div>
                <h3 className="mb-3 text-sm font-semibold text-green-700">ข้อมูลการอนุมัติ</h3>
                <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                  <dl>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">ยอดอนุมัติ</dt>
                    <dd className="mt-1 text-sm font-semibold text-green-700">{formatMoney(loan.amount_approved)} ฿</dd>
                  </dl>
                  <dl>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">วันที่อนุมัติ</dt>
                    <dd className="mt-1 text-sm text-gray-700">{formatDate(loan.approved_date)}</dd>
                  </dl>
                  <dl>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">วงเงินสินเชื่อ</dt>
                    <dd className="mt-1 text-sm text-gray-700">{formatMoney(loan.loan_amount)} ฿</dd>
                  </dl>
                  <dl>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">อัตราดอกเบี้ย</dt>
                    <dd className="mt-1 text-sm text-gray-700">{loan.interest_rate != null ? `${loan.interest_rate}%` : '—'}</dd>
                  </dl>
                  <dl>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">จำนวนงวด</dt>
                    <dd className="mt-1 text-sm text-gray-700">{loan.term_months != null ? `${loan.term_months} เดือน` : '—'}</dd>
                  </dl>
                  <dl>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">ค่างวด/เดือน</dt>
                    <dd className="mt-1 text-sm font-semibold text-gray-900">{formatMoney(loan.monthly_payment)} ฿</dd>
                  </dl>
                </div>
              </div>
            </>
          )}

          {loan.note && (
            <>
              <hr className="border-gray-100" />
              <div>
                <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">หมายเหตุ</dt>
                <div
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: loan.note }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: ผู้ค้ำ */}
      {activeTab === 'guarantors' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">รายชื่อผู้ค้ำประกัน</h3>
            {isPending && canEdit && (
              <button
                type="button"
                onClick={() => setAddingGuarantor((p) => !p)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <PlusIcon /> เพิ่มผู้ค้ำ
              </button>
            )}
          </div>

          {/* Add form */}
          {addingGuarantor && (
            <div className="p-4 bg-blue-50 border-b border-blue-100 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {([
                  { key: 'name', label: 'ชื่อ-นามสกุล *', type: 'text' },
                  { key: 'phone', label: 'เบอร์โทร', type: 'text' },
                  { key: 'id_card', label: 'เลขบัตรประชาชน', type: 'text' },
                  { key: 'relationship', label: 'ความสัมพันธ์', type: 'text' },
                ] as { key: keyof typeof guarantorForm; label: string; type: string }[]).map(({ key, label, type }) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs font-medium text-blue-800">{label}</label>
                    <input
                      type={type}
                      value={guarantorForm[key]}
                      onChange={(e) => setGuarantorForm((p) => ({ ...p, [key]: e.target.value }))}
                      className="w-full rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setAddingGuarantor(false)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">ยกเลิก</button>
                <button
                  type="button"
                  onClick={handleAddGuarantor}
                  disabled={savingGuarantor || !guarantorForm.name.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingGuarantor ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </div>
          )}

          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">ชื่อ</th>
                <th className="px-4 py-3 font-medium">เบอร์โทร</th>
                <th className="px-4 py-3 font-medium">เลขบัตร</th>
                <th className="px-4 py-3 font-medium">ความสัมพันธ์</th>
                {isPending && canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {guarantors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">ยังไม่มีผู้ค้ำประกัน</td>
                </tr>
              ) : (
                guarantors.map((g: Guarantor) => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{g.name}</td>
                    <td className="px-4 py-3 text-gray-600">{g.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{g.id_card ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{g.relationship ?? '—'}</td>
                    {isPending && canEdit && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteGuarantor(g.id)}
                          disabled={deletingGuarantorId === g.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-50"
                          title="ลบ"
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: เอกสารแนบ */}
      {activeTab === 'documents' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Drop zone */}
          {canEdit && (
            <div className="border-b border-gray-100 p-5 space-y-4">
              <div
                className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-6 py-8 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon />
                <span>คลิกหรือลากไฟล์มาวางที่นี่</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleFileSelect}
              />

              {stagedFiles.length > 0 && (
                <div className="space-y-2">
                  {stagedFiles.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
                      <FileIcon />
                      <span className="flex-1 truncate text-sm text-gray-700">{s.file.name}</span>
                      <select
                        value={s.doc_type}
                        onChange={(e) => updateStagedType(i, e.target.value as LoanDocumentType)}
                        className="rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                      >
                        {(Object.keys(DOC_TYPE_LABELS) as LoanDocumentType[]).map((k) => (
                          <option key={k} value={k}>{DOC_TYPE_LABELS[k]}</option>
                        ))}
                      </select>
                      {s.error && <span className="text-xs text-red-500">{s.error}</span>}
                      <button type="button" onClick={() => removeStagedFile(i)} className="text-gray-400 hover:text-red-500">
                        <XIcon />
                      </button>
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={uploadAll}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      <UploadIcon /> อัพโหลด ({stagedFiles.length})
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Uploaded list */}
          <div className="divide-y divide-gray-100">
            {documents.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">ยังไม่มีเอกสารแนบ</p>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                  <FileIcon />
                  <div className="flex-1 min-w-0">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm font-medium text-blue-600 hover:underline"
                    >
                      {doc.file_name}
                    </a>
                    <p className="text-xs text-gray-400 mt-0.5">{DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}</p>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleDeleteDoc(doc.id)}
                      disabled={deletingDocId === doc.id}
                      className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-50"
                      title="ลบเอกสาร"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Confirm modals */}
      <ConfirmModal
        isOpen={confirmModal?.type === 'approve'}
        title="ยืนยันอนุมัติคำขอ"
        message="คุณต้องการอนุมัติคำขอสินเชื่อนี้ใช่หรือไม่?"
        confirmLabel="อนุมัติ"
        variant="info"
        isLoading={actionLoading}
        onConfirm={handleApprove}
        onCancel={() => setConfirmModal(null)}
      />
      <ConfirmModal
        isOpen={confirmModal?.type === 'reject'}
        title="ยืนยันปฏิเสธคำขอ"
        message="คุณต้องการปฏิเสธคำขอสินเชื่อนี้ใช่หรือไม่?"
        confirmLabel="ปฏิเสธ"
        variant="danger"
        isLoading={actionLoading}
        onConfirm={handleReject}
        onCancel={() => setConfirmModal(null)}
      />
      <ConfirmModal
        isOpen={confirmModal?.type === 'cancel'}
        title="ยืนยันยกเลิกคำขอ"
        message="คุณต้องการยกเลิกคำขอสินเชื่อนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้"
        confirmLabel="ยกเลิกคำขอ"
        variant="danger"
        isLoading={actionLoading}
        onConfirm={handleCancel}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  )
}
