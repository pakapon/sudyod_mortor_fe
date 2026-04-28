import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { serviceOrderService } from '@/api/serviceOrderService'
import { customerService } from '@/api/customerService'
import { hrService } from '@/api/hrService'
import type { ServiceOrder } from '@/types/serviceOrder'
import type { Branch } from '@/types/hr'
import type { Customer, CustomerVehicle } from '@/types/customer'
import { cn } from '@/lib/utils'
import { CustomerSearchSelect, getCustomerDisplayName } from '@/components/ui/CustomerSearchSelect'

// ── Icons ─────────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

// ── Form Values ───────────────────────────────────────────────────────────────
interface FormValues {
  symptom: string
  received_date: string
  mileage: string
  expected_completion_date: string
  is_quick_repair: boolean
  branch_id: string
  diagnosis: string
  internal_note: string
}

export function ServiceOrderFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id

  const [isLoading, setIsLoading] = useState(isEdit)
  const [isSaving, setIsSaving] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [existing, setExisting] = useState<ServiceOrder | null>(null)

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([])
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')

  const today = new Date().toISOString().slice(0, 10)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      symptom: '',
      received_date: today,
      mileage: '',
      expected_completion_date: '',
      is_quick_repair: false,
      branch_id: '',
      diagnosis: '',
      internal_note: '',
    },
  })

  useEffect(() => {
    hrService.getBranches().then((res) => {
      if (res.data.success) setBranches(res.data.data as Branch[])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    serviceOrderService.getServiceOrder(Number(id))
      .then((res) => {
        const d = res.data.data
        setExisting(d)
        reset({
          symptom: d.symptom,
          received_date: d.received_date.slice(0, 10),
          mileage: d.mileage != null ? String(d.mileage) : '',
          expected_completion_date: d.expected_completion_date ? d.expected_completion_date.slice(0, 10) : '',
          is_quick_repair: d.is_quick_repair ?? false,
          branch_id: String(d.branch_id),
          diagnosis: d.diagnosis ?? '',
          internal_note: d.internal_note ?? '',
        })
        if (d.customer) setSelectedCustomer(d.customer as Customer)
        if (d.vehicle_id) setSelectedVehicleId(String(d.vehicle_id))
        if (d.customer_id) {
          setIsLoadingVehicles(true)
          customerService.getVehicles(d.customer_id)
            .then((vRes) => {
              if (vRes.data.success) setVehicles(vRes.data.data as CustomerVehicle[])
            })
            .catch(() => {})
            .finally(() => setIsLoadingVehicles(false))
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [id, reset])

  const handleCustomerSelect = (c: Customer | null) => {
    setSelectedCustomer(c)
    setSelectedVehicleId('')
    setVehicles([])
    if (c) {
      setIsLoadingVehicles(true)
      customerService.getVehicles(c.id)
        .then((vRes) => {
          if (vRes.data.success) setVehicles(vRes.data.data as CustomerVehicle[])
        })
        .catch(() => {})
        .finally(() => setIsLoadingVehicles(false))
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!selectedCustomer) return
    setIsSaving(true)
    try {
      if (isEdit) {
        await serviceOrderService.updateServiceOrder(Number(id), {
          symptom: values.symptom.trim(),
          received_date: values.received_date,
          mileage: values.mileage ? Number(values.mileage) : undefined,
          expected_completion_date: values.expected_completion_date || undefined,
          is_quick_repair: values.is_quick_repair,
          diagnosis: values.diagnosis || undefined,
          internal_note: values.internal_note || undefined,
        })
        navigate(`/service-orders/${id}`)
      } else {
        const res = await serviceOrderService.createServiceOrder({
          customer_id: selectedCustomer.id,
          vehicle_id: selectedVehicleId ? Number(selectedVehicleId) : undefined,
          branch_id: Number(values.branch_id),
          symptom: values.symptom.trim(),
          mileage: values.mileage ? Number(values.mileage) : undefined,
          received_date: values.received_date,
          expected_completion_date: values.expected_completion_date || undefined,
          is_quick_repair: values.is_quick_repair,
        })
        navigate(`/service-orders/${res.data.data.id}`)
      }
    } catch {
      //
    } finally {
      setIsSaving(false)
    }
  })

  const canEdit = !isEdit || existing?.status === 'draft' || existing?.status === 'pending_review'

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
        <Link
          to={isEdit ? `/service-orders/${id}` : '/service-orders'}
          className="p-1.5 text-gray-400 hover:text-gray-700"
        >
          <BackIcon />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? `แก้ไขใบสั่งซ่อม ${existing?.so_number ?? ''}` : 'สร้างใบสั่งซ่อมใหม่'}
        </h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Section 1: เลือกลูกค้า + รถ */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">ข้อมูลลูกค้าและรถ</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                ลูกค้า *
              </label>
              <CustomerSearchSelect
                selectedCustomer={
                  selectedCustomer
                    ? { id: selectedCustomer.id, label: getCustomerDisplayName(selectedCustomer) }
                    : null
                }
                onSelect={handleCustomerSelect}
                disabled={!canEdit}
                placeholder="พิมพ์ชื่อหรือเบอร์โทรเพื่อค้นหาลูกค้า..."
              />
              {!selectedCustomer && (
                <p className="mt-1 text-xs text-red-500">กรุณาเลือกลูกค้า</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">รถ</label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                disabled={!canEdit || !selectedCustomer || isLoadingVehicles}
                className={cn(
                  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                  (!canEdit || !selectedCustomer) && 'bg-gray-50 cursor-not-allowed',
                )}
              >
                <option value="">
                  {isLoadingVehicles
                    ? 'กำลังโหลด...'
                    : !selectedCustomer
                    ? 'เลือกลูกค้าก่อน'
                    : vehicles.length === 0
                    ? 'ไม่มีรถในระบบ'
                    : 'เลือกรถ (ไม่บังคับ)'}
                </option>
                {vehicles.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.plate_number}
                    {v.brand ? ` · ${v.brand}` : ''}
                    {v.model ? ` ${v.model}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {!isEdit && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">สาขา *</label>
                <select
                  {...register('branch_id', { required: true })}
                  disabled={!canEdit}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                    errors.branch_id ? 'border-red-400' : 'border-gray-200',
                    !canEdit && 'bg-gray-50 cursor-not-allowed',
                  )}
                >
                  <option value="">เลือกสาขา</option>
                  {branches.map((b) => (
                    <option key={b.id} value={String(b.id)}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* Section 2: ข้อมูลใบสั่งซ่อม */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">ข้อมูลใบสั่งซ่อม</h2>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">อาการเสีย *</label>
            <textarea
              rows={3}
              {...register('symptom', { required: true })}
              disabled={!canEdit}
              placeholder="ระบุอาการเสียหรือสิ่งที่ต้องทำ..."
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                errors.symptom ? 'border-red-400' : 'border-gray-200',
                !canEdit && 'bg-gray-50 cursor-not-allowed',
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">วันที่รับรถ *</label>
              <input
                type="date"
                {...register('received_date', { required: true })}
                disabled={!canEdit}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                  errors.received_date ? 'border-red-400' : 'border-gray-200',
                  !canEdit && 'bg-gray-50 cursor-not-allowed',
                )}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">วันนัดรับ</label>
              <input
                type="date"
                {...register('expected_completion_date')}
                disabled={!canEdit}
                className={cn(
                  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                  !canEdit && 'bg-gray-50 cursor-not-allowed',
                )}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">เลขไมล์ (กม.)</label>
              <input
                type="number"
                min="0"
                {...register('mileage')}
                disabled={!canEdit}
                placeholder="0"
                className={cn(
                  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                  !canEdit && 'bg-gray-50 cursor-not-allowed',
                )}
              />
            </div>
          </div>

          {isEdit && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">ผลการวินิจฉัย</label>
                <textarea
                  rows={3}
                  {...register('diagnosis')}
                  disabled={!canEdit}
                  placeholder="ระบุผลการวินิจฉัย..."
                  className={cn(
                    'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                    !canEdit && 'bg-gray-50 cursor-not-allowed',
                  )}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">หมายเหตุภายใน</label>
                <textarea
                  rows={2}
                  {...register('internal_note')}
                  disabled={!canEdit}
                  placeholder="หมายเหตุสำหรับทีมภายในเท่านั้น..."
                  className={cn(
                    'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                    !canEdit && 'bg-gray-50 cursor-not-allowed',
                  )}
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_quick_repair"
              {...register('is_quick_repair')}
              disabled={!canEdit}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_quick_repair" className="text-sm font-medium text-gray-700">
              ซ่อมด่วน (ข้ามขั้นตอนเสนอราคา)
            </label>
          </div>
        </section>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            to={isEdit ? `/service-orders/${id}` : '/service-orders'}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={isSaving || !canEdit || !selectedCustomer}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'บันทึกฉบับร่าง'}
          </button>
        </div>
      </form>
    </div>
  )
}
