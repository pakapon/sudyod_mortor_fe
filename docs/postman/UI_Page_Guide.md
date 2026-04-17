# คู่มือหน้า UI — Sudyod Motor ERP

> เอกสารนี้อธิบายทุกหน้าที่ต้องสร้าง, แต่ละหน้ามีอะไรบ้าง, เรียก API อะไร, และเชื่อมต่อกันยังไง
> เขียนสำหรับ Frontend Developer เพื่อให้เข้าใจภาพรวมก่อนลงมือทำ

---

## สารบัญ

1. [ภาพรวมระบบ](#1-ภาพรวมระบบ)
2. [Login & Auth](#2-login--auth)
3. [Layout หลัก (Shell)](#3-layout-หลัก-shell)
4. [Dashboard](#4-dashboard)
5. [ลูกค้า (Customers)](#5-ลูกค้า-customers)
6. [ใบสั่งซ่อม (Service Orders)](#6-ใบสั่งซ่อม-service-orders)
7. [ใบเสนอราคา (Quotations)](#7-ใบเสนอราคา-quotations)
8. [ใบแจ้งหนี้ (Invoices)](#8-ใบแจ้งหนี้-invoices)
9. [มัดจำ (Deposits)](#9-มัดจำ-deposits)
10. [ใบส่งมอบ (Delivery Notes)](#10-ใบส่งมอบ-delivery-notes)
11. [ใบรับประกัน (Warranties)](#11-ใบรับประกัน-warranties)
12. [สินค้า (Products)](#12-สินค้า-products)
13. [คลังสินค้า & สต็อก (Inventory)](#13-คลังสินค้า--สต็อก-inventory)
14. [ใบสั่งซื้อ (Purchase Orders)](#14-ใบสั่งซื้อ-purchase-orders)
15. [สินเชื่อ & ไฟแนนซ์ (Loans & Finance)](#15-สินเชื่อ--ไฟแนนซ์-loans--finance)
16. [พนักงาน & HR](#16-พนักงาน--hr)
17. [ตั้งค่าระบบ (Settings)](#17-ตั้งค่าระบบ-settings)
18. [แจ้งเตือน (Notifications)](#18-แจ้งเตือน-notifications)
19. [Audit Log](#19-audit-log)
20. [Flow เชื่อมระหว่างหน้า](#20-flow-เชื่อมระหว่างหน้า)

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

## 2. Login & Auth

### 2.1 หน้า Login

**Route:** `/login`

**Components:**
- Input: `identifier` (placeholder: "อีเมลหรือเบอร์โทร") — รับทั้ง email และ phone
- Input: `password` (type: password, toggle show/hide)
- Button: "เข้าสู่ระบบ"
- Link: "ลืมรหัสผ่าน?" → ไปหน้า Forgot Password

**API:**
```
POST /auth/login
Body: { identifier, password }
→ เก็บ token ใน localStorage/cookie
→ เรียก GET /permissions/me → เก็บสิทธิ์ไว้ใน state
→ redirect ไป Dashboard
```

**Logic:**
- ถ้า identifier มี `@` → server query email, ไม่มี → query phone
- Token expired → redirect กลับ Login
- Auto refresh token ก่อนหมดอายุ ด้วย `POST /auth/refresh-token`

### 2.2 หน้า Forgot Password (3 ขั้นตอน)

**Route:** `/forgot-password`

**Step 1 — ส่ง OTP:**
- Input: `phone` (เบอร์โทร)
- Button: "ส่งรหัส OTP"
- API: `POST /auth/forgot-password { phone }`

**Step 2 — กรอก OTP:**
- Input: OTP 6 หลัก (auto-focus, ตัวต่อตัว)
- Countdown: 5 นาที (ส่งใหม่ได้เมื่อหมดเวลา)
- API: `POST /auth/verify-otp { phone, otp_code }`
- ได้ `reset_token` กลับมา

**Step 3 — ตั้งรหัสใหม่:**
- Input: `new_password` + `confirm_password`
- Button: "ตั้งรหัสผ่านใหม่"
- API: `POST /auth/reset-password { reset_token, new_password }`
- สำเร็จ → redirect ไป Login

### 2.3 หน้า Change Password

**Route:** `/settings/change-password` (ใน layout หลัก)

- Input: `current_password`
- Input: `new_password` + `confirm_password`
- API: `PUT /auth/change-password`

### 2.4 Session Management

**เข้าถึงจาก:** Profile dropdown → "จัดการ Session"

- แสดงรายการ session ที่ login อยู่ (device, เวลา, IP)
- ปุ่ม "Kick" ตัดออกจากระบบ
- API: `GET /auth/sessions`, `DELETE /auth/sessions/{id}`

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

**Accept-Language Header:**
- ทุก API request ส่ง `Accept-Language: th` (default) หรือ `en`
- สามารถมี Language Switcher ใน header ให้ user เลือก

---

## 4. Dashboard

**Route:** `/dashboard`
**Permission:** `dashboard.can_view`

### Components:

**Stats Cards (แถวบน):**
- ใบสั่งซ่อมวันนี้ / เดือนนี้
- รายรับวันนี้ / เดือนนี้
- จำนวนลูกค้าใหม่
- สินค้าสต็อกต่ำ
- ใบแจ้งหนี้ค้างชำระ (overdue)
- API: `GET /dashboard/stats?branch_id=1`

**Charts (กลาง):**
- กราฟรายรับรายจ่ายรายเดือน
- กราฟจำนวนใบสั่งซ่อมรายสัปดาห์
- กราฟสินค้าขายดี
- API: `GET /dashboard/charts?branch_id=1&period=monthly`

**Quick Actions:**
- ปุ่ม "สร้างใบสั่งซ่อม" → ไป `/service-orders/create`
- ปุ่ม "ขายหน้าร้าน" → ไป `/invoices/create-retail`
- ปุ่ม "รับรถเข้า" → ไป `/service-orders/create`

**Recent Activity:**
- SO ล่าสุด 5 รายการ + status badge
- Invoice ค้างชำระ
- Low stock alerts

**Links ไปหน้าอื่น:**
- คลิก stat card → ไปหน้า list ที่เกี่ยวข้อง
- คลิก SO → ไปหน้า detail ของ SO นั้น

---

## 5. ลูกค้า (Customers)

### 5.1 หน้า List ลูกค้า

**Route:** `/customers`
**Permission:** `customers.can_view`

**Components:**
- Search bar: ค้นชื่อ/เบอร์โทร/tax_id
- Filter: `type` (individual/corporate), `branch_id`
- Table columns: ชื่อ, ประเภท, เบอร์โทร, สาขา, วันที่สร้าง
- Pagination: page, limit (default 20)
- Export button → `GET /customers/export`
- ปุ่ม "เพิ่มลูกค้า" → modal หรือ `/customers/create`

**API:** `GET /customers?search=xxx&type=individual&branch_id=1&page=1&limit=20`

### 5.2 หน้า สร้าง/แก้ไข ลูกค้า

**Route:** `/customers/create` หรือ `/customers/{id}/edit`

**Form Fields:**

**Section: ข้อมูลทั่วไป**
| Field | Type | Required | หมายเหตุ |
|-------|------|----------|---------|
| `type` | Select: individual / corporate | ✅ | เปลี่ยนแล้ว fields ด้านล่างจะเปลี่ยนตาม |
| `first_name` | Text | ✅ (individual) | |
| `last_name` | Text | ✅ (individual) | |
| `company_name` | Text | ✅ (corporate) | |
| `company_branch` | Text | ❌ (corporate) | สาขาของบริษัทลูกค้า |
| `tax_id` | Text | ❌ (corporate) | เลข 13 หลัก |
| `contact_name` | Text | ❌ (corporate) | ผู้ติดต่อ |
| `contact_position` | Text | ❌ (corporate) | ตำแหน่งผู้ติดต่อ |
| `email` | Email | ❌ | |
| `address` | Textarea | ❌ | |
| `branch_id` | Select | ✅ | dropdown สาขา — `GET /branches` |
| `note` | Textarea | ❌ | |

**API:**
- สร้าง: `POST /customers`
- แก้ไข: `PUT /customers/{id}` (ต้อง `GET /customers/{id}` ก่อนเพื่อ prefill)

### 5.3 หน้า Detail ลูกค้า

**Route:** `/customers/{id}`

**Layout: Tab-based**

**Tab ข้อมูลทั่วไป:**
- แสดงข้อมูลลูกค้าทั้งหมด
- ปุ่ม "แก้ไข", "ลบ"
- API: `GET /customers/{id}`

**Tab เบอร์โทรศัพท์:**
- List เบอร์โทรทั้งหมด (type: mobile/home/work/fax, number, is_primary)
- ปุ่ม "เพิ่มเบอร์" → modal: `type` (select), `number`, `is_primary` (toggle)
- API: `GET /customers/{id}/phones`, `POST /customers/{id}/phones`

**Tab ที่อยู่ออกบิล (Billing Addresses):**
- List ที่อยู่ออกใบกำกับภาษี
- ปุ่ม "เพิ่มที่อยู่" → modal
- Fields: `label`, `address`, `province`, `district`, `sub_district`, `postal_code`, `is_default`
- API: `GET /customers/{id}/billing-addresses`, `POST /customers/{id}/billing-addresses`
- ⚠️ ใช้ตอนออก Invoice/Receipt → dropdown เลือกที่อยู่

**Tab รถยนต์ (Vehicles):**
- List รถทั้งหมดของลูกค้า
- ปุ่ม "เพิ่มรถ" → modal/form
- Fields: `plate_number`, `province`, `brand`, `model`, `year`, `color`, `vin`, `engine_number`, `mileage`
- API: `GET /customers/{id}/vehicles`, `POST /customers/{id}/vehicles`
- คลิกรถ → แสดง popup ประวัติซ่อมของรถนั้น
- ⚠️ เลือกรถตอนสร้าง SO

**Tab เอกสาร (Documents):**
- List เอกสารที่อัปโหลด (สำเนาบัตร, ทะเบียนบ้าน ฯลฯ)
- ปุ่ม "อัปโหลด" → file upload (multipart/form-data)
- Fields: `type` (select), `file` (file input)
- API: `GET /customers/{id}/documents`, `POST /customers/{id}/documents`

**Tab Timeline:**
- แสดงเหตุการณ์ทั้งหมดเรียงตามเวลา (สร้างลูกค้า, ส่งซ่อม, ซื้อของ, บันทึกพนักงาน)
- ปุ่ม "เพิ่มบันทึก" → modal: `event_type`, `event_date`, `description`
- API: `GET /customers/{id}/timeline`, `POST /customers/{id}/timeline`

**Tab ประวัติ:**
- **ประวัติซ่อม**: `GET /customers/{id}/service-history` → list SO ทั้งหมด
- **ประวัติซื้อ**: `GET /customers/{id}/purchase-history` → list Invoice ทั้งหมด
- **ประวัติรับประกัน**: `GET /customers/{id}/warranty-history` → list Warranty ทั้งหมด
- คลิกแต่ละรายการ → navigate ไปหน้า detail ของ SO/INV/WR นั้น

### 5.4 Flow เชื่อมต่อ

```
หน้าลูกค้า → เลือกรถ → "สร้างใบสั่งซ่อม" → ไป /service-orders/create?customer_id=X&vehicle_id=Y
หน้าลูกค้า → "สร้างใบเสนอราคา (ขาย)" → ไป /quotations/create?customer_id=X
หน้าลูกค้า → Tab ประวัติ → คลิก SO → ไป /service-orders/{id}
```

---

## 6. ใบสั่งซ่อม (Service Orders)

> **หัวใจของระบบ** — ทุก Scenario A (ซ่อมรถ) เริ่มที่นี่

### 6.1 หน้า List ใบสั่งซ่อม

**Route:** `/service-orders`
**Permission:** `service_orders.can_view`

**Components:**
- Search: เลข SO / ชื่อลูกค้า / ทะเบียนรถ
- Filter: `status` (dropdown multi-select 9 สถานะ), `branch_id`, `technician_id`, `date_from`, `date_to`
- Summary bar: `GET /service-orders/summary` → แสดงจำนวน SO แต่ละ status (เหมือน Kanban header)
- Table columns: เลข SO, ลูกค้า, ทะเบียนรถ, สถานะ (badge สี), ช่าง, วันที่รับ, วันนัดรับ
- Status badge สี:
  - `draft` → สีเทา
  - `pending_review` → สีเหลือง
  - `pending_quote` → สีส้ม
  - `approved` → สีน้ำเงิน
  - `in_progress` → สีม่วง
  - `completed` → สีเขียวอ่อน
  - `pending_payment` → สีแดง
  - `pending_pickup` → สีชมพู
  - `closed` → สีเขียวเข้ม
  - `cancelled` → สีเทาเข้ม
- Export: `GET /service-orders/export`
- ปุ่ม "สร้างใบสั่งซ่อม"

**API:** `GET /service-orders?status=in_progress&branch_id=1&page=1&limit=20`

**มุมมองทางเลือก:** Kanban Board — แต่ละ column คือ status, ลาก card ย้าย status (เรียก transition API)

### 6.2 หน้า สร้างใบสั่งซ่อม

**Route:** `/service-orders/create`

**Form Sections:**

**Section 1: เลือกลูกค้า + รถ**
- Autocomplete ค้นลูกค้า → `GET /customers?search=xxx`
- เลือกลูกค้าแล้ว → แสดงรถทั้งหมด → `GET /customers/{id}/vehicles`
- ถ้ายังไม่มีลูกค้า → ปุ่ม "สร้างลูกค้าใหม่" (modal)
- ถ้ายังไม่มีรถ → ปุ่ม "เพิ่มรถ" (modal)

**Section 2: ข้อมูลใบสั่งซ่อม**
| Field | Type | Required |
|-------|------|----------|
| `description` | Textarea | ✅ | อาการเสีย/สิ่งที่ต้องทำ |
| `mileage_in` | Number | ❌ | เลขไมล์ตอนรับรถ |
| `estimated_completion_date` | Date | ❌ | วันนัดรับ |
| `branch_id` | Select | ✅ | (auto จาก current branch) |

- ปุ่ม "บันทึกฉบับร่าง" → สถานะ `draft`
- API: `POST /service-orders`
- สำเร็จ → redirect ไป `/service-orders/{id}` (หน้า detail)

### 6.3 หน้า Detail ใบสั่งซ่อม ⭐

**Route:** `/service-orders/{id}`

> หน้านี้สำคัญที่สุด — เป็น hub ของ Flow A ทั้งหมด

**Layout: หน้าเดียว + Tabs + Action Buttons ด้านบน**

**Header:**
- เลข SO (SO-2026-XXXX) + Status Badge
- ชื่อลูกค้า (link ไปหน้าลูกค้า)
- ทะเบียนรถ + ยี่ห้อ/รุ่น
- ช่างที่รับผิดชอบ (หรือ "ยังไม่มอบหมาย")
- วันที่รับ / วันนัดรับ

**Action Buttons (แสดงตาม status + permission):**

| Status ปัจจุบัน | ปุ่มที่แสดง | API | ไปหน้า/ทำอะไร |
|----------------|------------|-----|--------------|
| `draft` | "ส่งตรวจสอบ" | `PATCH /service-orders/{id}/transition { status: "pending_review" }` | ⚠️ ต้องมี GPS pre_intake ≥1 |
| `draft` | "ยกเลิก" | `POST /service-orders/{id}/cancel` | |
| `pending_review` | "พร้อมเสนอราคา" | transition → `pending_quote` | |
| `pending_quote` | "สร้างใบเสนอราคา" | → navigate ไป `/quotations/create?service_order_id={id}` | |
| `pending_quote` | "ยกเลิก" | cancel | |
| `approved` | "มอบหมายช่าง" | `PATCH /service-orders/{id}/assign { technician_id }` | dropdown เลือกช่าง |
| `approved` | "เริ่มซ่อม" | transition → `in_progress` | ⚠️ ต้องมี technician + ตัดสต็อกอัตโนมัติ |
| `in_progress` | "ซ่อมเสร็จ" | transition → `completed` | |
| `completed` | "รอชำระ" | transition → `pending_payment` | |
| `pending_payment` | "ดูใบแจ้งหนี้" | → navigate ไปหน้า Invoice | |
| `pending_payment` | "รอรับรถ" | transition → `pending_pickup` | ⚠️ ต้องมี Invoice + Receipt ครบ |
| `pending_pickup` | "ปิดงาน" | transition → `closed` | ⚠️ ต้องมี GPS delivery ≥1 + DN signed |
| `closed` | "เปิดงานอีกครั้ง" | `PATCH /service-orders/{id}/reopen` | เฉพาะผู้จัดการ (approve) |

**Tab: รายการอะไหล่/ค่าแรง (SO Items)**
- Table: ชื่อสินค้า/บริการ, จำนวน, ราคาต่อหน่วย, ส่วนลด, ราคารวม
- ปุ่ม "เพิ่มรายการ" → modal:
  - เลือกสินค้า → `GET /products?search=xxx` (autocomplete)
  - หรือพิมพ์ค่าแรง (type: service)
  - `quantity`, `unit_price`, `discount`
- ลบรายการ: `DELETE /service-orders/{id}/items/{iid}`
- สรุปยอดรวม (subtotal, discount, vat, total)
- API: `GET /service-orders/{id}/items`, `POST /service-orders/{id}/items`
- ⚠️ แก้ได้เฉพาะ status ≤ pending_quote

**Tab: GPS Photos**
- แสดงรูปทั้งหมดจัดกลุ่มตาม `photo_type`:
  - `pre_intake` — ก่อนรับรถ (⚠️ บังคับ ≥1 ก่อน pending_review)
  - `damage_spot` — ตำแหน่งเสียหาย
  - `pre_repair` — ก่อนซ่อม
  - `pre_delivery` — ก่อนส่งมอบ
  - `delivery` — ส่งมอบ (⚠️ บังคับ ≥1 ก่อน closed)
- Gallery view + click enlarge
- ปุ่ม "ถ่ายรูป/อัปโหลด" (mobile-first)
  - ต้องส่ง: `photo` (file), `photo_type`, `latitude`, `longitude`, `taken_at`
  - ⚠️ ขอ GPS permission จาก browser
  - Server จะ stamp watermark 4 บรรทัดอัตโนมัติ
- API: `GET /service-orders/{id}/gps-photos`, `POST /service-orders/{id}/gps-photos` (multipart/form-data)

**Tab: เอกสารที่เกี่ยวข้อง**
- Link ไป QT, INV, DN, WR ที่ผูกกับ SO นี้
- แสดงสถานะแต่ละเอกสาร

**Tab: Audit Log/History**
- แสดง timeline การเปลี่ยน status + ใครทำเมื่อไหร่

### 6.4 Status Flow Diagram (สำหรับ UI)

```
draft ──→ pending_review ──→ pending_quote ──→ approved ──→ in_progress
  │           │                   │                            │
  └── cancel  └── (ไม่ cancel)    └── cancel                   │
                                                               ▼
                                                          completed
                                                               │
                                                               ▼
                                                       pending_payment
                                                               │
                                                               ▼
                                                       pending_pickup ◄── reopen (ผู้จัดการ)
                                                               │
                                                               ▼
                                                            closed
```

---

## 7. ใบเสนอราคา (Quotations)

### 7.1 หน้า List

**Route:** `/quotations`
**Permission:** `quotations.can_view`

**Components:**
- Search: เลข QT / ชื่อลูกค้า
- Filter: `status` (draft/sent/approved/rejected/expired), `type` (service/sale), `branch_id`
- Table: เลข QT, type, ลูกค้า, ยอดรวม, สถานะ, วันที่สร้าง, หมดอายุ
- API: `GET /quotations?status=draft&type=service&page=1&limit=20`

### 7.2 หน้า สร้าง/แก้ไข Quotation

**Route:** `/quotations/create` หรือ `/quotations/{id}/edit`

**กรณีมาจาก SO (type=service):**
- `service_order_id` ส่งมาใน query param
- ระบบดึงข้อมูลลูกค้า + items จาก SO มา prefill
- API: `GET /service-orders/{id}` + `GET /service-orders/{id}/items`

**กรณีขายอะไหล่ (type=sale):**
- เลือกลูกค้า (autocomplete)
- เพิ่ม items เอง

**Form Fields:**
| Field | Type | Required | หมายเหตุ |
|-------|------|----------|---------|
| `type` | Select: service / sale | ✅ | |
| `customer_id` | Autocomplete | ✅ | |
| `service_order_id` | Hidden | ถ้า service | |
| `validity_days` | Number | ✅ | จำนวนวันหมดอายุ (default 30) |
| `note` | Textarea | ❌ | |

**Items Table (เหมือน SO Items):**
- สินค้า/บริการ, จำนวน, ราคา, ส่วนลด
- สรุปยอด

**API:** `POST /quotations`, `PATCH /quotations/{id}`

### 7.3 หน้า Detail Quotation

**Route:** `/quotations/{id}`

**Action Buttons:**

| Status | ปุ่ม | API | หมายเหตุ |
|--------|------|-----|---------|
| `draft` | "ส่งให้ลูกค้า" | → status `sent` | |
| `sent` | "อนุมัติ" | `PATCH /quotations/{id}/approve` | permission: approve |
| `sent` | "ปฏิเสธ" | `PATCH /quotations/{id}/reject { reject_reason }` | ต้องใส่เหตุผล |
| `approved` | "สร้างใบแจ้งหนี้" | → navigate `/invoices/create-from-qt?quotation_id={id}` | |
| `approved` | "รับมัดจำ" (ถ้า type=sale) | → navigate `/deposits/create?quotation_id={id}` | เฉพาะ Flow B2 |

**แสดงข้อมูล:**
- Header: เลข QT, ลูกค้า, ยอดรวม, สถานะ, วันหมดอายุ
- Items Table (read-only ถ้าไม่ใช่ draft)
- ถ้ามี SO → link ไปหน้า SO
- ถ้ามี Invoice → link ไปหน้า Invoice
- ถ้ามี Deposit → แสดงข้อมูลมัดจำ

**Status Flow:**
```
draft → sent → approved → (สร้าง Invoice ได้)
              → rejected
              → expired (อัตโนมัติเมื่อเลย validity_days)
```

---

## 8. ใบแจ้งหนี้ (Invoices)

### 8.1 หน้า List

**Route:** `/invoices`
**Permission:** `invoices.can_view`

- Filter: `status` (draft/issued/paid/overdue/cancelled), `type` (service/sale/retail), `branch_id`
- Table: เลข INV, type, ลูกค้า, ยอดรวม, จ่ายแล้ว, ค้าง, สถานะ, due_date
- **สี overdue แดงเด่น** — INV ที่เลย due_date + ยังไม่จ่าย

### 8.2 สร้าง Invoice — 3 ทาง

**ทาง 1: จาก Quotation (Flow A, B1, B2)**
- Route: `/invoices/create-from-qt?quotation_id={id}`
- API: `POST /invoices/from-quotation { quotation_id, due_date }`
- Items มาจาก QT อัตโนมัติ
- ถ้ามี deposit → ยอดหัก deposit amount

**ทาง 2: Retail (Flow C — ขายหน้าร้าน)**
- Route: `/invoices/create-retail`
- API: `POST /invoices/retail`
- เลือกสินค้าเอง (POS-style)
- Component: Product search + เพิ่มลงตะกร้า + สรุปยอด
- ⚠️ ลูกค้า optional (walk-in)

**ทาง 3: สร้างตรง (ถ้ามี)**
- อาจไม่จำเป็นถ้ามีทาง 1 + 2

### 8.3 หน้า Detail Invoice

**Route:** `/invoices/{id}`

**Header:**
- เลข INV, type, ลูกค้า, สถานะ, due_date, ยอดรวม, จ่ายแล้ว, ค้างชำระ

**Action Buttons:**

| Status | ปุ่ม | API | หมายเหตุ |
|--------|------|-----|---------|
| `draft` | "Issue" | `POST /invoices/{id}/issue` | ⚠️ ถ้า type=sale → ตัดสต็อกทันที |
| `draft` | "ยกเลิก" | `POST /invoices/{id}/cancel { cancel_reason }` | |
| `issued` | "บันทึกชำระ" | → modal Payment | |
| `issued` | "ยกเลิก" | cancel | |
| `paid` | "ออกใบเสร็จ" | `POST /invoices/{id}/issue-receipt` | ⚠️ ต้องกดเอง ไม่ออกอัตโนมัติ |
| `paid` | "สร้างใบส่งมอบ" | → `/delivery-notes/create?invoice_id={id}` | |
| `paid` | "สร้างใบรับประกัน" | → `/warranties/create?invoice_id={id}` | |

**Section: Payment History**
- Table: วันที่, วิธีชำระ, จำนวนเงิน, หมายเหตุ
- API: `GET /invoices/{id}/payments`

**Modal: บันทึกการชำระเงิน**
- Fields: `amount`, `method` (cash/transfer/credit_card/cheque), `reference_no`, `note`, `paid_at`
- API: `POST /invoices/{id}/payments`
- ⚠️ จ่ายหลายครั้งได้ (partial payment) → เมื่อยอดครบ → status `paid` อัตโนมัติ

**Section: Items (read-only)**

**Section: เอกสารที่เกี่ยวข้อง**
- Link ไป QT, SO, Deposit, Receipt (PDF), DN, Warranty

### 8.4 Invoice Status Flow
```
draft → issued → paid
               → overdue (อัตโนมัติ — Job ตรวจทุกคืน)
       → cancelled
```

### 8.5 วิธีชำระเงิน 3 แบบ

| วิธี | Flow | หมายเหตุ |
|------|------|---------|
| **เงินสด / โอน** | Payment → INV paid → Receipt | ง่ายที่สุด |
| **ไฟแนนซ์** | สร้าง Loan Application → อนุมัติ → Payment (จากไฟแนนซ์) | ลูกค้าไม่จ่ายเอง |
| **ผ่อนร้าน** | สร้าง Store Loan → จ่ายงวดทุกเดือน → Payment ทีละงวด | ร้านเป็นเจ้าหนี้เอง |

---

## 9. มัดจำ (Deposits)

**Route:** `/deposits`
**Permission:** `deposits.can_view`

### 9.1 เมื่อไหร่ใช้?
- **เฉพาะ Flow B2 (ขายมีมัดจำ)** — ลูกค้าจ่ายมัดจำก่อนซื้อ
- สร้างจาก Quotation ที่ approved (type=sale)

### 9.2 หน้า List
- Table: เลข Deposit, QT ref, ลูกค้า, จำนวนเงิน, สถานะ (active/refunded)

### 9.3 สร้าง Deposit
- API: `POST /deposits { quotation_id, amount, method, reference_no }`
- ⚠️ ใบเสร็จมัดจำออกอัตโนมัติทันที (ไม่ต้องกดเหมือน Receipt ปกติ)

### 9.4 Detail
- แสดงข้อมูลมัดจำ + link ไป QT
- ปุ่ม "ดูใบเสร็จ" → `GET /deposits/{id}/receipt` (PDF)
- ปุ่ม "คืนมัดจำ" → `PATCH /deposits/{id}/refund`

---

## 10. ใบส่งมอบ (Delivery Notes)

**Route:** `/delivery-notes`
**Permission:** `delivery_notes.can_view`

### 10.1 เมื่อไหร่ใช้?
- **Flow A (ซ่อม)**: บังคับ — ลูกค้าต้องเซ็นรับรถก่อน close SO
- **Flow B1/B2 (ขาย)**: ไม่บังคับ — แต่ควรทำเมื่อส่งสินค้าให้ลูกค้า

### 10.2 สร้าง DN
- API: `POST /delivery-notes { invoice_id }`
- Items มาจาก Invoice อัตโนมัติ

### 10.3 Detail
- แสดงรายการสินค้าที่ส่งมอบ
- ปุ่ม "ลูกค้าเซ็นรับ" → `PATCH /delivery-notes/{id}/sign`
- ⚠️ `signed_at` ต้องไม่เป็น null ก่อน SO จะ close ได้
- แสดง signature (ถ้ามี digital signature)

---

## 11. ใบรับประกัน (Warranties)

**Route:** `/warranties`
**Permission:** `warranties.can_view`

### 11.1 เมื่อไหร่ใช้?
- สร้างหลัง Invoice paid + ส่งมอบแล้ว
- ผูกกับ SO (ซ่อม) หรือ Invoice (ขาย)

### 11.2 สร้าง Warranty
- Fields: `owner_type` (service_order/invoice), `owner_id`, `warranty_months`, `start_date`, `conditions`
- API: `POST /warranties`

### 11.3 List + Detail
- Table: เลข WR, ลูกค้า, ระยะรับประกัน, วันหมดอายุ, สถานะ (active/expired)
- Detail: ข้อมูลรับประกัน + เงื่อนไข + link ไป SO/INV
- ⚠️ Job `service-reminder` ตรวจรถที่ใกล้เช็คระยะ → แจ้งเตือน

---

## 12. สินค้า (Products)

### 12.1 หน้า List สินค้า

**Route:** `/products`
**Permission:** `products.can_view`

- Search: SKU / ชื่อสินค้า
- Filter: `brand_id`, `category_id`, `type` (goods/service)
- Table: SKU, ชื่อ, ยี่ห้อ, หมวด, ราคาขาย, สต็อกรวม
- Export: `GET /products/export`
- API: `GET /products?search=xxx&brand_id=1&page=1&limit=20`

### 12.2 หน้า สร้าง/แก้ไข สินค้า

**Form Fields:**
| Field | Type | Required |
|-------|------|----------|
| `sku` | Text | ✅ |
| `name` | Text | ✅ |
| `type` | Select: goods / service | ✅ |
| `brand_id` | Select | ❌ | dropdown — `GET /brands` |
| `category_id` | Select | ✅ | dropdown — `GET /product-categories` |
| `unit_id` | Select | ✅ | dropdown — `GET /product-units` |
| `description` | Textarea | ❌ |
| `cost_price` | Number | ❌ |
| `selling_price` | Number | ✅ |
| `min_stock` | Number | ❌ | สำหรับ low stock alert |

### 12.3 หน้า Detail สินค้า

**Tab-based:**

**Tab รูปภาพ:**
- Gallery รูปสินค้า (drag to reorder)
- อัปโหลด: `POST /products/{id}/images` (multipart)
- ลบ: `DELETE /products/{id}/images/{iid}`
- เรียงลำดับ: `PUT /products/{id}/images/reorder`

**Tab ราคา (Pricing):**
- ตารางราคาหลายระดับ (ขายปลีก, ขายส่ง, ราคาพิเศษ)
- API: `GET /products/{id}/pricing`, `PUT /products/{id}/pricing`

**Tab แปลงหน่วย (Unit Conversions):**
- เช่น 1 กล่อง = 12 ชิ้น
- API: CRUD `/products/{id}/unit-conversions`

**Tab BOM (Bill of Materials):**
- สำหรับ "ชุด" — แสดงส่วนประกอบ
- เช่น "ชุดเปลี่ยนถ่าย" = น้ำมันเครื่อง 4L + กรอง 1 ชิ้น + ...
- API: CRUD `/products/{id}/bom`
- เช็คสต็อก BOM: `GET /products/{id}/bom/availability` → แสดงว่าทำได้กี่ชุด

---

## 13. คลังสินค้า & สต็อก (Inventory)

### 13.1 หน้า List คลังสินค้า

**Route:** `/warehouses`
**Permission:** `warehouses.can_view`

- Table: ชื่อคลัง, สาขา, จำนวนสินค้า, สถานะ
- API: `GET /warehouses`

### 13.2 หน้า Detail คลัง

**Route:** `/warehouses/{id}`

**Tab ตำแหน่ง (Locations):**
- Rack, ชั้น, ช่อง
- API: `GET /warehouses/{id}/locations`, `POST /warehouses/{id}/locations`

**Tab สต็อก (Inventory):**
- Table: สินค้า, จำนวน, ตำแหน่ง, cost price
- API: `GET /warehouses/{id}/inventory`

**Tab ปรับสต็อก:**
- ปุ่ม "ปรับสต็อก" → modal: เลือกสินค้า, จำนวนปรับ (+/-), เหตุผล
- API: `PATCH /warehouses/{id}/inventory/adjust`

**Tab นับสต็อก (Cycle Count):**
- API: `POST /warehouses/{id}/inventory/cycle-count`

### 13.3 หน้า Inventory Overview

**Route:** `/inventory`
**Permission:** `inventory.can_view`

- ดูสต็อกทั้งหมดทุกคลัง: `GET /inventory`
- สินค้าสต็อกต่ำ: `GET /inventory/low-stock` → แสดงเตือนสีแดง
- ประวัติเคลื่อนไหว: `GET /inventory/transactions` → table: วันที่, สินค้า, เข้า/ออก, จำนวน, อ้างอิง (SO/GR/ST)
- Export: `GET /inventory/export`

### 13.4 ใบรับสินค้า (Goods Receipts)

**Route:** `/goods-receipts`
**Permission:** `goods_receipts.can_view`

**สร้าง:**
- Fields: `warehouse_id` (select), `vendor_id` (select — `GET /vendors`), `reference_no`, `note`
- Items: เลือกสินค้า + จำนวน + cost_price
- API: `POST /goods-receipts`

**Detail:**
- ปุ่ม "อนุมัติรับ" → `POST /goods-receipts/{id}/approve` → สต็อกเข้าคลังทันที
- ปุ่ม "ยกเลิก" → `POST /goods-receipts/{id}/cancel` (ได้เฉพาะ draft)

**Status:** `draft → received / cancelled`

### 13.5 โอนย้ายสต็อก (Stock Transfers)

**Route:** `/stock-transfers`
**Permission:** `stock_transfers.can_view`

**สร้าง:**
- Fields: `from_warehouse_id`, `to_warehouse_id` (2 dropdowns), `note`
- Items: เลือกสินค้า + จำนวน
- API: `POST /stock-transfers`

**Detail:**
- ปุ่ม "อนุมัติ" → `POST /stock-transfers/{id}/approve` → สต็อกย้ายทันที
- ปุ่ม "ยืนยันรับ" → `POST /stock-transfers/{id}/complete` (ปลายทางยืนยัน)

**Status:** `draft → pending → approved / rejected`

---

## 14. ใบสั่งซื้อ (Purchase Orders)

**Route:** `/purchase-orders`
**Permission:** `purchase_orders.can_view`

**สร้าง:**
- เลือก Vendor: `GET /vendors` → autocomplete
- Items: เลือกสินค้า + จำนวน + ราคาสั่งซื้อ
- API: `POST /purchase-orders`

**Detail:**
- ปุ่ม "ส่งให้ Supplier" → `POST /purchase-orders/{id}/send`
- ปุ่ม "รับของ" → `POST /purchase-orders/{id}/receive` → สร้าง Goods Receipt อัตโนมัติ

---

## 15. สินเชื่อ & ไฟแนนซ์ (Loans & Finance)

### 15.1 บริษัทไฟแนนซ์ (Finance Companies)

**Route:** `/settings/finance-companies`
**Permission:** `finance_companies.can_view`

- CRUD: ชื่อบริษัท, ที่อยู่, เบอร์โทร, ผู้ติดต่อ
- API: CRUD `/finance-companies`

### 15.2 ใบสมัครสินเชื่อ (Loan Applications)

**Route:** `/loan-applications`
**Permission:** `loan_applications.can_view`

**เมื่อไหร่ใช้?**
- ลูกค้าต้องการผ่อนผ่านไฟแนนซ์ → สร้างใบสมัคร → อนุมัติ → ไฟแนนซ์จ่ายเงิน

**สร้าง:**
- Fields: `finance_company_id`, `applicant_name`, `amount_requested`, `applied_date`, `id_card_number`, `phone`, `note`
- API: `POST /loan-applications`

**Detail:**
- ปุ่ม "อนุมัติ" → `PATCH /loan-applications/{id}/approve`
- ปุ่ม "ปฏิเสธ" → `PATCH /loan-applications/{id}/reject`
- ปุ่ม "ยกเลิก" → `PATCH /loan-applications/{id}/cancel`

**Sub-resource: ผู้ค้ำประกัน (Guarantors)**
- Table: ชื่อ, เบอร์โทร, บัตร ปชช.
- เพิ่ม: `POST /loan-applications/{id}/guarantors`
- ลบ: `DELETE /loan-applications/{id}/guarantors/{gid}`

**Status:** `pending → approved / rejected / cancelled`

### 15.3 สินเชื่อร้าน (Store Loans)

**Route:** `/store-loans`
**Permission:** `store_loans.can_view`

**เมื่อไหร่ใช้?**
- ลูกค้าผ่อนกับร้านโดยตรง (ไม่ผ่านไฟแนนซ์)

**สร้าง:**
- Fields: `customer_id`, `invoice_id`, `customer_name`, `total_amount`, `down_payment`, `monthly_payment`, `interest_rate`, `term_months`, `start_date`, `next_due_date`
- API: `POST /store-loans`

**Detail:**
- แสดงตารางค่างวด
- คำนวณ: `GET /store-loans/{id}/calculate` → ตารางงวดทั้งหมด
- บันทึกจ่ายงวด: `POST /store-loans/{id}/payments`
- ดูประวัติจ่าย: `GET /store-loans/{id}/payments`
- ⚠️ Job `check-overdue` ตรวจทุกคืน → ถ้าเลย due → status `overdue`

**Status:** `active → completed / overdue / cancelled`

### 15.4 ค้นหาสินเชื่อ (Loan Search)

**Route:** `/loans/search`

- Input: เบอร์โทร หรือ เลขบัตร ปชช.
- ค้นหาจาก Elasticsearch (multi-index)
- แสดงผลรวม: ผู้กู้, ผู้ค้ำ, สินเชื่อร้าน
- API: `GET /loans/search?q=0812345678`
- ⚠️ ต้อง Elasticsearch ทำงาน

---

## 16. พนักงาน & HR

### 16.1 หน้า List พนักงาน

**Route:** `/employees`
**Permission:** `employees.can_view`

- Search: ชื่อ, email, เบอร์โทร
- Filter: `branch_id`, `position_id`, `status` (active/inactive)
- Table: ชื่อ, ตำแหน่ง, สาขา, เบอร์โทร, สถานะ
- API: `GET /employees?branch_id=1&search=xxx`

### 16.2 สร้าง/แก้ไข พนักงาน

**Form Fields:**
| Field | Type | Required |
|-------|------|----------|
| `first_name` | Text | ✅ |
| `last_name` | Text | ✅ |
| `email` | Email | ✅ |
| `phone` | Text | ✅ |
| `password` | Password | ✅ (create) |
| `branch_id` | Select | ✅ | dropdown สาขา |
| `position_id` | Select | ✅ | dropdown ตำแหน่ง — `GET /positions` |
| `role_ids` | Multi-select | ✅ | checkbox/tag — `GET /permissions/roles` |
| `work_schedule_id` | Select | ✅ | dropdown — `GET /work-schedules` |
| `hire_date` | Date | ✅ |

### 16.3 Detail พนักงาน

- ข้อมูลทั่วไป + สาขา + ตำแหน่ง + role
- Tab ลงเวลา: `GET /employees/{id}/attendance?start_date=xxx&end_date=xxx`
  - แสดงปฏิทินรายเดือน: แต่ละวันมีสี (เขียว=ปกติ, เหลือง=สาย, แดง=ขาด, เทา=หยุด)
  - Table: วันที่, เข้า, ออก, สถานะ, ชั่วโมง
- ปุ่ม "แก้ไข" / "ลบ" (soft delete → login ไม่ได้)

### 16.4 หน้า Attendance (ลงเวลา)

**Route:** `/attendance`
**Permission:** `attendance.can_view`

**มุมมอง Admin:**
- ดูลงเวลาทุกคน: `GET /attendance?date=2026-04-16&branch_id=1`
- Filter: วันที่, สาขา, สถานะ (present/late/absent/holiday)
- Table: พนักงาน, เข้า, ออก, สถานะ, ชั่วโมง, สาย?
- ปุ่ม "แก้ไข" → modal: แก้เวลาเข้า/ออก, สถานะ, หมายเหตุ — `PUT /attendance/{id}`
- Export: `GET /attendance/export?branch_id=1&month=2026-04` (CSV)

**มุมมองพนักงาน:**
- ปุ่มใหญ่ "ลงเวลาเข้า" / "ลงเวลาออก"
- ต้องขอ GPS permission → ส่ง `latitude`, `longitude`
- API: `POST /attendance/check-in`, `POST /attendance/check-out`
- แสดงผล: สถานะวันนี้, เวลาเข้า/ออก, สาย?, ชั่วโมงรวม
- History ย้อนหลัง: ปฏิทินรายเดือน

### 16.5 หน้า วันหยุด (Holidays)

**Route:** `/holidays`
**Permission:** `holidays.can_view`

- ปฏิทินรายปี → จุดสีแดงวันที่เป็นวันหยุด
- Table: วันที่, ชื่อวันหยุด, สาขา (ทุกสาขา / เฉพาะสาขา)
- สร้าง: `POST /holidays { name, date, branch_id(null=ทุกสาขา) }`
- API: `GET /holidays?year=2026`

---

## 17. ตั้งค่าระบบ (Settings)

### 17.1 สาขา (Branches)

**Route:** `/settings/branches`

- CRUD: ชื่อสาขา, ที่อยู่, เบอร์โทร, `allowed_ip_range`
- API: CRUD `/branches`

### 17.2 ตำแหน่ง (Positions)

**Route:** `/settings/positions`
**Permission:** `positions.can_view`

- CRUD: ชื่อตำแหน่ง, คำอธิบาย
- API: CRUD `/positions`

### 17.3 บทบาท & สิทธิ์ (Roles & Permissions) ⭐

**Route:** `/settings/roles`
**Permission:** `roles.can_view`

**หน้านี้สำคัญมาก — ควบคุมว่าใครทำอะไรได้บ้าง ผ่านระบบ Permission-Based Access Control (PBAC)**

---

#### 17.3.1 หน้า List Roles

**Route:** `/settings/roles`

- แสดง role ทั้งหมด + จำนวนพนักงาน + สถานะ (active/inactive)
- ช่อง search: `?search=ชื่อ role`
- filter: `?is_active=true`
- คลิก role → ไปหน้า `/settings/roles/{id}`
- ปุ่ม "สร้าง Role ใหม่": `POST /permissions/roles` (permission: `roles.can_create`)

**API:**
```
GET /permissions/roles?search=&is_active=true&page=1&limit=20
```

**Response:**
```json
{
  "data": [
    { "id": 1, "name": "ผู้ดูแลระบบ", "description": "...", "is_active": true, "employee_count": 3 }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5, "total_pages": 1 }
}
```

---

#### 17.3.2 สร้าง Role ใหม่

**API:** `POST /permissions/roles` (permission: `roles.can_create`)

**Request Body:**
```json
{
  "name": "ช่างเทคนิค",
  "description": "สิทธิ์สำหรับช่างซ่อม",
  "is_active": true
}
```

> หลังสร้าง role ใหม่ ต้องไปกำหนดสิทธิ์แยกต่างหากผ่าน `PUT /permissions/roles/{id}`

---

#### 17.3.3 หน้า Detail / แก้ไขสิทธิ์

**Route:** `/settings/roles/{id}`
**API Load:** `GET /permissions/roles/{id}` (permission: `roles.can_view`)

แสดง:
- ชื่อ role, description, is_active
- **Permission Matrix**: Grid 22 modules × 6 actions

**Permission Matrix (Checkbox Grid):**

```
Module                │ View │ Create │ Edit │ Delete │ Approve │ Export │
──────────────────────┼──────┼────────┼──────┼────────┼─────────┼────────┤
dashboard             │  ☑   │   ☐    │  ☐   │   ☐    │    ☐    │   ☐    │
employees             │  ☑   │   ☑    │  ☑   │   ☐    │    ☐    │   ☑    │
positions             │  ☑   │   ☑    │  ☑   │   ☑    │    ☐    │   ☐    │
roles                 │  ☑   │   ☐    │  ☑   │   ☐    │    ☐    │   ☐    │
work_schedules        │  ☑   │   ☑    │  ☑   │   ☑    │    ☐    │   ☐    │
attendance            │  ☑   │   ☑    │  ☑   │   ☐    │    ☐    │   ☑    │
holidays              │  ☑   │   ☑    │  ☑   │   ☑    │    ☐    │   ☐    │
customers             │  ☑   │   ☑    │  ☑   │   ☐    │    ☐    │   ☑    │
vehicles              │  ☑   │   ☑    │  ☑   │   ☑    │    ☐    │   ☐    │
vendors               │  ☑   │   ☑    │  ☑   │   ☑    │    ☐    │   ☐    │
brands                │  ☑   │   ☑    │  ☑   │   ☑    │    ☐    │   ☐    │
product_categories    │  ☑   │   ☑    │  ☑   │   ☑    │    ☐    │   ☐    │
products              │  ☑   │   ☑    │  ☑   │   ☑    │    ☐    │   ☑    │
warehouses            │  ☑   │   ☑    │  ☑   │   ☑    │    ☐    │   ☐    │
inventory             │  ☑   │   ☐    │  ☑   │   ☐    │    ☐    │   ☑    │
goods_receipts        │  ☑   │   ☑    │  ☑   │   ☑    │    ☑    │   ☑    │
stock_transfers       │  ☑   │   ☑    │  ☑   │   ☑    │    ☑    │   ☐    │
purchase_orders       │  ☑   │   ☑    │  ☑   │   ☐    │    ☑    │   ☑    │
service_orders        │  ☑   │   ☑    │  ☑   │   ☐    │    ☑    │   ☑    │
quotations            │  ☑   │   ☑    │  ☑   │   ☐    │    ☑    │   ☐    │
deposits              │  ☑   │   ☑    │  ☐   │   ☐    │    ☐    │   ☑    │
invoices              │  ☑   │   ☑    │  ☑   │   ☐    │    ☐    │   ☑    │
payments              │  ☑   │   ☑    │  ☐   │   ☐    │    ☐    │   ☑    │
delivery_notes        │  ☑   │   ☑    │  ☑   │   ☐    │    ☐    │   ☑    │
warranties            │  ☑   │   ☑    │  ☑   │   ☐    │    ☐    │   ☑    │
finance_companies     │  ☑   │   ☑    │  ☑   │   ☑    │    ☐    │   ☐    │
loan_applications     │  ☑   │   ☑    │  ☑   │   ☐    │    ☑    │   ☑    │
store_loans           │  ☑   │   ☑    │  ☑   │   ☐    │    ☑    │   ☑    │
notifications         │  ☑   │   ☐    │  ☐   │   ☐    │    ☐    │   ☐    │
audit_logs            │  ☑   │   ☐    │  ☐   │   ☐    │    ☐    │   ☑    │
```

**UI Tip:**
- ปุ่ม "เลือกทั้งหมด" / "ยกเลิกทั้งหมด" ต่อ module (row)
- ปุ่ม "เลือกทุก View" / "เลือกทุก Module" (column)
- สีแสดงสถานะ: ☑ เปิดใช้ / ☐ ปิด

**บันทึกสิทธิ์:**
```
PUT /permissions/roles/{id}
```
```json
{
  "permissions": [
    {
      "module": "customers",
      "can_view": true,
      "can_create": true,
      "can_edit": true,
      "can_delete": false,
      "can_approve": false,
      "can_export": true
    },
    {
      "module": "service_orders",
      "can_view": true,
      "can_create": true,
      "can_edit": true,
      "can_delete": false,
      "can_approve": true,
      "can_export": true
    }
  ]
}
```

> **หมายเหตุ**: ต้องส่ง **ทุก module** ที่ต้องการบันทึก (ไม่ใช่เฉพาะที่เปลี่ยน) — API จะ replace สิทธิ์ทั้งหมดของ role นั้น

---

#### 17.3.4 ผลกระทบของการเปลี่ยนสิทธิ์

- สิทธิ์มีผลทันที — ระบบใช้ APCu cache 5 นาที → **invalidate ทันทีเมื่อแก้ไข**
- พนักงานที่ login อยู่: สิทธิ์ใหม่จะมีผลภายใน 5 นาที (หรือทันทีเมื่อ token refresh)
- เมนู UI ซ่อน/แสดงตาม `GET /permissions/me` (โหลดตอน login สำเร็จ + เก็บใน state)

---

#### 17.3.5 API Summary

| Method | Endpoint | หน้าที่ | Permission |
|--------|----------|---------|------------|
| `GET` | `/permissions/me` | ดูสิทธิ์ตัวเอง (JWT-only) | - |
| `GET` | `/permissions/roles` | List roles ทั้งหมด | `roles.can_view` |
| `POST` | `/permissions/roles` | สร้าง role ใหม่ | `roles.can_create` |
| `GET` | `/permissions/roles/{id}` | ดูสิทธิ์ของ role | `roles.can_view` |
| `PUT` | `/permissions/roles/{id}` | แก้ไขสิทธิ์ role | `roles.can_edit` |

### 17.4 ตารางเวลาทำงาน (Work Schedules)

**Route:** `/settings/work-schedules`
**Permission:** `work_schedules.can_view`

- Table: ชื่อตาราง, ผูกกับ (position/employee), เวลาเข้า-ออก, grace period, สถานะ
- สร้าง (`POST /work-schedules`):
  - `owner_type`: `"position"` (ผูกตำแหน่ง) หรือ `"employee"` (ผูกพนักงานเฉพาะคน)
  - `owner_id`: position_id หรือ employee_id ที่ผูก
  - `name`, `login_start_time`, `login_end_time` (HH:MM)
  - `grace_minutes`: จำนวนนาทีผ่อนผันมาสาย
  - `allowed_ip_range`: IP range ที่อนุญาต (nullable)
  - `is_active`: เปิด/ปิดใช้งาน
  - `days`: array 7 วัน (day 1=จันทร์ ถึง 7=อาทิตย์) แต่ละวันมี `start_time`, `end_time`, `is_day_off`
- แก้ไข (`PUT /work-schedules/{id}`): fields เดียวกับสร้าง ทุก field optional
- ดูรายละเอียด (`GET /work-schedules/{id}`): แสดง schedule + days ทั้ง 7
- ลบ (`DELETE /work-schedules/{id}`)

**Resolve ลำดับความสำคัญ (ตอน Check-in):**
1. `employee_schedule_overrides` — override เฉพาะวันนั้น
2. Work Schedule ที่ `owner_type = employee` — ตารางเฉพาะคน
3. Work Schedule ที่ `owner_type = position` — ตารางตามตำแหน่ง

### 17.5 Master Data อื่นๆ

**ยี่ห้อ (Brands):** `/settings/brands` → CRUD `/brands`
**หมวดสินค้า (Categories):** `/settings/categories` → CRUD `/product-categories`
**หน่วยนับ (Units):** `/settings/units` → CRUD `/product-units`
**Supplier (Vendors):** `/settings/vendors` → CRUD `/vendors` + phones + documents

---

## 18. แจ้งเตือน (Notifications)

**เข้าถึงจาก:** Bell icon ใน header

**Components:**
- Dropdown panel: แสดง 10 แจ้งเตือนล่าสุด + "ดูทั้งหมด"
- Badge จำนวนยังไม่อ่าน: `GET /notifications/unread-count`
- Full page: `/notifications` → list ทั้งหมด + filter (read/unread)
- คลิกแจ้งเตือน → Mark as read + navigate ไปเอกสารที่เกี่ยวข้อง
- ปุ่ม "อ่านทั้งหมด": `PATCH /notifications/read-all`

**API:**
- List: `GET /notifications?page=1&limit=20`
- Read: `PATCH /notifications/{id}/read`
- Unread count: `GET /notifications/unread-count`

**ตัวอย่างแจ้งเตือน:**
- "ใบสั่งซ่อม SO-2026-0001 ถูกมอบหมายให้คุณ"
- "ใบแจ้งหนี้ INV-2026-0023 ค้างชำระเกินกำหนด"
- "รถทะเบียน กก-1234 ถึงรอบเช็คระยะ"

---

## 19. Audit Log

**Route:** `/audit-logs`
**Permission:** `audit_logs.can_view`

- Table: วันเวลา, พนักงาน, action (create/update/delete), module, entity_id, description
- Filter: วันที่, พนักงาน, module, action
- Export: `GET /audit-logs/export`
- API: `GET /audit-logs?module=service_orders&employee_id=12&page=1&limit=20`

---

## 20. Flow เชื่อมระหว่างหน้า

### Flow A: ซ่อมรถ (19 ขั้นตอน)

```
1.  /customers        → สร้าง/เลือกลูกค้า
2.  /customers/{id}   → Tab รถ → เพิ่มรถ (ถ้ายังไม่มี)
3.  /service-orders/create → เลือกลูกค้า + รถ → สร้าง SO (draft)
4.  /service-orders/{id}  → Tab GPS → ถ่ายรูป pre_intake (≥1)
5.  /service-orders/{id}  → ปุ่ม "ส่งตรวจสอบ" → pending_review
6.  /service-orders/{id}  → ปุ่ม "พร้อมเสนอราคา" → pending_quote
7.  /service-orders/{id}  → Tab Items → เพิ่มอะไหล่ + ค่าแรง
8.  /quotations/create → สร้าง QT (type=service) จาก SO
9.  /quotations/{id}  → ส่งให้ลูกค้า → อนุมัติ → SO status → approved
10. /service-orders/{id} → มอบหมายช่าง
11. /service-orders/{id} → เริ่มซ่อม → in_progress (ตัดสต็อกอัตโนมัติ)
12. /service-orders/{id} → ซ่อมเสร็จ → completed → pending_payment
13. /invoices (สร้างจาก QT) → INV draft → issue
14. /invoices/{id} → รับชำระเงิน → paid
15. /invoices/{id} → ปุ่ม "ออกใบเสร็จ" → Receipt PDF
16. /delivery-notes/create → สร้าง DN → ลูกค้าเซ็นรับ
17. /service-orders/{id} → Tab GPS → ถ่ายรูป delivery (≥1)
18. /service-orders/{id} → pending_pickup → closed
19. /warranties/create → สร้างใบรับประกัน
```

### Flow B1: ขายไม่มีมัดจำ

```
1. /customers        → สร้าง/เลือกลูกค้า
2. /quotations/create → สร้าง QT (type=sale) + items
3. /quotations/{id}  → ส่ง → อนุมัติ
4. /invoices (จาก QT) → issue (ตัดสต็อกทันที)
5. /invoices/{id}    → รับชำระ → paid
6. /invoices/{id}    → ออกใบเสร็จ
7. /delivery-notes   → (ไม่บังคับ)
8. /warranties       → สร้างรับประกัน
```

### Flow B2: ขายมีมัดจำ

```
1. /customers        → สร้าง/เลือกลูกค้า
2. /quotations/create → สร้าง QT (type=sale) + items
3. /quotations/{id}  → ส่ง → อนุมัติ
4. /deposits/create   → รับมัดจำ (ใบเสร็จมัดจำออกอัตโนมัติ)
5. /invoices (จาก QT) → ยอดหัก deposit → issue
6. /invoices/{id}    → รับชำระส่วนเหลือ → paid
7. /invoices/{id}    → ออกใบเสร็จ
8. /delivery-notes   → (ไม่บังคับ)
9. /warranties       → สร้างรับประกัน
```

### Flow C: ขายหน้าร้าน (POS)

```
1. /invoices/create-retail → เลือกสินค้า (POS) → สร้าง INV retail → issue
2. /invoices/{id}         → รับเงิน → paid
3. /invoices/{id}         → ออกใบเสร็จ
```

### Flow: การชำระผ่านไฟแนนซ์

```
1. /loan-applications/create → สร้างใบสมัคร + ผู้ค้ำ
2. /loan-applications/{id}   → อนุมัติ
3. /invoices/{id}/payments    → บันทึกรับเงินจากไฟแนนซ์
```

### Flow: การผ่อนร้าน

```
1. /store-loans/create → สร้างสัญญาสินเชื่อ
2. /store-loans/{id}   → บันทึกจ่ายงวดทุกเดือน
3. (Job ตรวจ overdue ทุกคืน)
```

### Flow: รับสินค้าเข้าคลัง

```
1. /purchase-orders/create  → สร้าง PO → ส่งให้ Vendor
2. /purchase-orders/{id}    → รับของ → สร้าง GR อัตโนมัติ
3. /goods-receipts/{id}     → อนุมัติ → สต็อกเข้าคลัง
```

### Flow: โอนสต็อกระหว่างคลัง

```
1. /stock-transfers/create  → เลือกคลังต้นทาง + ปลายทาง + สินค้า
2. /stock-transfers/{id}    → อนุมัติ → สต็อกย้าย
3. /stock-transfers/{id}    → ปลายทางยืนยันรับ → complete
```

---

## Quick Reference: ข้อควรระวังสำคัญสำหรับ Frontend

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
| **ใบเสร็จมัดจำ** | ออกอัตโนมัติตอน `POST /deposits` |
| **ตัดสต็อกซ่อม** | เกิดตอน SO: approved → in_progress |
| **ตัดสต็อกขาย** | เกิดตอน INV: draft → issued |
| **Status forward only** | ทุก status ไปข้างหน้าเท่านั้น (ยกเว้น reopen) |
| **Error Response** | `{ success: false, message: "...", errors: {} }` |
