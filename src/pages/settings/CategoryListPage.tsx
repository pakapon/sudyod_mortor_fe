import { useState, useEffect } from 'react'
import { hrService } from '@/api/hrService'
import type { ProductCategory, ProductCategoryPayload } from '@/types/hr'
import { cn, getApiErrorMessage } from '@/lib/utils'
import { toast } from 'react-hot-toast'

import { useAuthStore } from '@/stores/authStore'
import { ActionIconButton } from '@/components/ui/ActionIconButton'
import { hasPermission } from '@/lib/permissions'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

type CategoryWithDepth = { cat: ProductCategory; depth: number }

function buildTreeOrder(cats: ProductCategory[]): CategoryWithDepth[] {
  const result: CategoryWithDepth[] = []
  const addNode = (parentId: number | null, depth: number) => {
    cats
      .filter((c) => c.parent_id === parentId)
      .forEach((c) => {
        result.push({ cat: c, depth })
        addNode(c.id, depth + 1)
      })
  }
  addNode(null, 0)
  return result
}

const defaultForm: ProductCategoryPayload = {
  name: '',
  code: '',
  parent_id: null,
  description: '',
  is_active: true,
}

export function CategoryListPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ProductCategory | null>(null)
  const [form, setForm] = useState<ProductCategoryPayload>(defaultForm)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set())
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const { permissions } = useAuthStore()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const res = await hrService.getProductCategories()
      setCategories(res.data.data || [])
    } catch {
      setCategories([])
    } finally {
      setIsLoading(false)
    }
  }

  const openCreate = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setError(null)
    setModalOpen(true)
  }

  const openEdit = (cat: ProductCategory) => {
    setEditTarget(cat)
    setForm({
      name: cat.name,
      code: cat.code || '',
      parent_id: cat.parent_id,
      description: cat.description || '',
      is_active: cat.is_active,
    })
    setError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditTarget(null)
    setForm(defaultForm)
    setError(null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('กรุณากรอกชื่อหมวดสินค้า')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const payload: ProductCategoryPayload = {
        ...form,
        code: form.code?.trim() || undefined,
        description: form.description?.trim() || undefined,
        parent_id: form.parent_id || null,
      }
      if (editTarget) {
        await hrService.updateProductCategory(editTarget.id, payload)
      } else {
        await hrService.createProductCategory(payload)
      }
      closeModal()
      fetchData()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = (id: number) => setDeleteId(id)

  const handleConfirmDelete = async () => {
    if (deleteId === null) return
    try {
      await hrService.deleteProductCategory(deleteId)
      setDeleteId(null)
      fetchData()
      toast.success('ลบหมวดสินค้าสำเร็จ')
    } catch {
      setDeleteId(null)
    }
  }

  const treeRows = buildTreeOrder(categories)

  const hasChildren = (id: number) => categories.some((c) => c.parent_id === id)

  const toggleCollapse = (id: number) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isAncestorCollapsed = (cat: ProductCategory): boolean => {
    if (cat.parent_id === null) return false
    if (collapsedIds.has(cat.parent_id)) return true
    const parent = categories.find((c) => c.id === cat.parent_id)
    return parent ? isAncestorCollapsed(parent) : false
  }

  const filteredRows: CategoryWithDepth[] = (() => {
    if (!search.trim()) {
      return treeRows.filter(({ cat }) => !isAncestorCollapsed(cat))
    }
    const q = search.toLowerCase()
    const matchedIds = new Set(
      categories
        .filter((c) => `${c.name} ${c.code || ''}`.toLowerCase().includes(q))
        .map((c) => c.id),
    )
    // หา matched ancestor ที่ใกล้ที่สุดในสายบรรพบุรุษ
    const nearestMatchedAncestor = (cat: ProductCategory): number | null => {
      if (cat.parent_id === null) return null
      if (matchedIds.has(cat.parent_id)) return cat.parent_id
      const parent = categories.find((c) => c.id === cat.parent_id)
      return parent ? nearestMatchedAncestor(parent) : null
    }
    // ตรวจว่า cat ถูกซ่อนโดย collapse state ในสายระหว่าง matchedAncId → cat
    const isHiddenFromMatchedAncestor = (cat: ProductCategory, matchedAncId: number): boolean => {
      if (cat.parent_id === matchedAncId) return collapsedIds.has(matchedAncId)
      if (cat.parent_id === null) return false
      if (collapsedIds.has(cat.parent_id)) return true
      const parent = categories.find((c) => c.id === cat.parent_id)
      return parent ? isHiddenFromMatchedAncestor(parent, matchedAncId) : false
    }
    return treeRows.filter(({ cat }) => {
      if (matchedIds.has(cat.id)) return true // ตัวที่ match โดยตรง — แสดงเสมอ
      const ancId = nearestMatchedAncestor(cat)
      if (ancId === null) return false // ไม่มี matched ancestor — ไม่แสดง
      return !isHiddenFromMatchedAncestor(cat, ancId) // แสดงถ้ายังไม่ถูก collapse
    })
  })()

  const getParentName = (parentId: number | null) => {
    if (!parentId) return null
    return categories.find((c) => c.id === parentId)?.name || null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการหมวดสินค้า</h1>
          <p className="text-sm text-gray-500">จัดการหมวดหมู่สินค้า รองรับหมวดหลักและหมวดย่อย</p>
        </div>
        {hasPermission(permissions, 'product_categories', 'can_create') && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>เพิ่มหมวดสินค้า</span>
          </button>
        )}
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <div className="relative w-full max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="ค้นหาชื่อ, รหัสหมวดสินค้า..."
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
                <th className="px-6 py-4 font-semibold">ชื่อหมวด / ระดับ</th>
                <th className="px-6 py-4 font-semibold">รหัส</th>
                <th className="px-6 py-4 font-semibold">คำอธิบาย</th>
                <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
                <th className="px-6 py-4 text-right font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    ไม่พบข้อมูลหมวดสินค้า
                  </td>
                </tr>
              ) : (
                filteredRows.map(({ cat, depth }) => (
                  <tr
                    key={cat.id}
                    className="bg-white hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <div
                        className="flex items-start gap-1"
                        style={{ paddingLeft: `${depth * 24}px` }}
                      >
                        {/* toggle button — แสดงเฉพาะแถวหมวดที่มีลูก */}
                        {hasChildren(cat.id) ? (
                          <button
                            onClick={() => toggleCollapse(cat.id)}
                            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                            title={collapsedIds.has(cat.id) ? 'ขยาย' : 'ย่อ'}
                          >
                            <svg
                              className={cn('w-3.5 h-3.5 transition-transform', collapsedIds.has(cat.id) ? '-rotate-90' : 'rotate-0')}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        ) : depth > 0 ? (
                          <svg className="mt-0.5 ml-0.5 w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        ) : (
                          <span className="w-5 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn('font-medium', depth === 0 ? 'text-gray-900' : 'text-gray-700')}>
                              {cat.name}
                            </span>
                            <span
                              className={cn(
                                'inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium border',
                                depth === 0
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : depth === 1
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-gray-100 text-gray-600 border-gray-200',
                              )}
                            >
                              {depth === 0 ? 'หมวดหลัก' : `ระดับ ${depth + 1}`}
                            </span>
                          </div>
                          {depth > 0 && (
                            <p className="mt-0.5 text-xs text-gray-400">
                              ภายใต้: {getParentName(cat.parent_id)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-gray-600 text-sm">{cat.code || '-'}</td>
                    <td className="px-6 py-3.5 text-gray-500 text-sm max-w-xs truncate">{cat.description || '-'}</td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                        cat.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800',
                      )}>
                        {cat.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasPermission(permissions, 'product_categories', 'can_edit') && (
                          <ActionIconButton variant="edit" onClick={() => openEdit(cat)} />
                        )}
                        {hasPermission(permissions, 'product_categories', 'can_delete') && (
                          <ActionIconButton variant="delete" onClick={() => handleDelete(cat.id)} />
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editTarget ? 'แก้ไขหมวดสินค้า' : 'เพิ่มหมวดสินค้าใหม่'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 p-6">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    ชื่อหมวดสินค้า <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="เช่น กรองอากาศ, น้ำมันเครื่อง"
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">รหัสหมวด</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="เช่น AIR, OIL"
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm font-mono text-gray-900 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">หมวดหลัก</label>
                  <select
                    value={form.parent_id ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value ? Number(e.target.value) : null }))}
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                  >
                    <option value="">— ไม่มี (หมวดหลัก) —</option>
                    {buildTreeOrder(categories)
                      .filter(({ cat }) => cat.id !== editTarget?.id)
                      .map(({ cat, depth }) => (
                        <option key={cat.id} value={cat.id}>
                          {'　'.repeat(depth)}{depth > 0 ? '↳ ' : ''}{cat.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">คำอธิบาย</label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="รายละเอียดหมวดสินค้า (ถ้ามี)"
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
              </div>
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
                {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteId !== null}
        title="ยืนยันการลบหมวดสินค้า"
        message="คุณต้องการลบหมวดสินค้านี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถเรียกคืนได้"
        confirmLabel="ลบหมวดสินค้า"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
