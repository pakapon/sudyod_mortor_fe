import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { loanService } from '@/api/loanService'
import { hrService } from '@/api/hrService'
import type { Branch } from '@/types/hr'
import type { CalculatePmtResult } from '@/types/loans'
import type { Customer } from '@/types/customer'
import { cn } from '@/lib/utils'
import { RichTextToolbar } from '@/components/RichTextToolbar'
import { CustomerSearchSelect, getCustomerDisplayName } from '@/components/ui/CustomerSearchSelect'

interface FormValues {
  branch_id: string
  customer_name: string
  customer_phone: string
  customer_id_card: string
  total_amount: string
  down_payment: string
  start_date: string
  next_due_date: string
  interest_rate: string
  term_months: string
  monthly_payment: string
  invoice_id: string
  note: string
}

interface CalcForm {
  principal: string
  interest_rate: string
  term_months: string
}

function BackIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}
function CalculatorIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="4" y="2" width="16" height="20" rx="2" strokeWidth={2} />
      <line x1="8" y1="6" x2="16" y2="6" strokeWidth={2} strokeLinecap="round" />
      <line x1="8" y1="10" x2="8" y2="10" strokeWidth={3} strokeLinecap="round" />
      <line x1="12" y1="10" x2="12" y2="10" strokeWidth={3} strokeLinecap="round" />
      <line x1="16" y1="10" x2="16" y2="10" strokeWidth={3} strokeLinecap="round" />
      <line x1="8" y1="14" x2="8" y2="14" strokeWidth={3} strokeLinecap="round" />
      <line x1="12" y1="14" x2="12" y2="14" strokeWidth={3} strokeLinecap="round" />
      <line x1="16" y1="14" x2="16" y2="18" strokeWidth={3} strokeLinecap="round" />
    </svg>
  )
}

