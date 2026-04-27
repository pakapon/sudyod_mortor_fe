import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { loanService } from '@/api/loanService'
import { hrService } from '@/api/hrService'
import type { LoanApplication } from '@/types/loans'
import type { Branch, FinanceCompany } from '@/types/hr'
import { cn } from '@/lib/utils'
import { RichTextToolbar } from '@/components/RichTextToolbar'
import type { Customer } from '@/types/customer'
import { CustomerSearchSelect, getCustomerDisplayName } from '@/components/ui/CustomerSearchSelect'

interface FormValues {
  branch_id: string
  finance_company_id: string
  applicant_name: string
  applicant_phone: string
  applicant_id_card: string
  amount_requested: string
  down_payment: string
  applied_date: string
  invoice_id: string
  quotation_id: string
  note: string
}

function BackIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

export function LoanApplicationFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id

  const [isLoading, setIsLoading] = useState(isEdit)
  const [isSaving, setIsSaving] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [financeCompanies, setFinanceCompanies] = useState<FinanceCompany[]>([])
  const [existing, setExisting] = useState<LoanApplication | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      branch_id: '', finance_company_id: '', applicant_name: '', applicant_phone: '',
      applicant_id_card: '', amount_requested: '', down_payment: '', applied_date: '',
      invoice_id: '', quotation_id: '', note: '',
    },
  })

  const noteValue = watch('note')

  useEffect(() => {
    Promise.all([hrService.getBranches(), hrService.getFinanceCompanies()])
      .then(([bRes, fcRes]) => {
        setBranches(bRes.data.data)
        setFinanceCompanies(fcRes.data.data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    loanService.getLoanApplication(Number(id))
      .then((res) => {
        const d = res.data.data
        setExisting(d)
        reset({
          branch_id: String(d.branch_id),
          finance_company_id: String(d.finance_company_id),
          applicant_name: d.applicant_name,
          applicant_phone: d.applicant_phone ?? '',
          applicant_id_card: d.applicant_id_card ?? '',
          amount_requested: String(d.amount_requested),
          down_payment: d.down_payment != null ? String(d.down_payment) : '',
          applied_date: d.applied_date.slice(0, 10),
          invoice_id: d.invoice_id != null ? String(d.invoice_id) : '',
          quotation_id: d.quotation_id != null ? String(d.quotation_id) : '',
          note: d.note ?? '',
        })
        if (d.customer_id != null && d.customer) {
          setSelectedCustomer(d.customer as Customer)
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [id, reset])

  const onSubmit = handleSubmit(async (values) => {
    setIsSaving(true)
    try {
      const payload = {
        branch_id: Number(values.branch_id),
        finance_company_id: Number(values.finance_company_id),
        applicant_name: values.applicant_name.trim(),
        amount_requested: Number(values.amount_requested),
        applied_date: values.applied_date,
        applicant_phone: values.applicant_phone || undefined,
        applicant_id_card: values.applicant_id_card || undefined,
        down_payment: values.down_payment ? Number(values.down_payment) : undefined,
        customer_id: selectedCustomer?.id ?? undefined,
        invoice_id: values.invoice_id ? Number(values.invoice_id) : undefined,
        quotation_id: values.quotation_id ? Number(values.quotation_id) : undefined,
        note: values.note || undefined,
      }
      if (isEdit) {
        await loanService.updateLoanApplication(Number(id), payload)
        navigate(`/loan-applications/${id}`)
      } else {
        const res = await loanService.createLoanApplication(payload)
        navigate(`/loan-applications/${res.data.data.id}`)
      }
    } catch {
      //
    } finally {
      setIsSaving(false)
    }
  })

  const handleCustomerSelect = (c: Customer | null) => {
    setSelectedCustomer(c)
    if (c) {
      setValue('applicant_name', getCustomerDisplayName(c))
      setValue('applicant_phone', c.primary_phone ?? '')
      setValue('applicant_id_card', c.id_card ?? '')
    }
  }

  const canEdit = !isEdit || existing?.status === 'pending'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/loan-applications" className="p-1.5 text-gray-400 hover:text-gray-700">
          <BackIcon />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? `แก้ไขคำขอ ${existing?.application_no ?? ''}` : 'สร้างคำขอสินเชื่อใหม่'}
        </h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* ข้อมูลผู้กู้ */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">ข้อมูลผู้กู้</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">ลูกค้าในระบบ</label>
              <CustomerSearchSelect
                selectedCustomer={selectedCustomer ? { id: selectedCustomer.id, label: getCustomerDisplayName(selectedCustomer) } : null}
                onSelect={handleCustomerSelect}
                disabled={!canEdit}
                placeholder="ค้นหาชื่อหรือเบอร์โทรเพื่อดึงข้อมูล (ไม่บังคับ)"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">ชื่อผู้กู้ *</label>
              <input
                type="text"
                {...register('applicant_name', { required: true })}
                disabled={!canEdit}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                  errors.applicant_name ? 'border-red-400' : 'border-gray-200',
                  !canEdit && 'bg-gray-50 cursor-not-allowed',
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">เบอร์โทรศัพท์</label>
              <input
                type="text"
                {...register('applicant_phone')}
                disabled={!canEdit}
                className={cn(
                  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                  !canEdit && 'bg-gray-50 cursor-not-allowed',
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">เลขบัตรประชาชน</label>
              <input
                type="text"
                maxLength={13}
                {...register('applicant_id_card')}
                disabled={!canEdit}
                className={cn(
                  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                  !canEdit && 'bg-gray-50 cursor-not-allowed',
                )}
              />
            </div>
          </div>
        </section>

        {/* รายละเอียดสินเชื่อ */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">รายละเอียดสินเชื่อ</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">สาขา *</label>
              <select
                {...register('branch_id', { required: true })}
                disabled={!canEdit}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none',
                  errors.branch_id ? 'border-red-400' : 'border-gray-200',
                  !canEdit && 'bg-gray-50 cursor-not-allowed',
                )}
              >
                <option value="">เลือกสาขา</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">บริษัทไฟแนนซ์ *</label>
              <select
                {...register('finance_company_id', { required: true })}
                disabled={!canEdit}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none',
                  errors.finance_company_id ? 'border-red-400' : 'border-gray-200',
                  !canEdit && 'bg-gray-50 cursor-not-allowed',
                )}
              >
                <option value="">เลือกบริษัทไฟแนนซ์</option>
                {financeCompanies.map((fc) => (
                  <option key={fc.id} value={fc.id}>{fc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">วันที่ยื่น *</label>
              <input
                type="date"
                {...register('applied_date', { required: true })}
                disabled={!canEdit}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none',
                  errors.applied_date ? 'border-red-400' : 'border-gray-200',
                  !canEdit && 'bg-gray-50 cursor-not-allowed',
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">ยอดขอกู้ (฿) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                {...register('amount_requested', { required: true, min: 1 })}
                disabled={!canEdit}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none',
                  errors.amount_requested ? 'border-red-400' : 'border-gray-200',
                  !canEdit && 'bg-gray-50 cursor-not-allowed',
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">เงินดาวน์ (฿)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                {...register('down_payment')}
                disabled={!canEdit}
                className={cn(
                  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none',
                  !canEdit && 'bg-gray-50 cursor-not-allowed',
                )}
              />
            </div>
          </div>
        </section>

        {/* ข้อมูลอ้างอิง */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">ข้อมูลอ้างอิง</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">รหัสใบแจ้งหนี้</label>
              <input
                type="number"
                min="1"
                {...register('invoice_id')}
                disabled={!canEdit}
                className={cn(
                  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none',
                  !canEdit && 'bg-gray-50 cursor-not-allowed',
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">รหัสใบเสนอราคา</label>
              <input
                type="number"
                min="1"
                {...register('quotation_id')}
                disabled={!canEdit}
                className={cn(
                  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none',
                  !canEdit && 'bg-gray-50 cursor-not-allowed',
                )}
              />
            </div>
          </div>
        </section>

        {/* หมายเหตุ */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-800">หมายเหตุ</h2>
          {canEdit && <RichTextToolbar targetId="note-editor" />}
          <div
            id="note-editor"
            contentEditable={canEdit}
            suppressContentEditableWarning
            onInput={(e) => setValue('note', (e.target as HTMLDivElement).innerHTML)}
            dangerouslySetInnerHTML={{ __html: noteValue }}
            className={cn(
              'min-h-[100px] w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none',
              !canEdit && 'bg-gray-50 cursor-not-allowed',
            )}
          />
        </section>

        {/* Actions */}
        {canEdit && (
          <div className="flex justify-end gap-3">
            <Link
              to={isEdit ? `/loan-applications/${id}` : '/loan-applications'}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'สร้างคำขอ'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
