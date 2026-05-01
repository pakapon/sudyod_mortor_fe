# ลูกค้า (Customers)

> ดู common conventions → [00-common.md](./00-common.md)

---

## 5.1 หน้า List ลูกค้า

**Route:** `/customers`
**Permission:** `customers.can_view`

**Components:**
- Search bar: ค้นหารายชื่อลูกค้า (ชื่อ/เบอร์โทร/รหัสลูกค้า/tax_id)
- ปุ่ม "ตัวกรอง" → filter panel:
  - `type` (`personal`/`corporate`)
  - `status` (`active`/`inactive`/`blacklisted`)
  - `grade` (`good`/`bad_credit`/`poor`/`new`/`x`)
  - `branch_id`
- ปุ่ม "Export Excel / CSV" → `GET /customers/export`
- ปุ่ม "+ สร้างลูกค้าใหม่" → `/customers/create`

**Table Columns:**
| Column | Field | หมายเหตุ |
|--------|-------|---------|
| รหัสลูกค้า | `customer_code` | format: `CUS001` |
| ชื่อ-สกุล/ชื่อบริษัท | `first_name last_name` / `company_name` | |
| โทรศัพท์หลัก | primary phone number | จาก `customer_phones` where `is_primary=true` |
| จำนวนการซื้อ | `purchase_count` | นับจาก invoices ที่ paid |
| เกรด | `grade` | badge (ดู enum ด้านล่าง) |
| สถานะ | `status` | badge (ดู enum ด้านล่าง) |
| ยอดใช้จ่ายรวม | `total_spending` | บาท (sum จาก invoices ที่ paid) |
| อัปเดตล่าสุด | `updated_at` | `YYYY-MM-DD` |
| Actions | — | `...` menu: แก้ไข, ลบ |

**Grade Enum + Badge:**
| Value | Label | Badge color |
|-------|-------|-------------|
| `good` | ดี | เขียว |
| `bad_credit` | เครดิตเสีย | เหลือง |
| `poor` | แย่ | ส้ม |
| `new` | ประเมินใหม่ | เทา |
| `x` | X | แดง |

**Status Enum + Badge:**
| Value | Label | Badge color |
|-------|-------|-------------|
| `active` | เปิดใช้งาน | เขียว |
| `inactive` | ปิดใช้งาน | เหลือง |
| `blacklisted` | แบล็คลิสต์ | แดง |

- Pagination: page, limit (default 20)

**API:** `GET /customers?search=xxx&type=personal&status=active&grade=good&branch_id=1&page=1&limit=20`

---

## 5.2 หน้า สร้าง/แก้ไข ลูกค้า

**Route:** `/customers/create` หรือ `/customers/{id}/edit`

---

**Upload Avatar**
| Field | Type | Required | หมายเหตุ |
|-------|------|----------|---------|
| `photo_url` | File input | ❌ | JPG / GIF / PNG — max 800k — แสดง preview รูปปัจจุบัน (ถ้ามี) |

---

**Section: ข้อมูลทั่วไป**
| Field | Type | Required | หมายเหตุ |
|-------|------|----------|---------|
| `type` | Radio: `personal` / `corporate` | ✅ | เปลี่ยนแล้ว fields ด้านล่างจะเปลี่ยนตาม |
| `id_card` | Text | ❌ | เลขบัตรประชาชน 13 หลัก (format: `111-xxx-xxxx-xxx`) |
| `customer_code` | Text (read-only) | — | auto-generate โดย server (CUS001) — แสดงตอน edit เท่านั้น |
| `prefix` | Select: นาย/นาง/นางสาว | ✅ เฉพาะ `personal` | |
| `first_name` | Text | ✅ เมื่อ `personal` | |
| `last_name` | Text | ✅ เมื่อ `personal` | |
| `company_name` | Text | ✅ เมื่อ `corporate` | |
| `company_branch` | Text | ❌ เฉพาะ `corporate` | สาขาของบริษัทลูกค้า |
| `tax_id` | Text | ❌ เฉพาะ `corporate` | เลข 13 หลัก |
| `contact_name` | Text | ❌ เฉพาะ `corporate` | ผู้ติดต่อ |
| `contact_position` | Text | ❌ เฉพาะ `corporate` | ตำแหน่งผู้ติดต่อ |
| `gender` | Select: `male` / `female` / `not_specified` | ❌ | เพศ (ชาย/หญิง/ไม่ระบุ) |
| `date_of_birth` | Date | ❌ | วันเกิด (DD/MM/YYYY) |
| `registered_at` | Text (read-only) | — | วันที่ลงทะเบียน — auto-set เมื่อสร้าง แสดงตอน edit |

---

**Section: ช่องทางติดต่อ (Dynamic Lists)**

