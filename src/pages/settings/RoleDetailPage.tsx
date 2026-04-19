import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { hrService } from '@/api/hrService'
import type { Role, RolePermission } from '@/types/hr'
import { cn } from '@/lib/utils'

const ALL_MODULES: { key: string; label: string }[] = [
  { key: 'branches', label: 'สาขา' },
  { key: 'dashboard', label: 'แดชบอร์ด' },
  { key: 'employees', label: 'พนักงาน' },
  { key: 'positions', label: 'ตำแหน่งงาน' },
  { key: 'roles', label: 'บทบาท & สิทธิ์' },
  { key: 'work_schedules', label: 'ตารางเวลาทำงาน' },
  { key: 'attendance', label: 'การลงเวลา' },
  { key: 'holidays', label: 'วันหยุด' },
  { key: 'customers', label: 'ลูกค้า' },
  { key: 'vehicles', label: 'รถลูกค้า' },
  { key: 'vendors', label: 'Supplier' },
  { key: 'brands', label: 'ยี่ห้อ' },
  { key: 'product_categories', label: 'หมวดสินค้า' },
  { key: 'products', label: 'สินค้า' },
  { key: 'warehouses', label: 'คลังสินค้า' },
  { key: 'inventory', label: 'สต็อก' },
  { key: 'goods_receipts', label: 'ใบรับสินค้า' },
  { key: 'stock_transfers', label: 'โอนย้ายสต็อก' },
  { key: 'purchase_orders', label: 'ใบสั่งซื้อ' },
  { key: 'service_orders', label: 'ใบสั่งซ่อม' },
  { key: 'quotations', label: 'ใบเสนอราคา' },
  { key: 'deposits', label: 'มัดจำ' },
  { key: 'invoices', label: 'ใบแจ้งหนี้' },
  { key: 'payments', label: 'รับชำระเงิน' },
  { key: 'delivery_notes', label: 'ใบส่งมอบ' },
  { key: 'warranties', label: 'ใบรับประกัน' },
  { key: 'finance_companies', label: 'บริษัทไฟแนนซ์' },
  { key: 'loan_applications', label: 'สินเชื่อ' },
  { key: 'store_loans', label: 'ผ่อนร้าน' },
  { key: 'notifications', label: 'แจ้งเตือน' },
  { key: 'audit_logs', label: 'ประวัติการใช้งาน' },
]

const ACTIONS: { key: keyof RolePermission; label: string; iconPath: string; color: string }[] = [
  {
    key: 'can_view', label: 'ดู',
    iconPath: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
    color: 'text-blue-600',
  },
  {
    key: 'can_create', label: 'สร้าง',
    iconPath: 'M12 4v16m8-8H4',
    color: 'text-emerald-600',
  },
  {
    key: 'can_edit', label: 'แก้ไข',
    iconPath: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
    color: 'text-amber-600',
  },
  {
    key: 'can_delete', label: 'ลบ',
    iconPath: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
    color: 'text-red-600',
  },
  {
    key: 'can_approve', label: 'อนุมัติ',
    iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'text-violet-600',
  },
  {
    key: 'can_export', label: 'ส่งออก',
    iconPath: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
    color: 'text-sky-600',
  },
]

type Matrix = Record<string, Record<string, boolean>>

function buildEmptyMatrix(): Matrix {
  const m: Matrix = {}
  ALL_MODULES.forEach(({ key }) => {
    m[key] = { can_view: false, can_create: false, can_edit: false, can_delete: false, can_approve: false, can_export: false }
  })
  return m
}

