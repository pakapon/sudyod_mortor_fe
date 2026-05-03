import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { vehicleInspectionService } from '@/api/vehicleInspectionService'
import type { VehicleInspectionChecklist } from '@/types/vehicleInspection'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { ActionIconLink, ActionIconButton } from '@/components/ui/ActionIconButton'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'

export function VehicleInspectionListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { permissions } = useAuthStore()

  const [checklists, setChecklists] = useState<VehicleInspectionChecklist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const search = searchParams.get('search') ?? ''
  const page = Number(searchParams.get('page') ?? '1')
  const sortKey = searchParams.get('sort') ?? 'id'
  const sortDir = (searchParams.get('order') ?? 'asc') as 'asc' | 'desc'
  const limit = 20

  const setParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page') next.delete('page')
      return next
    })
  }

  const handleSort = (key: string) => {
    if (key === sortKey) {
      setParam('order', sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('sort', key)
        next.set('order', 'asc')
        next.delete('page')
        return next
      })
    }
  }

  const loadChecklists = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await vehicleInspectionService.getChecklists({
        search: search || undefined,
        sort: sortKey as 'id' | 'brand' | 'model' | 'year' | 'vehicle_type' | 'created_at',
        order: sortDir,
        page,
        limit,
      })
      setChecklists(res.data.data || [])
      setTotal(res.data.pagination?.total ?? 0)
    } catch {
      setChecklists([])
    } finally {
      setIsLoading(false)
    }
  }, [search, sortKey, sortDir, page])

  useEffect(() => { loadChecklists() }, [loadChecklists])

  const handleDelete = (id: number) => setDeleteId(id)

  const handleConfirmDelete = async () => {
    if (deleteId === null) return
    try {
      await vehicleInspectionService.deleteChecklist(deleteId)
      setDeleteId(null)
      toast.success('ลบรายการตรวจสอบสำเร็จ')
      loadChecklists()
    } catch {
      setDeleteId(null)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">แม่แบบรายการตรวจสอบรถ</h1>
          <p className="text-sm text-gray-500">จัดการแม่แบบรายการตรวจสอบสภาพรถยนต์แต่ละประเภท</p>
        </div>
        {hasPermission(permissions, 'vehicle_inspection_checklists', 'can_create') && (
          <Link
            to="/settings/vehicle-inspection-checklists/create"
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>เพิ่มแม่แบบ</span>
          </Link>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
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
              placeholder="ค้นหาประเภทรถ แบรนด์ หรือรุ่น..."
              value={search}
              onChange={(e) => setParam('search', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pl-10 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700">
              <tr>
                <SortableHeader label="ประเภทรถ" sortKey="vehicle_type" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="แบรนด์" sortKey="brand" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="รุ่น" sortKey="model" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="ปี" sortKey="year" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-6 py-4 font-semibold text-center">จำนวนรายการ</th>
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
              ) : checklists.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    ไม่พบข้อมูลแม่แบบรายการตรวจสอบ
                  </td>
                </tr>
              ) : (
                checklists.map((checklist) => (
                  <tr key={checklist.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{checklist.vehicle_type}</td>
                    <td className="px-6 py-4 text-gray-600">{checklist.brand}</td>
                    <td className="px-6 py-4 text-gray-600">{checklist.model}</td>
                    <td className="px-6 py-4 text-gray-600">{checklist.year ?? 'ทุกปี'}</td>
                    <td className="px-6 py-4 text-center text-gray-600">
                      {checklist.items_count ?? checklist.items?.length ?? 0} รายการ
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                        checklist.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800',
                      )}>
                        {checklist.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasPermission(permissions, 'vehicle_inspection_checklists', 'can_edit') && (
                          <ActionIconLink variant="edit" to={`/settings/vehicle-inspection-checklists/${checklist.id}/edit`} />
                        )}
                        {hasPermission(permissions, 'vehicle_inspection_checklists', 'can_delete') && (
                          <ActionIconButton variant="delete" onClick={() => handleDelete(checklist.id)} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500">
              แสดง {(page - 1) * limit + 1}–{Math.min(page * limit, total)} จาก {total.toLocaleString('th-TH')} รายการ
            </p>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setParam('page', String(page - 1))}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
              >
                ก่อนหน้า
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setParam('page', String(page + 1))}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteId !== null}
        title="ยืนยันการลบแม่แบบรายการตรวจสอบ"
        message="คุณต้องการลบแม่แบบรายการตรวจสอบนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถเรียกคืนได้"
        confirmLabel="ลบแม่แบบ"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
