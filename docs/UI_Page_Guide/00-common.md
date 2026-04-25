# Common — สิ่งที่ใช้ทุกหน้า

> เอกสารนี้ครอบคลุม: ภาพรวมระบบ, 4 Scenario, Navigation, UI Conventions, Layout Shell, และ Quick Reference
> **อ่านไฟล์นี้ก่อนทำงานทุกหน้า**

---

## 1. ภาพรวมระบบ

### ระบบทำอะไร?
สุดยอดมอเตอร์ คือระบบ ERP สำหรับร้านซ่อมรถ + ขายอะไหล่ ครอบคลุม:
- **รับซ่อมรถ** (Service Order → เสนอราคา → ใบแจ้งหนี้ → รับเงิน → ใบเสร็จ → ส่งมอบ → รับประกัน)
- **ขายอะไหล่** (เสนอราคา → [มัดจำ] → ใบแจ้งหนี้ → รับเงิน → ใบเสร็จ → [ส่งมอบ] → รับประกัน)
- **ขายหน้าร้าน** (ใบแจ้งหนี้ retail → รับเงิน → ใบเสร็จ)
- **คลังสินค้า** (รับของ, โอนย้าย, ปรับสต็อก, นับสต็อก)
- **สินเชื่อ** (สมัครไฟแนนซ์ / ผ่อนร้าน)
- **HR** (ลงเวลา, ตารางทำงาน, วันหยุด)

### 4 Scenario หลักของธุรกิจ

| Scenario | ชื่อ | Flow |
|----------|------|------|
| **A** | ซ่อมรถ | SO → QT → INV → Payment → Receipt → DN → Warranty |
| **B1** | ขายไม่มีมัดจำ | QT → INV → Payment → Receipt → [DN] → Warranty |
| **B2** | ขายมีมัดจำ | QT → Deposit(+Receipt) → INV(หักมัดจำ) → Payment → Receipt → [DN] → Warranty |
| **C** | ขายหน้าร้าน | INV(retail) → Payment → Receipt |

> ดู Flow ละเอียดขั้นตอนต่อขั้นตอน → [20-flows.md](./20-flows.md)

### Navigation Structure (แนะนำ)

```
Sidebar Menu:
├── 🏠 Dashboard
├── 👤 ลูกค้า
├── 🔧 ใบสั่งซ่อม
├── 💰 การเงิน
│   ├── ใบเสนอราคา
│   ├── ใบแจ้งหนี้
│   ├── มัดจำ
│   ├── ใบส่งมอบ
│   └── ใบรับประกัน
├── 📦 สินค้า & สต็อก
│   ├── สินค้า
│   ├── คลังสินค้า
│   ├── สต็อกในคลัง
│   ├── ใบรับสินค้า
│   ├── โอนย้ายสต็อก
│   └── ใบสั่งซื้อ
├── 🏦 สินเชื่อ
│   ├── สมัครไฟแนนซ์
│   ├── สินเชื่อร้าน
│   └── ค้นหาสินเชื่อ
├── 👥 HR
│   ├── พนักงาน
│   ├── ลงเวลา
│   └── วันหยุด
├── ⚙️ ตั้งค่า
│   ├── สาขา
│   ├── ตำแหน่ง
│   ├── บทบาท & สิทธิ์
│   ├── ตารางเวลา
│   ├── ยี่ห้อ
│   ├── หมวดสินค้า
│   ├── หน่วยนับ
│   ├── Supplier
│   ├── บริษัทไฟแนนซ์
│   ├── ตัวเลือกแบบสินค้า
│   └── รายการตรวจสอบสภาพรถ
├── 📋 Audit Log
└── 🔔 แจ้งเตือน (badge จำนวน)
```

> **สำคัญ**: เมนูที่แสดงขึ้นอยู่กับสิทธิ์ของผู้ใช้ — ดึงจาก `GET /permissions/me` ตอน login สำเร็จ

---

### เมนู → ไฟล์อ้างอิง

