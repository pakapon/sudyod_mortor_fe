import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { hrService } from '@/api/hrService'
import type { FinanceCompany, FinanceCompanyPayload, FinanceCompanyDocument, FinanceCompanyDocumentFileType } from '@/types/hr'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { ActionIconButton } from '@/components/ui/ActionIconButton'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

const FILE_TYPE_MAP: Record<FinanceCompanyDocumentFileType, string> = {
  contract: 'สัญญา',
  rate_sheet: 'ตารางอัตราดอกเบี้ย',
  application_form: 'แบบฟอร์มสมัคร',
  other: 'อื่นๆ',
}

const FILE_TYPE_OPTIONS: { value: FinanceCompanyDocumentFileType; label: string }[] = [
  { value: 'contract', label: 'สัญญา' },
  { value: 'rate_sheet', label: 'ตารางอัตราดอกเบี้ย' },
  { value: 'application_form', label: 'แบบฟอร์มสมัคร' },
  { value: 'other', label: 'อื่นๆ' },
]

const EMPTY_UPLOAD_FORM = { file_type: 'contract' as FinanceCompanyDocumentFileType, file_name: '', note: '' }

export function FinanceCompanyDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const companyId = Number(id)

  const [activeTab, setActiveTab] = useState<'info' | 'documents'>('info')
  const [company, setCompany] = useState<FinanceCompany | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [documents, setDocuments] = useState<FinanceCompanyDocument[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadForm, setUploadForm] = useState(EMPTY_UPLOAD_FORM)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const { permissions } = useAuthStore()

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FinanceCompanyPayload>({
    defaultValues: { name: '', logo_url: '', contact_person: '', phone: '', email: '', address: '', commission_rate: '', note: '', is_active: true },
  })

  const watchedLogoUrl = watch('logo_url')

  useEffect(() => {
    hrService.getFinanceCompany(companyId)
      .then(({ data }) => {
        setCompany(data.data)
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
      })
      .catch(() => navigate('/settings/finance-companies'))
      .finally(() => setIsLoading(false))
  }, [companyId, reset, navigate])

  const loadDocuments = async () => {
    setIsLoadingDocs(true)
    try {
      const res = await hrService.getFinanceCompanyDocuments(companyId)
      setDocuments(res.data.data || [])
    } catch {
      setDocuments([])
    } finally {
      setIsLoadingDocs(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'documents') loadDocuments()
  }, [activeTab])

  const onSubmit = async (payload: FinanceCompanyPayload) => {
    setIsSubmitting(true)
    setSaveSuccess(false)
    try {
      const res = await hrService.updateFinanceCompany(companyId, payload)
      setCompany(res.data.data)
      setSaveSuccess(true)
      toast.success('บันทึกข้อมูลสำเร็จ')
      setTimeout(() => setSaveSuccess(false), 2500)
    } catch {
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingLogo(true)
    try {
      const res = await hrService.uploadFinanceCompanyLogo(companyId, file)
      const newLogoUrl = res.data.data.logo_url || ''
      setValue('logo_url', newLogoUrl)
      setCompany((prev) => prev ? { ...prev, logo_url: newLogoUrl } : prev)
      toast.success('อัปโหลดโลโก้สำเร็จ')
    } catch {
    } finally {
      setIsUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const handleUploadDoc = async () => {
    if (!uploadFile) return
    setIsUploading(true)
    try {
      await hrService.uploadFinanceCompanyDocument(companyId, uploadFile, {
        file_type: uploadForm.file_type,
        file_name: uploadForm.file_name.trim() || undefined,
        note: uploadForm.note.trim() || undefined,
      })
      setShowUploadModal(false)
      setUploadForm(EMPTY_UPLOAD_FORM)
      setUploadFile(null)
      if (docInputRef.current) docInputRef.current.value = ''
      loadDocuments()
      toast.success('อัปโหลดเอกสารสำเร็จ')
    } catch {
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteDoc = (docId: number) => setDeleteDocId(docId)

  const handleConfirmDeleteDoc = async () => {
    if (deleteDocId === null) return
    try {
      await hrService.deleteFinanceCompanyDocument(companyId, deleteDocId)
      setDeleteDocId(null)
      loadDocuments()
      toast.success('ลบเอกสารสำเร็จ')
    } catch {
      setDeleteDocId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/settings/finance-companies"
          className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <div className="flex items-center gap-3 min-w-0">
          {company?.logo_url && (
            <img
              key={company.logo_url}
              src={company.logo_url}
              alt={company.name}
              className="h-10 w-10 rounded-lg border border-gray-200 object-contain bg-white flex-shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{company?.name}</h1>
            <p className="text-sm text-gray-500">รายละเอียดบริษัทไฟแนนซ์</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {([
            { key: 'info', label: 'ข้อมูลบริษัท' },
            { key: 'documents', label: 'เอกสาร' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'border-b-2 pb-3 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab 1: ข้อมูลบริษัท ── */}
      {activeTab === 'info' && (
        <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
          {/* Logo */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">โลโก้บริษัท</label>
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div className="flex-shrink-0 h-20 w-20 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                {watchedLogoUrl ? (
                  <img
                    key={watchedLogoUrl}
                    src={watchedLogoUrl}
                    alt="โลโก้"
                    className="h-full w-full object-contain"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <svg className="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                  </svg>
                )}
              </div>

              <div className="flex-1 space-y-2">
                {/* Upload button */}
                {hasPermission(permissions, 'finance_companies', 'can_edit') && (
                  <div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleLogoFileChange}
                    />
                    <button
                      type="button"
                      disabled={isUploadingLogo}
                      onClick={() => logoInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {isUploadingLogo ? (
                        <>
                          <svg className="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          กำลังอัปโหลด...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          อัปโหลดโลโก้
                        </>
                      )}
                    </button>
                    <p className="mt-1 text-xs text-gray-400">JPG, PNG, WebP, GIF — อัปโหลดแล้ว URL จะถูกอัปเดตอัตโนมัติ</p>
                  </div>
                )}

                {/* URL input */}
                <div>
                  <p className="mb-1 text-xs text-gray-500">หรือวาง URL ตรงๆ</p>
                  <input
                    {...register('logo_url')}
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                    placeholder="https://spaces.example.com/finance-companies/logos/..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ชื่อบริษัท */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">ชื่อบริษัท <span className="text-red-500">*</span></label>
            <input
              {...register('name', { required: 'กรุณากรอกชื่อบริษัท' })}
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          {/* ผู้ติดต่อ */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">ชื่อผู้ติดต่อ</label>
            <input
              {...register('contact_person')}
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
            />
          </div>

          {/* โทร + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">เบอร์โทรศัพท์</label>
              <input
                {...register('phone')}
                type="tel"
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">อีเมล</label>
              <input
                {...register('email')}
                type="email"
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Commission */}
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

          {/* ที่อยู่ */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">ที่อยู่</label>
            <textarea
              {...register('address')}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
            />
          </div>

          {/* หมายเหตุ */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">หมายเหตุ</label>
            <textarea
              {...register('note')}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
            />
          </div>

          {/* is_active */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active_detail"
              {...register('is_active')}
              className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <label htmlFor="is_active_detail" className="text-sm font-medium text-gray-700">เปิดใช้งาน</label>
          </div>

          {/* Actions */}
          {hasPermission(permissions, 'finance_companies', 'can_edit') && (
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
              {saveSuccess && (
                <span className="text-sm text-emerald-600 font-medium">บันทึกสำเร็จ ✓</span>
              )}
            </div>
          )}
        </form>
      )}

      {/* ── Tab 2: เอกสาร ── */}
      {activeTab === 'documents' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5 flex items-center justify-between">
            <p className="text-sm text-gray-500">เอกสารสัญญา, ตารางอัตราดอกเบี้ย, และเอกสารอื่นๆ</p>
            {hasPermission(permissions, 'finance_companies', 'can_edit') && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                อัปโหลดเอกสาร
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                <tr>
                  <th className="px-6 py-4 font-semibold">ชื่อไฟล์</th>
                  <th className="px-6 py-4 font-semibold">ประเภท</th>
                  <th className="px-6 py-4 font-semibold">หมายเหตุ</th>
                  <th className="px-6 py-4 font-semibold">วันที่อัปโหลด</th>
                  <th className="px-6 py-4 text-right font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoadingDocs ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">กำลังโหลด...</td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">ยังไม่มีเอกสาร</td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="font-medium text-red-600 hover:underline"
                        >
                          {doc.file_name}
                        </a>
                      </td>
                      <td className="px-6 py-4">{FILE_TYPE_MAP[doc.file_type] ?? doc.file_type}</td>
                      <td className="px-6 py-4 text-gray-600">{doc.note || '-'}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {doc.created_at
                          ? new Date(doc.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noreferrer noopener"
                            download
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-blue-200 text-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="ดาวน์โหลด"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                          {hasPermission(permissions, 'finance_companies', 'can_edit') && (
                            <ActionIconButton variant="delete" onClick={() => handleDeleteDoc(doc.id)} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Upload Modal ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900">อัปโหลดเอกสาร</h2>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">ประเภทเอกสาร <span className="text-red-500">*</span></label>
              <select
                value={uploadForm.file_type}
                onChange={(e) => setUploadForm((f) => ({ ...f, file_type: e.target.value as FinanceCompanyDocumentFileType }))}
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
              >
                {FILE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">ไฟล์เอกสาร <span className="text-red-500">*</span></label>
              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  setUploadFile(f)
                  if (f && !uploadForm.file_name) {
                    setUploadForm((prev) => ({ ...prev, file_name: f.name }))
                  }
                }}
              />
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                เลือกไฟล์
              </button>
              {uploadFile ? (
                <p className="mt-1.5 text-xs text-gray-700 font-medium">{uploadFile.name}</p>
              ) : (
                <p className="mt-1 text-xs text-gray-400">PDF, JPG, PNG, DOC, DOCX, XLS, XLSX</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">ชื่อไฟล์ที่แสดง <span className="text-gray-400 text-xs font-normal">(ไม่บังคับ)</span></label>
              <input
                value={uploadForm.file_name}
                onChange={(e) => setUploadForm((f) => ({ ...f, file_name: e.target.value }))}
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                placeholder="ถ้าไม่ระบุ จะใช้ชื่อไฟล์ต้นฉบับ"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">หมายเหตุ</label>
              <input
                value={uploadForm.note || ''}
                onChange={(e) => setUploadForm((f) => ({ ...f, note: e.target.value }))}
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                placeholder="หมายเหตุเพิ่มเติม"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleUploadDoc}
                disabled={isUploading || !uploadFile}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isUploading ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
              <button
                onClick={() => { setShowUploadModal(false); setUploadForm(EMPTY_UPLOAD_FORM); setUploadFile(null); if (docInputRef.current) docInputRef.current.value = '' }}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteDocId !== null}
        title="ยืนยันการลบเอกสาร"
        message="คุณต้องการลบเอกสารนี้ใช่หรือไม่? ไฟล์จะถูกลบอย่างถาวรและไม่สามารถเรียกคืนได้"
        confirmLabel="ลบเอกสาร"
        variant="danger"
        onConfirm={handleConfirmDeleteDoc}
        onCancel={() => setDeleteDocId(null)}
      />
    </div>
  )
}
