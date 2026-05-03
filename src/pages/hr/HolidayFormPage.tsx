import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { hrService } from '@/api/hrService'
import type { HolidayPayload, Branch } from '@/types/hr'

export function HolidayFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<HolidayPayload>({
    defaultValues: { name: '', date: '', branch_id: null },
  })

  useEffect(() => {
    hrService.getBranches().then((res) => setBranches(res.data.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (isEditing) {
      hrService.getHolidays()
        .then(({ data }) => {
          const holiday = (data.data || []).find((h) => h.id === Number(id))
          if (holiday) {
            reset({
              name: holiday.name,
              date: holiday.date,
              branch_id: holiday.branch_id,
            })
          } else {
            navigate('/hr/holidays')
          }
        })
        .catch(() => navigate('/hr/holidays'))
    }
  }, [isEditing, id, reset, navigate])

  const onSubmit = async (payload: HolidayPayload) => {
    setIsSubmitting(true)
    // Convert empty string branch_id to null
    const finalPayload = {
      ...payload,
      branch_id: payload.branch_id ? Number(payload.branch_id) : null,
    }
    try {
      if (isEditing) {
        await hrService.updateHoliday(Number(id), finalPayload)
      } else {
        await hrService.createHoliday(finalPayload)
      }
      navigate('/hr/holidays')
    } catch {
      // interceptor handles display
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/hr/holidays" className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'แก้ไขวันหยุด' : 'เพิ่มวันหยุดใหม่'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">ชื่อวันหยุด <span className="text-red-500">*</span></label>
          <input
            {...register('name', { required: 'กรุณากรอกชื่อวันหยุด' })}
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
            placeholder="เช่น สงกรานต์, วันแรงงาน"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">วันที่ <span className="text-red-500">*</span></label>
          <input
            type="date"
            {...register('date', { required: 'กรุณาเลือกวันที่' })}
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
          />
          {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">สาขา</label>
          <select
            {...register('branch_id')}
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
          >
            <option value="">ทุกสาขา (ใช้กับทั้งบริษัท)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">เลือก "ทุกสาขา" เพื่อใช้วันหยุดกับทั้งบริษัท หรือเลือกสาขาเฉพาะ</p>
        </div>

        <div className="flex flex-col-reverse gap-3 pt-4 border-t border-gray-100 sm:flex-row">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 sm:w-auto"
          >
            {isSubmitting ? 'กำลังบันทึก...' : isEditing ? 'บันทึกการแก้ไข' : 'สร้างวันหยุด'}
          </button>
          <Link
            to="/hr/holidays"
            className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors sm:w-auto"
          >
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  )
}
