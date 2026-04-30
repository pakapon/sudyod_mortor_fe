# ใบแจ้งหนี้ (Invoices)

> ดู common conventions → [00-common.md](./00-common.md)  
> **📋 Reference เท่านั้น** — ดู API sequence จริงตาม flow ที่ [20-flows.md](./20-flows.md)

---

## 8.1 หน้า List Invoice

**Route:** `/invoices`  
**Permission:** `invoices.can_view`

**Components:**
- Search: เลข INV / ชื่อลูกค้า
- Filter: `status` (draft/issued/paid/overdue/cancelled), `type` (service/sale/retail), `branch_id`, `date_from`, `date_to`
- Table: เลข INV, type, ลูกค้า, ยอดรวม, สถานะ (badge สี), วันที่ออก, วันครบกำหนด
- Status badge:
  - `draft` → สีเทา
  - `issued` → สีน้ำเงิน
  - `paid` → สีเขียว
  - `overdue` → สีแดง
  - `cancelled` → สีเทาเข้ม
- Export: `GET /api/v1/invoices/export` (ยังไม่ implement — planned)
- ปุ่ม "สร้าง Invoice ขายปลีก" → `/billing/pos`

**API:** `GET /api/v1/invoices?status=issued&type=service&page=1&limit=20`

---

## 8.2 หน้า Detail Invoice

**Route:** `/invoices/{id}`  
**Permission:** `invoices.can_view`

**Header:**
- เลข INV (INV-2026-XXXX) + Status Badge
- ลูกค้า (link ไปหน้าลูกค้า)
- ยอดรวม (subtotal, VAT, total)
- วันที่ออก / วันครบกำหนด
- Link ไป QT ที่เกี่ยวข้อง (ถ้ามี)
- Link ไป SO ที่เกี่ยวข้อง (ถ้ามี type=service)

**รายการสินค้า/บริการ:**
- Table: ชื่อรายการ, จำนวน, ราคาต่อหน่วย, ส่วนลด, รวม
- สรุปยอด: subtotal, discount, vat, total
- มัดจำที่หัก (ถ้ามี Deposit — Flow B2)

**Tab: การชำระเงิน**
- List การชำระทั้งหมด: วันที่, จำนวน, ช่องทาง, ยอดคงเหลือ
- API: `GET /api/v1/invoices/{id}/payments`

**API:** `GET /api/v1/invoices/{id}`

---

## 8.3 Action Buttons (แสดงตาม status + permission)

| Status | ปุ่ม | Action |
|--------|------|--------|
| `draft` | "ออก Invoice" | `POST /api/v1/invoices/{id}/issue` |
| `draft` | "แก้ไข" | `PUT /api/v1/invoices/{id}` |
| `draft` | "ยกเลิก" | `POST /api/v1/invoices/{id}/cancel` |
| `issued` | "บันทึกชำระ" | เปิด modal → ดู §8.4 |
| `issued` | "ยกเลิก" | `POST /api/v1/invoices/{id}/cancel` |
| `paid` | "ออกใบเสร็จ" | `POST /api/v1/invoices/{id}/issue-receipt` |
| `paid` | "สร้าง DN" | เปิด modal → ดู §8.5 |
| `paid` | "สร้างใบรับประกัน" | เปิด modal → ดู §8.6 |

---

## 8.4 Modal: บันทึกการชำระเงิน

**เปิดเมื่อ:** กด "บันทึกชำระ" (Invoice status = `issued`)

**Fields:**

| Field | Type | Required | หมายเหตุ |
|-------|------|----------|---------|
| `amount` | Number | ✅ | จำนวนเงินที่ชำระ |
| `method` | Select | ✅ | `cash` / `transfer` / `credit_card` / `cheque` / `store_installment` / `finance_loan` |
| `reference_no` | Text | ❌ | เลขอ้างอิงการโอน / เลขเช็ค |
| `note` | Textarea | ❌ | หมายเหตุ |

**API:** `POST /api/v1/invoices/{id}/payments`

```json
{
  "amount": 3500.00,
  "method": "transfer",
  "reference_no": "REF20260430001",
  "note": "โอนผ่าน SCB"
}
```

> ❌ **ไม่มี field `paid_at`** — เวลาบันทึกจาก server timestamp อัตโนมัติ  
> ชำระได้หลายครั้ง (partial payment) จนครบยอด

---

## 8.5 Modal: สร้าง Delivery Note จาก Invoice

**เปิดเมื่อ:** กด "สร้าง DN" (Invoice status = `paid`)

> **⚠️ หมายเหตุ:** DN ผูกกับ SO หรือ QT ไม่ใช่ INV โดยตรง  
> หน้า Invoice ต้องรู้ว่า INV นั้นมาจาก SO หรือ QT แล้วใช้ owner_type ที่ถูกต้อง

**API:** `POST /api/v1/delivery-notes`

```json
{
  "owner_type": "service_order",
  "owner_id": {so_id},
  "customer_id": {customer_id},
  "note": "ส่งมอบสินค้า"
}
```

> `owner_type`: `service_order` (Flow A) หรือ `quotation` (Flow B1/B2)  
> ดูรายละเอียด DN ที่ [10-delivery-notes.md](./10-delivery-notes.md)

---

## 8.6 Modal: สร้างใบรับประกันจาก Invoice

**เปิดเมื่อ:** กด "สร้างใบรับประกัน" (Invoice status = `paid`)

> **⚠️ หมายเหตุ:** WR ผูกกับ SO หรือ QT ไม่ใช่ INV โดยตรง

**API:** `POST /api/v1/warranties`

```json
{
  "owner_type": "service_order",
  "owner_id": {so_id},
  "warranty_months": 3,
  "warranty_km": 5000,
  "conditions": "รับประกันชิ้นส่วนที่ซ่อม",
  "start_date": "2026-04-30"
}
```

> `owner_type`: `service_order` หรือ `quotation`  
> ดูรายละเอียดที่ [11-warranties.md](./11-warranties.md)

---

## 8.7 สร้าง Invoice จากแหล่งต่างๆ

**จาก QT (Flow A / B1 / B2):**

```
POST /api/v1/invoices/from-quotation
{ "quotation_id": {qt_id}, "due_date": "2026-05-07", "note": "" }
```

**ขายปลีก / Retail POS (Flow C):**

→ ใช้หน้า **Billing POS** ที่ `/billing/pos`

```
POST /api/v1/invoices/retail
{
  "customer_id": null,
  "vat_percent": 7,
  "items": [ { "product_id": 20, "quantity": 2, "unit_price": 150.00, "discount": 0 } ]
}
```

---

## 8.8 Status Flow

```
draft ──→ issued ──→ paid
  │           │         └──→ (ออกใบเสร็จ, DN, WR)
  └── cancel  └── cancel
              └── overdue (อัตโนมัติ job ตรวจ 01:00 ทุกวัน)
```

---

## ดูเพิ่มเติม

- [09-deposits.md](./09-deposits.md) — มัดจำ (Flow B2)
- [10-delivery-notes.md](./10-delivery-notes.md) — ใบส่งมอบ
- [11-warranties.md](./11-warranties.md) — ใบรับประกัน
- [20-flows.md](./20-flows.md) — sequence ทั้งหมด (A-15 ถึง A-24)
- [12-billing-hub.md](./12-billing-hub.md) — Billing Hub UX
