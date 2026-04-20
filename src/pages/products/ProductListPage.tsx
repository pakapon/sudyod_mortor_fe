import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { productService } from '@/api/productService'
import type { Product, ProductType } from '@/types/product'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { ActionIconLink, ActionIconButton } from '@/components/ui/ActionIconButton'

const TYPE_LABEL: Record<ProductType, string> = {
  goods: 'สินค้า',
  service: 'บริการ',
}
const TYPE_COLOR: Record<ProductType, string> = {
  goods: 'bg-blue-100 text-blue-700',
  service: 'bg-purple-100 text-purple-700',
}

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
function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

export function ProductListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { permissions } = useAuthStore()

  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const search = searchParams.get('search') ?? ''
  const typeFilter = (searchParams.get('type') ?? '') as ProductType | ''
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

  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await productService.getProducts({
        search: search || undefined,
        type: typeFilter || undefined,
        page,
        limit,
      })
      setProducts(res.data.data || [])
      setTotal(res.data.pagination?.total ?? 0)
    } catch {
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }, [search, typeFilter, page])

  useEffect(() => { loadProducts() }, [loadProducts])

  const handleDelete = async (id: number) => {
    if (!window.confirm('ยืนยันการลบสินค้ารายการนี้?')) return
    setDeleteId(id)
    try {
      await productService.deleteProduct(id)
      loadProducts()
    } catch {
      // interceptor handles display
    } finally {
      setDeleteId(null)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const res = await productService.exportProducts({
        search: search || undefined,
        type: typeFilter || undefined,
      })
      const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]))
      const link = document.createElement('a')
      link.href = url
      link.download = 'products.csv'
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      // interceptor handles display
    } finally {
      setIsExporting(false)
    }
  }

  const canCreate = hasPermission(permissions, 'products', 'can_create')
  const canEdit = hasPermission(permissions, 'products', 'can_edit')
  const canDelete = hasPermission(permissions, 'products', 'can_delete')
  const canExport = hasPermission(permissions, 'products', 'can_export')

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">สินค้า</h1>
          <p className="mt-1 text-sm text-gray-500">รายการสินค้าทั้งหมดในระบบ</p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <DownloadIcon />
              {isExporting ? 'กำลัง Export...' : 'Export CSV'}
            </button>
          )}
          {canCreate && (
            <Link
              to="/products/create"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <PlusIcon />
              สร้างสินค้าใหม่
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="ค้นหา SKU / ชื่อสินค้า"
              value={search}
              onChange={(e) => setParam('search', e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setParam('type', e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">ประเภท (ทั้งหมด)</option>
            <option value="goods">สินค้า</option>
            <option value="service">บริการ</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">SKU</th>
                <th className="px-4 py-3 font-medium text-gray-600">ชื่อสินค้า</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">ประเภท</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">ยี่ห้อ</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">หมวดหมู่</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">ราคาขาย</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">สต็อกรวม</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">สถานะ</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-gray-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    ไม่พบข้อมูลสินค้า
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => navigate(`/products/${product.id}`)}
                    className="cursor-pointer hover:bg-blue-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{product.sku}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLOR[product.type]}`}>
                        {TYPE_LABEL[product.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{product.brand?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{product.category?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {product.selling_price != null
                        ? product.selling_price.toLocaleString('th-TH', { minimumFractionDigits: 2 })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {product.stock_qty != null ? product.stock_qty.toLocaleString('th-TH') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {product.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <ActionIconLink to={`/products/${product.id}`} title="ดูรายละเอียด" variant="view" />
                        {canEdit && (
                          <ActionIconLink to={`/products/${product.id}/edit`} title="แก้ไข" variant="edit" />
                        )}
                        {canDelete && (
                          <ActionIconButton
                            onClick={() => handleDelete(product.id)}
                            title="ลบ"
                            variant="delete"
                            disabled={deleteId === product.id}
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

        {/* Pagination */}
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
    </div>
  )
}
