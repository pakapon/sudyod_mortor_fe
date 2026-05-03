import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { hrService } from '@/api/hrService'
import type { Role, RolePermission } from '@/types/hr'
import { cn } from '@/lib/utils'

// PBAC Modules defined by Backend
const ALL_MODULES = [
  'branches', 'dashboard', 'employees', 'positions', 'roles', 'attendance', 'holidays',
  'customers', 'vehicles', 'vendors', 'brands', 'product_categories', 'products',
  'warehouses', 'inventory', 'goods_receipts', 'stock_transfers', 'service_orders',
  'quotations', 'invoices', 'loan_applications', 'store_loans', 'notifications'
]

const ACTIONS = [
  { key: 'can_view', label: 'ดู' },
  { key: 'can_create', label: 'สร้าง' },
  { key: 'can_edit', label: 'แก้ไข' },
  { key: 'can_delete', label: 'ลบ' },
  { key: 'can_approve', label: 'อนุมัติ' },
  { key: 'can_export', label: 'ส่งออก' },
] as const

const mockRoles: Role[] = [
  { id: 1, name: 'Super Admin', description: 'สิทธิ์เต็ม', is_active: true },
  { id: 2, name: 'ผู้จัดการสาขา', description: null, is_active: true },
]

export function PermissionMatrixPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  
  // matrix: { moduleName: { can_view: true, can_create: false, ... } }
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch roles list
  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setIsLoading(true)
    try {
      const { data } = await hrService.getRoles()
      setRoles(data.data || mockRoles)
      if (data.data?.length) {
        selectRole(data.data[0])
      } else {
        selectRole(mockRoles[0])
      }
    } catch {
      setRoles(mockRoles)
      selectRole(mockRoles[0])
    } finally {
      setIsLoading(false)
    }
  }

  // When a role is selected, fetch its specific permissions
  const selectRole = async (role: Role) => {
    setSelectedRole(role)
    try {
      const { data } = await hrService.getRolePermissions(role.id)
      const perms = data.data.permissions || []
      
      // Initialize an empty matrix for ALL modules
      const initialMatrix: Record<string, Record<string, boolean>> = {}
      ALL_MODULES.forEach(mod => {
        initialMatrix[mod] = {
          can_view: false, can_create: false, can_edit: false, 
          can_delete: false, can_approve: false, can_export: false
        }
      })

      // Overlay the fetched permissions
      perms.forEach(p => {
        if (initialMatrix[p.module]) {
          initialMatrix[p.module] = {
            can_view: p.can_view,
            can_create: p.can_create,
            can_edit: p.can_edit,
            can_delete: p.can_delete,
            can_approve: p.can_approve,
            can_export: p.can_export,
          }
        }
      })
      
      setMatrix(initialMatrix)
    } catch {
      // Mock Fallback
      const initialMatrix: Record<string, Record<string, boolean>> = {}
      ALL_MODULES.forEach(mod => {
        initialMatrix[mod] = {
          can_view: role.id === 1, can_create: role.id === 1, can_edit: role.id === 1, 
          can_delete: role.id === 1, can_approve: role.id === 1, can_export: role.id === 1
        }
      })
      setMatrix(initialMatrix)
    }
  }

  const togglePermission = (mod: string, actionKey: string) => {
    setMatrix(prev => ({
      ...prev,
      [mod]: {
        ...prev[mod],
        [actionKey]: !prev[mod][actionKey]
      }
    }))
  }

  const handleSave = async () => {
    if (!selectedRole) return
    setIsSaving(true)
    
    // Transform matrix back to RolePermission[]
    const payload: RolePermission[] = Object.keys(matrix).map(mod => ({
      module: mod,
      can_view: matrix[mod].can_view,
      can_create: matrix[mod].can_create,
      can_edit: matrix[mod].can_edit,
      can_delete: matrix[mod].can_delete,
      can_approve: matrix[mod].can_approve,
      can_export: matrix[mod].can_export,
    }))

    try {
      await hrService.updateRolePermissions(selectedRole.id, payload)
      toast.success('บันทึกสิทธิ์การใช้งานสำเร็จ')
    } catch {
      // interceptor handles display
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">กำหนดสิทธิ์การใช้งาน (Permissions)</h1>
          <p className="text-sm text-gray-500">เลือก Role ด้านซ้าย และติ๊กเลือกสิทธิ์ในตารางด้านขวา ระบบ PBAC</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || !selectedRole}
          className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
        </button>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Left Sidebar: Roles List */}
        <div className="w-64 shrink-0 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-100 bg-gray-50 font-medium text-gray-700">เลือกตำแหน่ง (Role)</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">กำลังโหลด...</div>
            ) : (
              roles.map(r => (
                <button
                  key={r.id}
                  onClick={() => selectRole(r)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    selectedRole?.id === r.id 
                      ? "bg-red-50 text-red-700" 
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  {r.name}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Section: PBAC Matrix Table */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-w-0 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50">
            <h3 className="font-medium text-gray-800">
              สิทธิ์ของ: <span className="text-red-600 font-bold ml-1">{selectedRole?.name || '-'}</span>
            </h3>
          </div>
          
          <div className="flex-1 overflow-auto">
            {selectedRole && !isLoading ? (
              <table className="w-full text-left text-sm text-gray-500 border-collapse">
                <thead className="bg-white sticky top-0 z-10 shadow-sm outline outline-1 outline-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-gray-700">โมดูล (Module)</th>
                    {ACTIONS.map(action => (
                      <th key={action.key} className="px-4 py-4 font-semibold text-gray-700 text-center border-l border-gray-100 min-w-[80px]">
                        {action.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {ALL_MODULES.map((mod) => (
                    <tr key={mod} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900 border-r border-gray-100">{mod}</td>
                      {ACTIONS.map(action => (
                        <td key={action.key} className="px-4 py-3 text-center border-r border-gray-100 last:border-0 relative">
                          <input
                            type="checkbox"
                            checked={matrix[mod]?.[action.key] || false}
                            onChange={() => togglePermission(mod, action.key)}
                            className="w-5 h-5 cursor-pointer rounded border-gray-300 text-red-600 focus:ring-red-500 transition-colors"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                {isLoading ? 'กำลังโหลดข้อมูลสิทธิ์...' : 'กรุณาเลือกตำแหน่งด้านซ้ายเพื่อดูและแก้ไขสิทธิ์'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