**โทรศัพท์** — dynamic list, ต้องมีอย่างน้อย 1 เบอร์
| Field | Type | Required | หมายเหตุ |
|-------|------|----------|---------|
| `phone_type` | Select: `mobile`/`home`/`work` | ✅ | มือถือ / บ้าน / ที่ทำงาน |
| `number` | Text | ✅ | เบอร์โทร |
| `is_primary` | Toggle | — | row แรก = true โดย default |
- ปุ่ม ➕ เพิ่มเบอร์ — ปุ่ม ลบ ต่อแถว

**อีเมล** — dynamic list
| Field | Type | Required |
|-------|------|----------|
| `email` | Email | ❌ |
- ปุ่ม ➕ เพิ่มอีเมล — ปุ่ม ลบ ต่อแถว

**ช่องทางอื่น** — dynamic list
| Field | Type | Required | หมายเหตุ |
|-------|------|----------|---------|
| `channel_type` | Select: `LINE`/`Facebook`/`other` | ❌ | |
| `channel_id` | Text | ❌ | เช่น LINE ID: popo_364 |
- ปุ่ม ➕ เพิ่มช่องทาง — ปุ่ม ลบ ต่อแถว

---

**Section: ที่อยู่จัดส่ง** — dynamic list (เลือกเป็นค่าเริ่มต้น 1 รายการ)
| Field | Type | Required | หมายเหตุ |
|-------|------|----------|---------|
| `label` | Select: `Operational`/`Home`/`Work`/`Other` | ✅ | ติดป้ายเป็น |
| `address` | Textarea | ✅ | ที่อยู่เต็ม (บ้านเลขที่, หมู่, ซอย, ถนน, แขวง/ตำบล, เขต/อำเภอ, จังหวัด, รหัสไปรษณีย์) |
| `is_default` | Toggle | — | ต้องมี 1 รายการที่เป็น default |
- ปุ่ม ➕ เพิ่มที่อยู่ — ปุ่ม ลบ ต่อแถว

---

**Section: สถานะ & เกรด & เครดิต**
| Field | Type | Required | หมายเหตุ |
|-------|------|----------|---------|
| `grade_updated_at` | DateTime (read-only) | — | วันที่ประเมินเกรดล่าสุด (auto-set เมื่อ grade เปลี่ยน) |
| `grade` | Select | ❌ | `good` (ดี) / `bad_credit` (เครดิตเสีย) / `poor` (แย่) / `new` (ประเมินใหม่) / `x` (X) — default `new` |
| `credit_limit` | Number | ❌ | วงเงินล่าสุด (บาท) |
| `status` | Select | ✅ | `active` (เปิดใช้งาน) / `inactive` (ปิดใช้งาน) / `blacklisted` (แบล็คลิสต์) — default `active` |

---

**Section: ข้อมูลเพิ่มเติม**
| Field | Type | Required | หมายเหตุ |
|-------|------|----------|---------|
| `source` | Text | ❌ | แหล่งที่มาของลูกค้า (walk-in, referral, etc.) |
| `note` | Textarea | ❌ | หมายเหตุ |
| `branch_id` | Select | ✅ | dropdown สาขา — `GET /branches` |

---

**API:**
- สร้าง: `POST /customers` → redirect ไป `/customers/{id}` (detail page)
- แก้ไข: `PUT /customers/{id}` → stay on `/customers/{id}` (ต้อง `GET /customers/{id}` ก่อนเพื่อ prefill)
- ลบ: `DELETE /customers/{id}` (Soft Delete — ต้องไม่มีใบสั่งซ่อม/Invoice ค้างอยู่)

---

## 5.3 หน้า Detail ลูกค้า

**Route:** `/customers/{id}`

**Layout: Tab-based**

**Tab ข้อมูลทั่วไป:**
- แสดงข้อมูลลูกค้าทั้งหมด
- ปุ่ม "แก้ไข", "ลบ"
- API: `GET /customers/{id}`

**Tab เบอร์โทรศัพท์:**
- List เบอร์โทรทั้งหมด (type, number, is_primary)
- ปุ่ม "เพิ่มเบอร์" → modal fields:
  - `type` (select): `mobile` | `home` | `work`
  - `number` (text, required)
  - `is_primary` (toggle) — ถ้า set true จะ unset เบอร์ primary เดิม
- API: `GET /customers/{id}/phones`, `POST /customers/{id}/phones`, `PATCH /customers/{id}/phones/{pid}`
- `PATCH` body: `{ "type": "mobile", "number": "0812345678", "is_primary": true }` — ทุก field optional; ถ้า `is_primary=true` จะ unset เบอร์ primary เดิมอัตโนมัติ

