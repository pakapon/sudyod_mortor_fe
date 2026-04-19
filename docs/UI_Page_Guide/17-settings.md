# การตั้งค่า (Settings)

> ดู common conventions → [00-common.md](./00-common.md)

---

## 17.1 สาขา (Branches)

**Route:** `/settings/branches`
**Permission:** `branches.can_view` / `branches.can_create` / `branches.can_edit` / `branches.can_delete`

- Table: รหัสสาขา, ชื่อสาขา, ที่อยู่, เบอร์โทร, IP ที่อนุญาต
- Sortable: `code` (asc), `name` (asc) — default sort: name asc
- CRUD: Fields: `name`, `address`, `phone`, `allowed_ip_range` (สำหรับจำกัด check-in)
- API: CRUD `/branches`
- **Delete:** Hard Delete — ลบได้เฉพาะสาขาที่ไม่มี reference จาก `employees` และ `warehouses` (ตรวจ 2 ตารางก่อนลบ)

---

## 17.2 ตำแหน่งงาน (Positions)

**Route:** `/settings/positions`
**Permission:** `positions.can_view`

- Table: ชื่อตำแหน่ง, คำอธิบาย
- Sortable: `name` (asc), `description` (asc) — default sort: name asc
- CRUD: Fields: `name`, `description`
- API: CRUD `/positions`

---

## 17.3 บทบาท & สิทธิ์ (Roles & Permissions) ⭐

**Route:** `/settings/roles`
**Permission:** `roles.can_view`

> หน้าสำคัญที่สุดใน Settings — กำหนดสิทธิ์ทุกอย่างในระบบ

### 17.3.1 List Roles
- `GET /permissions/roles?search=&is_active=&page=&limit=`
- Response มี `employee_count` (จำนวนพนักงานที่ใช้ role นี้)
- ปุ่ม "สร้าง Role"

### 17.3.2 สร้าง Role
- `POST /permissions/roles { name, description, is_active }`
- → redirect ไป detail เพื่อตั้งค่า permission

### 17.3.3 Detail/Edit Role ⭐ (Permission Matrix)

**Route:** `/settings/roles/{id}`
- `GET /permissions/roles/{id}`

**Permission Matrix:**
- **32 modules × 6 actions** = checkbox grid

| Module | view | create | edit | delete | approve | export |
|--------|------|--------|------|--------|---------|--------|
| branches | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| dashboard | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| employees | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| positions | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| roles | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| work_schedules | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| attendance | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| holidays | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| customers | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| vehicles | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| vendors | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| brands | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| product_categories | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| products | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| warehouses | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| inventory | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| goods_receipts | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| stock_transfers | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| purchase_orders | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| service_orders | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| quotations | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| deposits | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| invoices | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| payments | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| delivery_notes | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| warranties | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| finance_companies | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| loan_applications | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| store_loans | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| product_units | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| notifications | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| audit_logs | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

**UI Controls:**
- "เลือกทั้งหมด/ยกเลิกทั้งหมด" ต่อ row (ต่อ module)
- "เลือกทุก View" / "เลือกทุก Module" ต่อ column

**Save:**
- `PUT /permissions/roles/{id} { permissions: [{module, can_view, can_create, can_edit, can_delete, can_approve, can_export}, ...] }`
- ⚠️ ต้องส่ง **ทุก module** (full replace — ไม่ใช่ partial)

### 17.3.4 ผลกระทบ
- APCu cache invalidate ทันทีเมื่อเปลี่ยน
- UI re-render permission จาก `GET /permissions/me`

---

## 17.4 ตารางเวลาทำงาน (Work Schedules)

**Route:** `/settings/work-schedules`
**Permission:** `work_schedules.can_view`

- Table: ชื่อ, Owner (ตำแหน่ง/พนักงาน), เวลาเข้า-ออก, grace, สถานะ
- Sortable: `name` (asc), `grace_minutes` (asc) — default sort: name asc

**สร้าง:**
| Field | Type | Required | หมายเหตุ |
|-------|------|----------|---------|
| `owner_type` | Select: position / employee | ✅ | |
| `owner_id` | Select | ✅ | dropdown ตาม owner_type |
| `name` | Text | ✅ | |
| `login_start_time` | Time (HH:MM) | ✅ | |
| `login_end_time` | Time (HH:MM) | ✅ | |
| `grace_minutes` | Number | ✅ | ความผ่อนปรน (นาที) |
| `allowed_ip_range` | Text | ❌ | จำกัด IP check-in |
| `is_active` | Toggle | ✅ | |
| `days` | 7 วัน × {start_time, end_time, is_day_off} | ✅ | |

