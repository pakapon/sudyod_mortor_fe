import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { loanService } from '@/api/loanService'
import type {
  StoreLoan,
  StoreLoanStatus,
  StoreLoanPayment,
  LoanDocument,
  LoanDocumentType,
  PaymentMethod,
} from '@/types/loans'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

// ── Status ────────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<StoreLoanStatus, { label: string; className: string }> = {
  active: { label: 'กำลังผ่อน', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'ชำระครบ', className: 'bg-green-100 text-green-700' },
  overdue: { label: 'ค้างชำระ', className: 'bg-red-100 text-red-700' },
  cancelled: { label: 'ยกเลิก', className: 'bg-gray-100 text-gray-500' },
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'เงินสด',
  transfer: 'โอนเงิน',
  credit_card: 'บัตรเครดิต',
  cheque: 'เช็ค',
}

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

// ── Staged file type ──────────────────────────────────────────────────────────
interface StagedFile {
  file: File
  doc_type: LoanDocumentType
  uploading: boolean
  error: string | null
}

interface PaymentFormValues {
  amount: string
  method: PaymentMethod
  reference_no: string
  paid_at: string
  note: string
}

export function StoreLoanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { permissions } = useAuthStore()
  const loanId = Number(id)

  const [loan, setLoan] = useState<StoreLoan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'detail' | 'payments' | 'documents'>('detail')

  const [payments, setPayments] = useState<StoreLoanPayment[]>([])
  const [documents, setDocuments] = useState<LoanDocument[]>([])

  // Cancel
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  // Payment form
  const [paymentForm, setPaymentForm] = useState<PaymentFormValues>({
    amount: '', method: 'cash', reference_no: '', paid_at: '', note: '',
  })
  const [isSavingPayment, setIsSavingPayment] = useState(false)

  // Document upload
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canEdit = hasPermission(permissions, 'store_loans', 'can_edit')

  const isActionable = loan?.status === 'active' || loan?.status === 'overdue'

  const load = () => {
    setIsLoading(true)
    Promise.all([
      loanService.getStoreLoan(loanId),
      loanService.getStoreLoanDocuments(loanId),
    ])
      .then(([loanRes, docsRes]) => {
        setLoan(loanRes.data.data)
        setDocuments(docsRes.data.data)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }

  const loadPayments = () => {
    loanService.getPayments(loanId)
      .then((res) => setPayments(res.data.data))
      .catch(() => {})
  }

  useEffect(() => { load() }, [loanId])
  useEffect(() => {
    if (activeTab === 'payments') loadPayments()
  }, [activeTab, loanId])

  // Cancel
  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      await loanService.cancelStoreLoan(loanId)
      setShowCancelModal(false)
      load()
    } catch {
      //
    } finally {
      setIsCancelling(false)
    }
  }

  // Record payment
  const handleRecordPayment = async () => {
    if (!paymentForm.amount) return
    setIsSavingPayment(true)
    try {
      await loanService.recordPayment(loanId, {
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        reference_no: paymentForm.reference_no || undefined,
        paid_at: paymentForm.paid_at || undefined,
        note: paymentForm.note || undefined,
      })
      setPaymentForm({ amount: '', method: 'cash', reference_no: '', paid_at: '', note: '' })
      load()
      loadPayments()
    } catch {
      //
    } finally {
      setIsSavingPayment(false)
    }
  }

  // Document upload
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
    for (let i = 0; i < stagedFiles.length; i++) {
      const s = stagedFiles[i]
      if (s.uploading) continue
      setStagedFiles((prev) => prev.map((x, j) => (j === i ? { ...x, uploading: true, error: null } : x)))
      try {
        const res = await loanService.uploadStoreLoanDocument(loanId, s.file, { document_type: s.doc_type })
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
      await loanService.deleteStoreLoanDocument(loanId, docId)
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
    } catch {
      //
    } finally {
      setDeletingDocId(null)
    }
  }

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
        <p className="text-gray-500">ไม่พบข้อมูลสัญญาสินเชื่อ</p>
        <Link to="/store-loans" className="text-sm text-blue-600 hover:underline">กลับรายการ</Link>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[loan.status] ?? STATUS_CONFIG.active

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/store-loans" className="p-1.5 text-gray-400 hover:text-gray-700">
            <ChevronLeftIcon />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{loan.store_loan_no}</h1>
              <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', statusCfg.className)}>
                {statusCfg.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {loan.customer_name} &middot; เริ่ม {formatDate(loan.start_date)}
            </p>
          </div>
        </div>
        {isActionable && canEdit && (
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            ยกเลิกสัญญา
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {([
            { key: 'detail', label: 'รายละเอียด' },
            { key: 'payments', label: `ประวัติชำระ (${payments.length})` },
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
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <dl>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">ชื่อลูกค้า</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">{loan.customer_name}</dd>
              </dl>
              <dl>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">เบอร์โทร</dt>
                <dd className="mt-1 text-sm text-gray-700">{loan.customer_phone ?? '—'}</dd>
              </dl>
              <dl>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">เลขบัตรประชาชน</dt>
                <dd className="mt-1 text-sm text-gray-700 font-mono text-xs">{loan.customer_id_card ?? '—'}</dd>
              </dl>
              <dl>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">ยอดรวม</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">{formatMoney(loan.total_amount)} ฿</dd>
              </dl>
              <dl>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">เงินดาวน์</dt>
                <dd className="mt-1 text-sm text-gray-700">{formatMoney(loan.down_payment)} ฿</dd>
              </dl>
              <dl>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">ยอดเงินต้น</dt>
                <dd className="mt-1 text-sm text-gray-700">{formatMoney(loan.principal)} ฿</dd>
              </dl>
              <dl>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">อัตราดอกเบี้ย</dt>
                <dd className="mt-1 text-sm text-gray-700">{loan.interest_rate}%</dd>
              </dl>
              <dl>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">จำนวนงวด</dt>
                <dd className="mt-1 text-sm text-gray-700">{loan.term_months} เดือน</dd>
              </dl>
              <dl>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">ค่างวด/เดือน</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">{formatMoney(loan.monthly_payment)} ฿</dd>
              </dl>
              <dl>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">วันที่เริ่มสัญญา</dt>
                <dd className="mt-1 text-sm text-gray-700">{formatDate(loan.start_date)}</dd>
              </dl>
              <dl>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">วันครบกำหนดถัดไป</dt>
                <dd className="mt-1 text-sm text-gray-700">{formatDate(loan.next_due_date)}</dd>
              </dl>
              <dl>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">สาขา</dt>
                <dd className="mt-1 text-sm text-gray-700">{loan.branch?.name ?? '—'}</dd>
              </dl>
            </div>
            {loan.note && (
              <>
                <hr className="my-5 border-gray-100" />
                <div>
                  <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">หมายเหตุ</dt>
                  <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: loan.note }} />
                </div>
              </>
            )}
          </div>

          {/* Inline payment section */}
          {isActionable && canEdit && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 space-y-4">
              <h3 className="font-semibold text-blue-800">บันทึกการชำระ</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-blue-800">ยอดชำระ (฿) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-blue-800">วิธีชำระ *</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, method: e.target.value as PaymentMethod }))}
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                  >
                    {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((k) => (
                      <option key={k} value={k}>{PAYMENT_METHOD_LABELS[k]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-blue-800">เลขอ้างอิง</label>
                  <input
                    type="text"
                    value={paymentForm.reference_no}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, reference_no: e.target.value }))}
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-blue-800">วันที่ชำระ</label>
                  <input
                    type="date"
                    value={paymentForm.paid_at}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, paid_at: e.target.value }))}
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-blue-800">หมายเหตุ</label>
                  <input
                    type="text"
                    value={paymentForm.note}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, note: e.target.value }))}
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleRecordPayment}
                  disabled={isSavingPayment || !paymentForm.amount}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSavingPayment ? 'กำลังบันทึก...' : 'บันทึกการชำระ'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: ประวัติชำระ */}
      {activeTab === 'payments' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">วันที่ชำระ</th>
                <th className="px-4 py-3 font-medium text-right">ยอด</th>
                <th className="px-4 py-3 font-medium">วิธีชำระ</th>
                <th className="px-4 py-3 font-medium">เลขอ้างอิง</th>
                <th className="px-4 py-3 font-medium">ผู้บันทึก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">ยังไม่มีประวัติการชำระ</td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{formatDate(p.paid_at)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatMoney(p.amount)} ฿</td>
                    <td className="px-4 py-3 text-gray-600">{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.reference_no ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.created_by ? `${p.created_by.first_name ?? ''} ${p.created_by.last_name ?? ''}`.trim() : '—'}
                    </td>
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

      {/* Cancel modal */}
      <ConfirmModal
        isOpen={showCancelModal}
        title="ยืนยันยกเลิกสัญญา"
        message="คุณต้องการยกเลิกสัญญาสินเชื่อนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้"
        confirmLabel="ยกเลิกสัญญา"
        variant="danger"
        isLoading={isCancelling}
        onConfirm={handleCancel}
        onCancel={() => setShowCancelModal(false)}
      />
    </div>
  )
}