**Tab ที่อยู่ออกบิล (Billing Addresses):**
- List ที่อยู่ออกใบกำกับภาษี
- ปุ่ม "เพิ่มที่อยู่" → modal, ปุ่ม "แก้ไข" → modal prefill
- Fields: `label` (required), `address` (required), `province` (required), `district` (required), `sub_district` (required), `postal_code` (required), `is_default` (toggle)
- API:
  - `GET /customers/{id}/billing-addresses`
  - `POST /customers/{id}/billing-addresses`
  - `PUT /customers/{id}/billing-addresses/{aid}`
- ⚠️ ใช้ตอนออก Invoice/Receipt → dropdown เลือกที่อยู่
- ⚠️ ยังไม่มี DELETE endpoint

**Tab รถยนต์ (Vehicles):**
- List รถทั้งหมดของลูกค้า
- ปุ่ม "เพิ่มรถ" → modal/form, ปุ่ม "แก้ไข" ในแต่ละแถว
- Fields:
  | Field | Required | หมายเหตุ |
  |-------|----------|----------|
  | `plate_number` | ✅ | ทะเบียน (เช่น "กข 1234 นครราชสีมา") |
  | `brand` | ❌ | ยี่ห้อ (Honda, Yamaha, ...) |
  | `model` | ❌ | รุ่น (Wave 110i, N-MAX, ...) |
  | `year` | ❌ | ปี พ.ศ. |
  | `color` | ❌ | สี |
  | `engine_number` | ❌ | เลขเครื่อง |
  | `chassis_number` | ❌ | เลขตัวถัง/VIN |
  | `current_mileage` | ❌ | เลขไมล์ปัจจุบัน (km) — อัปเดตทุกครั้งที่ซ่อม |
  | `is_purchased_here` | ❌ | ซื้อจากร้านนี้หรือเปล่า (toggle) |
  | `note` | ❌ | หมายเหตุ |
- API:
  - `GET /customers/{id}/vehicles`
  - `POST /customers/{id}/vehicles`
  - `PUT /customers/{id}/vehicles/{vid}`
- คลิกรถ → popup แสดงข้อมูลรถ + ประวัติซ่อมทั้งหมดของรถนั้น
- ⚠️ เลือกรถตอนสร้าง SO
- ⚠️ ยังไม่มี DELETE endpoint

**Tab เอกสาร (Documents):**
- List เอกสารที่อัปโหลด พร้อมปุ่ม **Download** แต่ละไฟล์
- ปุ่ม "อัปโหลด" → modal `multipart/form-data`
- Fields:
  - `file` (file input, required) — รองรับ PDF, JPG, PNG, DOC, DOCX, XLS, XLSX
  - `file_type` (select, required): `id_card` | `house_registration` | `other`
  - `file_name` (text, optional) — ถ้าไม่ระบุใช้ชื่อไฟล์ต้นฉบับ
  - `note` (text, optional)
- Upload ตรงไปยัง server — server อัปโหลดไป DO Spaces เอง ไม่ต้อง upload เองก่อน
- API: `GET /customers/{id}/documents`, `POST /customers/{id}/documents`
- ⚠️ ยังไม่มี DELETE endpoint

**Tab Timeline:**
- แสดงเหตุการณ์ทั้งหมดเรียงตามเวลา (สร้างลูกค้า, ส่งซ่อม, ซื้อของ, บันทึกพนักงาน)
- ปุ่ม "เพิ่มบันทึก" → modal fields:
  - `event_type` (select, required): `call` | `appointment` | `note` | `other`
  - `event_date` (date/datetime, required)
  - `description` (textarea, required)
- `created_by` ถูก set อัตโนมัติจาก JWT — ไม่ต้องส่งจาก client
- ⚠️ Timeline record ลบไม่ได้ — เก็บไว้เป็น audit trail
- API: `GET /customers/{id}/timeline`, `POST /customers/{id}/timeline`

