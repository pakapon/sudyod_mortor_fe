import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { customerService } from '@/api/customerService'
import { hrService } from '@/api/hrService'
import type {
  CustomerPayload,
  CustomerType,
  CustomerStatus,
  CustomerGrade,
  CustomerGender,
  CustomerPhoneType,
} from '@/types/customer'
import type { Branch } from '@/types/hr'
import { cn } from '@/lib/utils'

// ─── Local Types ──────────────────────────────────────────────────────────────
interface PhoneItem { type: CustomerPhoneType; number: string; is_primary: boolean }
interface EmailItem { email: string }
interface ChannelItem { channel_type: string; channel_id: string }
interface AddrItem { label: string; address: string; is_default: boolean }

interface FormValues {
  type: CustomerType
  id_card: string
  prefix: string
  first_name: string
  last_name: string
  gender: CustomerGender | ''
  date_of_birth: string
  company_name: string
  company_branch: string
  tax_id: string
  contact_name: string
  contact_position: string
  status: CustomerStatus
  grade: CustomerGrade | ''
  grade_updated_at: string
  credit_limit: string
  source: string
  note: string
  branch_id: number
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PHONE_TYPES: { v: CustomerPhoneType; l: string }[] = [
  { v: 'mobile', l: 'มือถือ' },
  { v: 'home', l: 'บ้าน' },
  { v: 'work', l: 'ที่ทำงาน' },
]
const CHANNEL_TYPES = ['LINE', 'Facebook', 'other']
const ADDR_LABELS = ['Operational', 'Home', 'Work', 'Other']

// ─── Styles ───────────────────────────────────────────────────────────────────
const field = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
const lbl = 'mb-1.5 block text-sm font-medium text-gray-700'
const card = 'rounded-xl border border-gray-200 bg-white p-6 shadow-sm'
const addBtn = 'rounded-full bg-green-500 text-white w-6 h-6 flex items-center justify-center hover:bg-green-600 flex-shrink-0'

// ─── Icons ────────────────────────────────────────────────────────────────────
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)

