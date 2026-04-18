import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { hrService } from '@/api/hrService'
import type { Role, RolePayload } from '@/types/hr'
import { cn } from '@/lib/utils'
import { ActionIconButton } from '@/components/ui/ActionIconButton'

const mockRoles: Role[] = [
  { id: 1, name: 'Super Admin', description: 'สิทธิ์เต็ม', is_active: true, employee_count: 1 },
  { id: 2, name: 'ผู้จัดการสาขา', description: null, is_active: true, employee_count: 3 },
  { id: 3, name: 'ช่าง', description: null, is_active: true, employee_count: 5 },
]

export function RoleManagementPage() {
  const navigate = useNavigate()
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, reset } = useForm<RolePayload>({
    defaultValues: { name: '', description: '', is_active: true }
  })

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    setIsLoading(true)
    try {
      const { data } = await hrService.getRoles()
      setRoles(data.data || mockRoles)
    } catch {
      setRoles(mockRoles)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenCreate = () => {
    setEditingRole(null)
    reset({ name: '', description: '', is_active: true })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (e: React.MouseEvent, role: Role) => {
    e.stopPropagation()
    setEditingRole(role)
    reset({ name: role.name, description: role.description || '', is_active: role.is_active })
    setIsModalOpen(true)
  }

  const onSubmit = async (values: RolePayload) => {
    setIsSubmitting(true)
    try {
      if (editingRole) {
        await hrService.updateRole(editingRole.id, values)
        setRoles(roles.map(r => r.id === editingRole.id ? { ...r, ...values, description: values.description || null } : r))
      } else {
        const { data } = await hrService.createRole(values)
        setRoles([...roles, data.data || { id: Date.now(), ...values, description: values.description || null, employee_count: 0 }])
      }
      setIsModalOpen(false)
    } catch {
      setRoles(editingRole
        ? roles.map(r => r.id === editingRole.id ? { ...r, ...values, description: values.description || null } : r)
        : [...roles, { id: Date.now(), ...values, description: values.description || null, employee_count: 0 }]
      )
      setIsModalOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredRoles = roles.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(search.toLowerCase())
    const matchActive =
      filterActive === 'all' ? true :
      filterActive === 'active' ? r.is_active :
      !r.is_active
    return matchSearch && matchActive
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">บทบาท & สิทธิ์ (Roles)</h1>
          <p className="text-sm text-gray-500">จัดการบทบาท และกำหนดสิทธิ์การเข้าถึงระบบ PBAC</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          สร้าง Role ใหม่
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ Role..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {(['all', 'active', 'inactive'] as const).map(val => (
            <button
              key={val}
              onClick={() => setFilterActive(val)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                filterActive === val
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {val === 'all' ? 'ทั้งหมด' : val === 'active' ? 'ใช้งาน' : 'ปิดใช้งาน'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold">ชื่อ Role</th>
                <th className="px-6 py-4 font-semibold">รายละเอียด</th>
                <th className="px-6 py-4 font-semibold text-center w-28">สถานะ</th>
                <th className="px-6 py-4 font-semibold text-right w-40">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">กำลังโหลดข้อมูล...</td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">ไม่พบ Role ที่ตรงกับการค้นหา</td>
                </tr>
              ) : (
                filteredRoles.map(role => (
                  <tr
                    key={role.id}
                    onClick={() => navigate(`/settings/roles/${role.id}`)}
                    className="hover:bg-red-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold">
                          {role.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 group-hover:text-red-700 transition-colors">{role.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{role.description || <span className="italic text-gray-300">—</span>}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                        role.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                      )}>
                        {role.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ActionIconButton
                          variant="edit"
                          onClick={e => handleOpenEdit(e, role)}
                          title="แก้ไข Role"
                        />
                        <ActionIconButton
                          variant="config"
                          onClick={e => { e.stopPropagation(); navigate(`/settings/roles/${role.id}`) }}
                          title="กำหนดสิทธิ์"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">{editingRole ? 'แก้ไข Role' : 'สร้าง Role ใหม่'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">ชื่อ Role <span className="text-red-500">*</span></label>
                <input
                  {...register('name', { required: true })}
                  className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                  placeholder="เช่น ผู้จัดการสาขา"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">รายละเอียด</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                  placeholder="อธิบายบทบาทของ Role นี้..."
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" {...register('is_active')} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
                <span className="text-sm font-medium text-gray-700">เปิดใช้งาน (Active)</span>
              </div>
              <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
                  ยกเลิก
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50">
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
