import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { hrService } from '@/api/hrService'
import type { Vendor } from '@/types/hr'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { ActionIconLink, ActionIconButton } from '@/components/ui/ActionIconButton'

export function VendorListPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<string>('')
  const { permissions } = useAuthStore()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const res = await hrService.getVendors()
      setVendors(res.data.data || [])
    } catch {
      setVendors([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`คุณต้องการลบ Supplier "${name}" ใช่หรือไม่?`)) return
    try {
      await hrService.deleteVendor(id)
      fetchData()
    } catch {
      alert('ไม่สามารถลบได้ อาจมีเอกสารที่ใช้ Supplier นี้อยู่')
    }
  }

  const filtered = vendors.filter((v) => {
    const matchSearch = search
      ? `${v.name} ${v.code || ''} ${v.contact_name || ''} ${v.tax_id || ''}`.toLowerCase().includes(search.toLowerCase())
      : true
    const matchActive =
      filterActive === 'true' ? v.is_active :
      filterActive === 'false' ? !v.is_active :
      true
    return matchSearch && matchActive
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการ Supplier</h1>
          <p className="text-sm text-gray-500">จัดการข้อมูลผู้จำหน่ายสินค้าและบริการ</p>
        </div>
        {hasPermission(permissions, 'vendors', 'can_create') && (
          <Link
            to="/settings/vendors/create"
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>เพิ่ม Supplier</span>
          </Link>
        )}
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="ค้นหาชื่อ, รหัส, ผู้ติดต่อ, เลขภาษี..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pl-10 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
            />
          </div>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
          >
            <option value="">ทุกสถานะ</option>
            <option value="true">ใช้งาน</option>
            <option value="false">ปิดใช้งาน</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700">
              <tr>
                <th className="px-6 py-4 font-semibold">ชื่อ Supplier</th>
                <th className="px-6 py-4 font-semibold">รหัส</th>
                <th className="px-6 py-4 font-semibold">ผู้ติดต่อ</th>
                <th className="px-6 py-4 font-semibold">เลขผู้เสียภาษี</th>
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
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    ไม่พบข้อมูล Supplier
                  </td>
                </tr>
              ) : (
                filtered.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{vendor.name}</div>
                      {vendor.email && (
                        <div className="text-xs text-gray-400">{vendor.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600">{vendor.code || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{vendor.contact_name || '-'}</td>
                    <td className="px-6 py-4 font-mono text-gray-600">{vendor.tax_id || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                        vendor.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800',
                      )}>
                        {vendor.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasPermission(permissions, 'vendors', 'can_edit') && (
                          <ActionIconLink variant="edit" to={`/settings/vendors/${vendor.id}/edit`} />
                        )}
                        {hasPermission(permissions, 'vendors', 'can_delete') && (
                          <ActionIconButton variant="delete" onClick={() => handleDelete(vendor.id, vendor.name)} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!isLoading && (
          <div className="border-t border-gray-100 px-6 py-3 text-xs text-gray-500">
            แสดง {filtered.length} รายการ จากทั้งหมด {vendors.length} รายการ
          </div>
        )}
      </div>
    </div>
  )
}
