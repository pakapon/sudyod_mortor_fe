import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { hrService } from '@/api/hrService'
import type { FinanceCompanyPayload } from '@/types/hr'

export function FinanceCompanyFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('')

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FinanceCompanyPayload>({
    defaultValues: { name: '', logo_url: '', contact_person: '', phone: '', email: '', address: '', commission_rate: '', note: '', is_active: true },
  })

  const watchedLogoUrl = watch('logo_url')
  const displayLogoUrl = logoPreviewUrl || watchedLogoUrl || ''

  useEffect(() => {
    if (isEditing) {
      hrService.getFinanceCompany(Number(id))
        .then(({ data }) => {
          reset({
            name: data.data.name,
            logo_url: data.data.logo_url || '',
            contact_person: data.data.contact_person || '',
            phone: data.data.phone || '',
            email: data.data.email || '',
            address: data.data.address || '',
            commission_rate: data.data.commission_rate || '',
            note: data.data.note || '',
            is_active: data.data.is_active,
          })
          setLogoPreviewUrl(data.data.logo_url || '')
        })
        .catch(() => navigate('/settings/finance-companies'))
    }
  }, [isEditing, id, reset, navigate])

  useEffect(() => {
    return () => {
      if (logoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreviewUrl)
      }
    }
  }, [logoPreviewUrl])

  const onSubmit = async (payload: FinanceCompanyPayload) => {
    setIsSubmitting(true)
    try {
      if (isEditing) {
        const targetId = Number(id)
        await hrService.updateFinanceCompany(targetId, payload)
        if (logoFile) {
          await hrService.uploadFinanceCompanyLogo(targetId, logoFile)
        }
      } else {
        const created = await hrService.createFinanceCompany(payload)
        const createdId = created.data.data.id
        if (logoFile && createdId) {
          await hrService.uploadFinanceCompanyLogo(createdId, logoFile)
        }
      }
      navigate('/settings/finance-companies')
    } catch {
      // interceptor handles display
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/settings/finance-companies" className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'แก้ไขบริษัทไฟแนนซ์' : 'เพิ่มบริษัทไฟแนนซ์ใหม่'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">ชื่อบริษัท <span className="text-red-500">*</span></label>
          <input
            {...register('name', { required: 'กรุณากรอกชื่อบริษัท' })}
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
            placeholder="เช่น ไทยลีสซิ่ง, กรุงศรี ออโต้"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">โลโก้บริษัท</label>
          <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[120px_minmax(0,1fr)] md:items-start">
              <div className="h-[120px] w-[120px] overflow-hidden rounded-lg border border-gray-200 bg-white">
                {displayLogoUrl ? (
                  <img
                    src={displayLogoUrl}
                    alt="ตัวอย่างโลโก้"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                    ยังไม่มีโลโก้
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">วางลิงก์รูป</p>
                  <input
                    {...register('logo_url')}
                    className="block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                    placeholder="https://spaces.example.com/finance-companies/logos/..."
                  />
                </div>

                <div className="border-t border-dashed border-gray-300 pt-3">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">หรืออัปโหลดไฟล์</p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setLogoFile(file)
                      if (file) {
                        if (logoPreviewUrl.startsWith('blob:')) {
                          URL.revokeObjectURL(logoPreviewUrl)
                        }
                        setLogoPreviewUrl(URL.createObjectURL(file))
                      }
                    }}
                    className="block w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 file:mr-3 file:rounded-md file:border-0 file:bg-red-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-red-700 hover:file:bg-red-100"
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    {logoFile ? `ไฟล์ที่เลือก: ${logoFile.name}` : 'รองรับ JPG, PNG, WebP, GIF'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">ชื่อผู้ติดต่อ</label>
          <input
            {...register('contact_person')}
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
            placeholder="ชื่อผู้ติดต่อ (ถ้ามี)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">เบอร์โทรศัพท์</label>
            <input
              {...register('phone')}
              type="tel"
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
              placeholder="เช่น 02-123-4567"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">อีเมล</label>
            <input
              {...register('email')}
              type="email"
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
              placeholder="example@company.com"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">ค่าคอมมิชชั่น (%)</label>
          <input
            {...register('commission_rate')}
            type="number"
            step="0.01"
            min="0"
            max="100"
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
            placeholder="เช่น 3.50"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">ที่อยู่</label>
          <textarea
            {...register('address')}
            rows={3}
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
            placeholder="ที่อยู่บริษัท (ถ้ามี)"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">หมายเหตุ</label>
          <textarea
            {...register('note')}
            rows={2}
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
            placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
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
            {isSubmitting ? 'กำลังบันทึก...' : isEditing ? 'บันทึกการแก้ไข' : 'สร้างบริษัทไฟแนนซ์'}
          </button>
          <Link
            to="/settings/finance-companies"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  )
}
