import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { hrService } from '@/api/hrService'
import type { FinanceCompany } from '@/types/hr'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { ActionIconLink, ActionIconButton } from '@/components/ui/ActionIconButton'

export function FinanceCompanyListPage() {
  const [companies, setCompanies] = useState<FinanceCompany[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { permissions } = useAuthStore()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const res = await hrService.getFinanceCompanies()
      setCompanies(res.data.data || [])
    } catch {
      setCompanies([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = (id: number) => {
    if (confirm('คุณต้องการลบบริษัทไฟแนนซ์นี้ใช่หรือไม่?')) {
      hrService.deleteFinanceCompany(id).then(() => fetchData())
    }
  }

  const filteredCompanies = companies.filter((c) =>
    `${c.name} ${c.contact_name || ''} ${c.phone || ''}`.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการบริษัทไฟแนนซ์</h1>
          <p className="text-sm text-gray-500">จัดการข้อมูลบริษัทไฟแนนซ์คู่ค้า</p>
        </div>
        {hasPermission(permissions, 'finance_companies', 'can_create') && (
          <Link
            to="/settings/finance-companies/create"
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>เพิ่มบริษัทไฟแนนซ์</span>
          </Link>
        )}
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
              placeholder="ค้นหาชื่อบริษัท, ผู้ติดต่อ..."
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
                <th className="px-6 py-4 font-semibold">ชื่อบริษัท</th>
                <th className="px-6 py-4 font-semibold">ผู้ติดต่อ</th>
                <th className="px-6 py-4 font-semibold">เบอร์โทร</th>
                <th className="px-6 py-4 font-semibold">ที่อยู่</th>
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
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    ไม่พบข้อมูลบริษัทไฟแนนซ์
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-900">{company.name}</td>
                    <td className="px-6 py-4 text-gray-600">{company.contact_name || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{company.phone || '-'}</td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{company.address || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                        company.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800',
                      )}>
                        {company.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasPermission(permissions, 'finance_companies', 'can_edit') && (
                          <ActionIconLink variant="edit" to={`/settings/finance-companies/${company.id}/edit`} />
                        )}
                        {hasPermission(permissions, 'finance_companies', 'can_delete') && (
                          <ActionIconButton variant="delete" onClick={() => handleDelete(company.id)} />
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
    </div>
  )
}
