import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { inventoryService } from '@/api/inventoryService'
import { customerService } from '@/api/customerService'
import { invoiceService } from '@/api/invoiceService'
import { useAuthStore } from '@/stores/authStore'
import { DocumentOutputModal } from '@/components/ui/DocumentOutputModal'
import { jsPDF } from 'jspdf'
import { Eye, Download, Link2 } from 'lucide-react'
import { drawBillingDocCanvas } from '@/lib/documentRenderers'
import type { InventoryItem } from '@/types/inventory'
import type { Invoice } from '@/types/invoice'

/* ─── POS Product (variant-level) ─── */
interface Product {
  id: number              // variant id (cart key)
  productId: number       // parent product id (for invoice payload)
  sku: string
  name: string
  imageUrl?: string
  price: number
  stock: number
  unit: string
  barcode?: string | null
}

function toPosProduct(inv: InventoryItem): Product {
  const v = inv.variant
  const p = inv.product
  return {
    id: inv.product_variant_id,
    productId: inv.product_id,
    sku: v?.sku ?? p?.sku ?? '',
    name: v?.name ?? p?.name ?? '',
    imageUrl: p?.images?.[0]?.image_url,
    price: Number(v?.selling_price ?? 0),
    stock: Number(inv.quantity ?? 0),
    unit: p?.unit?.name ?? 'ชิ้น',
    barcode: v?.barcode ?? null,
  }
}

/* ─── Cart Item ─── */
interface CartItem extends Product {
  qty: number
}

/* ─── Icons ─── */
function BarcodeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5v14" /><path d="M8 5v14" /><path d="M12 5v14" /><path d="M17 5v14" /><path d="M21 5v14" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function formatDateTime(value?: string): string {
  if (!value) return new Date().toLocaleDateString('th-TH')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}


const crc32Table = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    c = crc32Table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function writeUint32LE(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true)
}

function writeUint16LE(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value & 0xffff, true)
}

async function buildSingleFileZip(fileName: string, fileBlob: Blob): Promise<Blob> {
  const fileBytes = new Uint8Array(await fileBlob.arrayBuffer())
  const fileNameBytes = new TextEncoder().encode(fileName)
  const fileCrc32 = crc32(fileBytes)

  const localHeaderSize = 30 + fileNameBytes.length
  const centralHeaderSize = 46 + fileNameBytes.length
  const eocdSize = 22
  const totalSize = localHeaderSize + fileBytes.length + centralHeaderSize + eocdSize

  const out = new Uint8Array(totalSize)
  const view = new DataView(out.buffer)
  let offset = 0

  writeUint32LE(view, offset, 0x04034b50); offset += 4
  writeUint16LE(view, offset, 20); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint32LE(view, offset, fileCrc32); offset += 4
  writeUint32LE(view, offset, fileBytes.length); offset += 4
  writeUint32LE(view, offset, fileBytes.length); offset += 4
  writeUint16LE(view, offset, fileNameBytes.length); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  out.set(fileNameBytes, offset); offset += fileNameBytes.length
  out.set(fileBytes, offset); offset += fileBytes.length

  const centralDirectoryOffset = offset

  writeUint32LE(view, offset, 0x02014b50); offset += 4
  writeUint16LE(view, offset, 20); offset += 2
  writeUint16LE(view, offset, 20); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint32LE(view, offset, fileCrc32); offset += 4
  writeUint32LE(view, offset, fileBytes.length); offset += 4
  writeUint32LE(view, offset, fileBytes.length); offset += 4
  writeUint16LE(view, offset, fileNameBytes.length); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint32LE(view, offset, 0); offset += 4
  writeUint32LE(view, offset, 0); offset += 4
  out.set(fileNameBytes, offset); offset += fileNameBytes.length

  writeUint32LE(view, offset, 0x06054b50); offset += 4
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 0); offset += 2
  writeUint16LE(view, offset, 1); offset += 2
  writeUint16LE(view, offset, 1); offset += 2
  writeUint32LE(view, offset, centralHeaderSize); offset += 4
  writeUint32LE(view, offset, centralDirectoryOffset); offset += 4
  writeUint16LE(view, offset, 0)

  return new Blob([out], { type: 'application/zip' })
}

