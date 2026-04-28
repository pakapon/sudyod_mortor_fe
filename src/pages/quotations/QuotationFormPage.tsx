import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { quotationService } from '@/api/quotationService'
import { serviceOrderService } from '@/api/serviceOrderService'
import { productService } from '@/api/productService'
import type { Quotation, QuotationType, QuotationPricingType } from '@/types/quotation'
import type { Customer } from '@/types/customer'
import type { Product } from '@/types/product'
import { cn } from '@/lib/utils'
import { CustomerSearchSelect, getCustomerDisplayName } from '@/components/ui/CustomerSearchSelect'

// ── Icons ─────────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface FormValues {
  validity_days: string
  vat_percent: string
  note: string
}

interface LocalItem {
  tempId: string
  pricing_type: QuotationPricingType
  product_id?: number
  product_name_display?: string
  description: string
  quantity: number
  unit_price: number
  discount: number
  discount_type: 'percent' | 'amount'
}

interface ProductSearchResult {
  itemTempId: string
  query: string
  results: Product[]
  isLoading: boolean
  isOpen: boolean
}

const formatCurrency = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── Component ─────────────────────────────────────────────────────────────────
export function QuotationFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEdit = !!id

  const soIdFromParams = searchParams.get('service_order_id')

  const [isLoading, setIsLoading] = useState(isEdit)
  const [isSaving, setIsSaving] = useState(false)
  const [existing, setExisting] = useState<Quotation | null>(null)

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [quotationType, setQuotationType] = useState<QuotationType>('service')
  const [linkedSoId, setLinkedSoId] = useState<number | undefined>(undefined)
  const [linkedSoNo, setLinkedSoNo] = useState<string>('')

  const [localItems, setLocalItems] = useState<LocalItem[]>([])
  const [productSearch, setProductSearch] = useState<ProductSearchResult | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      validity_days: '30',
      vat_percent: '7',
      note: '',
    },
  })

  const vatPercent = Number(watch('vat_percent') || '0')

  // ── Compute totals ────────────────────────────────────────────────────────
  const subtotal = localItems.reduce((s, i) => {
    const discAmt = i.discount_type === 'percent'
      ? i.quantity * i.unit_price * (i.discount / 100)
      : i.discount
    return s + i.quantity * i.unit_price - discAmt
  }, 0)
  const vatAmount = subtotal * (vatPercent / 100)
  const grandTotal = subtotal + vatAmount

  // ── Load existing (edit mode) ─────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    quotationService.getQuotation(Number(id))
      .then((res) => {
        const d = res.data.data
        setExisting(d)
        setQuotationType(d.type)
        if (d.customer) setSelectedCustomer(d.customer as Customer)
        if (d.service_order_id) {
          setLinkedSoId(d.service_order_id)
          setLinkedSoNo(d.service_order?.so_no || d.service_order?.so_number || `SO #${d.service_order_id}`)
        }
        if (d.items) {
          setLocalItems(
            d.items.map((item) => ({
              tempId: String(item.id ?? Math.random()),
              pricing_type: item.pricing_type,
              product_id: item.product_id ?? undefined,
              product_name_display: item.product_name ?? '',
              description: item.description ?? '',
              quantity: item.quantity,
              unit_price: item.unit_price,
              discount: item.discount ?? 0,
              discount_type: 'amount' as const,
            })),
          )
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [id])

  // ── SO prefill (create mode with ?service_order_id=) ─────────────────────
  useEffect(() => {
    if (isEdit || !soIdFromParams) return
    const soId = Number(soIdFromParams)
    setLinkedSoId(soId)
    setQuotationType('service')

    Promise.all([
      serviceOrderService.getServiceOrder(soId),
      serviceOrderService.getItems(soId),
    ])
      .then(([soRes, itemsRes]) => {
        const so = soRes.data.data
        if (so.customer) setSelectedCustomer(so.customer as Customer)
        setLinkedSoNo(so.so_number || so.so_no || `SO #${soId}`)

        const rawItems = Array.isArray(itemsRes.data.data) ? itemsRes.data.data : []
        setLocalItems(
          rawItems.map((item: {
            id?: number
            item_type?: string
            product_id?: number
            product_name?: string
            custom_name?: string
            quantity?: number
            unit_price?: number
            selling_price?: number
          }) => ({
            tempId: String(item.id ?? Math.random()),
            pricing_type: item.item_type === 'product' ? 'part' : 'labor',
            product_id: item.item_type === 'product' ? item.product_id : undefined,
            product_name_display: item.product_name ?? item.custom_name ?? '',
            description: item.custom_name ?? item.product_name ?? '',
            quantity: item.quantity ?? 1,
            unit_price: item.unit_price ?? item.selling_price ?? 0,
            discount: 0,
            discount_type: 'percent' as const,
          })),
        )
      })
      .catch(() => {})
  }, [isEdit, soIdFromParams])

  // ── Close product dropdown on outside click ────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProductSearch(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Items management ──────────────────────────────────────────────────────
  const addItem = () => {
    setLocalItems((prev) => [
      ...prev,
      {
        tempId: String(Date.now() + Math.random()),
        pricing_type: 'part',
        description: '',
        quantity: 1,
        unit_price: 0,
        discount: 0,
        discount_type: 'percent',
      },
    ])
  }

  const removeItem = (tempId: string) => {
    setLocalItems((prev) => prev.filter((i) => i.tempId !== tempId))
  }

  const updateItem = (tempId: string, patch: Partial<LocalItem>) => {
    setLocalItems((prev) =>
      prev.map((i) => (i.tempId === tempId ? { ...i, ...patch } : i)),
    )
  }

  // ── Product search ────────────────────────────────────────────────────────
  const handleProductQueryChange = useCallback(
    (tempId: string, query: string) => {
      updateItem(tempId, { product_name_display: query, product_id: undefined })

      setProductSearch({ itemTempId: tempId, query, results: [], isLoading: true, isOpen: true })

      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (!query.trim()) {
        setProductSearch(null)
        return
      }
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await productService.getProducts({ search: query, limit: 10 })
          setProductSearch({ itemTempId: tempId, query, results: res.data.data, isLoading: false, isOpen: true })
        } catch {
          setProductSearch((prev) => prev ? { ...prev, isLoading: false } : null)
        }
      }, 300)
    },
    [],
  )

  const handleSelectProduct = (p: Product) => {
    if (!productSearch) return
    updateItem(productSearch.itemTempId, {
      product_id: p.id,
      product_name_display: p.name,
      unit_price: typeof p.selling_price === 'number' ? p.selling_price : Number(p.selling_price ?? 0),
    })
    setProductSearch(null)
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = handleSubmit(async (values) => {
    if (!selectedCustomer) return
    setIsSaving(true)
    try {
      const payload = {
        customer_id: selectedCustomer.id,
        type: quotationType,
        service_order_id: linkedSoId,
        validity_days: Number(values.validity_days),
        vat_percent: Number(values.vat_percent),
        note: values.note || undefined,
        items: localItems.map((i) => ({
          product_id: i.pricing_type === 'part' ? (i.product_id ?? null) : null,
          quantity: i.quantity,
          unit_price: i.unit_price,
          pricing_type: i.pricing_type,
          description: i.pricing_type === 'labor' ? i.description : undefined,
          discount: i.discount_type === 'percent'
            ? (i.quantity * i.unit_price * (i.discount / 100)) || undefined
            : i.discount || undefined,
        })),
      }
      if (isEdit) {
        await quotationService.updateQuotation(Number(id), payload)
        navigate(`/quotations/${id}`)
      } else {
        const res = await quotationService.createQuotation(payload)
        navigate(`/quotations/${res.data.data.id}`)
      }
    } catch {
      // errors handled by global interceptor
    } finally {
      setIsSaving(false)
    }
  })

  const canEdit = !isEdit || existing?.status === 'draft'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to={isEdit ? `/quotations/${id}` : '/quotations'}
          className="p-1.5 text-gray-400 hover:text-gray-700"
        >
          <BackIcon />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? `แก้ไขใบเสนอราคา ${existing?.quotation_no ?? ''}` : 'สร้างใบเสนอราคาใหม่'}
        </h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Section 1: ลูกค้าและประเภท */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-800">ลูกค้าและประเภท</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Customer */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">ลูกค้า *</label>
              <CustomerSearchSelect
                selectedCustomer={
                  selectedCustomer
                    ? { id: selectedCustomer.id, label: getCustomerDisplayName(selectedCustomer) }
                    : null
                }
                onSelect={(c) => setSelectedCustomer(c)}
                disabled={!canEdit}
                placeholder="พิมพ์ชื่อหรือเบอร์โทรเพื่อค้นหาลูกค้า..."
              />
              {!selectedCustomer && (
                <p className="mt-1 text-xs text-red-500">กรุณาเลือกลูกค้า</p>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">ประเภทใบเสนอราคา</label>
              <div className="flex gap-2">
                {(['service', 'sale'] as QuotationType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                      setQuotationType(t)
                      if (t !== 'service') {
                        setLinkedSoId(undefined)
                        setLinkedSoNo('')
                      }
                    }}
                    className={cn(
                      'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                      quotationType === t
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                      !canEdit && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    {t === 'service' ? 'ซ่อมรถ' : 'ขายสินค้า'}
                  </button>
                ))}
              </div>
            </div>

            {/* Linked SO */}
            {quotationType === 'service' && linkedSoNo && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">ใบสั่งซ่อมอ้างอิง</label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {linkedSoNo}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 2: รายละเอียด */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-800">รายละเอียด</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                ระยะเวลาใบเสนอราคา (วัน) *
              </label>
              <input
                type="number"
                min="1"
                {...register('validity_days', { required: true, min: 1 })}
                disabled={!canEdit}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                  errors.validity_days ? 'border-red-400' : 'border-gray-200',
                  !canEdit && 'bg-gray-50 cursor-not-allowed',
                )}
              />
              {errors.validity_days && (
                <p className="mt-1 text-xs text-red-500">กรุณากรอกระยะเวลา</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                ภาษีมูลค่าเพิ่ม (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                {...register('vat_percent')}
                disabled={!canEdit}
                className={cn(
                  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                  !canEdit && 'bg-gray-50 cursor-not-allowed',
                )}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">หมายเหตุ</label>
              <textarea
                rows={3}
                {...register('note')}
                disabled={!canEdit}
                placeholder="หมายเหตุ (ไม่บังคับ)"
                className={cn(
                  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                  !canEdit && 'bg-gray-50 cursor-not-allowed',
                )}
              />
            </div>
          </div>
        </section>

        {/* Section 3: รายการสินค้า/บริการ */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">รายการสินค้า/บริการ</h2>
            {canEdit && (
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-blue-400 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
              >
                <PlusIcon />
                เพิ่มรายการ
              </button>
            )}
          </div>

          {localItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              ยังไม่มีรายการ — กดปุ่ม "เพิ่มรายการ" เพื่อเพิ่ม
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-24" />
                  <col />
                  <col className="w-20" />
                  <col className="w-28" />
                  <col className="w-36" />
                  <col className="w-24" />
                  <col className="w-9" />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                    <th className="pb-2 pr-3">ประเภท</th>
                    <th className="pb-2 pr-3">สินค้า/รายการ</th>
                    <th className="pb-2 pr-3 text-right">จำนวน</th>
                    <th className="pb-2 pr-3 text-right">ราคา/หน่วย</th>
                    <th className="pb-2 pr-3 text-right">ส่วนลด</th>
                    <th className="pb-2 text-right">รวม</th>
                    {canEdit && <th className="pb-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {localItems.map((item) => {
                    const discAmt = item.discount_type === 'percent'
                      ? item.quantity * item.unit_price * (item.discount / 100)
                      : item.discount
                    const lineTotal = item.quantity * item.unit_price - discAmt
                    const isProductSearch =
                      productSearch !== null && productSearch.itemTempId === item.tempId

                    return (
                      <tr key={item.tempId} className="group">
                        {/* Pricing type */}
                        <td className="py-2 pr-3 align-top">
                          {canEdit ? (
                            <select
                              value={item.pricing_type}
                              onChange={(e) => {
                                updateItem(item.tempId, {
                                  pricing_type: e.target.value as QuotationPricingType,
                                  product_id: undefined,
                                  product_name_display: '',
                                })
                                setProductSearch(null)
                              }}
                              className="rounded border border-gray-200 px-2 py-1.5 text-xs focus:outline-none"
                            >
                              <option value="part">อะไหล่</option>
                              <option value="labor">ค่าแรง</option>
                            </select>
                          ) : (
                            <span className="text-sm text-gray-700">
                              {item.pricing_type === 'part' ? 'อะไหล่' : 'ค่าแรง'}
                            </span>
                          )}
                        </td>

                        {/* Product/Description */}
                        <td className="py-2 pr-3 align-top" style={{ minWidth: '200px' }}>
                          {canEdit ? (
                            item.pricing_type === 'part' ? (
                              <div className="relative" ref={isProductSearch ? dropdownRef : null}>
                                <input
                                  type="text"
                                  value={item.product_name_display ?? ''}
                                  onChange={(e) => handleProductQueryChange(item.tempId, e.target.value)}
                                  placeholder="ค้นหาสินค้า..."
                                  className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                />
                                {isProductSearch && productSearch.isOpen && (
                                  <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                                    {productSearch.isLoading ? (
                                      <div className="px-3 py-2 text-sm text-gray-400">กำลังค้นหา...</div>
                                    ) : productSearch.results.length === 0 ? (
                                      <div className="px-3 py-2 text-sm text-gray-400">ไม่พบสินค้า</div>
                                    ) : (
                                      productSearch.results.map((p) => (
                                        <button
                                          key={p.id}
                                          type="button"
                                          onMouseDown={(e) => {
                                            e.preventDefault()
                                            handleSelectProduct(p)
                                          }}
                                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                                        >
                                          <span className="font-medium text-gray-900">{p.name}</span>
                                          {p.sku && (
                                            <span className="ml-auto text-xs text-gray-400">{p.sku}</span>
                                          )}
                                        </button>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateItem(item.tempId, { description: e.target.value })}
                                placeholder="รายละเอียดค่าแรง..."
                                className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                              />
                            )
                          ) : (
                            <span className="text-sm text-gray-800">
                              {item.pricing_type === 'part'
                                ? item.product_name_display ?? `สินค้า #${item.product_id}`
                                : item.description}
                            </span>
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="py-2 pr-3 align-top">
                          {canEdit ? (
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(item.tempId, { quantity: Number(e.target.value) })
                              }
                              className="w-full rounded border border-gray-200 px-2 py-1.5 text-right text-sm focus:outline-none"
                            />
                          ) : (
                            <span className="block text-right text-sm text-gray-700">{item.quantity}</span>
                          )}
                        </td>

                        {/* Unit price */}
                        <td className="py-2 pr-3 align-top">
                          {canEdit ? (
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unit_price}
                              onChange={(e) =>
                                updateItem(item.tempId, { unit_price: Number(e.target.value) })
                              }
                              className="w-full rounded border border-gray-200 px-2 py-1.5 text-right text-sm focus:outline-none"
                            />
                          ) : (
                            <span className="block text-right text-sm text-gray-700">
                              {formatCurrency(item.unit_price)}
                            </span>
                          )}
                        </td>

                        {/* Discount */}
                        <td className="py-2 pr-3 align-top">
                          {canEdit ? (
                            <div className="flex">
                              <input
                                type="number"
                                min="0"
                                max={item.discount_type === 'percent' ? 100 : undefined}
                                step="any"
                                value={item.discount}
                                onChange={(e) =>
                                  updateItem(item.tempId, { discount: Number(e.target.value) })
                                }
                                className="min-w-0 flex-1 rounded-l border border-r-0 border-gray-200 px-2 py-1.5 text-right text-sm focus:outline-none"
                              />
                              <select
                                value={item.discount_type}
                                onChange={(e) =>
                                  updateItem(item.tempId, {
                                    discount_type: e.target.value as 'percent' | 'amount',
                                    discount: 0,
                                  })
                                }
                                className="rounded-r border border-gray-200 bg-gray-50 px-1.5 py-1.5 text-xs focus:outline-none"
                              >
                                <option value="percent">%</option>
                                <option value="amount">฿</option>
                              </select>
                            </div>
                          ) : (
                            <span className="block text-right text-sm text-gray-700">
                              {item.discount
                                ? item.discount_type === 'percent'
                                  ? `${item.discount}%`
                                  : formatCurrency(item.discount)
                                : '—'}
                            </span>
                          )}
                        </td>

                        {/* Line total */}
                        <td className="py-2 pr-3 align-top text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(lineTotal)}
                          </span>
                        </td>

                        {/* Remove */}
                        {canEdit && (
                          <td className="py-2 align-top">
                            <button
                              type="button"
                              onClick={() => removeItem(item.tempId)}
                              className="p-1.5 text-gray-300 hover:text-red-500"
                            >
                              <TrashIcon />
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          {localItems.length > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-1.5 rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>ราคาก่อน VAT</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>VAT ({vatPercent}%)</span>
                  <span>{formatCurrency(vatAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1.5 text-base font-semibold text-gray-900">
                  <span>ยอดรวมทั้งสิ้น</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Actions */}
        {canEdit && (
          <div className="flex justify-end gap-3">
            <Link
              to={isEdit ? `/quotations/${id}` : '/quotations'}
              className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={isSaving || !selectedCustomer}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'สร้างใบเสนอราคา'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
