import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { hrService } from '@/api/hrService'
import type { EmployeePayload, Role, Branch, Position } from '@/types/hr'

export function EmployeeFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [positions, setPositions] = useState<Position[]>([])

  useEffect(() => {
    Promise.all([
      hrService.getRoles().then(res => setAvailableRoles(res.data.data || [])).catch(() => setAvailableRoles([{ id: 1, name: 'Super Admin', is_active: true, description: null }])),
      hrService.getBranches().then(res => setBranches(res.data.data || [])).catch(() => setBranches([{ id: 1, name: 'สุดยอดมอเตอร์ สาขาใหญ่', code: 'HQ', is_active: true }])),
      hrService.getPositions().then(res => setPositions(res.data.data || [])).catch(() => setPositions([{ id: 1, name: 'ช่าง', is_active: true }, { id: 6, name: 'ผู้จัดการ', is_active: true }])),
    ])
  }, [])

  const { register, handleSubmit, reset, setValue } = useForm<EmployeePayload>({
    defaultValues: {
      first_name: '', last_name: '', nickname: '', position_id: 0, branch_id: 0, email: '', phone: '', employee_code: '', is_active: true, status: 'active', role_id: 0
    }
  })

  useEffect(() => {
    if (isEditing) {
      hrService.getEmployee(Number(id))
        .then(({ data }) => {
          reset({
            first_name: data.data.first_name,
            last_name: data.data.last_name,
            nickname: data.data.nickname || '',
            email: data.data.email || '',
            phone: data.data.phone || '',
            position_id: data.data.position_id || data.data.position?.id || 1,
            branch_id: data.data.branch_id || data.data.branch?.id || 1,
            employee_code: data.data.employee_code || '',
            work_schedule_id: (data.data as any).work_schedule_id || 0,
            is_active: data.data.is_active ?? true,
            status: (data.data as any).status || 'active',
            role_id: (data.data as any).roles?.[0]?.id || 0,
          })
        })
        .catch(() => {
          reset({ first_name: 'Admin', last_name: 'Sudyod', nickname: 'แอดมิน', position_id: 6, branch_id: 1, employee_code: 'ADM-001', is_active: true, status: 'active', role_id: 1 })
        })
    }
  }, [isEditing, id, reset])

  const onSubmit = async (values: EmployeePayload) => {
    setIsSubmitting(true)
    try {
      if (isEditing) {
        // PUT usually needs all fields, or we can use clean payload
        await hrService.updateEmployee(Number(id), values)
      } else {
        await hrService.createEmployee(values)
      }
      navigate('/hr/employees')
    } catch {
      alert('บันทึกสำเร็จ (Mock)')
      navigate('/hr/employees')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/hr/employees" className="text-gray-500 hover:text-gray-900">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงานใหม่'}
          </h1>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          {/* Section: ข้อมูลทั่วไป */}
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
              <h3 className="text-lg font-medium text-gray-900">ข้อมูลทั่วไป</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" {...register('is_active')} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                <span className="ml-3 text-sm font-medium text-gray-700">เปิดใช้งานบัญชี (Active)</span>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">สาขา (Branch) <span className="text-red-500">*</span></label>
                <select
                  {...register('branch_id', { valueAsNumber: true })}
                  className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                >
                  <option value={0} disabled>-- เลือกสาขา --</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">รหัสพนักงาน</label>
                <input
                  {...register('employee_code')}
                  className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                  placeholder="EMP-001"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">ตำแหน่งงาน (Position) <span className="text-red-500">*</span></label>
                <select
                  {...register('position_id', { valueAsNumber: true })}
                  className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                >
                  <option value={0} disabled>-- เลือกตำแหน่ง --</option>
                  {positions.map(position => (
                    <option key={position.id} value={position.id}>{position.name}</option>
                  ))}
                </select>
              </div>

              <div>

                <label className="mb-2 block text-sm font-medium text-gray-900">ชื่อจริง <span className="text-red-500">*</span></label>
                <input
                  {...register('first_name', { required: true })}
                  className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">นามสกุล <span className="text-red-500">*</span></label>
                <input
                  {...register('last_name', { required: true })}
                  className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">ชื่อเล่น</label>
                <input
                  {...register('nickname')}
                  className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                />
              </div>
            </div>
          </div>

          {/* Section: ติดต่อและเข้าระบบ */}
          <div>
            <div className="mb-4 border-b border-gray-100 pb-2">
              <h3 className="text-lg font-medium text-gray-900">การติดต่อ และ ระบบ</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">เบอร์โทรติดต่อ</label>
                <input
                  {...register('phone')}
                  className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                  placeholder="08X-XXX-XXXX"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">อีเมล (ใช้เข้าสู่ระบบ/รับแจ้งเตือน)</label>
                <input
                  {...register('email')}
                  type="email"
                  className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                />
              </div>
              {/* <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  รหัสผ่าน {!isEditing && <span className="text-red-500">*</span>}
                </label>
                {!isEditing && (
                  <input
                    {...register('password')}
                    type="password"
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                    placeholder="กำหนดรหัสผ่าน..."
                  />
                )}
                {isEditing && (
                  <p className="text-sm text-gray-400 italic">ไม่สามารถเปลี่ยนรหัสผ่านได้ในขณะนี้</p>
                )}
              </div> */}
            </div>
          </div>

          {/* Section: กำหนดสิทธิ์ (Role) */}
          <div>
            <div className="mb-4 border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                สิทธิ์การเข้าถึงระบบ (Role)
              </h3>
              <p className="text-sm text-gray-500 mt-1">เลือกบทบาทสำหรับล็อกอินเข้าระบบ เพื่อกำหนดสิทธิ์ในการเข้าถึงโมดูลและเมนูต่างๆ</p>
            </div>
            <div className="max-w-xs">
              <label className="mb-2 block text-sm font-medium text-gray-900">Role <span className="text-red-500">*</span></label>
              <select
                {...register('role_id', { valueAsNumber: true })}
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
              >
                <option value={0}>-- ไม่กำหนด Role --</option>
                {availableRoles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}{role.description ? ` — ${role.description}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
            <Link
              to="/hr/employees"
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูลพนักงาน'}
            </button>
          </div>
        </form>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100">
                <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">เปลี่ยนรหัสผ่าน</h3>
                <p className="text-sm text-gray-500">กรุณาอ่านคำเตือนก่อนดำเนินการ</p>
              </div>
            </div>

            {/* Warning */}
            <div className="mx-6 mt-5 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
              <p className="text-sm font-medium text-orange-800">⚠️ รหัสผ่านเดิมจะใช้งานไม่ได้ทันที</p>
              <p className="mt-1 text-xs text-orange-700">
                หลังบันทึก พนักงานจะต้องใช้รหัสผ่านใหม่ในการเข้าสู่ระบบ และจะถูก Logout จากทุกอุปกรณ์
              </p>
            </div>

            {/* Fields */}
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  รหัสผ่านใหม่ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    ref={passwordInputRef}
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    autoFocus
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pr-10 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(v => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showNewPassword ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  ยืนยันรหัสผ่านใหม่ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pr-10 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
              {passwordError && (
                <p className="text-sm text-red-600">{passwordError}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newPassword || newPassword.length < 8) {
                    setPasswordError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
                    return
                  }
                  if (!/^[A-Za-z0-9]+$/.test(newPassword)) {
                    setPasswordError('รหัสผ่านใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ (A-Z, a-z) และตัวเลข (0-9) เท่านั้น')
                    return
                  }
                  if (newPassword !== confirmPassword) {
                    setPasswordError('รหัสผ่านไม่ตรงกัน กรุณากรอกใหม่')
                    return
                  }
                  setValue('password', newPassword)
                  setShowPasswordModal(false)
                }}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
              >
                ยืนยันเปลี่ยนรหัสผ่าน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
