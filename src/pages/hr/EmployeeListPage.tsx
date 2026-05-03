import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { hrService } from '@/api/hrService'
import type { Employee } from '@/types/hr'
import { cn, sortRows } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { ActionIconLink, ActionIconButton } from '@/components/ui/ActionIconButton'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

const mockEmployees: Employee[] = [
  { id: 1, employee_code: 'ADM-001', first_name: 'Admin', last_name: 'Sudyod', nickname: 'แอดมิน', email: 'admin@sudyodmotor.com', phone: '0812345678', position_id: 6, branch_id: 1, is_active: true, position: { id: 6, name: 'ผู้จัดการ' }, branch: { id: 1, name: 'สาขาใหญ่' } },
]

export function EmployeeListPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('employee_code')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const handleSort = (key: string) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const [branches, setBranches] = useState<Record<number, string>>({})
  const [positions, setPositions] = useState<Record<number, string>>({})

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [empRes, branchRes, posRes] = await Promise.all([
        hrService.getEmployees(),
        hrService.getBranches().catch(() => ({ data: { data: [] } })),
        hrService.getPositions().catch(() => ({ data: { data: [] } }))
      ])

      const branchMap = (branchRes.data?.data || []).reduce((acc: Record<number, string>, b: any) => ({ ...acc, [b.id]: b.name }), {})
      const posMap = (posRes.data?.data || []).reduce((acc: Record<number, string>, p: any) => ({ ...acc, [p.id]: p.name }), {})
      
      setBranches(branchMap)
      setPositions(posMap)
      setEmployees(empRes.data.data || mockEmployees)
    } catch {
      // Fallback to mock data if API is not available during dev
      setEmployees(mockEmployees)
      setBranches({ 1: 'สาขาใหญ่' })
      setPositions({ 6: 'ผู้จัดการ', 1: 'ช่าง' })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredEmployees = sortRows(
    employees.filter((emp) => {
      const posName = emp.position?.name || positions[emp.position_id] || ''
      const branchName = emp.branch?.name || branches[emp.branch_id] || ''
      return `${emp.first_name} ${emp.last_name} ${emp.nickname || ''} ${emp.employee_code} ${posName} ${branchName}`
        .toLowerCase()
        .includes(search.toLowerCase())
    }),
    sortKey,
    sortDir,
    sortKey === 'first_name' ? (emp) => `${emp.first_name} ${emp.last_name}` : undefined,
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการพนักงาน</h1>
          <p className="text-sm text-gray-500">จัดการข้อมูลพนักงานและตำแหน่งในระบบ</p>
        </div>
        <Link
          to="/hr/employees/create"
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
        >
          <PlusIcon />
          <span>เพิ่มพนักงาน</span>
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative w-full sm:max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-gray-400"><SearchIcon /></span>
            </div>
            <input
              type="text"
              placeholder="ค้นหาชื่อ, รหัส, ตำแหน่ง..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pl-10 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm text-gray-500">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700">
              <tr>
                <SortableHeader label="รหัสพนักงาน" sortKey="employee_code" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="พนักงาน" sortKey="first_name" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-6 py-4 font-semibold">ตำแหน่ง/สาขา</th>
                <th className="px-6 py-4 font-semibold">เบอร์โทร</th>
                <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
                <th className="px-6 py-4 text-right font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    ไม่พบข้อมูลพนักงาน
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{emp.employee_code || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {emp.avatar_url ? (
                          <img
                            src={emp.avatar_url}
                            alt={`${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'employee'}
                            className="h-8 w-8 rounded-full border border-gray-200 object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-sm font-semibold text-red-600">
                            {emp.first_name ? emp.first_name[0] : '?'}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            {emp.first_name} {emp.last_name} {emp.nickname ? `(${emp.nickname})` : ''}
                          </div>
                          <div className="text-xs text-gray-500">{emp.email || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="font-medium text-gray-900">{emp.position?.name || positions[emp.position_id] || '-'}</div>
                      <div className="text-xs text-gray-500">{emp.branch?.name || branches[emp.branch_id] || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{emp.phone || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                        emp.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      )}>
                        {emp.is_active ? 'ใช้งานปกติ' : 'ปิดการใช้งาน'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ActionIconLink variant="edit" to={`/hr/employees/${emp.id}`} title="แก้ไข" />
                        <ActionIconButton
                          variant="delete"
                          onClick={() => setDeleteId(emp.id)}
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

      <ConfirmModal
        isOpen={deleteId !== null}
        title="ยืนยันการลบพนักงาน"
        message="คุณต้องการลบพนักงานท่านนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถเรียกคืนได้"
        confirmLabel="ลบพนักงาน"
        variant="danger"
        onConfirm={async () => {
          if (deleteId === null) return
          try {
            await hrService.deleteEmployee(deleteId)
            setDeleteId(null)
            fetchData()
            toast.success('ลบพนักงานสำเร็จ')
          } catch {
            setDeleteId(null)
          }
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
