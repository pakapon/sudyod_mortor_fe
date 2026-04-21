import { useState, useEffect, useRef } from 'react'
import { cn, sortRows } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { ActionIconButton } from '@/components/ui/ActionIconButton'
import { hrService } from '@/api/hrService'
import type { ProductUnit, ProductUnitPayload } from '@/types/hr'

// ─── Alias types for clarity ─────────────────────────────────────────────────
type ProductAttribute = ProductUnit
type ProductAttributePayload = ProductUnitPayload

const defaultForm: ProductAttributePayload = { name: '', abbreviation: '', is_active: true }

// ─── Component ───────────────────────────────────────────────────────────────

export function ProductAttributeOptionsPage() {
  const [items, setItems] = useState<ProductAttribute[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ProductAttribute | null>(null)
  const [form, setForm] = useState<ProductAttributePayload>(defaultForm)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const { permissions } = useAuthStore()
  const inputRef = useRef<HTMLInputElement>(null)

  const canCreate = hasPermission(permissions, 'products', 'can_create')
  const canEdit = hasPermission(permissions, 'products', 'can_edit')
  const canDelete = hasPermission(permissions, 'products', 'can_delete')

  const handleSort = (key: string) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setIsLoading(true)
    try {
      const res = await hrService.getProductUnits()
      setItems(Array.isArray(res.data.data) ? res.data.data : [])
    } catch {
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // ── Modal helpers ───────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setError(null)
    setModalOpen(true)
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  const openEdit = (item: ProductAttribute) => {
    setEditTarget(item)
    setForm({ name: item.name, abbreviation: item.abbreviation ?? '', is_active: item.is_active })
    setError(null)
    setModalOpen(true)
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditTarget(null)
    setForm(defaultForm)
    setError(null)
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { setError('กรุณากรอกชื่อแบบสินค้า'); return }
    setIsSaving(true)
    setError(null)
    try {
      if (editTarget) {
        await hrService.updateProductUnit(editTarget.id, form)
      } else {
        await hrService.createProductUnit(form)
      }
      closeModal()
      fetchData()
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!confirm('ต้องการลบแบบสินค้านี้ใช่หรือไม่?')) return
    setDeletingId(id)
    try {
      await hrService.deleteProductUnit(id)
      fetchData()
    } catch { /* interceptor handles toast */ } finally {
      setDeletingId(null)
    }
  }

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const filtered = sortRows(
    items.filter((i) =>
      `${i.name} ${i.abbreviation ?? ''}`.toLowerCase().includes(search.toLowerCase()),
    ),
    sortKey,
    sortDir,
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">แบบสินค้า</h1>
          <p className="text-sm text-gray-500">
            ตัวเลือกแบบสินค้าในระบบ เช่น สี, ไซต์, CC, ตัว, อัน, แท่ง
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            เพิ่มแบบสินค้า
          </button>
        )}
      </div>

      {/* ── Table Card ── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Search bar */}
        <div className="border-b border-gray-100 p-4">
          <div className="relative w-full max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="ค้นหาชื่อแบบสินค้า..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700">
              <tr>
                <th className="w-12 px-5 py-4 font-semibold text-center">#</th>
                <SortableHeader label="ชื่อแบบสินค้า" sortKey="name" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="ตัวย่อ" sortKey="abbreviation" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
                <th className="px-6 py-4 text-right font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      กำลังโหลด...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                      <p className="text-sm">
                        {search ? `ไม่พบแบบสินค้าที่ค้นหา "${search}"` : 'ยังไม่มีแบบสินค้าในระบบ'}
                      </p>
                      {!search && canCreate && (
                        <button
                          onClick={openCreate}
                          className="mt-1 text-sm font-medium text-red-600 hover:underline"
                        >
                          + เพิ่มแบบสินค้าแรก
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={item.id} className={cn('hover:bg-gray-50/60 transition-colors', deletingId === item.id && 'opacity-50')}>
                    <td className="px-5 py-4 text-center text-xs text-gray-400">{idx + 1}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-gray-500 font-mono">{item.abbreviation || <span className="text-gray-300 italic">—</span>}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                        item.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500',
                      )}>
                        {item.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && <ActionIconButton variant="edit" onClick={() => openEdit(item)} />}
                        {canDelete && (
                          <ActionIconButton
                            variant="delete"
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
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

        {/* Footer count */}
        {!isLoading && filtered.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-3 text-xs text-gray-400">
            แสดง {filtered.length} รายการ{search ? ` (ค้นหา "${search}")` : ''}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editTarget ? 'แก้ไขแบบสินค้า' : 'เพิ่มแบบสินค้าใหม่'}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-4 p-6">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  ชื่อแบบสินค้า <span className="text-red-500">*</span>
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder="เช่น สี, ไซต์, CC, ตัว, อัน, แท่ง"
                  className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* Abbreviation */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  ตัวย่อ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={(form as ProductUnitPayload).abbreviation ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, abbreviation: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder="เช่น color, size, cc, pcs"
                  className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm font-mono text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* Toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.is_active}
                  onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    form.is_active ? 'bg-red-600' : 'bg-gray-200',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                      form.is_active ? 'translate-x-6' : 'translate-x-1',
                    )}
                  />
                </button>
                <span className="text-sm text-gray-700">
                  {form.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                </span>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {isSaving ? 'กำลังบันทึก...' : editTarget ? 'บันทึกการแก้ไข' : 'เพิ่มแบบสินค้า'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