**Tab ประวัติ:**
- **ประวัติซ่อม**: `GET /customers/{id}/service-history` → list SO ทั้งหมด (เลข SO, สถานะ, วันที่, ทะเบียนรถ)
- **ประวัติซื้อ**: `GET /customers/{id}/purchase-history` → list **grouped by invoice** (1 card = 1 ใบเอกสาร) พร้อม pagination
  - **Pagination: นับตามจำนวน invoice** (ไม่ใช่จำนวน item) — default 20
  - Response structure:
    ```json
    {
      "data": [
        {
          "invoice_id": 25,
          "invoice_no": "INV-DEMO-0001",
          "invoice_type": "sale",
          "invoice_status": "paid",
          "payment_status": "ชำระครบ",
          "purchase_date": "2025-03-15T10:30:00",
          "branch_name": "สุดยอดมอเตอร์ สาขาใหญ่",
          "service_order_id": null,
          "grand_total": 96444.33,
          "items_count": 3,
          "items": [
            {
              "id": 1,
              "sort_order": 0,
              "item_type": "product",
              "product_sku": "SKU-WAVE110I",
              "product_name": "Honda Wave 110i (2025)",
              "product_category": "มอเตอร์ไซค์",
              "product_category_code": "MOTO",
              "quantity": 1,
              "unit_price": 45900.00,
              "discount": 900.00,
              "total": 45000.00
            },
            {
              "item_type": "discount",
              "product_sku": null,
              "product_name": "ส่วนลดพิเศษลูกค้าเก่า",
              "quantity": 1,
              "unit_price": -500.00,
              "discount": 0,
              "total": -500.00
            },
            {
              "item_type": "free_gift",
              "product_sku": null,
              "product_name": "ของแถม: หมวกกันน๊อก INDEX",
              "quantity": 1,
              "unit_price": 0,
              "discount": 0,
              "total": 0
            }
          ]
        }
      ],
      "pagination": { "page": 1, "limit": 20, "total": 6, "total_pages": 1 }
    }
    ```
  - **`item_type` enum** (inferred server-side จากค่าใน invoice_items):
    | value | เงื่อนไข | การแสดงผล |
    |-------|---------|----------|
    | `product` | product_id ไม่ null, total ≥ 0 | แสดงปกติ |
    | `service` | product_id เป็น null, unit_price > 0 | แสดงเป็น "ค่าแรง/บริการ" |
    | `discount` | total < 0 | ตัวเลขสีแดง ขึ้นต้น "-" badge `ส่วนลด` |
    | `free_gift` | unit_price = 0 และ total = 0 | badge `ฟรี` สีเขียว |
  - **Bundle/Set items**: ไม่มี field พิเศษ — frontend ตรวจจาก `product_name` ที่ขึ้นต้นด้วย `[เซ็ต...]` แล้ว indent หรือจัดกลุ่มเอง
  - **UI — Invoice card** (ทำ expand/collapse):
    ```
    ┌──────────────────────────────────────────────────────────┐
    │ INV-DEMO-0006 │ 28 ก.พ. 2569 │ สาขาใหญ่ │ ✅ ชำระครบ  │
    │ 6 รายการ                             ยอดสุทธิ 48,471 บาท│
    ├──────────────────────────────────────────────────────────┤  ← expand
    │ • Honda Wave 110i (2025)    1 คัน × 45,900   = 45,000  │
    │   ↳ ลด 900 บาท                                          │
    │ • [เซ็ตแต่งรถ] กระจกมองหลัง CNC  1 × 450     =    450 │
    │ • [เซ็ตแต่งรถ] แฮนด์การ์ด        1 × 350     =    350 │
    │ 🏷 ส่วนลดพิเศษลูกค้าเก่า                        - 500  │
    │ 🎁 ของแถม: หมวกกันน๊อก INDEX                      ฟรี  │
    │ 🎁 ของแถม: ถุงมือกันลม                             ฟรี  │
    └──────────────────────────────────────────────────────────┘
    ```
  - Filter (query params): `search` (invoice_no/ชื่อสินค้า), `invoice_type`, `date_from`, `date_to`, `branch_id`
  - Summary card: จำนวน invoice ทั้งหมด + ยอดรวมทุก invoice
  - สถานะการชำระ: `ชำระครบ` (paid) | `ค้างชำระ` (overdue) | `รอชำระ` (issued)
  - คลิกเลขเอกสาร → navigate ไป `/billing/documents` (กดที่ row จะพาไป `/billing/jobs/{kind}:{id}`)
- **ประวัติรับประกัน**: `GET /customers/{id}/warranty-history` → list Warranty ทั้งหมด (เลข WR, สินค้า, วันหมดอายุ)
- ⚠️ service-history และ warranty-history ไม่ต้อง pagination — return ทั้งหมด

---

## 5.4 Flow เชื่อมต่อ

```
หน้าลูกค้า → เลือกรถ → "สร้างใบสั่งซ่อม" → ไป /billing/new/repair?customer_id=X&vehicle_id=Y
หน้าลูกค้า → "สร้างใบเสนอราคา (ขาย)" → ไป /quotations/create?customer_id=X
หน้าลูกค้า → Tab ประวัติ → คลิก SO → ไป /billing/jobs/repair:{id}
```

---

## ดูเพิ่มเติม
- [06-service-orders.md](./06-service-orders.md) — ใบสั่งซ่อมของลูกค้า
- [07-quotations.md](./07-quotations.md) — ใบเสนอราคา (ขาย)
- [08-invoices.md](./08-invoices.md) — ประวัติซื้อ (Invoice)
- [11-warranties.md](./11-warranties.md) — ประวัติรับประกัน
