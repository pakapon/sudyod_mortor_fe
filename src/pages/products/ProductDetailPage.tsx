import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { productService } from '@/api/productService'
import type {
  Product,
  ProductImage,
  BOMItem,
  ProductVariant,
  AttributeOption,
  ProductCompatibility,
} from '@/types/product'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

type BottomTabKey = 'sku' | 'bundle' | 'spare'

const BOTTOM_TABS: { key: BottomTabKey; label: string }[] = [
  { key: 'sku', label: 'รหัสสินค้า/แบบสินค้า' },
  { key: 'bundle', label: 'ชุดอะไหล่' },
  { key: 'spare', label: 'อะไหล่' },
]

// ─── Icons ───────────────────────────────────────────────────────────────────
function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
function EditIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
function TrashIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function SortIcon() {
  return (
    <svg className="inline ml-1 opacity-40" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
    </svg>
  )
}

// ─── Field display component ────────────────────────────────────────────────
function Field({ label, value, className }: { label: string; value?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-xs text-gray-500">{label}</span>
      <div className="min-h-[36px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 flex items-center">
        {value != null && value !== '' ? value : <span className="text-gray-400">—</span>}
      </div>
    </div>
  )
}

// ─── Info Panel ──────────────────────────────────────────────────────────────
function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</p>
      <div className="space-y-1.5 text-sm text-gray-700">{children}</div>
    </div>
  )
}
function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex gap-1.5">
      <span className="text-gray-500 shrink-0">{label}:</span>
      <span className="font-medium">{value ?? '—'}</span>
    </div>
  )
}