| เมนู | ไฟล์ | Section |
|------|------|---------|
| Login / Auth | [02-login-auth.md](./02-login-auth.md) | ทั้งหมด |
| Dashboard | [04-dashboard.md](./04-dashboard.md) | ทั้งหมด |
| ลูกค้า | [05-customers.md](./05-customers.md) | ทั้งหมด |
| ใบสั่งซ่อม | [06-service-orders.md](./06-service-orders.md) | ทั้งหมด |
| การเงิน › ใบเสนอราคา | [07-quotations.md](./07-quotations.md) | ทั้งหมด |
| การเงิน › ใบแจ้งหนี้ | [08-invoices.md](./08-invoices.md) | ทั้งหมด |
| การเงิน › มัดจำ | [09-deposits.md](./09-deposits.md) | ทั้งหมด |
| การเงิน › ใบส่งมอบ | [10-delivery-notes.md](./10-delivery-notes.md) | ทั้งหมด |
| การเงิน › ใบรับประกัน | [11-warranties.md](./11-warranties.md) | ทั้งหมด |
| สินค้า & สต็อก › สินค้า | [12-products.md](./12-products.md) | 12.1–12.3 |
| สินค้า & สต็อก › คลังสินค้า | [13-inventory.md](./13-inventory.md) | 13.1–13.2 |
| สินค้า & สต็อก › สต็อกในคลัง | [13-inventory.md](./13-inventory.md) | 13.3 |
| สินค้า & สต็อก › ใบรับสินค้า | [13-inventory.md](./13-inventory.md) | 13.4 |
| สินค้า & สต็อก › โอนย้ายสต็อก | [13-inventory.md](./13-inventory.md) | 13.5 |
| สินค้า & สต็อก › ใบสั่งซื้อ | [14-purchase-orders.md](./14-purchase-orders.md) | ทั้งหมด |
| สินเชื่อ | [15-loans-finance.md](./15-loans-finance.md) | ทั้งหมด |
| HR (พนักงาน / ลงเวลา / วันหยุด) | [16-hr.md](./16-hr.md) | ทั้งหมด |
| ตั้งค่า › สาขา / ตำแหน่ง / บทบาท / ตารางเวลา | [17-settings.md](./17-settings.md) | 17.1–17.4 |
| ตั้งค่า › ยี่ห้อ / หน่วยนับ / Supplier | [17-settings.md](./17-settings.md) | 17.5 |
| ตั้งค่า › หมวดสินค้า | [17-settings.md](./17-settings.md) | 17.6 |
| ตั้งค่า › บริษัทไฟแนนซ์ | [17-settings.md](./17-settings.md) | 17.7 |
| ตั้งค่า › ตัวเลือกแบบสินค้า | [17-settings.md](./17-settings.md) | 17.8 |
| ตั้งค่า › รายการตรวจสอบสภาพรถ | [17-settings.md](./17-settings.md) | 17.9 |
| แจ้งเตือน | [18-notifications.md](./18-notifications.md) | ทั้งหมด |
| Audit Log | [19-audit-log.md](./19-audit-log.md) | ทั้งหมด |
| Business Flows (ทุก Scenario) | [20-flows.md](./20-flows.md) | ทั้งหมด |

---

## 2. UI Component Conventions

### Sortable Table Headers

ทุกตารางในหน้า list ที่ implement แล้วใช้ `SortableHeader` component (`src/components/ui/SortableHeader.tsx`)

- คลิกหัวคอลัมน์ → เรียงจากน้อยไปมาก (asc)
- คลิกซ้ำ → สลับ asc / desc
- ลูกศร ▲/▼ ที่ active คอลัมน์ จะเปลี่ยนเป็นสี **แดง** (`text-red-600`)
- ลูกศรที่ inactive จะเป็นสีเทา และเข้มขึ้นเมื่อ hover
- ใช้ utility `sortRows<T>()` จาก `src/lib/utils.ts` ในการเรียงข้อมูล
- Sort เกิดใน frontend (ไม่ส่ง query param ไป API)

```tsx
// ตัวอย่างการใช้
import { SortableHeader } from '@/components/ui/SortableHeader'
import { sortRows } from '@/lib/utils'

const [sortKey, setSortKey] = useState('name')
const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

const handleSort = (key: string) => {
  if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
  else { setSortKey(key); setSortDir('asc') }
}

const sorted = sortRows(rows, sortKey, sortDir)
```

