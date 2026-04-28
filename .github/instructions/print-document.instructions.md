---
applyTo: "src/pages/**/*DetailPage.tsx,src/pages/**/*PrintPage.tsx"
---

# Print Document Instructions

ใช้เมื่อสร้างหรือแก้ไขหน้า detail ที่มีปุ่มพิมพ์เอกสาร (ใบเสนอราคา, ใบแจ้งหนี้, ใบส่งของ, ใบรับประกัน ฯลฯ)

## โครงสร้าง JSX

```tsx
return (
  <>
    {/* ─── Screen View ─────────────────────────────── */}
    <div className="space-y-6 print:hidden">
      {/* UI ปกติ: header, actions, sections */}
    </div>

    {/* ─── Print Document ───────────────────────────── */}
    {(() => {
      const ROWS_PER_PAGE = 10
      const items = doc.items ?? []
      const pages: typeof items[] = []
      for (let i = 0; i < Math.max(items.length, 1); i += ROWS_PER_PAGE) {
        pages.push(items.slice(i, i + ROWS_PER_PAGE))
      }
      const isLastPage = (idx: number) => idx === pages.length - 1

      const PageHeader = () => (
        <div>
          {/* หัวกระดาษ: ชื่อสาขา + เลขเอกสาร + วันที่ */}
          {/* ข้อมูลลูกค้า */}
        </div>
      )

      return (
        <div className="hidden print:block" style={{ fontFamily: 'sans-serif', fontSize: '13px', color: '#111827' }}>
          {pages.map((pageItems, pageIdx) => (
            <div
              key={pageIdx}
              style={{
                width: '100%',
                pageBreakAfter: isLastPage(pageIdx) ? 'auto' : 'always',
                ...(isLastPage(pageIdx) && {
                  height: '262mm',
                  display: 'flex',
                  flexDirection: 'column',
                }),
              }}
            >
              <PageHeader />

              {/* ตารางรายการ */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1f2937', color: 'white' }}>
                    {/* หัวตาราง */}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item, idx) => {
                    const globalIdx = pageIdx * ROWS_PER_PAGE + idx
                    return (
                      <tr key={item.id ?? globalIdx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '6px 8px' }}>{globalIdx + 1}</td>
                        {/* columns */}
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* หน้าสุดท้ายเท่านั้น: ยอดรวม + ลายเซ็นต์ */}
              {isLastPage(pageIdx) && (
                <>
                  {/* ยอดรวม */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                    <div style={{ width: '210px', border: '1px solid #d1d5db' }}>
                      {/* subtotal / vat / grand_total rows */}
                    </div>
                  </div>

                  {/* Spacer ดัน signature ลงล่างสุด */}
                  <div style={{ flex: 1 }} />

                  {/* ลายเซ็นต์ */}
                  <div style={{ paddingTop: '16px', borderTop: '1px solid #e5e7eb', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ textAlign: 'center', width: '180px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ borderBottom: '1px solid #9ca3af', height: '36px', marginBottom: '4px' }} />
                        <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>ลูกค้า / วันที่</p>
                      </div>
                      <div style={{ textAlign: 'center', width: '180px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ borderBottom: '1px solid #9ca3af', height: '36px', marginBottom: '4px' }} />
                        <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>ผู้อนุมัติ / วันที่</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )
    })()}
  </>
)
```

## กฎที่ต้องทำตามเสมอ

### Pagination
- `ROWS_PER_PAGE = 10` — แต่ละหน้ารองรับสูงสุด 10 แถว
- ถ้า items เป็น 0 ให้ push chunk ว่าง 1 อัน เพื่อให้หน้ายังแสดง: `Math.max(items.length, 1)`
- ใช้ `globalIdx = pageIdx * ROWS_PER_PAGE + idx` สำหรับหมายเลขแถวต่อเนื่อง

### Page div
| หน้า | style ที่ต้องใส่ |
|------|----------------|
| ไม่ใช่หน้าสุดท้าย | `pageBreakAfter: 'always'` เท่านั้น — **ห้ามใส่ height** |
| หน้าสุดท้าย | `height: '262mm'` + `display: 'flex'` + `flexDirection: 'column'` + `pageBreakAfter: 'auto'` |

> **เหตุผล:** ถ้าใส่ height บนหน้าที่ไม่ใช่สุดท้าย + pageBreakAfter:always → browser สร้างหน้าเปล่าเพิ่ม
> `height: 262mm` = 297mm (A4) − 30mm (margin บน+ล่าง 15mm) − 5mm safety margin

### Signature block
- ต้องใส่ `pageBreakInside: 'avoid'` + `breakInside: 'avoid'` ทั้ง outer div และ column div ทุกอัน
- `flex: 1` spacer ต้องอยู่ก่อน signature block เพื่อดันลงล่างสุด
- Spacer ทำงานได้เพราะ last page div มี `height: 262mm` (definite height)

