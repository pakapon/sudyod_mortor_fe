import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

/* ─── Mock Product Data ─── */
interface Product {
  id: number
  sku: string
  barcode: string
  name: string
  price: number
  stock: number
  unit: string
  image?: string
}

const MOCK_PRODUCTS: Product[] = [
  { id: 1, sku: 'ACC-001', barcode: '8850001000011', name: 'หมวกกันน็อค Honda (สีดำ)', price: 1290, stock: 15, unit: 'ชิ้น' },
  { id: 2, sku: 'ACC-002', barcode: '8850001000028', name: 'เสื้อฮอนด้า Racing (M)', price: 890, stock: 20, unit: 'ตัว' },
  { id: 3, sku: 'OIL-001', barcode: '8850001000035', name: 'น้ำมันเครื่อง Honda 10W-30 1L', price: 250, stock: 50, unit: 'ขวด' },
  { id: 4, sku: 'OIL-002', barcode: '8850001000042', name: 'น้ำมันเกียร์ Honda 80W-90', price: 180, stock: 30, unit: 'ขวด' },
  { id: 5, sku: 'ACC-003', barcode: '8850001000059', name: 'สติ๊กเกอร์ตกแต่ง Honda Wing', price: 150, stock: 100, unit: 'แผ่น' },
  { id: 6, sku: 'ACC-004', barcode: '8850001000066', name: 'ถุงมือขับขี่ Honda (L)', price: 390, stock: 25, unit: 'คู่' },
  { id: 7, sku: 'OIL-003', barcode: '8850001000073', name: 'น้ำมันเบรค DOT4 Honda', price: 220, stock: 40, unit: 'ขวด' },
  { id: 8, sku: 'ACC-005', barcode: '8850001000080', name: 'ปลอกแฮนด์ Honda สีแดง', price: 290, stock: 35, unit: 'คู่' },
]

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
  const barcodeRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerName, setCustomerName] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash')
  const [showCheckout, setShowCheckout] = useState(false)
  const [amountReceived, setAmountReceived] = useState('')

  // Focus barcode input on mount
  useEffect(() => {
    barcodeRef.current?.focus()
  }, [])

  // Search products
  const filteredProducts = MOCK_PRODUCTS.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.includes(q)
  })

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

  // Handle barcode scan
  const handleBarcodeScan = (value: string) => {
    const product = MOCK_PRODUCTS.find((p) => p.barcode === value || p.sku === value)
    if (product) {
      addToCart(product)
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
  const lookupCustomer = () => {
    if (customerPhone === '0891234567') {
      setCustomerName('นายสมชาย ใจดี')
    } else if (customerPhone) {
      setCustomerName(null)
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
                    className="flex-1 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
                    onClick={() => {
                      // Print receipt then reset
                      setTimeout(() => window.print(), 100)
                      setTimeout(() => {
                        setCart([])
                        setShowCheckout(false)
                        setAmountReceived('')
                        setCustomerPhone('')
                        setCustomerName(null)
                        barcodeRef.current?.focus()
                      }, 500)
                    }}
                  >
                    🖨️ ยืนยัน + ปริ้นใบเสร็จ
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* ─── Print Receipt ─── */}
    {(() => {
      const now = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      const rcpNo = `RCP-${Date.now().toString(36).toUpperCase()}`
      return (
        <div className="hidden print:block" style={{ fontFamily: 'monospace', fontSize: '12px', color: '#000', maxWidth: '280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
            <p style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>สุดยอดมอเตอร์</p>
            <p style={{ fontSize: '10px', margin: '2px 0' }}>88/8 ถ.อุดมสุข กรุงเทพฯ</p>
            <p style={{ fontSize: '10px', margin: 0 }}>โทร: 02-123-4567</p>
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