**Priority:** override > employee schedule > position schedule

---

## 17.5 Master Data

**Brands** — `/settings/brands`
- CRUD: `name`, `code`
- Sortable: `name` (asc), `code` (asc)
- API: CRUD `/brands`

**Units (หน่วยนับ)** — `/settings/units`
- CRUD: `name`, `abbreviation`
- Sortable: `name` (asc), `abbreviation` (asc)
- API: CRUD `/product-units`

**Vendors (ผู้จัดจำหน่าย)** — `/settings/vendors`
- CRUD: `name`, `code`, `contact_name`, `tax_id`, `email`, `address`
- Sortable: `name` (asc), `code` (asc), `contact_name` (asc), `tax_id` (asc)
- Sub-resources: Phones + Documents (มี DELETE)
- API: CRUD `/vendors`, `/vendors/{id}/phones`, `/vendors/{id}/documents`

---

## 17.6 หมวดสินค้า (Product Categories) ⭐

**Route:** `/settings/categories`
**Permission:** `product_categories.can_view`

**โครงสร้าง:** ลำดับชั้นไม่จำกัด (parent_id = null คือ root)

**Fields:**
| Field | Required | หมายเหตุ |
|-------|----------|---------|
| `name` | ✅ | max 100 ตัวอักษร |
| `code` | ✅ | max 50, unique |
| `description` | ❌ | |
| `parent_id` | ❌ | null = root |
| `is_active` | ✅ | default true |

**APIs:**
| Method | Endpoint | หมายเหตุ |
|--------|----------|---------|
| GET | `/product-categories` | list หรือ tree (query: `tree=true`) |
| POST | `/product-categories` | |
| GET | `/product-categories/{id}` | |
| PUT | `/product-categories/{id}` | |
| DELETE | `/product-categories/{id}` | ⚠️ ถ้ามีลูก → error toast |

**Query params:** `search`, `parent_id`, `roots_only`, `is_active`, `tree` (bool — ไม่มี pagination เมื่อ tree=true)

**UI:**
- Flat list render เป็น tree แบบ depth-first (indent = depth × 24px)
- Level badges: 0=น้ำเงิน, 1=เหลืองอำพัน, 2+=เทา
- Chevron expand/collapse (collapsedIds Set)
- Search → filter frontend (แสดง match + children ทั้งหมด)
- Dropdown modal → indented tree order

---

## 17.7 บริษัทไฟแนนซ์ (Finance Companies)

**Route:** `/settings/finance-companies`
**Permission:** `finance_companies.can_view`

**Fields:**
| Field | Required | หมายเหตุ |
|-------|----------|---------|
| `name` | ✅ | max 255 |
| `logo_url` | ❌ | อัปโหลดแยก endpoint |
| `contact_person` | ❌ | |
| `phone` | ❌ | |
| `email` | ❌ | |
| `address` | ❌ | |
| `commission_rate` | ❌ | % decimal, default 0 |
| `note` | ❌ | |
| `is_active` | ✅ | |

**APIs:**
- CRUD `/finance-companies`
- Logo: `POST /finance-companies/{id}/logo` (multipart, field: `logo`) — รองรับ JPG/PNG/WebP/GIF
- Documents: CRUD `/finance-companies/{id}/documents`
  - `file_type` enum: `contract` | `rate_sheet` | `application_form` | `other`

**Query params:** `search` (ค้น name/contact_person/phone), `is_active`, `sort` (name/commission_rate), `order`, `page`, `limit`
**Sortable:** `name` (asc), `commission_rate` (asc)

**UI:**
- แสดง thumbnail logo
- Detail: 2 tabs — (1) ข้อมูล + logo, (2) เอกสาร (download + delete)

---

## ดูเพิ่มเติม
- [16-hr.md](./16-hr.md) — ใช้ Positions, Roles, Work Schedules
- [12-products.md](./12-products.md) — ใช้ Brands, Categories, Units
- [15-loans-finance.md](./15-loans-finance.md) — ใช้ Finance Companies