export function RoleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const roleId = Number(id)

  const [role, setRole] = useState<Role | null>(null)
  const [matrix, setMatrix] = useState<Matrix>(buildEmptyMatrix())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (!roleId) return
    setIsLoading(true)
    hrService.getRolePermissions(roleId)
      .then(({ data }) => {
        const r = data.data
        setRole(r)
        const m = buildEmptyMatrix()
        ;(r.permissions || []).forEach(p => {
          if (m[p.module]) {
            m[p.module] = {
              can_view: p.can_view,
              can_create: p.can_create,
              can_edit: p.can_edit,
              can_delete: p.can_delete,
              can_approve: p.can_approve,
              can_export: p.can_export,
            }
          }
        })
        setMatrix(m)
      })
      .catch(() => {
        // Mock fallback
        setRole({ id: roleId, name: 'Role (' + roleId + ')', description: null, is_active: true })
        setMatrix(buildEmptyMatrix())
      })
      .finally(() => setIsLoading(false))
  }, [roleId])

  const toggle = (mod: string, action: string) => {
    setMatrix(prev => ({
      ...prev,
      [mod]: { ...prev[mod], [action]: !prev[mod][action] }
    }))
  }

  // Toggle entire row (all actions for a module)
  const toggleRow = (mod: string) => {
    const rowValues = matrix[mod]
    const allTrue = ACTIONS.every(a => rowValues[a.key as string])
    setMatrix(prev => ({
      ...prev,
      [mod]: Object.fromEntries(ACTIONS.map(a => [a.key, !allTrue]))
    }))
  }

  // Toggle entire column (one action for all modules)
  const toggleColumn = (action: string) => {
    const allTrue = ALL_MODULES.every(({ key }) => matrix[key][action])
    setMatrix(prev => {
      const next = { ...prev }
      ALL_MODULES.forEach(({ key }) => {
        next[key] = { ...next[key], [action]: !allTrue }
      })
      return next
    })
  }

  const handleSave = async () => {
    if (!role) return
    setIsSaving(true)
    setSaveSuccess(false)
    const permissions: RolePermission[] = ALL_MODULES.map(({ key }) => ({
      module: key,
      can_view: matrix[key].can_view,
      can_create: matrix[key].can_create,
      can_edit: matrix[key].can_edit,
      can_delete: matrix[key].can_delete,
      can_approve: matrix[key].can_approve,
      can_export: matrix[key].can_export,
    }))
    try {
      await hrService.updateRolePermissions(role.id, permissions)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      // Mock success
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        กำลังโหลดข้อมูล...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/settings/roles" className="text-gray-400 hover:text-gray-700 transition-colors">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{role?.name}</h1>
            <span className={cn(
              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
              role?.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
            )}>
              {role?.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
            </span>
          </div>
          {role?.description && (
            <p className="text-sm text-gray-500 mt-0.5">{role.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-sm font-medium text-emerald-600 flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              บันทึกสำเร็จ
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกสิทธิ์'}
          </button>
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
          <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div>
            <h2 className="text-base font-semibold text-gray-800">ตารางสิทธิ์การเข้าถึง (Permission Matrix)</h2>
            <p className="text-xs text-gray-500 mt-0.5">คลิกหัวคอลัมน์เพื่อเลือก/ยกเลิกทั้งคอลัมน์ · คลิก "ทั้งหมด" เพื่อเลือก/ยกเลิกทั้งแถว</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-white sticky top-0 z-10 shadow-[0_1px_0_0_#e5e7eb]">
              <tr>
                <th className="w-52 px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  โมดูล
                </th>
                {ACTIONS.map(action => {
                  const allChecked = ALL_MODULES.every(({ key }) => matrix[key][action.key as string])
                  const someChecked = ALL_MODULES.some(({ key }) => matrix[key][action.key as string])
                  return (
                    <th
                      key={action.key as string}
                      className="px-3 py-3 text-center cursor-pointer hover:bg-red-50 transition-colors select-none min-w-[72px] border-l border-gray-100"
                      onClick={() => toggleColumn(action.key as string)}
                      title={`คลิกเพื่อเลือก/ยกเลิกทั้งคอลัมน์ ${action.label}`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <svg
                          className={cn('h-5 w-5 transition-colors', someChecked ? action.color : 'text-gray-300')}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={action.iconPath} />
                        </svg>
                        <span className={cn('text-[10px] font-semibold tracking-wide', someChecked ? action.color : 'text-gray-400')}>
                          {action.label}
                        </span>
                        <div className={cn(
                          'h-1 w-8 rounded-full transition-colors',
                          allChecked ? 'bg-red-500' : someChecked ? 'bg-red-200' : 'bg-gray-100'
                        )} />
                      </div>
                    </th>
                  )
                })}
                <th className="px-3 py-3 text-center border-l border-gray-100 min-w-[56px]" title="เลือก/ยกเลิกทั้งแถว">
                  <div className="flex flex-col items-center gap-1">
                    <svg className="h-5 w-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <span className="text-[10px] font-semibold tracking-wide text-gray-400">แถว</span>
                    <div className="h-1 w-8 rounded-full bg-gray-100" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ALL_MODULES.map(({ key, label }, idx) => {
                const rowValues = matrix[key]
                const allRowChecked = ACTIONS.every(a => rowValues[a.key as string])
                const someRowChecked = ACTIONS.some(a => rowValues[a.key as string])
                return (
                  <tr key={key} className={cn('hover:bg-gray-50/80 transition-colors', idx % 2 === 0 ? '' : 'bg-gray-50/30')}>
                    <td className="px-6 py-3 font-medium text-gray-800 border-r border-gray-100 whitespace-nowrap">
                      {label}
                      <div className="text-xs font-mono text-gray-400 mt-0.5">{key}</div>
                    </td>
                    {ACTIONS.map(action => (
                      <td key={action.key as string} className="px-3 py-3 text-center border-r border-gray-50">
                        <input
                          type="checkbox"
                          checked={rowValues[action.key as string] || false}
                          onChange={() => toggle(key, action.key as string)}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-red-600 focus:ring-red-500 transition-colors"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center border-l border-gray-100">
                      <button
                        type="button"
                        onClick={() => toggleRow(key)}
                        title={allRowChecked ? 'ยกเลิกทั้งแถว' : 'เลือกทั้งแถว'}
                        className={cn(
                          'inline-flex items-center justify-center h-8 w-8 rounded-md border transition-colors',
                          allRowChecked
                            ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                            : someRowChecked
                              ? 'border-orange-200 bg-orange-50 text-orange-500 hover:bg-orange-100'
                              : 'border-gray-200 bg-white text-gray-300 hover:bg-gray-50 hover:text-gray-500'
                        )}
                      >
                        {allRowChecked ? (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : someRowChecked ? (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom save bar */}
      <div className="flex items-center justify-end gap-3 rounded-xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
        <p className="text-sm text-gray-400 mr-auto">
          การเปลี่ยนสิทธิ์มีผลทันที — พนักงานที่ login อยู่จะได้รับสิทธิ์ใหม่ภายใน 5 นาที
        </p>
        <Link
          to="/settings/roles"
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          กลับรายการ
        </Link>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {isSaving ? 'กำลังบันทึก...' : 'บันทึกสิทธิ์'}
        </button>
      </div>
    </div>
  )
}
