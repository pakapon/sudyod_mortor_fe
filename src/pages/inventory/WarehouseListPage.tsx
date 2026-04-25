import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { warehouseService } from '@/api/warehouseService'
import type { Warehouse } from '@/types/inventory'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { ActionIconLink, ActionIconButton } from '@/components/ui/ActionIconButton'
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export function WarehouseListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { permissions } = useAuthStore()

  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const search = searchParams.get('search') ?? ''
  const page = Number(searchParams.get('page') ?? '1')
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

  const loadWarehouses = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await warehouseService.getWarehouses({ search: search || undefined, page, limit })
      setWarehouses(res.data.data || [])
      setTotal(res.data.pagination?.total ?? 0)
    } catch {
      setWarehouses([])
    } finally {
      setIsLoading(false)
    }
  }, [search, page])

  useEffect(() => { loadWarehouses() }, [loadWarehouses])

  const handleDelete = (id: number) => { setConfirmDeleteId(id) }

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    setConfirmDeleteId(null)
    setDeleteId(id)
    try {
      await warehouseService.deleteWarehouse(id)
      loadWarehouses()
    } catch {
      // interceptor handles display
    } finally {
      setDeleteId(null)
    }
  }

  const canCreate = hasPermission(permissions, 'warehouses', 'can_create')
  const canEdit = hasPermission(permissions, 'warehouses', 'can_edit')
  const canDelete = hasPermission(permissions, 'warehouses', 'can_delete')
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">คลังสินค้า</h1>
          <p className="mt-1 text-sm text-gray-500">รายการคลังสินค้าทั้งหมด</p>
        </div>
        {canCreate && (
          <Link
            to="/warehouses/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <PlusIcon />
            สร้างคลังใหม่
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative max-w-sm">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="ค้นหาชื่อคลัง / รหัส"
            value={search}
            onChange={(e) => setParam('search', e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">รหัส</th>
                <th className="px-4 py-3 font-medium text-gray-600">ชื่อคลัง</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">สาขา</th>
                <th className="px-4 py-3 font-medium text-gray-600">ที่อยู่</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">สถานะ</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-gray-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : warehouses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    ไม่พบข้อมูลคลังสินค้า
                  </td>
                </tr>
              ) : (
                warehouses.map((wh) => (
                  <tr
                    key={wh.id}
                    onClick={() => navigate(`/warehouses/${wh.id}`)}
                    className="cursor-pointer hover:bg-blue-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{wh.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{wh.name}</td>
                    <td className="px-4 py-3 text-gray-600">{wh.branch?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{wh.address ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${wh.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {wh.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <ActionIconLink to={`/warehouses/${wh.id}`} title="ดูรายละเอียด" variant="view" />
                        {canEdit && (
                          <ActionIconLink to={`/warehouses/${wh.id}/edit`} title="แก้ไข" variant="edit" />
                        )}
                        {canDelete && (
                          <ActionIconButton
                            onClick={() => handleDelete(wh.id)}
                            title="ลบ"
                            variant="delete"
                            disabled={deleteId === wh.id}
                          />
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
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                ก่อนหน้า
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setParam('page', String(page + 1))}
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        title="ยืนยันการลบ"
        message="คุณต้องการลบคลังสินค้ารายการนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้"
        confirmLabel="ลบ"
        variant="danger"
        isLoading={deleteId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