// ─── Component ────────────────────────────────────────────────────────────────
export function CustomerFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [customerCode, setCustomerCode] = useState('')
  const [registeredAt, setRegisteredAt] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [phones, setPhones] = useState<PhoneItem[]>([{ type: 'mobile', number: '', is_primary: true }])
  const [emails, setEmails] = useState<EmailItem[]>([{ email: '' }])
  const [channels, setChannels] = useState<ChannelItem[]>([{ channel_type: 'LINE', channel_id: '' }])
  const [addresses, setAddresses] = useState<AddrItem[]>([{ label: 'Operational', address: '', is_default: true }])

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      type: 'personal',
      id_card: '',
      prefix: '',
      first_name: '',
      last_name: '',
      gender: '',
      date_of_birth: '',
      company_name: '',
      company_branch: '',
      tax_id: '',
      contact_name: '',
      contact_position: '',
      status: 'active',
      grade: 'new',
      grade_updated_at: '',
      credit_limit: '',
      source: '',
      note: '',
      branch_id: 0,
    },
  })

  const isCorporate = watch('type') === 'corporate'

  useEffect(() => {
    hrService.getBranches().then((r) => setBranches(r.data.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEditing) return
    customerService.getCustomer(Number(id))
      .then(({ data }) => {
        const c = data.data
        reset({
          type: c.type,
          id_card: c.id_card ?? '',
          prefix: c.prefix ?? '',
          first_name: c.first_name ?? '',
          last_name: c.last_name ?? '',
          gender: c.gender ?? '',
          date_of_birth: c.date_of_birth ?? '',
          company_name: c.company_name ?? '',
          company_branch: c.company_branch ?? '',
          tax_id: c.tax_id ?? '',
          contact_name: c.contact_name ?? '',
          contact_position: c.contact_position ?? '',
          status: c.status ?? 'active',
          grade: c.grade ?? 'new',
          credit_limit: c.credit_limit != null ? String(c.credit_limit) : '',
          source: c.source ?? '',
          grade_updated_at: c.grade_updated_at ? c.grade_updated_at.slice(0, 10) : '',
          note: c.note ?? '',
          branch_id: c.branch_id,
        })
        setCustomerCode(c.customer_code ?? '')
        setRegisteredAt(c.registered_at ?? c.created_at ?? '')
        if (c.photo_url) setPhotoPreview(c.photo_url)
        if (c.phones?.length) {
          setPhones(c.phones.map((p) => ({ type: p.type, number: p.number, is_primary: p.is_primary })))
        }
      })
      .catch(() => navigate('/customers'))
  }, [isEditing, id, reset, navigate])

  // ── Photo ──────────────────────────────────────────────────────────────────
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  // ── Phone helpers ──────────────────────────────────────────────────────────
  const updatePhone = (i: number, k: keyof PhoneItem, v: string | boolean) =>
    setPhones((p) =>
      p.map((item, idx) => {
        if (k === 'is_primary' && v) return idx === i ? { ...item, is_primary: true } : { ...item, is_primary: false }
        return idx === i ? { ...item, [k]: v } : item
      }),
    )

  // ── Address helpers ────────────────────────────────────────────────────────
  const updateAddress = (i: number, k: keyof AddrItem, v: string | boolean) =>
    setAddresses((a) =>
      a.map((item, idx) => {
        if (k === 'is_default' && v) return idx === i ? { ...item, is_default: true } : { ...item, is_default: false }
        return idx === i ? { ...item, [k]: v } : item
      }),
    )

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      const payload: CustomerPayload = {
        type: values.type,
        id_card: values.id_card || undefined,
        prefix: values.prefix || undefined,
        first_name: values.first_name || undefined,
        last_name: values.last_name || undefined,
        gender: (values.gender || undefined) as CustomerGender | undefined,
        date_of_birth: values.date_of_birth || undefined,
        company_name: values.company_name || undefined,
        company_branch: values.company_branch || undefined,
        tax_id: values.tax_id || undefined,
        contact_name: values.contact_name || undefined,
        contact_position: values.contact_position || undefined,
        status: values.status,
        grade: (values.grade || undefined) as CustomerGrade | undefined,
        grade_updated_at: values.grade_updated_at || undefined,
        credit_limit: values.credit_limit ? Number(values.credit_limit) : undefined,
        source: values.source || undefined,
        note: values.note || undefined,
        branch_id: Number(values.branch_id),
        phones: phones.filter((p) => p.number.trim()),
        emails: emails.filter((e) => e.email.trim()),
        channels: channels.filter((c) => c.channel_id.trim()),
        shipping_addresses: addresses.filter((a) => a.address.trim()),
      }

      let cid: number
      if (isEditing) {
        await customerService.updateCustomer(Number(id), payload)
        cid = Number(id)
      } else {
        const res = await customerService.createCustomer(payload)
        cid = res.data.data.id
      }

      if (photoFile) {
        try { await customerService.uploadCustomerPhoto(cid, photoFile) } catch { /* continue */ }
      }

      navigate(`/customers/${cid}`)
    } catch {
      // interceptor handles display
    } finally {
      setIsSubmitting(false)
    }
  }

  const fmtDate = (d: string) => {
    if (!d) return ''
    try { return new Date(d).toLocaleDateString('th-TH', { dateStyle: 'short' }) } catch { return d }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link
          to={isEditing ? `/customers/${id}` : '/customers'}
          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'แก้ไขข้อมูลลูกค้า' : 'สร้างลูกค้าใหม่'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Upload Avatar ────────────────────────────────────────── */}
        <div className={card}>
          <p className="mb-3 text-sm font-medium text-gray-700">Upload Avatar</p>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
              {photoPreview
                ? <img src={photoPreview} alt="avatar" className="h-full w-full object-cover" />
                : (
                  <svg className="text-gray-400" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                )
              }
            </div>
            <div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Choose file
                </button>
                <span className="text-sm text-gray-500">{photoFile ? photoFile.name : 'No file chosen'}</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">JPG, GIF or PNG. Max size of 800k</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/gif,image/png"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
          </div>
        </div>

        {/* ── ข้อมูลทั่วไป ─────────────────────────────────────────── */}
        <div className={card}>
          {/* ประเภทลูกค้า */}
          <div className="mb-5 flex gap-6">
            {(['personal', 'corporate'] as CustomerType[]).map((t) => (
              <label key={t} className="flex cursor-pointer items-center gap-2">
                <input type="radio" value={t} {...register('type')} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-medium text-gray-700">{t === 'personal' ? 'บุคคล' : 'นิติบุคคล'}</span>
              </label>
            ))}
          </div>

          <div className="space-y-4">
            {/* id_card + customer_code */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={lbl}>มัตประชาชน</label>
                <input type="text" placeholder="111-xxx-xxxx-xxx" {...register('id_card')} className={field} />
              </div>
              <div>
                <label className={lbl}>รหัสลูกค้า</label>
                <input
                  type="text"
                  value={customerCode}
                  readOnly
                  placeholder={isEditing ? '' : 'สร้างอัตโนมัติ'}
                  className={cn(field, 'bg-gray-50 text-gray-500 cursor-not-allowed')}
                />
              </div>
            </div>

            {/* Name fields — conditional */}
            {isCorporate ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={lbl}>คำนำหน้า</label>
                  <select {...register('prefix')} className={field}>
                    <option value="">— ไม่ระบุ —</option>
                    {['บริษัท', 'ห้างหุ้นส่วน', 'อื่นๆ'].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={lbl}>ชื่อบริษัท / ร้าน <span className="text-red-500">*</span></label>
                  <input type="text" {...register('company_name', { required: true })} className={cn(field, errors.company_name ? 'border-red-400' : '')} />
                </div>
                <div>
                  <label className={lbl}>สาขา (ของลูกค้า)</label>
                  <input type="text" placeholder="เช่น สำนักงานใหญ่" {...register('company_branch')} className={field} />
                </div>
                <div>
                  <label className={lbl}>เลขประจำตัวผู้เสียภาษี</label>
                  <input type="text" maxLength={13} placeholder="13 หลัก" {...register('tax_id')} className={field} />
                </div>
                <div>
                  <label className={lbl}>ชื่อผู้ติดต่อ</label>
                  <input type="text" {...register('contact_name')} className={field} />
                </div>
                <div>
                  <label className={lbl}>ตำแหน่งผู้ติดต่อ</label>
                  <input type="text" {...register('contact_position')} className={field} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className={lbl}>คำนำหน้า <span className="text-red-500">*</span></label>
                  <select {...register('prefix', { required: true })} className={cn(field, errors.prefix ? 'border-red-400' : '')}>
                    <option value="">— เลือก —</option>
                    {['นาย', 'นาง', 'นางสาว'].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>ชื่อ <span className="text-red-500">*</span></label>
                  <input type="text" {...register('first_name', { required: true })} className={cn(field, errors.first_name ? 'border-red-400' : '')} />
                </div>
                <div>
                  <label className={lbl}>นามสกุล <span className="text-red-500">*</span></label>
                  <input type="text" {...register('last_name', { required: true })} className={cn(field, errors.last_name ? 'border-red-400' : '')} />
                </div>
              </div>
            )}

            {/* gender / date_of_birth / registered_at */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={lbl}>เพศ</label>
                <select {...register('gender')} className={field}>
                  <option value="">— ไม่ระบุ —</option>
                  <option value="male">ชาย</option>
                  <option value="female">หญิง</option>
                  <option value="not_specified">ไม่ระบุ</option>
                </select>
              </div>
              <div>
                <label className={lbl}>วันเกิด</label>
                <input type="date" {...register('date_of_birth')} className={field} />
              </div>
              <div>
                <label className={lbl}>วันที่ลงทะเบียน</label>
                <input
                  type="text"
                  value={fmtDate(registeredAt)}
                  readOnly
                  placeholder={isEditing ? '' : 'สร้างอัตโนมัติ'}
                  className={cn(field, 'bg-gray-50 text-gray-500 cursor-not-allowed')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── ช่องทางติดต่อ ─────────────────────────────────────────── */}
        <div className={cn(card, 'space-y-6')}>
          {/* โทรศัพท์ */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">
                โทรศัพท์ <span className="text-red-400">●</span>
              </span>
              <button
                type="button"
                onClick={() => setPhones((p) => [...p, { type: 'mobile', number: '', is_primary: false }])}
                className={addBtn}
              >
                <PlusIcon />
              </button>
            </div>
            <div className="space-y-2">
              {phones.map((ph, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={ph.type}
                    onChange={(e) => updatePhone(i, 'type', e.target.value)}
                    className="w-28 flex-shrink-0 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {PHONE_TYPES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.18 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </span>
                    <input
                      type="tel"
                      value={ph.number}
                      onChange={(e) => updatePhone(i, 'number', e.target.value)}
                      placeholder="123-456-7890"
                      className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={ph.is_primary}
                    onClick={() => { if (!ph.is_primary) updatePhone(i, 'is_primary', true) }}
                    title={ph.is_primary ? 'เบอร์หลักปัจจุบัน' : 'ตั้งเป็นเบอร์หลัก'}
                    className={cn(
                      'relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200',
                      ph.is_primary ? 'bg-blue-600' : 'bg-gray-300 cursor-pointer',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
                        ph.is_primary ? 'translate-x-4' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                  {phones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPhones((p) => p.filter((_, j) => j !== i))}
                      className="flex-shrink-0 p-1 text-red-400 hover:text-red-600"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* อีเมล */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">อีเมล <span className="text-red-400">●</span></span>
              <button
                type="button"
                onClick={() => setEmails((e) => [...e, { email: '' }])}
                className={addBtn}
              >
                <PlusIcon />
              </button>
            </div>
            <div className="space-y-2">
              {emails.map((em, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="email"
                    value={em.email}
                    onChange={(e) => setEmails((list) => list.map((item, j) => j === i ? { email: e.target.value } : item))}
                    placeholder="xxx@gmail.com"
                    className={cn(field, 'flex-1')}
                  />
                  {emails.length > 1 && (
                    <button type="button" onClick={() => setEmails((e) => e.filter((_, j) => j !== i))} className="flex-shrink-0 p-1 text-red-400 hover:text-red-600">
                      <TrashIcon />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ช่องทางอื่น */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">ช่องทางอื่น</span>
              <button
                type="button"
                onClick={() => setChannels((c) => [...c, { channel_type: 'LINE', channel_id: '' }])}
                className={addBtn}
              >
                <PlusIcon />
              </button>
            </div>
            <div className="space-y-2">
              {channels.map((ch, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={ch.channel_type}
                    onChange={(e) => setChannels((list) => list.map((item, j) => j === i ? { ...item, channel_type: e.target.value } : item))}
                    className="w-36 flex-shrink-0 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {CHANNEL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input
                    type="text"
                    value={ch.channel_id}
                    onChange={(e) => setChannels((list) => list.map((item, j) => j === i ? { ...item, channel_id: e.target.value } : item))}
                    placeholder="ID หรือชื่อบัญชี"
                    className={cn(field, 'flex-1')}
                  />
                  {channels.length > 1 && (
                    <button type="button" onClick={() => setChannels((c) => c.filter((_, j) => j !== i))} className="flex-shrink-0 p-1 text-red-400 hover:text-red-600">
                      <TrashIcon />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── ที่อยู่จัดส่ง ─────────────────────────────────────────── */}
        <div className={card}>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-base font-semibold text-gray-900">
              ที่อยู่จัดส่ง
              <span className="ml-2 text-xs font-normal text-gray-400">(เลือกเป็นค่าเริ่มต้น 1 รายการ)</span>
            </span>
            <button
              type="button"
              onClick={() => setAddresses((a) => [...a, { label: 'Operational', address: '', is_default: false }])}
              className={addBtn}
            >
              <PlusIcon />
            </button>
          </div>
          <div className="space-y-3">
            {addresses.map((addr, i) => (
              <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
                <div className="grid grid-cols-[140px_1fr] gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      ติดป้ายเป็น <span className="text-red-400">●</span>
                    </label>
                    <select
                      value={addr.label}
                      onChange={(e) => updateAddress(i, 'label', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      {ADDR_LABELS.map((al) => <option key={al} value={al}>{al}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">ที่อยู่</label>
                    <input
                      type="text"
                      value={addr.address}
                      onChange={(e) => updateAddress(i, 'address', e.target.value)}
                      placeholder="บ้านเลขที่, หมู่, ซอย, ถนน, แขวง/ตำบล, เขต/อำเภอ, จังหวัด, รหัสไปรษณีย์"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2" onClick={() => updateAddress(i, 'is_default', true)}>
                    <div className={cn('relative inline-flex h-5 w-10 rounded-full transition-colors', addr.is_default ? 'bg-blue-500' : 'bg-gray-300')}>
                      <span className={cn('mt-0.5 inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', addr.is_default ? 'translate-x-5' : 'translate-x-0.5')} />
                    </div>
                    <span className="text-sm text-gray-600">ค่าเริ่มต้น</span>
                  </label>
                  {addresses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setAddresses((a) => a.filter((_, j) => j !== i))}
                      className="text-sm text-red-400 hover:text-red-600"
                    >
                      ลบ
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── สถานะ & เกรด & เครดิต ──────────────────────────────── */}
        <div className={card}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={lbl}>วันที่</label>
              <input
                type="date"
                {...register('grade_updated_at')}
                className={field}
              />
            </div>
            <div>
              <label className={lbl}>เกรด</label>
              <select {...register('grade')} className={field}>
                <option value="">— ไม่ระบุ —</option>
                <option value="good">ดี</option>
                <option value="bad_credit">เครดิตเสีย</option>
                <option value="poor">แย่</option>
                <option value="new">ประเมินใหม่</option>
                <option value="x">X</option>
              </select>
            </div>
            <div>
              <label className={lbl}>วงเงินล่าสุด (บาท)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-sm text-gray-500">฿</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('credit_limit')}
                  placeholder="0.00"
                  className={cn(field, 'pl-7')}
                />
              </div>
            </div>
            <div>
              <label className={lbl}>สถานะ <span className="text-red-500">*</span></label>
              <select {...register('status', { required: true })} className={cn(field, errors.status ? 'border-red-400' : '')}>
                <option value="active">เปิดใช้งาน</option>
                <option value="inactive">ปิดใช้งาน</option>
                <option value="blacklisted">แบล็คลิสต์</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── ข้อมูลเพิ่มเติม ──────────────────────────────────────── */}
        <div className={card}>
          <div className="space-y-4">
            <div>
              <label className={lbl}>แหล่งที่มา</label>
              <input type="text" placeholder="เช่น walk-in, referral" {...register('source')} className={field} />
            </div>
            <div>
              <label className={lbl}>หมายเหตุ</label>
              <textarea rows={3} {...register('note')} className={cn(field, 'resize-none')} />
            </div>
            <div>
              <label className={lbl}>สาขาที่ดูแล <span className="text-red-500">*</span></label>
              <select
                {...register('branch_id', { required: true, valueAsNumber: true })}
                className={cn(field, errors.branch_id ? 'border-red-400' : '')}
              >
                <option value={0}>— เลือกสาขา —</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Actions ────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pb-6">
          <Link
            to={isEditing ? `/customers/${id}` : '/customers'}
            className="rounded-lg border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting ? 'กำลังบันทึก...' : isEditing ? 'บันทึกการแก้ไข' : 'สร้างลูกค้า'}
          </button>
        </div>
      </form>
    </div>
  )
}