/* ─── Main POS Page ─── */
export function RetailPosPage() {
  const navigate = useNavigate()
  const { employee } = useAuthStore()
  const barcodeRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerName, setCustomerName] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'credit_card'>('cash')
  const [showCheckout, setShowCheckout] = useState(false)
  const [amountReceived, setAmountReceived] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isDocModalOpen, setIsDocModalOpen] = useState(false)
  const [slipImageUrl, setSlipImageUrl] = useState<string | null>(null)
  const [slipPdfBlob, setSlipPdfBlob] = useState<Blob | null>(null)
  const [slipPdfUrl, setSlipPdfUrl] = useState<string | null>(null)
  const [slipDocNo, setSlipDocNo] = useState('')

  // Focus barcode input on mount
  useEffect(() => {
    barcodeRef.current?.focus()
  }, [])

  useEffect(() => {
    return () => {
      if (slipImageUrl) URL.revokeObjectURL(slipImageUrl)
      if (slipPdfUrl) URL.revokeObjectURL(slipPdfUrl)
    }
  }, [slipImageUrl, slipPdfUrl])

  // Fetch inventory items (variant-level, debounced search)
  useEffect(() => {
    let cancelled = false
    setProductsLoading(true)
    const t = setTimeout(() => {
      inventoryService
        .getInventory({ search: search || undefined, limit: 24, branch_id: employee?.branch_id })
        .then((r) => {
          if (cancelled) return
          const list = (r.data.data ?? []).map(toPosProduct)
          setProducts(list)
        })
        .catch(() => { if (!cancelled) setProducts([]) })
        .finally(() => { if (!cancelled) setProductsLoading(false) })
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [search])

  // Search products (already filtered server-side)
  const filteredProducts = products

  // Add to cart
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === product.id)
      if (existing) {
        return prev.map((c) => c.id === product.id ? { ...c, qty: c.qty + 1 } : c)
      }
      return [...prev, { ...product, qty: 1 }]
    })
    setSearch('')
    barcodeRef.current?.focus()
  }

  // Handle barcode scan (match variant by barcode/SKU server-side)
  const handleBarcodeScan = async (value: string) => {
    try {
      const res = await inventoryService.getInventory({ search: value, limit: 1, branch_id: employee?.branch_id })
      const first = (res.data.data ?? [])[0]
      if (first) addToCart(toPosProduct(first))
    } catch {
      // ignore
    }
  }

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim()) {
      handleBarcodeScan(search.trim())
    }
  }

  // Cart operations
  const updateQty = (id: number, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.id !== id))
    } else {
      setCart((prev) => prev.map((c) => c.id === id ? { ...c, qty } : c))
    }
  }

  const removeItem = (id: number) => setCart((prev) => prev.filter((c) => c.id !== id))
  const clearCart = () => setCart([])

  // Totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const vat = Math.round(subtotal * 0.07)
  const total = subtotal + vat
  const change = amountReceived ? Number(amountReceived) - total : 0
  const amountReceivedNumber = Number(amountReceived || 0)
  const normalizeMoney = (value: number) => Math.max(0, Math.round(value * 100) / 100)

  const setCashReceived = (value: number) => {
    setAmountReceived(String(normalizeMoney(value)))
  }

  const addCashReceived = (delta: number) => {
    setCashReceived(amountReceivedNumber + delta)
  }

  const cashQuickOptions = Array.from(new Set([
    total,
    Math.ceil(total / 100) * 100,
    Math.ceil(total / 500) * 500,
    Math.ceil(total / 1000) * 1000,
  ])).filter((v) => Number.isFinite(v) && v > 0)

  const buildReceiptDocument = async (invoiceId: number) => {
    const res = await invoiceService.getInvoice(invoiceId)
    const invoice = (res.data.data ?? res.data) as Invoice
    const canvas = document.createElement('canvas')
    canvas.width = 1240
    canvas.height = 1754
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('สร้างภาพเอกสารไม่สำเร็จ')

    const items = (invoice.items ?? []).map((item) => {
      const it = item as typeof item & { total?: number | string; product?: { name?: string } }
      return {
        name: it.description || it.product?.name || '-',
        qty: toNumber(it.quantity, 0),
        unit_price: toNumber(it.unit_price, 0),
        discount: toNumber(it.discount ?? 0, 0),
        subtotal: toNumber(it.subtotal ?? it.total ?? toNumber(it.quantity, 0) * toNumber(it.unit_price, 0), 0),
      }
    })

    const custName = invoice.customer
      ? (invoice.customer.type === 'corporate'
          ? invoice.customer.company_name
          : [invoice.customer.first_name, invoice.customer.last_name].filter(Boolean).join(' '))
      : customerName ?? undefined

    drawBillingDocCanvas(ctx, 1240, 1754, {
      docTitle: 'ใบกำกับภาษี/ใบเสร็จรับเงิน',
      docNo: (invoice as Invoice & { receipt_no?: string }).receipt_no || invoice.invoice_no || '-',
      docDate: formatDateTime(invoice.updated_at ?? invoice.created_at),
      branch: {
        name: invoice.branch?.name ?? employee?.branch?.name ?? '-',
        address: invoice.branch?.address ?? '',
        phone: invoice.branch?.phone ?? '',
        tax_id: invoice.branch?.tax_id ?? '',
      },
      customerName: custName,
      items,
      subtotal: toNumber(invoice.subtotal),
      vatPercent: toNumber(invoice.vat_percent, 7),
      vatAmount: toNumber(invoice.vat_amount),
      grandTotal: toNumber(invoice.grand_total),
      sigLeftLabel: 'ผู้รับเงิน',
      sigRightLabel: 'ผู้รับสินค้า/ผู้ชำระเงิน',
      payment: { method: paymentMethod, amount: toNumber(invoice.grand_total) },
    })

    const imageBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('สร้างไฟล์รูปไม่สำเร็จ'))
          return
        }
        resolve(blob)
      }, 'image/png', 1)
    })

    const imageDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(new Error('แปลงเอกสารเป็น PDF ไม่สำเร็จ'))
      reader.readAsDataURL(imageBlob)
    })

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    pdf.addImage(imageDataUrl, 'PNG', 0, 0, pageW, pageH, undefined, 'FAST')
    const pdfBlob = pdf.output('blob')

    if (slipImageUrl) URL.revokeObjectURL(slipImageUrl)
    if (slipPdfUrl) URL.revokeObjectURL(slipPdfUrl)

    const nextImageUrl = URL.createObjectURL(imageBlob)
    const nextPdfUrl = URL.createObjectURL(pdfBlob)
    setSlipDocNo((invoice as Invoice & { receipt_no?: string }).receipt_no || invoice.invoice_no || `INV-${invoiceId}`)
    setSlipImageUrl(nextImageUrl)
    setSlipPdfBlob(pdfBlob)
    setSlipPdfUrl(nextPdfUrl)
    setIsDocModalOpen(true)
  }

  const handleViewSlip = () => {
    if (!slipImageUrl) return
    window.open(slipImageUrl, '_blank', 'noopener,noreferrer')
  }

  const handleDownloadZip = async () => {
    try {
      if (!slipPdfBlob) return
      const zipBlob = await buildSingleFileZip(`${slipDocNo || 'receipt'}.pdf`, slipPdfBlob)
      const zipUrl = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = zipUrl
      a.download = `${slipDocNo || 'receipt'}.zip`
      a.click()
      URL.revokeObjectURL(zipUrl)
      toast.success('ดาวน์โหลด ZIP เรียบร้อย')
    } catch {
      toast.error('ดาวน์โหลด ZIP ไม่สำเร็จ')
    }
  }

  const handleCopyImageLink = async () => {
    if (!slipImageUrl) return
    try {
      await navigator.clipboard.writeText(slipImageUrl)
      toast.success('คัดลอกลิงก์รูปแล้ว')
    } catch {
      toast.error('คัดลอกลิงก์ไม่สำเร็จ')
    }
  }

  const handleCopyPdfLink = async () => {
    if (!slipPdfUrl) return
    try {
      await navigator.clipboard.writeText(slipPdfUrl)
      toast.success('คัดลอกลิงก์ PDF แล้ว')
    } catch {
      toast.error('คัดลอกลิงก์ไม่สำเร็จ')
    }
  }

  // Lookup customer by phone
  const lookupCustomer = async () => {
    if (!customerPhone.trim()) {
      setCustomerName(null)
      setCustomerId(null)
      return
    }
    try {
      const res = await customerService.getCustomers({ search: customerPhone.trim(), limit: 1 })
      const c = (res.data.data ?? [])[0]
      if (c) {
        setCustomerId(c.id)
        const name = c.type === 'corporate'
          ? (c.company_name ?? '')
          : `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim()
        setCustomerName(name || null)
      } else {
        setCustomerName(null)
        setCustomerId(null)
      }
    } catch {
      setCustomerName(null)
      setCustomerId(null)
    }
  }

  return (
    <>
    <div className="flex h-[calc(100vh-7rem)] gap-4 print:hidden">
      {/* LEFT — Product Search */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
        {/* Search Bar */}
        <div className="border-b border-gray-100 p-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <BarcodeIcon />
              </span>
              <input
                ref={barcodeRef}
                type="text"
                placeholder="ยิงบาร์โค้ด หรือ พิมพ์ชื่อ/รหัสสินค้า..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <button
              onClick={() => navigate('/billing')}
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              ← กลับ
            </button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {productsLoading && (
            <div className="py-2 text-center text-xs text-gray-400">กำลังโหลด...</div>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="group flex flex-col items-start rounded-lg border border-gray-100 bg-white p-3 text-left transition-all hover:border-blue-300 hover:shadow-md"
              >
                <div className="relative mb-2 flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-gray-50 text-xl group-hover:bg-blue-50">
                  <span>📦</span>
                  {p.imageUrl && (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                </div>
                <div className="text-sm font-medium text-gray-900 line-clamp-2">{p.name}</div>
                <div className="mt-1 text-xs text-gray-400">{p.sku}</div>
                <div className="mt-auto pt-2 flex items-center justify-between w-full">
                  <span className="text-sm font-bold text-blue-600">฿{p.price.toLocaleString()}</span>
                  <span className="text-[10px] text-gray-400">คลัง: {p.stock}</span>
                </div>
              </button>
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <span className="text-4xl mb-2">🔍</span>
              <p className="text-sm">ไม่พบสินค้าที่ค้นหา</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — Cart */}
      <div className="flex w-80 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white lg:w-96">
        {/* Cart Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">
            🛒 ตะกร้า
            {cart.length > 0 && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                {cart.length}
              </span>
            )}
          </h2>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-red-500 hover:underline">
              ล้างทั้งหมด
            </button>
          )}
        </div>

        {/* Customer (Optional) */}
        <div className="border-b border-gray-100 px-4 py-3">
          <label className="text-xs font-medium text-gray-500">ลูกค้า (ไม่บังคับ)</label>
          <div className="mt-1 flex gap-2">
            <input
              type="tel"
              placeholder="เบอร์โทรลูกค้า..."
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              onBlur={lookupCustomer}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          {customerName && (
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs text-green-700">
              ✓ {customerName}
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-300">
              <span className="text-4xl mb-2">🛒</span>
              <p className="text-sm">ยิงบาร์โค้ดหรือเลือกสินค้า</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg bg-gray-50 p-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                    <div className="text-xs text-gray-500">฿{item.price.toLocaleString()} × {item.qty}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      className="flex h-6 w-6 items-center justify-center rounded bg-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-300"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      className="flex h-6 w-6 items-center justify-center rounded bg-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-300"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-1 flex h-6 w-6 items-center justify-center rounded text-red-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                  <div className="w-16 text-right text-sm font-semibold text-gray-900">
                    ฿{(item.price * item.qty).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Summary & Checkout */}
        {cart.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
            {!showCheckout ? (
              <>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>ราคาสินค้า</span>
                    <span>฿{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>VAT 7%</span>
                    <span>฿{vat.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold text-gray-900">
                    <span>ยอดรวม</span>
                    <span className="text-blue-600">฿{total.toLocaleString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowCheckout(true)}
                  className="mt-3 w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
                >
                  💳 ชำระเงิน (฿{total.toLocaleString()})
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">วิธีชำระเงิน</h3>
                <div className="grid grid-cols-3 gap-2">
                  {([['cash', '💵 เงินสด'], ['transfer', '🏦 โอน'], ['credit_card', '💳 บัตร']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setPaymentMethod(val)}
                      className={cn(
                        'rounded-lg border py-2 text-xs font-medium transition-colors',
                        paymentMethod === val
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {paymentMethod === 'cash' && (
                  <div>
                    <label className="text-xs text-gray-500">รับเงิน</label>
                    <input
                      type="number"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      placeholder={String(total)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-right text-lg font-bold focus:border-blue-500 focus:outline-none"
                      autoFocus
                    />
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setCashReceived(total)}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        พอดี
                      </button>
                      {cashQuickOptions.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setCashReceived(value)}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          ฿{value.toLocaleString()}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {[20, 50, 100].map((delta) => (
                        <button
                          key={delta}
                          type="button"
                          onClick={() => addCashReceived(delta)}
                          className="rounded-lg border border-green-200 bg-green-50 px-2 py-2 text-xs font-semibold text-green-700 hover:bg-green-100"
                        >
                          +฿{delta}
                        </button>
                      ))}
                    </div>
                    {Number(amountReceived) >= total && (
                      <div className="mt-1 text-right text-sm font-medium text-green-600">
                        ทอน: ฿{change.toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCheckout(false)}
                    className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    disabled={submitting || (paymentMethod === 'cash' && Number(amountReceived) < total)}
                    className="flex-1 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={async () => {
                      setSubmitError(null)
                      setSubmitting(true)
                      try {
                        const createRes = await invoiceService.createRetail({
                          customer_id: customerId ?? undefined,
                          branch_id: employee?.branch_id,
                          vat_percent: 7,
                          items: cart.map((c) => ({
                            product_id: c.productId,
                            product_variant_id: c.id,
                            quantity: c.qty,
                            unit_price: c.price,
                          })),
                        })
                        const createdInvoice = (createRes.data.data ?? createRes.data) as Invoice
                        const invId = createdInvoice.id
                        await invoiceService.issue(invId)
                        await invoiceService.addPayment(invId, {
                          amount: toNumber(createdInvoice.grand_total, total),
                          method: paymentMethod,
                        })
                        await invoiceService.issueReceipt(invId)
                        await buildReceiptDocument(invId)
                        toast.success('ชำระเงินสำเร็จ')
                        setCart([])
                        setShowCheckout(false)
                        setAmountReceived('')
                        setCustomerPhone('')
                        setCustomerName(null)
                        setCustomerId(null)
                        barcodeRef.current?.focus()
                      } catch (err) {
                        const e = err as { response?: { data?: { message?: string } } }
                        setSubmitError(e.response?.data?.message ?? 'ชำระเงินไม่สำเร็จ')
                      } finally {
                        setSubmitting(false)
                      }
                    }}
                  >
                    {submitting ? 'กำลังบันทึก...' : '🧾 ยืนยัน + เปิดใบเสร็จ'}
                  </button>
                </div>
                {submitError && (
                  <p className="mt-2 text-xs text-red-600">{submitError}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    <DocumentOutputModal
      isOpen={isDocModalOpen}
      title="ใบเสร็จรับเงิน (รูปภาพ A4)"
      subtitle="เลือกการใช้งานเอกสาร"
      previewUrl={slipImageUrl}
      previewAlt="receipt-a4"
      onClose={() => setIsDocModalOpen(false)}
      actions={[
        {
          key: 'view',
          label: '1. ดูหน้าเต็ม',
          description: 'เปิดแท็บใหม่แสดงรูปใบเสร็จขนาด A4',
          icon: <Eye className="h-4 w-4" />,
          onClick: handleViewSlip,
          tone: 'blue',
        },
        {
          key: 'zip',
          label: '2. ดาวน์โหลด ZIP',
          description: 'ดาวน์โหลดไฟล์ ZIP ที่มีไฟล์ PDF ใบเสร็จรับเงิน',
          icon: <Download className="h-4 w-4" />,
          onClick: () => { void handleDownloadZip() },
          tone: 'green',
        },
        {
          key: 'share-image',
          label: '3. คัดลอกลิงก์รูป',
          description: 'คัดลอกลิงก์ไฟล์รูปภาพเอกสาร',
          icon: <Link2 className="h-4 w-4" />,
          onClick: () => { void handleCopyImageLink() },
          tone: 'amber',
        },
        {
          key: 'share-pdf',
          label: '4. คัดลอกลิงก์ PDF',
          description: 'คัดลอกลิงก์ไฟล์ PDF เอกสาร',
          icon: <Link2 className="h-4 w-4" />,
          onClick: () => { void handleCopyPdfLink() },
          tone: 'amber',
        },
      ]}
      footerText="ลิงก์ public แบบเดาไม่ได้ต้องมี endpoint ฝั่ง backend สำหรับออก share token ของเอกสาร"
      footerLinks={[
        ...(slipImageUrl ? [{ label: 'รูปภาพ', url: slipImageUrl }] : []),
        ...(slipPdfUrl ? [{ label: 'PDF', url: slipPdfUrl }] : []),
      ]}
    />
    </>
  )
}
