import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { inventoryService } from '@/api/inventoryService'
import { customerService } from '@/api/customerService'
import { invoiceService } from '@/api/invoiceService'
import { hrService } from '@/api/hrService'
import { useAuthStore } from '@/stores/authStore'
import type { InventoryItem } from '@/types/inventory'
import type { Branch } from '@/types/hr'

/* ─── POS Product (variant-level) ─── */
interface Product {
  id: number              // variant id (cart key)
  productId: number       // parent product id (for invoice payload)
  sku: string
  name: string
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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash')
  const [showCheckout, setShowCheckout] = useState(false)
  const [amountReceived, setAmountReceived] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [lastReceiptNo, setLastReceiptNo] = useState<string | null>(null)
  const [branchInfo, setBranchInfo] = useState<Branch | null>(null)

  // Load full branch details for receipt header
  useEffect(() => {
    if (!employee?.branch_id) return
    hrService.getBranch(employee.branch_id)
      .then((r) => setBranchInfo(r.data.data ?? null))
      .catch(() => {})
  }, [employee?.branch_id])

  // Focus barcode input on mount
  useEffect(() => {
    barcodeRef.current?.focus()
  }, [])

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

  const fmtCur = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2 })

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
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-50 text-xl group-hover:bg-blue-50">
                  📦
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
                  {([['cash', '💵 เงินสด'], ['transfer', '🏦 โอน'], ['card', '💳 บัตร']] as const).map(([val, label]) => (
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
                        const invId = createRes.data.data.id
                        await invoiceService.issue(invId)
                        await invoiceService.addPayment(invId, {
                          amount: total,
                          method: paymentMethod,
                        })
                        const rcpRes = await invoiceService.issueReceipt(invId)
                        setLastReceiptNo(rcpRes.data.data.receipt_no ?? null)
                        toast.success('ชำระเงินสำเร็จ')
                        setTimeout(() => window.print(), 100)
                        setTimeout(() => {
                          setCart([])
                          setShowCheckout(false)
                          setAmountReceived('')
                          setCustomerPhone('')
                          setCustomerName(null)
                          setCustomerId(null)
                          setLastReceiptNo(null)
                          barcodeRef.current?.focus()
                        }, 800)
                      } catch (err) {
                        const e = err as { response?: { data?: { message?: string } } }
                        setSubmitError(e.response?.data?.message ?? 'ชำระเงินไม่สำเร็จ')
                      } finally {
                        setSubmitting(false)
                      }
                    }}
                  >
                    {submitting ? 'กำลังบันทึก...' : '🖨️ ยืนยัน + ปริ้นใบเสร็จ'}
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

    {/* ─── Print Receipt ─── */}
    {(() => {
      const now = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      const rcpNo = lastReceiptNo ?? `RCP-${Date.now().toString(36).toUpperCase()}`
      return (
        <div className="hidden print:block" style={{ fontFamily: 'monospace', fontSize: '12px', color: '#000', maxWidth: '280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
            <p style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{branchInfo?.name ?? employee?.branch?.name ?? 'สุดยอดมอเตอร์'}</p>
            {branchInfo?.address && <p style={{ fontSize: '10px', margin: '2px 0' }}>{branchInfo.address}</p>}
            {branchInfo?.phone && <p style={{ fontSize: '10px', margin: 0 }}>โทร: {branchInfo.phone}</p>}
          </div>
          <p style={{ fontSize: '11px', margin: '0 0 4px' }}>เลขที่: {rcpNo}</p>
          <p style={{ fontSize: '11px', margin: '0 0 8px' }}>วันที่: {now}</p>
          {customerName && <p style={{ fontSize: '11px', margin: '0 0 8px' }}>ลูกค้า: {customerName}</p>}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '8px' }}>
            <thead>
              <tr style={{ borderBottom: '1px dashed #000' }}>
                <th style={{ textAlign: 'left', padding: '2px 0' }}>รายการ</th>
                <th style={{ textAlign: 'right', padding: '2px 0', width: '40px' }}>จำนวน</th>
                <th style={{ textAlign: 'right', padding: '2px 0', width: '60px' }}>รวม</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.id}>
                  <td style={{ padding: '2px 0' }}>{item.name}</td>
                  <td style={{ textAlign: 'right', padding: '2px 0' }}>{item.qty}</td>
                  <td style={{ textAlign: 'right', padding: '2px 0' }}>{fmtCur(item.price * item.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderTop: '1px dashed #000', paddingTop: '4px', fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>ราคาสินค้า</span><span>{fmtCur(subtotal)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>VAT 7%</span><span>{fmtCur(vat)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '14px', borderTop: '1px dashed #000', marginTop: '4px', paddingTop: '4px' }}>
              <span>ยอดรวม</span><span>{fmtCur(total)}</span>
            </div>
            {paymentMethod === 'cash' && Number(amountReceived) >= total && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}><span>รับเงิน</span><span>{fmtCur(Number(amountReceived))}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>ทอน</span><span>{fmtCur(change)}</span></div>
              </>
            )}
          </div>
          <div style={{ textAlign: 'center', borderTop: '1px dashed #000', marginTop: '12px', paddingTop: '8px', fontSize: '10px', color: '#666' }}>
            <p style={{ margin: 0 }}>ขอบคุณที่ใช้บริการ</p>
            <p style={{ margin: '2px 0 0' }}>www.sudyodmotor.com</p>
          </div>
        </div>
      )
    })()}
    </>
  )
}