### Full-Width Form Layout

ทุกหน้า form ต้องแสดงแบบ **เต็มจอ** (ไม่มี `mx-auto max-w-*` ที่ root div)

```tsx
// ✅ ถูกต้อง
<div className="p-6">

// ❌ ผิด — จะทำให้ไม่เต็มจอ
<div className="mx-auto max-w-4xl p-6">
```

---

## 2b. Icon Conventions

### ไอคอนทั้งหมดเป็น Inline SVG — ไม่ใช้ library ภายนอก

```tsx
// ✅ ถูกต้อง — ประกาศเป็น local function บนสุดของไฟล์
function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
```

### ไอคอนมาตรฐานที่ใช้บ่อย

| ไอคอน | ชื่อ function | ใช้ที่ |
|-------|--------------|--------|
| ➕ | `PlusIcon` (20×20) | ปุ่ม "สร้าง..." ใน header |
| 🔍 | `SearchIcon` (18×18) | ช่อง search input |
| ⬇️ | `DownloadIcon` (16×16) | ปุ่ม Export CSV |
| ◀ ▶ | Chevron SVG (16×16) | ปุ่ม pagination prev/next |

### ActionIconButton / ActionIconLink — ปุ่มไอคอนใน table rows

ใช้ `src/components/ui/ActionIconButton.tsx` เสมอสำหรับปุ่มแถวใน table

```tsx
import { ActionIconLink, ActionIconButton } from '@/components/ui/ActionIconButton'

// Link (navigate)
<ActionIconLink to={`/items/${id}/edit`} variant="edit" title="แก้ไข" />
<ActionIconLink to={`/items/${id}`}       variant="view" title="ดูรายละเอียด" />

// Button (action)
<ActionIconButton variant="delete" onClick={() => setDeleteId(id)} title="ลบ" />
<ActionIconButton variant="config" onClick={() => openConfig(id)} title="กำหนดสิทธิ์" />
```

| variant | สี default | สี hover | ใช้กับ |
|---------|-----------|---------|--------|
| `edit`   | gray-400  | amber-600 | แก้ไขข้อมูล |
| `delete` | red-400   | red-600   | ลบข้อมูล |
| `view`   | blue-400  | blue-600  | ดูรายละเอียด |
| `config` | red-500   | red-700   | กำหนดสิทธิ์ / ตั้งค่าพิเศษ |

**กฎ:** ปุ่มทุกตัวใน table row ต้อง `e.stopPropagation()` เพื่อไม่ให้ trigger row click

```tsx
<div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
  <ActionIconLink to={`/items/${id}/edit`} variant="edit" />
  <ActionIconButton variant="delete" onClick={() => setDeleteId(id)} />
</div>
```

### ❌ ห้ามใช้ Dots Dropdown Menu ใน table ที่มี overflow-x-auto

**ปัญหา:** `position: absolute` dropdown ถูก clip โดย `overflow-x-auto` / `overflow-hidden` ของ container — ทำให้เมนูหลบออกไปนอกหน้าจอ โดยเฉพาะเมื่อมีข้อมูลน้อย (1-2 row)

**กฎ:**
- ❌ ห้ามใช้ dots menu (`⋮`) + absolute-positioned dropdown สำหรับ action แก้ไข/ลบใน table
- ✅ ใช้ inline icon buttons เคียงกันใน `<td>` โดยตรง
- ✅ ถ้าต้องการ dropdown (เช่น เลือกประเภทเอกสาร 3 รายการ) ให้ใช้ Flowbite `<Dropdown>` ซึ่งรองรับ portal rendering

**Pattern มาตรฐาน (inline — ใช้ในทุก sub-table ใน FormPage):**
```tsx
<td className="px-3 py-2.5">
  <div className="flex items-center gap-1">
    <button type="button" title="แก้ไข"
      onClick={() => { setEditing(item); setShowModal(true) }}
      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
      <EditPenIcon size={14} />
    </button>
    <button type="button" title="ลบ"
      onClick={() => setDeleteTarget(item)}
      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-600">
      <TrashIcon size={14} />
    </button>
  </div>
</td>
```