export function StoreLoanFormPage() {
  const navigate = useNavigate()
  const [isSaving, setIsSaving] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [calcForm, setCalcForm] = useState<CalcForm>({ principal: '', interest_rate: '', term_months: '' })
  const [calcResult, setCalcResult] = useState<CalculatePmtResult | null>(null)
  const [showSchedule, setShowSchedule] = useState(false)
  const [openYears, setOpenYears] = useState<Set<number>>(new Set([1]))
  const [isCalculating, setIsCalculating] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerError, setCustomerError] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      branch_id: '', customer_name: '', customer_phone: '', customer_id_card: '',
      total_amount: '', down_payment: '', start_date: '', next_due_date: '',
      interest_rate: '', term_months: '', monthly_payment: '', invoice_id: '', note: '',
    },
  })

  const noteValue = watch('note')

  useEffect(() => {
    hrService.getBranches()
      .then((res) => setBranches(res.data.data))
      .catch(() => {})
  }, [])

  const handleCalculate = async () => {
    if (!calcForm.principal || !calcForm.interest_rate || !calcForm.term_months) return
    setIsCalculating(true)
    setShowSchedule(false)
    setOpenYears(new Set([1]))
    try {
      const res = await loanService.calculatePmt({
        principal: Number(calcForm.principal),
        interest_rate: Number(calcForm.interest_rate),
        term_months: Number(calcForm.term_months),
      })
      const result = res.data.data
      setCalcResult(result)
      setValue('monthly_payment', String(result.summary.monthly_payment))
      setValue('interest_rate', calcForm.interest_rate)
      setValue('term_months', calcForm.term_months)
    } catch {
      //
    } finally {
      setIsCalculating(false)
    }
  }

  const toggleYear = (year: number) => {
    setOpenYears((prev) => {
      const next = new Set(prev)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })
  }

  const handleCustomerSelect = (c: Customer | null) => {
    setSelectedCustomer(c)
    setCustomerError(false)
    if (c) {
      setValue('customer_name', getCustomerDisplayName(c))
      setValue('customer_phone', c.primary_phone ?? '')
      setValue('customer_id_card', c.id_card ?? '')
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!selectedCustomer) {
      setCustomerError(true)
      return
    }
    setIsSaving(true)
    try {
      const res = await loanService.createStoreLoan({
        branch_id: Number(values.branch_id),
        customer_id: selectedCustomer.id,
        customer_name: values.customer_name.trim(),
        total_amount: Number(values.total_amount),
        interest_rate: Number(values.interest_rate),
        term_months: Number(values.term_months),
        monthly_payment: Number(values.monthly_payment),
        start_date: values.start_date,
        next_due_date: values.next_due_date,
        down_payment: values.down_payment ? Number(values.down_payment) : undefined,
        customer_phone: values.customer_phone || undefined,
        customer_id_card: values.customer_id_card || undefined,
        invoice_id: values.invoice_id ? Number(values.invoice_id) : undefined,
        note: values.note || undefined,
      })
      navigate(`/store-loans/${res.data.data.id}`)
    } catch {
      //
    } finally {
      setIsSaving(false)
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/store-loans" className="p-1.5 text-gray-400 hover:text-gray-700">
          <BackIcon />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">สร้างสัญญาสินเชื่อร้าน</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* เครื่องคิดค่างวด */}
        <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <CalculatorIcon />
            <h2 className="font-semibold text-indigo-800">คำนวณค่างวด</h2>
            <span className="text-xs text-indigo-500">(ไม่บังคับ — ช่วยกรอกค่างวดในฟอร์มอัตโนมัติ)</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-indigo-800">ยอดเงินต้น (฿)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={calcForm.principal}
                onChange={(e) => setCalcForm((p) => ({ ...p, principal: e.target.value }))}
                className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-indigo-800">อัตราดอกเบี้ย (% ต่อปี)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={calcForm.interest_rate}
                onChange={(e) => setCalcForm((p) => ({ ...p, interest_rate: e.target.value }))}
                className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-indigo-800">จำนวนงวด (เดือน)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={calcForm.term_months}
                onChange={(e) => setCalcForm((p) => ({ ...p, term_months: e.target.value }))}
                className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleCalculate}
            disabled={isCalculating || !calcForm.principal || !calcForm.interest_rate || !calcForm.term_months}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isCalculating ? 'กำลังคำนวณ...' : 'คำนวณ'}
          </button>

          {/* ผลลัพธ์ summary */}
          {calcResult !== null && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <div className="col-span-2 sm:col-span-1 rounded-lg bg-indigo-600 px-4 py-3 text-center">
                  <p className="text-xs font-medium text-indigo-200">ค่างวด/เดือน</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {calcResult.summary.monthly_payment.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-indigo-200">บาท</p>
                </div>
                <div className="rounded-lg bg-white border border-indigo-100 px-4 py-3 text-center">
                  <p className="text-xs font-medium text-gray-500">ยอดชำระรวม</p>
                  <p className="mt-1 text-base font-semibold text-gray-800">
                    {calcResult.summary.total_paid.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-400">บาท</p>
                </div>
                <div className="rounded-lg bg-white border border-indigo-100 px-4 py-3 text-center">
                  <p className="text-xs font-medium text-gray-500">ดอกเบี้ยรวม</p>
                  <p className="mt-1 text-base font-semibold text-orange-600">
                    {calcResult.summary.total_interest.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-400">บาท</p>
                </div>
                <div className="rounded-lg bg-white border border-indigo-100 px-4 py-3 text-center">
                  <p className="text-xs font-medium text-gray-500">งวดแรก</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">{calcResult.summary.first_payment_date}</p>
                </div>
                <div className="rounded-lg bg-white border border-indigo-100 px-4 py-3 text-center">
                  <p className="text-xs font-medium text-gray-500">งวดสุดท้าย</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">{calcResult.summary.last_payment_date}</p>
                </div>
              </div>

              {/* toggle ตาราง */}
              <button
                type="button"
                onClick={() => setShowSchedule((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:text-indigo-900"
              >
                <svg
                  className={cn('w-4 h-4 transition-transform', showSchedule ? 'rotate-180' : '')}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {showSchedule ? 'ซ่อนตารางผ่อนชำระ' : `ดูตารางผ่อนชำระ (${calcResult.summary.term_months} งวด)`}
              </button>

              {/* ตารางผ่อนชำระ — accordion ทีละปี */}
              {showSchedule && (() => {
                const totalMonths = calcResult.summary.term_months
                const totalYears = Math.ceil(totalMonths / 12)
                return (
                  <div className="space-y-2">
                    {Array.from({ length: totalYears }, (_, yi) => {
                      const year = yi + 1
                      const startIdx = yi * 12
                      const items = calcResult.schedule.slice(startIdx, startIdx + 12)
                      const isOpen = openYears.has(year)
                      return (
                        <div key={year} className="rounded-lg border border-indigo-100 bg-white overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleYear(year)}
                            className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-indigo-800 hover:bg-indigo-50"
                          >
                            <span>
                              ปีที่ {year} — งวดที่ {startIdx + 1}–{Math.min(startIdx + 12, totalMonths)}
                            </span>
                            <svg
                              className={cn('w-4 h-4 transition-transform', isOpen ? 'rotate-180' : '')}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {isOpen && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-indigo-50 text-indigo-700">
                                    <th className="px-3 py-2 text-right font-medium">งวดที่</th>
                                    <th className="px-3 py-2 text-left font-medium">วันชำระ</th>
                                    <th className="px-3 py-2 text-right font-medium">ยอดหนี้ต้นงวด</th>
                                    <th className="px-3 py-2 text-right font-medium">ค่างวด</th>
                                    <th className="px-3 py-2 text-right font-medium">เงินต้น</th>
                                    <th className="px-3 py-2 text-right font-medium">ดอกเบี้ย</th>
                                    <th className="px-3 py-2 text-right font-medium">ยอดหนี้คงเหลือ</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {items.map((row) => (
                                    <tr key={row.installment} className="hover:bg-gray-50">
                                      <td className="px-3 py-1.5 text-right text-gray-600">{row.installment}</td>
                                      <td className="px-3 py-1.5 text-left text-gray-600">{row.payment_date}</td>
                                      <td className="px-3 py-1.5 text-right text-gray-700">{row.beginning_balance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                      <td className="px-3 py-1.5 text-right font-medium text-gray-900">{row.payment.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                      <td className="px-3 py-1.5 text-right text-gray-700">{row.principal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                      <td className="px-3 py-1.5 text-right text-orange-600">{row.interest.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                      <td className="px-3 py-1.5 text-right text-gray-700">{row.ending_balance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}
        </section>

        {/* ข้อมูลลูกค้า */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">ข้อมูลลูกค้า</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">ค้นหาลูกค้า *</label>
              <CustomerSearchSelect
                selectedCustomer={selectedCustomer ? { id: selectedCustomer.id, label: getCustomerDisplayName(selectedCustomer) } : null}
                onSelect={handleCustomerSelect}
                error={customerError}
              />
              {customerError && <p className="mt-1 text-xs text-red-500">กรุณาเลือกลูกค้า</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">ชื่อลูกค้า *</label>
              <input
                type="text"
                {...register('customer_name', { required: true })}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none',
                  errors.customer_name ? 'border-red-400' : 'border-gray-200',
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">เบอร์โทร</label>
              <input
                type="text"
                {...register('customer_phone')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">เลขบัตรประชาชน</label>
              <input
                type="text"
                maxLength={13}
                {...register('customer_id_card')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* รายละเอียดสัญญา */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">รายละเอียดสัญญา</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">สาขา *</label>
              <select
                {...register('branch_id', { required: true })}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none',
                  errors.branch_id ? 'border-red-400' : 'border-gray-200',
                )}
              >
                <option value="">เลือกสาขา</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">ยอดรวม (฿) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                {...register('total_amount', { required: true })}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none',
                  errors.total_amount ? 'border-red-400' : 'border-gray-200',
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
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">อัตราดอกเบี้ย (%) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                {...register('interest_rate', { required: true })}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none',
                  errors.interest_rate ? 'border-red-400' : 'border-gray-200',
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">จำนวนงวด (เดือน) *</label>
              <input
                type="number"
                min="1"
                step="1"
                {...register('term_months', { required: true })}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none',
                  errors.term_months ? 'border-red-400' : 'border-gray-200',
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">ค่างวด/เดือน (฿) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                {...register('monthly_payment', { required: true })}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none',
                  errors.monthly_payment ? 'border-red-400' : 'border-gray-200',
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">วันที่เริ่มสัญญา *</label>
              <input
                type="date"
                {...register('start_date', { required: true })}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none',
                  errors.start_date ? 'border-red-400' : 'border-gray-200',
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">วันครบกำหนดครั้งถัดไป *</label>
              <input
                type="date"
                {...register('next_due_date', { required: true })}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none',
                  errors.next_due_date ? 'border-red-400' : 'border-gray-200',
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">รหัสใบแจ้งหนี้</label>
              <input
                type="number"
                min="1"
                {...register('invoice_id')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* หมายเหตุ */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-800">หมายเหตุ</h2>
          <RichTextToolbar targetId="store-loan-note-editor" />
          <div
            id="store-loan-note-editor"
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => setValue('note', (e.target as HTMLDivElement).innerHTML)}
            dangerouslySetInnerHTML={{ __html: noteValue }}
            className="min-h-[100px] w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </section>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            to="/store-loans"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'กำลังบันทึก...' : 'สร้างสัญญา'}
          </button>
        </div>
      </form>
    </div>
  )
}
