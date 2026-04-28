# ใบสั่งซ่อม (Service Orders)

> ดู common conventions → [00-common.md](./00-common.md)
> **หัวใจของระบบ** — ทุก Scenario A (ซ่อมรถ) เริ่มที่นี่

---

## 6.1 หน้า List ใบสั่งซ่อม

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

---

## 6.2 หน้า สร้างใบสั่งซ่อม

**Route:** `/service-orders/create`

**Form Sections:**

**Section 1: เลือกลูกค้า + รถ**
- Autocomplete ค้นลูกค้า → `GET /customers?search=xxx`
- เลือกลูกค้าแล้ว → แสดงรถทั้งหมด → `GET /customers/{id}/vehicles`
- ถ้ายังไม่มีลูกค้า → ปุ่ม "สร้างลูกค้าใหม่" (modal)
- ถ้ายังไม่มีรถ → ปุ่ม "เพิ่มรถ" (modal)

**Section 2: ข้อมูลใบสั่งซ่อม**
| Field | Type | Required | หมายเหตุ |
|-------|------|----------|---------|
| `symptom` | Textarea | ✅ | อาการเสีย/สิ่งที่ต้องทำ |
| `received_date` | Date | ✅ | วันที่รับรถจริง |
| `mileage` | Number | ❌ | เลขไมล์ตอนรับรถ |
| `expected_completion_date` | Date | ❌ | วันนัดรับ |
| `is_quick_repair` | Checkbox | ❌ | ซ่อมด่วน (ข้าม pending_quote) |
| `branch_id` | Select | ✅ | (auto จาก current branch) |

- ปุ่ม "บันทึกฉบับร่าง" → สถานะ `draft`
- API: `POST /service-orders`
- สำเร็จ → redirect ไป `/service-orders/{id}` (หน้า detail)

> **แก้ไข SO:** `PATCH /service-orders/{id}` — แก้ได้เฉพาะ status `draft` และ `pending_review` เท่านั้น
> Fields ที่แก้ได้: `symptom`, `received_date`, `mileage`, `expected_completion_date`, `is_quick_repair`, `diagnosis`, `internal_note`

---

## 6.3 หน้า Detail ใบสั่งซ่อม ⭐

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
| `pending_review` | "อนุมัติด่วน" | transition → `approved` | กรณีซ่อมด่วน/Scenario B ไม่ต้องเสนอราคา |
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
- ⚠️ แก้ได้เฉพาะ status ≤ pending_quote; เพิ่มได้หลัง `approved` แต่จะถูก flag `is_additional = true`
- ⚠️ ลบรายการไม่ได้เมื่อ status ≥ `in_progress` (สต็อกถูกตัดแล้ว)

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

---

## 6.4 Status Flow Diagram (สำหรับ UI)

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

## ดูเพิ่มเติม
- [05-customers.md](./05-customers.md) — เลือกลูกค้า + รถ
- [07-quotations.md](./07-quotations.md) — สร้างใบเสนอราคา (QT) จาก SO
- [08-invoices.md](./08-invoices.md) — ใบแจ้งหนี้ที่ผูกกับ SO
- [10-delivery-notes.md](./10-delivery-notes.md) — ใบส่งมอบ (DN) บังคับก่อน closed
- [11-warranties.md](./11-warranties.md) — ใบรับประกัน
- [12-products.md](./12-products.md) — ค้นหาอะไหล่ตอนเพิ่ม SO items
- [20-flows.md](./20-flows.md) — Flow A ทั้งหมด 19 ขั้นตอน