---

## 2c. Filter Panel Conventions

### โครงสร้าง Filter Bar

```tsx
<div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
  <div className="flex flex-wrap items-center gap-3">

    {/* Search input — flex-1, icon ซ้าย */}
    <div className="relative flex-1 min-w-[200px]">
      <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
        <SearchIcon />
      </span>
      <input
        type="text"
        placeholder="ค้นหา..."
        value={search}
        onChange={(e) => setParam('search', e.target.value)}
        className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>

    {/* Dropdown filters */}
    <select
      value={typeFilter}
      onChange={(e) => setParam('type', e.target.value)}
      className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      <option value="">ประเภท (ทั้งหมด)</option>
      ...
    </select>

  </div>
</div>
```

**กฎ:**
- Filter bar อยู่ในกล่อง `rounded-xl border bg-white shadow-sm` แยกจาก table
- Search input กว้าง `flex-1 min-w-[200px]` ส่วน dropdown filter กว้างตามเนื้อหา
- ทุก filter ต้องส่งค่าไปยัง `useSearchParams` (`setSearchParams`) ไม่ใช่ `useState` — เพื่อให้ URL สะท้อนสถานะ filter และ Back/refresh ทำงานถูกต้อง
- เมื่อ filter เปลี่ยน ต้อง reset `page` กลับเป็น 1 (`next.delete('page')`)

---

## 2d. Page Header Conventions

### โครงสร้าง Header ของทุกหน้า List

```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold text-gray-900">ชื่อหน้า</h1>
    <p className="mt-1 text-sm text-gray-500">คำอธิบายสั้น ๆ</p>
  </div>
  <div className="flex items-center gap-2">
    {/* Export button — white/border */}
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
    {/* Create button — blue solid */}
    {canCreate && (
      <Link
        to="/items/create"
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        <PlusIcon />
        สร้าง...ใหม่
      </Link>
    )}
  </div>
</div>
```

**กฎ:**
- ปุ่ม Export: `border bg-white text-gray-700` (secondary style)
- ปุ่มสร้าง: `bg-blue-600 text-white` (primary style)
- ปุ่มทุกอันต้อง wrap ด้วย permission check (`canCreate`, `canExport` จาก `hasPermission()`)

---

## 2e. ConfirmModal — Popup ยืนยันการลบ

ใช้ `src/components/ui/ConfirmModal.tsx` แทน `window.confirm()` เสมอ

```tsx
import { ConfirmModal } from '@/components/ui/ConfirmModal'

// State
const [deleteId, setDeleteId] = useState<number | null>(null)
const [isDeleting, setIsDeleting] = useState(false)

const handleConfirmDelete = async () => {
  if (!deleteId) return
  setIsDeleting(true)
  try {
    await service.deleteItem(deleteId)
    toast.success('ลบสำเร็จ')
    fetchData()
  } catch {
    // interceptor handles display
  } finally {
    setIsDeleting(false)
    setDeleteId(null)
  }
}

// JSX
<ConfirmModal
  isOpen={deleteId !== null}
  title="ยืนยันการลบ"
  message="คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้"
  confirmLabel="ลบ"
  variant="danger"
  isLoading={isDeleting}
  onConfirm={handleConfirmDelete}
  onCancel={() => setDeleteId(null)}
/>
```

| prop | ค่า | ความหมาย |
|------|-----|---------|
| `variant` | `danger` | icon + confirm button สีแดง (ลบ) |
| `variant` | `warning` | icon + confirm button สีเหลือง (เตือน) |
| `variant` | `info` | icon + confirm button สีน้ำเงิน (ยืนยันทั่วไป) |

**กฎ:**
- ปิดได้ด้วย Escape / click backdrop / ปุ่มยกเลิก
- ล็อก body scroll เมื่อเปิด
- ปุ่ม cancel ได้ focus อัตโนมัติเมื่อ modal เปิด (safe default)
- **ห้ามใช้** `window.confirm()` ในหน้าใดทั้งสิ้น

---

## 2f. ApiErrorModal — Global Error Display