### PageHeader
- ต้อง render ใน **ทุกหน้า** ไม่ใช่แค่หน้าแรก
- ประกอบด้วย: ชื่อสาขา + ที่อยู่ + โทร + ชื่อเอกสาร + เลขที่ + วันที่ + ลูกค้า
- ใช้ inner function `const PageHeader = () => (...)` ภายใน IIFE เดียวกัน

### CSS (globals.css @media print)
```css
@page {
  size: A4;
  margin: 15mm;  /* ห้ามมีสอง @page rule */
}

@media print {
  aside, header { display: none !important; }
  body { background: white !important; }
  main {
    margin-left: 0 !important;
    padding-top: 0 !important;
    padding: 0 !important;
  }
  /* สำคัญ: ลบ p-6 padding ของ AppLayout */
  main > div { padding: 0 !important; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; page-break-after: auto; }
  thead {
    display: table-header-group;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

> ⚠️ **globals.css ถูกตั้งค่าไว้แล้ว** — ไม่ต้องแก้อีก เว้นแต่เพิ่ม @page rule ใหม่ (ห้ามมีซ้ำ)

## หัวกระดาษ (PageHeader) — pattern มาตรฐาน

```tsx
const PageHeader = () => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '2px solid #1f2937', marginBottom: '12px' }}>
      <div>
        <p style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{doc.branch?.name ?? '—'}</p>
        {doc.branch?.address && <p style={{ fontSize: '11px', color: '#4b5563', margin: '2px 0 0' }}>{doc.branch.address}</p>}
        {doc.branch?.phone && <p style={{ fontSize: '11px', color: '#4b5563', margin: '1px 0 0' }}>โทร: {doc.branch.phone}</p>}
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>{DOCUMENT_TITLE}</p>
        <p style={{ fontSize: '12px', margin: '4px 0 0' }}>เลขที่: {doc.doc_no}</p>
        <p style={{ fontSize: '12px', margin: '2px 0 0' }}>วันที่: {formatDate(doc.created_at)}</p>
      </div>
    </div>
    {/* ข้อมูลลูกค้า */}
    <div style={{ padding: '4px 0 10px' }}>
      <p style={{ fontSize: '10px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', margin: '0 0 4px' }}>ลูกค้า</p>
      <p style={{ fontWeight: 600, fontSize: '13px', margin: 0 }}>{getCustomerName(doc)}</p>
      {getCustomerAddress(doc) && <p style={{ fontSize: '11px', color: '#4b5563', margin: '1px 0 0' }}>{getCustomerAddress(doc)}</p>}
    </div>
  </div>
)
```

## DOCUMENT_TITLE แต่ละประเภท

| หน้า | ชื่อเอกสาร | เลขที่ field |
|------|-----------|-------------|
| QuotationDetailPage | ใบเสนอราคา | `quotation_no` |
| InvoiceDetailPage | ใบแจ้งหนี้ | `invoice_no` |
| DeliveryNoteDetailPage | ใบส่งของ | `delivery_no` |
| WarrantyDetailPage | ใบรับประกัน | `warranty_no` |
| DepositDetailPage | ใบรับมัดจำ | `deposit_no` |

## Helper functions (ใส่ไว้นอก component เสมอ)

```ts
const formatDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const formatCurrency = (n?: number | null) =>
  n != null ? n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

function getCustomerName(doc: { customer?: Customer | null; customer_id?: number }): string {
  const c = doc.customer
  if (!c) return `ลูกค้า #${doc.customer_id}`
  if (c.type === 'corporate') return c.company_name || `ลูกค้า #${c.id}`
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || `ลูกค้า #${c.id}`
}

function getCustomerAddress(doc: { customer?: Customer | null }): string {
  const c = doc.customer
  if (!c) return ''
  return [c.address, c.sub_district, c.district, c.province, c.postal_code].filter(Boolean).join(' ')
}
```

## ปุ่มพิมพ์ (screen view)

```tsx
<button
  onClick={() => window.print()}
  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
>
  <PrintIcon />
  ปริ้น
</button>
```

## สิ่งที่ห้ามทำ

- ❌ ห้ามใช้ `<table><thead>` สำหรับ repeat header — ใช้ JS PageHeader แทน
- ❌ ห้ามใช้ `<tfoot>` สำหรับ signature — ใช้ flex spacer ใน last page แทน
- ❌ ห้ามใส่ `height` บนหน้าที่ไม่ใช่หน้าสุดท้าย
- ❌ ห้ามใส่ `minHeight` แทน `height` บนหน้าสุดท้าย (flex:1 spacer ต้องการ definite height)
- ❌ ห้ามมี `@page` rule ซ้ำใน globals.css
- ❌ ห้ามลืมใส่ `pageBreakInside: 'avoid'` บน signature divs
