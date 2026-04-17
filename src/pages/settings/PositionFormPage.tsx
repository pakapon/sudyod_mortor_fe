import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { hrService } from '@/api/hrService'
import type { PositionPayload } from '@/types/hr'

export function PositionFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PositionPayload>({
    defaultValues: { name: '', description: '', is_active: true },
  })

  useEffect(() => {
    if (isEditing) {
      hrService.getPosition(Number(id))
        .then(({ data }) => {
          reset({
            name: data.data.name,
            description: data.data.description || '',
            is_active: data.data.is_active,
          })
        })
        .catch(() => navigate('/settings/positions'))
    }
  }, [isEditing, id, reset, navigate])

  const onSubmit = async (payload: PositionPayload) => {
    setIsSubmitting(true)
    try {
      if (isEditing) {
        await hrService.updatePosition(Number(id), payload)
      } else {
        await hrService.createPosition(payload)
      }
      navigate('/settings/positions')
    } catch {
      alert('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/settings/positions" className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'แก้ไขตำแหน่ง' : 'เพิ่มตำแหน่งใหม่'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">ชื่อตำแหน่ง <span className="text-red-500">*</span></label>
          <input
            {...register('name', { required: 'กรุณากรอกชื่อตำแหน่ง' })}
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
            placeholder="เช่น ช่างซ่อม, พนักงานขาย"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">รายละเอียด</label>
          <textarea
            {...register('description')}
            rows={3}
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
            placeholder="รายละเอียดตำแหน่ง (ถ้ามี)"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            {...register('is_active')}
            className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">เปิดใช้งาน</label>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'กำลังบันทึก...' : isEditing ? 'บันทึกการแก้ไข' : 'สร้างตำแหน่ง'}
          </button>
          <Link
            to="/settings/positions"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  )
}