**ไม่ต้องเรียกเอง** — Axios interceptor ใน `src/api/client.ts` เรียก `useErrorStore.getState().setError(message)` อัตโนมัติเมื่อ API return error

```tsx
// ❌ ไม่ต้องทำใน catch block
} catch (err) {
  setError(getApiErrorMessage(err)) // ← ห้าม — interceptor จัดการแล้ว
}

// ✅ ถูกต้อง — catch block ทำแค่ cleanup state
} catch {
  setDeleteId(null)
}
```

**ข้อยกเว้น:** ถ้าหน้ามี inline modal form error (เช่น BrandListPage, CategoryListPage) ให้ใช้ local `const [error, setError] = useState<string | null>(null)` แยกต่างหาก — ไม่ใช้ global errorStore

---

## 2g. Status Badge Conventions

```tsx
// Pattern มาตรฐาน
const STATUS_LABEL: Record<SomeStatus, string> = { active: 'เปิดใช้งาน', inactive: 'ปิดใช้งาน' }
const STATUS_COLOR: Record<SomeStatus, string> = {
  active:   'bg-green-100 text-green-700',
  inactive: 'bg-yellow-100 text-yellow-700',
  // สีอ้างอิง:
  // danger / ยกเลิก / blacklist → bg-red-100 text-red-700
  // warning / รอ / pending     → bg-yellow-100 text-yellow-700
  // success / active / อนุมัติ → bg-green-100 text-green-700
  // info / in_progress          → bg-blue-100 text-blue-700
  // neutral / ร่าง              → bg-gray-100 text-gray-600
}

// Render
<span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLOR[item.status])}>
  {STATUS_LABEL[item.status]}
</span>
```

---

## 2h. Table & Skeleton Loading Conventions

### Table Shell

```tsx
<div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full text-sm text-left">
      <thead className="border-b border-gray-200 bg-gray-50">
        <tr>
          <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">คอลัมน์</th>
          ...
          <th className="px-4 py-3 font-medium text-gray-600 text-right">จัดการ</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {isLoading ? <SkeletonRows cols={N} rows={8} /> : ...}
      </tbody>
    </table>
  </div>
  {/* Pagination อยู่นี่ */}
</div>
```

### Skeleton Loading

```tsx
// Skeleton rows ขณะโหลด
{isLoading && Array.from({ length: 8 }).map((_, i) => (
  <tr key={i}>
    {Array.from({ length: N }).map((__, j) => (
      <td key={j} className="px-4 py-3">
        <div className="h-4 rounded bg-gray-100 animate-pulse" />
      </td>
    ))}
  </tr>
))}

// Empty state
{!isLoading && rows.length === 0 && (
  <tr>
    <td colSpan={N} className="px-4 py-12 text-center text-gray-400">
      ไม่พบข้อมูล
    </td>
  </tr>
)}
```

### Row Click

```tsx
// ทุก list page — คลิก row → navigate ไปหน้า detail
<tr
  onClick={() => navigate(`/items/${item.id}`)}
  className="cursor-pointer hover:bg-blue-50 transition-colors"
>
```

---

## 2i. Pagination Conventions

```tsx
// ใช้ useSearchParams เก็บ page state
const page = Number(searchParams.get('page') ?? '1')
const limit = 20
const totalPages = Math.ceil(total / limit)
const rowStart = (page - 1) * limit + 1
const rowEnd = Math.min(page * limit, total)

// UI อยู่ที่ด้านล่าง table ใน border-t
<div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
  <p className="text-sm text-gray-500">
    {total > 0 ? `Showing ${rowStart.toLocaleString()}-${rowEnd.toLocaleString()} of ${total.toLocaleString()}` : 'ไม่พบข้อมูล'}
  </p>
  {totalPages > 1 && (
    <div className="flex items-center gap-1">
      {/* Prev */}
      <button disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}
        className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-40">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      {/* Page numbers (max 5 visible, sliding window) */}
      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => { /* ... */ }).map((p) => (
        <button key={p} onClick={() => setParam('page', String(p))}
          className={cn('min-w-[32px] rounded-lg border px-2.5 py-1 text-sm',
            p === page ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-200 hover:bg-gray-50 text-gray-600')}>
          {p}
        </button>
      ))}
      {/* Next */}
      <button disabled={page >= totalPages} onClick={() => setParam('page', String(page + 1))}
        className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-40">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
    </div>
  )}
</div>
```

