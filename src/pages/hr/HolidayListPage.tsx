import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { hrService } from '@/api/hrService'
import type { Holiday, Branch } from '@/types/hr'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { ActionIconLink, ActionIconButton } from '@/components/ui/ActionIconButton'
import { sortRows } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

export function HolidayListPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterBranch, setFilterBranch] = useState<string>('')
  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const { permissions } = useAuthStore()

  const handleSort = (key: string) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  useEffect(() => {
    hrService.getBranches().then((res) => setBranches(res.data.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    fetchData()
  }, [filterYear, filterBranch])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const res = await hrService.getHolidays({
        year: filterYear,
        branch_id: filterBranch ? Number(filterBranch) : undefined,
      })
      setHolidays(res.data.data || [])
    } catch {
      setHolidays([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = (id: number) => setDeleteId(id)

  const handleConfirmDelete = async () => {
    if (deleteId === null) return
    try {
      await hrService.deleteHoliday(deleteId)
      setDeleteId(null)
      fetchData()
      toast.success('ลบวันหยุดสำเร็จ')
    } catch {
      setDeleteId(null)
    }
  }

  const sortedHolidays = sortRows(holidays, sortKey, sortDir)

  const getBranchLabel = (branchId: number | null) => {
    if (branchId === null) return 'ทุกสาขา'
    const branch = branches.find((b) => b.id === branchId)
    return branch?.name || `สาขา #${branchId}`
  }

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการวันหยุด</h1>
          <p className="text-sm text-gray-500">กำหนดวันหยุดประจำปีสำหรับทั้งบริษัทหรือรายสาขา</p>
        </div>
        {hasPermission(permissions, 'holidays', 'can_create') && (
          <Link
            to="/hr/holidays/create"
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>เพิ่มวันหยุด</span>
          </Link>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Filters */}
        <div className="border-b border-gray-100 p-4 flex flex-wrap gap-4">
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>ปี {y + 543}</option>
            ))}
          </select>

          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
          >
            <option value="">ทุกสาขา</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700">
              <tr>
                <SortableHeader label="วันที่" sortKey="date" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="ชื่อวันหยุด" sortKey="name" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-6 py-4 font-semibold">สาขา</th>
                <th className="px-6 py-4 text-right font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : holidays.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    ไม่พบข้อมูลวันหยุด
                  </td>
                </tr>
              ) : (
                sortedHolidays.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-900">{formatDate(h.date)}</td>
                    <td className="px-6 py-4 text-gray-900">{h.name}</td>
                    <td className="px-6 py-4">
                      <span className={h.branch_id === null
                        ? 'inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800'
                        : 'inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700'
                      }>
                        {getBranchLabel(h.branch_id)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasPermission(permissions, 'holidays', 'can_edit') && (
                          <ActionIconLink variant="edit" to={`/hr/holidays/${h.id}/edit`} />
                        )}
                        {hasPermission(permissions, 'holidays', 'can_delete') && (
                          <ActionIconButton variant="delete" onClick={() => handleDelete(h.id)} />
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

      <ConfirmModal
        isOpen={deleteId !== null}
        title="ยืนยันการลบวันหยุด"
        message="คุณต้องการลบวันหยุดนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถเรียกคืนได้"
        confirmLabel="ลบวันหยุด"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
