import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { hrService } from '@/api/hrService'
import type { VendorPayload } from '@/types/hr'
import { cn } from '@/lib/utils'

const defaultForm: VendorPayload = {
  name: '',
  code: '',
  tax_id: '',
  contact_name: '',
  email: '',
  address: '',
  province: '',
  district: '',
  sub_district: '',
  postal_code: '',
  note: '',
  is_active: true,
}

export function VendorFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<VendorPayload>(defaultForm)
  const [isLoading, setIsLoading] = useState(isEdit)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof VendorPayload, string>>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit || !id) return
    setIsLoading(true)
    hrService.getVendor(Number(id))
      .then((res) => {
        const v = res.data.data
        setForm({
          name: v.name,
          code: v.code || '',
          tax_id: v.tax_id || '',
          contact_name: v.contact_name || '',
          email: v.email || '',
          address: v.address || '',
          province: v.province || '',
          district: v.district || '',
          sub_district: v.sub_district || '',
          postal_code: v.postal_code || '',
          note: v.note || '',
          is_active: v.is_active,
        })
      })
      .catch(() => {
        setServerError('ไม่พบข้อมูล Supplier ที่ต้องการแก้ไข')
      })
      .finally(() => setIsLoading(false))
  }, [id, isEdit])

  const validate = (): boolean => {
    const errs: Partial<Record<keyof VendorPayload, string>> = {}
    if (!form.name.trim()) errs.name = 'กรุณากรอกชื่อ Supplier'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'รูปแบบอีเมลไม่ถูกต้อง'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleChange = (field: keyof VendorPayload, value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSaving(true)
    setServerError(null)
    try {
      const payload: VendorPayload = {
        ...form,
        code: form.code?.trim() || undefined,
        tax_id: form.tax_id?.trim() || undefined,
        contact_name: form.contact_name?.trim() || undefined,
        email: form.email?.trim() || undefined,
        address: form.address?.trim() || undefined,
        province: form.province?.trim() || undefined,
        district: form.district?.trim() || undefined,
        sub_district: form.sub_district?.trim() || undefined,
        postal_code: form.postal_code?.trim() || undefined,
        note: form.note?.trim() || undefined,
      }
      if (isEdit && id) {
        await hrService.updateVendor(Number(id), payload)
      } else {
        await hrService.createVendor(payload)
      }
      navigate('/settings/vendors')
    } catch {
      setServerError('เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        กำลังโหลดข้อมูล...
      </div>
    )
  }

  if (serverError && isEdit && !form.name) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-red-600">{serverError}</p>
        <button
          onClick={() => navigate('/settings/vendors')}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          กลับไปหน้ารายการ
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/settings/vendors')}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="กลับ"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'แก้ไขข้อมูล Supplier' : 'เพิ่ม Supplier ใหม่'}
          </h1>
          <p className="text-sm text-gray-500">
            {isEdit ? 'แก้ไขข้อมูลผู้จำหน่าย' : 'กรอกข้อมูลเพื่อเพิ่มผู้จำหน่ายใหม่'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {serverError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        {/* ข้อมูลหลัก */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">ข้อมูลหลัก</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2">
            {/* ชื่อ */}
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                ชื่อ Supplier <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="ชื่อบริษัท / ร้านค้า"
                className={cn(
                  'block w-full rounded-lg border bg-gray-50 p-2.5 text-sm text-gray-900 focus:ring-red-500',
                  errors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-red-500',
                )}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            {/* รหัส */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">รหัส Supplier</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                placeholder="เช่น SUP001"
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm font-mono text-gray-900 focus:border-red-500 focus:ring-red-500"
              />
            </div>

            {/* เลขผู้เสียภาษี */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">เลขผู้เสียภาษี</label>
              <input
                type="text"
                value={form.tax_id}
                onChange={(e) => handleChange('tax_id', e.target.value)}
                placeholder="0000000000000"
                maxLength={13}
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm font-mono text-gray-900 focus:border-red-500 focus:ring-red-500"
              />
            </div>
          </div>
        </div>

        {/* ข้อมูลติดต่อ */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">ข้อมูลติดต่อ</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2">
            {/* ผู้ติดต่อ */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">ชื่อผู้ติดต่อ</label>
              <input
                type="text"
                value={form.contact_name}
                onChange={(e) => handleChange('contact_name', e.target.value)}
                placeholder="ชื่อ-นามสกุลผู้ติดต่อ"
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
              />
            </div>

            {/* อีเมล */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">อีเมล</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="example@company.com"
                className={cn(
                  'block w-full rounded-lg border bg-gray-50 p-2.5 text-sm text-gray-900 focus:ring-red-500',
                  errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-red-500',
                )}
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>
          </div>
        </div>

        {/* ที่อยู่ */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">ที่อยู่</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2">
            {/* ที่อยู่ */}
            <div className="col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">ที่อยู่</label>
              <textarea
                rows={2}
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="บ้านเลขที่ ถนน ซอย"
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
              />
            </div>

            {/* ตำบล */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">ตำบล / แขวง</label>
              <input
                type="text"
                value={form.sub_district}
                onChange={(e) => handleChange('sub_district', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
              />
            </div>

            {/* อำเภอ */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">อำเภอ / เขต</label>
              <input
                type="text"
                value={form.district}
                onChange={(e) => handleChange('district', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
              />
            </div>

            {/* จังหวัด */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">จังหวัด</label>
              <input
                type="text"
                value={form.province}
                onChange={(e) => handleChange('province', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
              />
            </div>

            {/* รหัสไปรษณีย์ */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">รหัสไปรษณีย์</label>
              <input
                type="text"
                value={form.postal_code}
                onChange={(e) => handleChange('postal_code', e.target.value)}
                maxLength={5}
                placeholder="10000"
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm font-mono text-gray-900 focus:border-red-500 focus:ring-red-500"
              />
            </div>
          </div>
        </div>

        {/* หมายเหตุ + สถานะ */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">ข้อมูลเพิ่มเติม</h2>
          </div>
          <div className="space-y-4 p-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">หมายเหตุ</label>
              <textarea
                rows={3}
                value={form.note}
                onChange={(e) => handleChange('note', e.target.value)}
                placeholder="บันทึกเพิ่มเติม (ถ้ามี)"
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.is_active}
                onClick={() => handleChange('is_active', !form.is_active)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  form.is_active ? 'bg-red-600' : 'bg-gray-200',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                    form.is_active ? 'translate-x-6' : 'translate-x-1',
                  )}
                />
              </button>
              <span className="text-sm text-gray-700">
                {form.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/settings/vendors')}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {isSaving ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'เพิ่ม Supplier'}
          </button>
        </div>
      </form>
    </div>
  )
}