**กฎ:**
- `limit = 20` เสมอ (ยกเว้น export ใช้ `limit=0`)
- Page number แสดงสูงสุด 5 หน้า แบบ sliding window
- แสดง `Showing X-Y of Z` ด้านล่างซ้าย

---

## 3. Layout หลัก (Shell)

### Components ที่ต้องมี:

**Header Bar:**
- Logo "สุดยอดมอเตอร์"
- Branch Selector dropdown (เลือกสาขาที่ดูข้อมูล) — `GET /branches`
- Notification Bell + badge จำนวนยังไม่อ่าน — `GET /notifications/unread-count`
- Profile dropdown: ชื่อ + ตำแหน่ง → Change Password / Sessions / Logout

**Sidebar:**
- เมนูตาม Navigation Structure ด้านบน
- ซ่อน/แสดงเมนูตามสิทธิ์ (ดึงจาก `GET /permissions/me`)
- เช่น ถ้า `customers.can_view = false` → ไม่แสดงเมนูลูกค้า

**Content Area:**
- Breadcrumb path
- Page content

**Global State ที่ต้องเก็บ:**
- `token` — JWT token
- `employee` — ข้อมูลตัวเอง (จาก login response หรือ `GET /auth/me`)
- `permissions` — สิทธิ์ทั้งหมด (จาก `GET /permissions/me`)
- `currentBranch` — สาขาที่เลือกดู (default จาก `employee.branch_id`)
- `accessibleBranches` — สาขาที่เข้าถึงได้ทั้งหมด (primary + multi-branch จาก `employee_branches`) — ใช้เป็นตัวเลือกใน branch selector

**Accept-Language Header:**
- ทุก API request ส่ง `Accept-Language: th` (default) หรือ `en`
- สามารถมี Language Switcher ใน header ให้ user เลือก

---

## 4. Quick Reference — ข้อควรระวังสำคัญ

| หัวข้อ | รายละเอียด |
|--------|-----------|
| **Token** | เก็บ JWT, auto refresh ก่อนหมดอายุ ด้วย `POST /auth/refresh-token` |
| **Permission** | ดึง `GET /permissions/me` ตอน login → ซ่อน/แสดงเมนู + ปุ่ม |
| **Branch** | ทุก list API ส่ง `branch_id` filter (จาก branch selector) |
| **Pagination** | ทุก list: `?page=1&limit=20` (min 10, max 100) |
| **Export** | limit=0 ดึงทั้งหมด, response อาจเป็น CSV/Excel |
| **i18n** | ทุก request ส่ง `Accept-Language: th` หรือ `en` |
| **File Upload** | ใช้ `multipart/form-data` (GPS photos, documents, product images) |
| **GPS** | ขอ permission จาก browser สำหรับ GPS photos + check-in |
| **Date Format** | `YYYY-MM-DD`, Datetime `YYYY-MM-DDTHH:mm:ss` (ไม่มี Z — Bangkok) |
| **ใบเสร็จต้องกดเอง** | `POST /invoices/{id}/issue-receipt` ไม่ออกอัตโนมัติ |
| **Sortable Headers** | ทุก list page เรียงข้อมูลใน frontend ผ่าน `SortableHeader` + `sortRows()` — ไม่ส่ง sort param ไป API |
| **Form Layout** | ทุก form page ใช้ layout เต็มจอ (ไม่มี `mx-auto max-w-*`) |
| **ใบเสร็จมัดจำ** | ออกอัตโนมัติตอน `POST /deposits` |
| **ตัดสต็อกซ่อม** | เกิดตอน SO: approved → in_progress |
| **ตัดสต็อกขาย** | เกิดตอน INV: draft → issued |
| **Status forward only** | ทุก status ไปข้างหน้าเท่านั้น (ยกเว้น reopen) |
| **Error Response** | `{ success: false, message: "...", errors: {} }` |
