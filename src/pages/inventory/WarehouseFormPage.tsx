import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { warehouseService } from '@/api/warehouseService'
import { hrService } from '@/api/hrService'
import type { WarehousePayload } from '@/types/inventory'
import { cn } from '@/lib/utils'

interface FormValues {
  name: string
  code: string
  branch_id: string
  address: string
  is_active: boolean
}

const field = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
const lbl = 'mb-1.5 block text-sm font-medium text-gray-700'
const card = 'rounded-xl border border-gray-200 bg-white p-6 shadow-sm'

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

export function WarehouseFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: '', code: '', branch_id: '', address: '', is_active: true },
  })

  useEffect(() => {
    hrService.getBranches()
      .then((res) => setBranches(res.data.data || []))
      .catch(() => {})

    if (isEditing && id) {
      warehouseService.getWarehouse(Number(id))
        .then((res) => {
          const wh = res.data.data
          reset({
            name: wh.name,
            code: wh.code,
            branch_id: wh.branch_id != null ? String(wh.branch_id) : '',
            address: wh.address ?? '',
            is_active: wh.is_active,
          })
        })
        .catch(() => {})
    }
  }, [id, isEditing, reset])

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      const payload: WarehousePayload = {
        name: values.name,
        code: values.code,
        branch_id: values.branch_id ? Number(values.branch_id) : undefined,
        address: values.address || undefined,
        is_active: values.is_active,
      }
      if (isEditing && id) {
        await warehouseService.updateWarehouse(Number(id), payload)
        navigate(`/warehouses/${id}`)
      } else {
        const res = await warehouseService.createWarehouse(payload)
        navigate(`/warehouses/${res.data.data.id}`)
      }
    } catch {
      // interceptor handles display
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={isEditing ? `/warehouses/${id}` : '/warehouses'} className="text-gray-400 hover:text-gray-600">
          <ChevronLeftIcon />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'แก้ไขคลังสินค้า' : 'สร้างคลังสินค้าใหม่'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isEditing ? 'อัปเดตข้อมูลคลังสินค้า' : 'กรอกข้อมูลคลังสินค้าใหม่'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className={card}>
          <h2 className="mb-4 text-base font-semibold text-gray-800">ข้อมูลคลังสินค้า</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={lbl}>ชื่อคลัง <span className="text-red-500">*</span></label>
              <input
                {...register('name', { required: 'กรุณากรอกชื่อคลัง' })}
                className={cn(field, errors.name && 'border-red-400')}
                placeholder="ชื่อคลังสินค้า"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div>
              <label className={lbl}>สาขา</label>
              <select {...register('branch_id')} className={field}>
                <option value="">— เลือกสาขา —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>ที่อยู่คลัง</label>
              <textarea
                {...register('address')}
                rows={3}
                className={field}
                placeholder="ที่อยู่คลังสินค้า"
              />
            </div>
          </div>
        </div>

        <div className={card}>
          <h2 className="mb-4 text-base font-semibold text-gray-800">การใช้งาน</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('is_active')} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            <span className="text-sm text-gray-700">เปิดใช้งานคลังนี้</span>
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            to={isEditing ? `/warehouses/${id}` : '/warehouses'}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting ? 'กำลังบันทึก...' : isEditing ? 'อัปเดตคลัง' : 'สร้างคลัง'}
          </button>
        </div>
      </form>
    </div>
  )
}
