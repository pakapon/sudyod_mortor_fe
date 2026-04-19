import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { hrService } from '@/api/hrService'
import type { Branch } from '@/types/hr'
import { cn, sortRows } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { ActionIconLink, ActionIconButton } from '@/components/ui/ActionIconButton'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

export function BranchListPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const handleSort = (key: string) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const res = await hrService.getBranches()
      setBranches(res.data.data || [])
    } catch {
      setBranches([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = (id: number) => setDeleteId(id)

  const handleConfirmDelete = async () => {
    if (deleteId === null) return
    try {
      await hrService.deleteBranch(deleteId)
      setDeleteId(null)
      fetchData()
      toast.success('ลบสาขาสำเร็จ')
    } catch {
      setDeleteId(null)
    }
  }

  const filteredBranches = sortRows(
    branches.filter((b) => `${b.name} ${b.code}`.toLowerCase().includes(search.toLowerCase())),
    sortKey,
    sortDir,
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการสาขา</h1>
          <p className="text-sm text-gray-500">จัดการข้อมูลสาขาของบริษัท</p>
        </div>
        <Link
            to="/settings/branches/create"
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>เพิ่มสาขา</span>
          </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4 flex gap-4">
          <div className="relative w-full max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-gray-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
            </div>
            <input
              type="text"
              placeholder="ค้นหาชื่อ, รหัสสาขา..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pl-10 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700">
              <tr>
                <SortableHeader label="รหัสสาขา" sortKey="code" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="ชื่อสาขา" sortKey="name" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-6 py-4 font-semibold">ที่อยู่</th>
                <th className="px-6 py-4 font-semibold">เบอร์โทร</th>
                <th className="px-6 py-4 font-semibold">IP ที่อนุญาต</th>
                <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
                <th className="px-6 py-4 text-right font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    ไม่พบข้อมูลสาขา
                  </td>
                </tr>
              ) : (
                filteredBranches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-900">{branch.code}</td>
                    <td className="px-6 py-4 text-gray-900">{branch.name}</td>
                    <td className="px-6 py-4 text-gray-500">{branch.address || '-'}</td>
                    <td className="px-6 py-4 text-gray-500">{branch.phone || '-'}</td>
                    <td className="px-6 py-4 text-gray-500">{branch.allowed_ip_range || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                        branch.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800',
                      )}>
                        {branch.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ActionIconLink variant="edit" to={`/settings/branches/${branch.id}/edit`} />
                        <ActionIconButton variant="delete" onClick={() => handleDelete(branch.id)} />
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
        title="ยืนยันการลบสาขา"
        message="คุณต้องการลบสาขานี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถเรียกคืนได้"
        confirmLabel="ลบสาขา"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
