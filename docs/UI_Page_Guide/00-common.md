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
│   └── บริษัทไฟแนนซ์
├── 📋 Audit Log
└── 🔔 แจ้งเตือน (badge จำนวน)
```

> **สำคัญ**: เมนูที่แสดงขึ้นอยู่กับสิทธิ์ของผู้ใช้ — ดึงจาก `GET /permissions/me` ตอน login สำเร็จ

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