// ─── SKU Tab (View) ─────────────────────────────────────────────────────────
function SkuTabView({ productId, product }: { productId: number; product: Product }) {
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [attrOptions, setAttrOptions] = useState<AttributeOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      productService.getProductVariants(productId),
      productService.getProductAttributeOptions(productId),
    ])
      .then(([vRes, aRes]) => {
        setVariants(Array.isArray(vRes.data.data) ? vRes.data.data : [])
        setAttrOptions(Array.isArray(aRes.data.data) ? aRes.data.data : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [productId])

  // Build attribute label map: axis → label
  const axisLabels: Record<number, string> = {}
  for (const o of attrOptions) {
    if (o.label && !axisLabels[o.axis]) axisLabels[o.axis] = o.label
  }

  // Format attributes string: "Size=S / สี=ขาว"

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-gray-100" />
        <div className="h-40 rounded-xl bg-gray-100" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Variants Table ── */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-800">รายการรหัสสินค้า</h3>

        {variants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
            ยังไม่มีรหัสสินค้า/แบบสินค้า
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-500">รหัสสินค้า</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-500">ชื่อสินค้า <SortIcon /></th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-500">คุณลักษณะสินค้า</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-500">บาร์โค้ด (หลัก/รอง)</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-500">หน่วย</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-gray-500">ล็อต /วันหมดอายุ</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-gray-500">หมายเลขซีเรียล</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-gray-500">ขั้นต่ำ / จุดสั่งซื้อซ้ำ</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-500">มิติการขนส่งมาตรฐาน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variants.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-medium text-gray-800">{v.sku}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{v.name}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{v.description || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                      {[v.barcode, v.barcode_secondary].filter(Boolean).join(' / ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{v.unit?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {v.track_lot_expiry
                        ? <span className="text-blue-600"><CheckIcon /></span>
                        : <span className="text-gray-300">–</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {v.track_serial
                        ? <span className="text-blue-600"><CheckIcon /></span>
                        : <span className="text-gray-300">–</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 tabular-nums">
                      {v.min_stock != null || v.reorder_point != null
                        ? `${v.min_stock ?? 0} / ${v.reorder_point ?? 0}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {[
                        (v.dimension_width != null || v.dimension_height != null || v.dimension_length != null)
                          ? `${v.dimension_width ?? 0}×${v.dimension_height ?? 0}×${v.dimension_length ?? 0} ซม.`
                          : (v.dimensions ?? null),
                        v.weight_kg != null ? `${v.weight_kg}kg` : null,
                      ].filter(Boolean).join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Info Panels ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoPanel title="หน่วย & บรรจุภัณฑ์">
          <InfoRow label="หน่วยหลัก" value={product.base_unit?.name ?? product.unit?.name} />
          <InfoRow label="น้ำหนัก" value={product.weight_grams != null ? `${product.weight_grams} กรัม` : undefined} />
          <InfoRow
            label="ขนาดสินค้า"
            value={
              product.width_cm && product.height_cm && product.length_cm
                ? `${product.width_cm} × ${product.height_cm} × ${product.length_cm} ซม.`
                : undefined
            }
          />
        </InfoPanel>

        <InfoPanel title="การติดตามสินค้า">
          {variants.length === 0 ? (
            <p className="text-gray-400 text-xs">ยังไม่มีรหัสสินค้า</p>
          ) : (
            <>
              <InfoRow
                label="Lot/EXP"
                value={
                  variants.some((v) => v.track_lot_expiry)
                    ? 'On (บังคับ MFG/EXP ตอนรับเข้า)'
                    : 'Off'
                }
              />
              <InfoRow
                label="Serial/IMEI"
                value={
                  variants.some((v) => v.track_serial)
                    ? 'On (เปิดแล้วต้องระบุก่อนขาย)'
                    : 'Off (เปิดแล้วต้องระบุก่อนขาย)'
                }
              />
            </>
          )}
        </InfoPanel>

        <InfoPanel title="นโยบายสต็อก">
          <p className="text-gray-600 text-xs leading-relaxed">
            Min / Reorder Point (ROP) ต่อ SKU<br />
            สามารถ override รายคลัง (Warehouse-level)
          </p>
        </InfoPanel>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// Main ProductDetailPage (view-only)
// ══════════════════════════════════════════════════════════════════
export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { permissions } = useAuthStore()

  const [activeTab, setActiveTab] = useState<BottomTabKey>('sku')
  const [product, setProduct] = useState<Product | null>(null)
  const [images, setImages] = useState<ProductImage[]>([])
  const [bom, setBom] = useState<BOMItem[]>([])
  const [compatibility, setCompatibility] = useState<ProductCompatibility[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const productId = Number(id)
  const canEdit = hasPermission(permissions, 'products', 'can_edit')
  const canDelete = hasPermission(permissions, 'products', 'can_delete')

  useEffect(() => {
    if (!productId) return
    setIsLoading(true)
    productService.getProduct(productId)
      .then((res) => setProduct(res.data.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [productId])

  useEffect(() => {
    if (!productId) return
    productService.getProductImages(productId)
      .then((res) => setImages(Array.isArray(res.data.data) ? res.data.data : []))
      .catch(() => {})
  }, [productId])

  useEffect(() => {
    if (!productId) return
    if (activeTab === 'bundle') {
      productService.getProductBOM(productId)
        .then((res) => setBom(Array.isArray(res.data.data) ? res.data.data : []))
        .catch(() => {})
    }
    if (activeTab === 'spare') {
      productService.getProductCompatibility(productId)
        .then((res) => setCompatibility(Array.isArray(res.data.data) ? res.data.data : []))
        .catch(() => {})
    }
  }, [activeTab, productId])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await productService.deleteProduct(productId)
      navigate('/products')
    } catch { /* interceptor handles */ }
    finally { setIsDeleting(false); setDeleteConfirmOpen(false) }
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-7 w-48 rounded bg-gray-100" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-gray-100" />
            ))}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <div className="h-44 rounded-xl bg-gray-100" />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-square rounded-lg bg-gray-100" />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg">ไม่พบข้อมูลสินค้า</p>
        <Link to="/products" className="mt-4 text-sm text-blue-600 hover:underline">กลับไปรายการสินค้า</Link>
      </div>
    )
  }

  const tags = Array.isArray(product.tags) ? product.tags.map((t) => (typeof t === 'string' ? t : t.name)) : []
  const mainImage = images[0]
  const galleryImages = images.slice(1, 7)
  const sellingPrice = product.selling_price ?? product.pricing?.selling_price ?? product.pricing_tiers?.[0]?.selling_price

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/products" className="text-gray-400 hover:text-gray-600"><ChevronLeftIcon /></Link>
          <h1 className="text-xl font-semibold text-gray-900">ผลิตภัณฑ์ & SKU</h1>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Link
              to={`/products/${productId}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <EditIcon size={14} /> แก้ไข
            </Link>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <TrashIcon size={14} /> ลบ
            </button>
          )}
        </div>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">

        {/* ====== LEFT: Product Info Card (view-only) ====== */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-gray-900">รายละเอียดสินค้า</h2>

          <div className="grid grid-cols-2 gap-4">
            <Field label="รหัสสินค้า" value={product.sku} />
            <Field label="ชื่อสินค้า" value={product.name} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <Field label="ยี่ห้อ" value={product.brand?.name} />
            <Field label="หมวดหมู่" value={product.category?.name} />
            <Field label="ประเภทสินค้า" value={product.product_type === 'standard' ? 'สินค้า (Standard)' : product.product_type === 'service' ? 'บริการ' : product.product_type ?? '—'} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <Field label="ผู้จำหน่าย (หลัก)" value={product.vendor?.name} />
            <Field label="นโยบายภาษี (VAT Code)" value={product.vat_code} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">แท็ก / คำค้นหา</span>
              <div className="min-h-[36px] rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 flex flex-wrap gap-1.5 items-center">
                {tags.length === 0 ? (
                  <span className="text-sm text-gray-400">—</span>
                ) : (
                  tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {tag}
                    </span>
                  ))
                )}
              </div>
            </div>
            <Field
              label="สถานะ"
              value={
                <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                  {product.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                </span>
              }
            />
          </div>

          <div className="mt-4">
            <Field
              label="ราคา"
              value={sellingPrice != null ? `฿${Number(sellingPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : undefined}
            />
          </div>

          <div className="mt-4 grid grid-cols-4 gap-4">
            <Field label="น้ำหนัก (กรัม)" value={product.weight_grams != null ? String(product.weight_grams) : undefined} />
            <Field label="ความสูง (ซม.)" value={product.height_cm != null ? String(product.height_cm) : undefined} />
            <Field label="ความกว้าง (ซม.)" value={product.width_cm != null ? String(product.width_cm) : undefined} />
            <Field label="ความยาว (ซม.)" value={product.length_cm != null ? String(product.length_cm) : undefined} />
          </div>

          <div className="mt-4">
            <span className="text-xs text-gray-500">คำอธิบาย/คุณสมบัติของสินค้า</span>
            <div className="mt-1 min-h-[100px] rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">
              {product.description || <span className="text-gray-400">—</span>}
            </div>
          </div>
        </div>

        {/* ====== RIGHT: Images Card (view-only — no delete) ====== */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-gray-900">รูปภาพ</h2>

          <p className="mb-2 text-xs text-gray-500">รูปภาพหลัก</p>
          <div className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
            {mainImage ? (
              <img src={mainImage.image_url} alt="" className="h-48 w-full object-cover rounded-xl" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-gray-300">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="text-sm">ไม่มีรูปภาพ</span>
              </div>
            )}
          </div>

          <p className="mb-2 text-xs text-gray-500">คลังภาพ</p>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => {
              const img = galleryImages[i]
              return (
                <div key={i} className="aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  {img ? (
                    <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ====== Bottom Tabs Section ====== */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex px-4">
            {BOTTOM_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'border-b-2 px-5 py-3.5 text-sm font-medium transition-colors',
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700',
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-5">

          {/* Tab: รหัสสินค้า/แบบสินค้า */}
          {activeTab === 'sku' && (
            <SkuTabView productId={productId} product={product} />
          )}

          {/* Tab: ชุดอะไหล่ (BOM) */}
          {activeTab === 'bundle' && (
            bom.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
                ยังไม่มีชุดอะไหล่
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Parent SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Component SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">ชื่อชิ้นส่วน</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">จำนวน</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">หน่วย</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">นโยบาย</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bom.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs font-medium text-gray-800">{item.parent_variant?.sku ?? '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.child_variant?.sku ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-900">{item.child_variant?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">{Number(item.quantity).toLocaleString('th-TH')}</td>
                        <td className="px-4 py-3 text-gray-600">{item.child_variant?.unit?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {item.parent_variant?.bom_stock_policy === 'auto' ? 'ตัดสต็อกอัตโนมัติ'
                            : item.parent_variant?.bom_stock_policy === 'manual' ? 'ไม่ตัดสต็อก' : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Tab: อะไหล่ */}
          {activeTab === 'spare' && (
            compatibility.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center">
                <p className="text-sm text-gray-400">ยังไม่มีข้อมูลรุ่นรถที่รองรับ</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['รหัสสินค้า', 'รหัสรถ', 'ชื่อยานพาหนะ', 'รุ่น (MODEL)', 'ปีเริ่มผลิต', 'ปีสิ้นสุด', 'เงื่อนไข'].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {compatibility.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5 font-mono text-xs text-blue-600">{product?.sku ?? '-'}</td>
                        <td className="px-3 py-2.5 font-mono text-xs font-medium text-gray-800">{item.vehicle_code}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-700">{item.vehicle_name}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{item.model ?? '-'}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{item.year_start ?? '-'}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{item.year_end ?? '-'}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{item.note ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="ยืนยันการลบสินค้า"
        message="คุณต้องการลบสินค้านี้ออกจากระบบใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้"
        confirmLabel="ลบสินค้า"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  )
}
