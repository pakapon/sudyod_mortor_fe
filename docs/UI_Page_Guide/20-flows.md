# Billing API Working Guide — Flows A / B1 / B2 / C

> **คู่มือ sequence จริง** สำหรับ dev ที่ต้องเรียก API ตามลำดับ  
> แต่ละ step ระบุ endpoint + request body + เงื่อนไขที่ต้องผ่านก่อน  
> ดูภาพรวม UI ที่ [12-billing-hub.md](./12-billing-hub.md)  

---

## Quick Reference

| Scenario | ใช้เมื่อ | Flow |
|----------|---------|------|
| A — ซ่อมรถ | รับรถเข้าซ่อม (SO → QT → INV → RCP → DN → WR) | A-1 ถึง A-25 |
| B1 — ขายไม่มัดจำ | ขายอะไหล่/อุปกรณ์ปกติ | B1-1 ถึง B1-9 |
| B2 — ขายมีมัดจำ | สั่งจอง/วางมัดจำก่อน | B2-1 ถึง B2-10 |
| C — Retail POS | ขายหน้าร้าน/ขายปลีกรายชิ้น | C-1 ถึง C-5 |

---

## SO Status Reference

```
draft → pending_review → pending_quote → approved → in_progress
  │            │               │
  └── cancel   └── cancel(*)   └── cancel
                                        │
                                   completed → pending_payment → pending_pickup → closed
```
(*) cancel ได้เฉพาะ status ≤ `pending_quote`

## QT Status Reference

```
draft → sent → approved
             → rejected
             → expired (อัตโนมัติ)
```

## INV Status Reference

```
draft → issued → paid
              → overdue (อัตโนมัติ)
              → cancelled
```

---

## Flow A — ซ่อมรถ (Scenario A)

> SO → GPS → QT → INV → Payment → Receipt → DN → WR → Close

### A-1 รับรถเข้า — สร้าง SO

```
POST /api/v1/service-orders
Authorization: Bearer {token}

{
  "customer_id": 1,
  "vehicle_id": 2,
  "symptom": "เครื่องดับระหว่างวิ่ง",
  "received_date": "2026-04-30",
  "mileage": 45000,
  "expected_completion_date": "2026-05-02",
  "branch_id": 1
}
```

**Response:** SO object ที่มี `id`, `reference_no` (SO-2026-XXXX), `status: "draft"`

---

### A-2 ถ่ายรูปก่อนรับรถ (GPS pre_intake ≥ 1 รูป — **บังคับ**)

```
POST /api/v1/service-orders/{id}/gps-photos
Content-Type: multipart/form-data

photo       = (file)
photo_type  = "pre_intake"
latitude    = 13.7563
longitude   = 100.5018
taken_at    = "2026-04-30T10:00:00"
```

> Server จะประทับ watermark 4 บรรทัดลงรูปอัตโนมัติ  
> บังคับถ่ายก่อน step A-3

---

### A-3 ส่งตรวจสอบ

```
PATCH /api/v1/service-orders/{id}/transition

{ "status": "pending_review" }
```

**ก่อนเรียกต้องมี:** GPS `pre_intake` ≥ 1 รูป (backend ตรวจ)

---

### A-4 ตรวจสอบแล้ว — รอเสนอราคา

```
PATCH /api/v1/service-orders/{id}/transition

{ "status": "pending_quote" }
```

---

### A-5 สร้างใบเสนอราคา (QT type=service)

```
POST /api/v1/quotations

{
  "type": "service",
  "customer_id": 1,
  "service_order_id": {so_id},
  "validity_days": 30,
  "note": "ราคานี้ยังไม่รวมค่าแรงเพิ่ม"
}
```

**Response:** QT object ที่มี `id`, `reference_no` (QT-2026-XXXX), `status: "draft"`

---

### A-6 เพิ่มรายการ QT

```
POST /api/v1/quotations/{qt_id}/items

{
  "product_id": 10,
  "item_type": "part",
  "description": "ไส้กรองน้ำมันเครื่อง",
  "quantity": 2,
  "unit_price": 350.00,
  "discount": 0
}
```

> เรียกซ้ำสำหรับแต่ละรายการ  
> `item_type`: `part` | `labor` | `service`  
> ถ้าเป็น labor/service ไม่ต้องระบุ `product_id`

---

### A-7 ส่งใบเสนอราคาให้ลูกค้า

```
PATCH /api/v1/quotations/{qt_id}/send
```

> ไม่ต้องส่ง body  
> QT status → `sent`

---

### A-8 อนุมัติใบเสนอราคา

```
PATCH /api/v1/quotations/{qt_id}/approve
```

> Permission: `quotations.can_approve`  
> QT status → `approved`

---

### A-9 SO อนุมัติ

```
PATCH /api/v1/service-orders/{id}/transition

{ "status": "approved" }
```

---

### A-10 มอบหมายช่าง

```
PATCH /api/v1/service-orders/{id}/assign

{ "technician_id": 5 }
```

---

### A-11 เริ่มซ่อม — ตัดสต็อกอัตโนมัติ (atomic DB transaction)

```
PATCH /api/v1/service-orders/{id}/transition

{ "status": "in_progress" }
```

**ก่อนเรียกต้องมี:** `technician_id` ถูกกำหนดแล้ว  
**Backend:** ตัดสต็อกอะไหล่ทุก item ใน SO ณ ขณะนี้ (transaction)

---

### A-12 ถ่ายรูประหว่างซ่อม (optional แต่แนะนำ)

```
POST /api/v1/service-orders/{id}/gps-photos
Content-Type: multipart/form-data

photo_type  = "damage_spot"   (หรือ "pre_repair")
latitude    = ...
longitude   = ...
taken_at    = "2026-04-30T11:00:00"
```

---

### A-13 ซ่อมเสร็จ

```
PATCH /api/v1/service-orders/{id}/transition

{ "status": "completed" }
```

---

### A-14 รอชำระเงิน

```
PATCH /api/v1/service-orders/{id}/transition

{ "status": "pending_payment" }
```

---

### A-15 สร้าง Invoice จาก QT

```
POST /api/v1/invoices/from-quotation

{
  "quotation_id": {qt_id},
  "due_date": "2026-05-07",
  "note": ""
}
```

**Response:** INV object ที่มี `id`, `reference_no` (INV-2026-XXXX), `status: "draft"`  
> ถ้ามี Deposit (Flow B2) ระบบจะหักมัดจำให้อัตโนมัติตาม `deposit_id` ที่ผูกกับ QT

---

### A-16 ออก Invoice

```
POST /api/v1/invoices/{inv_id}/issue
```

> INV status → `issued`  
> ไม่ต้องส่ง body

---

### A-17 บันทึกการชำระเงิน

```
POST /api/v1/invoices/{inv_id}/payments

{
  "amount": 3500.00,
  "method": "transfer",
  "reference_no": "REF20260430001",
  "note": "โอนผ่าน SCB"
}
```

> `method`: `cash` | `transfer` | `credit_card` | `cheque` | `store_installment` | `finance_loan`  
> ชำระได้หลายครั้งจนครบ  
> ดูประวัติ: `GET /api/v1/invoices/{inv_id}/payments`

---

### A-18 ออกใบเสร็จ (PDF)

```
POST /api/v1/invoices/{inv_id}/issue-receipt
```

> ไม่ต้องส่ง body  
> **ก่อนเรียกต้องมี:** ชำระครบแล้ว (INV status = `paid`)  
> Response: `{ receipt_url: "https://..." }` (PDF บน DO Spaces)  
> Receipt No: RCP-2026-XXXX

---

### A-19 รอรับรถ

```
PATCH /api/v1/service-orders/{id}/transition

{ "status": "pending_pickup" }
```

**ก่อนเรียกต้องมี:** Invoice ออกแล้ว + Receipt ออกแล้ว

---

### A-20 ถ่ายรูปก่อนส่งมอบ (optional)

```
POST /api/v1/service-orders/{id}/gps-photos
Content-Type: multipart/form-data

photo_type  = "pre_delivery"
...
```

---

### A-21 สร้าง Delivery Note

```
POST /api/v1/delivery-notes

{
  "owner_type": "service_order",
  "owner_id": {so_id},
  "customer_id": 1,
  "note": "ส่งมอบรถหลังซ่อมเสร็จ"
}
```

**Response:** DN object ที่มี `id`, `reference_no` (DN-2026-XXXX)

---

### A-22 ลูกค้าเซ็นรับ DN

```
PATCH /api/v1/delivery-notes/{dn_id}/sign

{ "signed_by": "นายมนัส ใจดี" }
```

> `signed_at` จะถูกตั้งค่าอัตโนมัติโดย backend

---

### A-23 ถ่ายรูปส่งมอบ (GPS delivery ≥ 1 รูป — **บังคับ**)

```
POST /api/v1/service-orders/{id}/gps-photos
Content-Type: multipart/form-data

photo_type  = "delivery"
latitude    = ...
longitude   = ...
taken_at    = "2026-04-30T16:00:00"
```

**บังคับก่อน step A-25**

---

### A-24 ออกใบรับประกัน

```
POST /api/v1/warranties

{
  "owner_type": "service_order",
  "owner_id": {so_id},
  "warranty_months": 3,
  "warranty_km": 5000,
  "conditions": "รับประกันชิ้นส่วนที่ซ่อม ไม่ครอบคลุมอุบัติเหตุ",
  "start_date": "2026-04-30"
}
```

**Response:** WR object ที่มี `id`, `reference_no` (WR-2026-XXXX)

---

### A-25 ปิดงาน

```
PATCH /api/v1/service-orders/{id}/transition

{ "status": "closed" }
```

**ก่อนเรียกต้องมี:**
- GPS `delivery` ≥ 1 รูป
- DN ที่ `signed_at` ไม่เป็น null

---

## Flow B1 — ขายอะไหล่ ไม่มีมัดจำ (Scenario B1)

> QT(sale) → INV → Payment → Receipt → [DN optional] → [WR optional]

### B1-1 สร้างใบเสนอราคาขาย

```
POST /api/v1/quotations

{
  "type": "sale",
  "customer_id": 1,
  "validity_days": 7,
  "note": ""
}
```

---

### B1-2 เพิ่มรายการ

```
POST /api/v1/quotations/{qt_id}/items

{
  "product_id": 15,
  "item_type": "part",
  "description": "ผ้าเบรกหน้า",
  "quantity": 1,
  "unit_price": 850.00,
  "discount": 50
}
```

---

### B1-3 ส่งและอนุมัติ

```
PATCH /api/v1/quotations/{qt_id}/send
PATCH /api/v1/quotations/{qt_id}/approve
```

---

### B1-4 สร้าง Invoice

```
POST /api/v1/invoices/from-quotation

{ "quotation_id": {qt_id} }
```

---

### B1-5 ออก Invoice (ตัดสต็อกอัตโนมัติ)

```
POST /api/v1/invoices/{inv_id}/issue
```

> **Trigger:** ตัดสต็อกสินค้าในรายการ INV type=sale ณ ขณะ issue (atomic transaction)

---

### B1-6 ชำระเงิน

```
POST /api/v1/invoices/{inv_id}/payments

{
  "amount": 800.00,
  "method": "cash",
  "reference_no": "",
  "note": ""
}
```

---

### B1-7 ออกใบเสร็จ

```
POST /api/v1/invoices/{inv_id}/issue-receipt
```

---

### B1-8 สร้าง DN (optional)

```
POST /api/v1/delivery-notes

{
  "owner_type": "quotation",
  "owner_id": {qt_id},
  "customer_id": 1,
  "note": ""
}
```

---

### B1-9 ออกใบรับประกัน (optional)

```
POST /api/v1/warranties

{
  "owner_type": "quotation",
  "owner_id": {qt_id},
  "warranty_months": 6,
  "warranty_km": 0,
  "conditions": "รับประกันสินค้า",
  "start_date": "2026-04-30"
}
```

---

## Flow B2 — ขายอะไหล่ มีมัดจำ (Scenario B2)

> QT(sale) → Deposit(+Receipt PDF) → INV(หักมัดจำ) → Payment → Receipt → [DN] → [WR]

### B2-1 ถึง B2-3 — เหมือน B1-1 ถึง B1-3

สร้าง QT (type=sale) → เพิ่ม items → ส่ง → อนุมัติ

---

### B2-4 รับมัดจำ

```
POST /api/v1/deposits

{
  "quotation_id": {qt_id},
  "amount": 1000.00,
  "payment_method": "transfer",
  "reference_no": "DEP20260430",
  "note": "มัดจำ 50%"
}
```

> `payment_method`: `cash` | `transfer` | `credit_card` | `cheque`  
> **Response:** Deposit object ที่มี `id`, `reference_no` (DP-2026-XXXX)

---

### B2-5 ออกใบเสร็จมัดจำ (PDF)

```
GET /api/v1/deposits/{deposit_id}/receipt
```

> Response: redirect หรือ `{ receipt_url: "https://..." }` (PDF)

---

### B2-6 สร้าง Invoice (ระบบหักมัดจำอัตโนมัติ)

```
POST /api/v1/invoices/from-quotation

{
  "quotation_id": {qt_id},
  "due_date": "2026-05-07"
}
```

> ถ้ามี Deposit ผูกกับ QT อยู่แล้ว ระบบจะหักมัดจำให้อัตโนมัติ  
> ยอดใน INV = ยอด QT − มัดจำ

---

### B2-7 ออก Invoice

```
POST /api/v1/invoices/{inv_id}/issue
```

---

### B2-8 ชำระส่วนที่เหลือ

```
POST /api/v1/invoices/{inv_id}/payments

{
  "amount": 1000.00,
  "method": "cash",
  "reference_no": "",
  "note": "ชำระส่วนที่เหลือ"
}
```

---

### B2-9 ออกใบเสร็จ

```
POST /api/v1/invoices/{inv_id}/issue-receipt
```

---

### B2-10 DN + WR (optional — เหมือน B1-8, B1-9)

```
owner_type: "quotation"
owner_id: {qt_id}
```

---

## Flow C — Retail POS (Scenario C)

> สแกนสินค้า → INV(retail) → Payment → Receipt

### C-1 ค้นสินค้า

```
GET /api/v1/products?search={barcode_or_name}&limit=10
```

---

### C-2 สร้าง Invoice ขายปลีก

```
POST /api/v1/invoices/retail

{
  "customer_id": null,
  "vat_percent": 7,
  "note": "",
  "items": [
    {
      "product_id": 20,
      "quantity": 2,
      "unit_price": 150.00,
      "discount": 0
    }
  ]
}
```

> `customer_id` เป็น optional (walk-in customer)  
> `branch_id` ดึงจาก JWT อัตโนมัติ  
> **Response:** INV object ที่มี `id`, `status: "draft"`

---

### C-3 ออก Invoice (ตัดสต็อก)

```
POST /api/v1/invoices/{inv_id}/issue
```

---

### C-4 ชำระเงิน

```
POST /api/v1/invoices/{inv_id}/payments

{
  "amount": 300.00,
  "method": "cash",
  "reference_no": "",
  "note": ""
}
```

---

### C-5 พิมพ์ใบเสร็จ

```
POST /api/v1/invoices/{inv_id}/issue-receipt
```

> Response: `{ receipt_url: "https://..." }` (PDF thermal-format)

---

## Finance / Loan (ข้อมูลอ้างอิง)

### สร้าง Loan Application

```
POST /api/v1/loan-applications

{
  "customer_id": 1,
  "finance_company_id": 2,
  "product_id": 5,
  "loan_amount": 50000,
  "down_payment": 10000,
  "term_months": 48,
  "note": ""
}
```

### เพิ่มผู้ค้ำ

```
POST /api/v1/loan-applications/{id}/guarantors

{
  "customer_id": 3,
  "relationship": "spouse"
}
```

### อนุมัติ / ปฏิเสธ

```
PATCH /api/v1/loan-applications/{id}/approve
PATCH /api/v1/loan-applications/{id}/reject  { "reject_reason": "..." }
```

### ค้นหา (Elasticsearch)

```
GET /api/v1/loans/search?q=0812345678&type=all
```

> ค้น phone/id_card ในทุก index พร้อมกัน (ผู้กู้ + ผู้ค้ำ + สินเชื่อร้าน)

---

## Store Loan (สินเชื่อร้าน)

### สร้างสินเชื่อร้าน

```
POST /api/v1/store-loans

{
  "customer_id": 1,
  "product_id": 5,
  "product_variant_id": null,
  "principal": 30000,
  "down_payment": 5000,
  "interest_rate": 1.5,
  "term_months": 36,
  "start_date": "2026-05-01"
}
```

### คำนวณงวด (ก่อนสร้าง)

```
GET /api/v1/store-loans/{id}/calculate
```

### บันทึกชำระงวด

```
POST /api/v1/store-loans/{id}/payments

{
  "amount": 1000.00,
  "payment_method": "transfer",
  "reference_no": "",
  "note": ""
}
```

---

## Inventory (ข้อมูลอ้างอิง)

### รับสินค้าเข้าคลัง (Goods Receipt)

```
POST /api/v1/goods-receipts

{
  "purchase_order_id": null,
  "warehouse_id": 1,
  "received_date": "2026-04-30",
  "items": [...]
}
```

```
POST /api/v1/goods-receipts/{id}/approve
```

### โอนสินค้าระหว่างคลัง

```
POST /api/v1/stock-transfers

{
  "from_warehouse_id": 1,
  "to_warehouse_id": 2,
  "note": "",
  "items": [
    { "product_id": 10, "quantity": 5 }
  ]
}
```

```
POST /api/v1/stock-transfers/{id}/approve
POST /api/v1/stock-transfers/{id}/complete
```

### ปรับสต็อก (manual)

```
PATCH /api/v1/warehouses/{wh_id}/inventory/adjust

{
  "product_id": 10,
  "quantity_change": -2,
  "reason": "สินค้าชำรุด"
}
```

---

## GET /billing/jobs — Unified Job List (planned)

> Endpoint นี้อยู่ใน **roadmap** — ยังไม่ได้ implement ใน backend  
> ออกแบบสำหรับหน้า Billing Hub (`/billing`) ที่ต้องแสดง job ทุกประเภทรวมกัน

**Endpoint (planned):**

```
GET /api/v1/billing/jobs
```

**Query Params:**

| Param | Type | หมายเหตุ |
|-------|------|---------|
| `type` | `repair` \| `sale` | กรองตาม flow type |
| `status` | string | กรองตาม status ของ source doc |
| `branch_id` | int | กรองสาขา |
| `search` | string | ค้น reference_no / ชื่อลูกค้า |
| `page` | int | default 1 |
| `limit` | int | default 20 |

**Response (planned):**

```json
{
  "success": true,
  "data": [
    {
      "type": "repair",
      "source_type": "service_order",
      "source_id": 42,
      "reference_no": "SO-2026-0042",
      "customer_name": "นายมนัส ใจดี",
      "status": "in_progress",
      "current_step": "repair_wk",
      "total_amount": 3500.00,
      "created_at": "2026-04-30T09:00:00"
    },
    {
      "type": "sale",
      "source_type": "quotation",
      "source_id": 15,
      "reference_no": "QT-2026-0015",
      "customer_name": "บริษัท ABC จำกัด",
      "status": "approved",
      "current_step": "payment",
      "total_amount": 12000.00,
      "created_at": "2026-04-29T14:30:00"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 45, "total_pages": 3 }
}
```

**หมายเหตุการ implement:**
- UNION SO (type=repair) + QT type=sale พร้อม JOIN customers
- Flow C (POS) ไม่อยู่ใน list นี้ — ดูได้จาก `GET /invoices?type=retail`
- `current_step` map จาก status → step name ของ JobFlowPage

---

## ดูเพิ่มเติม

- [08-invoices.md](./08-invoices.md) — หน้า List + Detail Invoice
- [09-deposits.md](./09-deposits.md) — หน้ามัดจำ
- [10-delivery-notes.md](./10-delivery-notes.md) — ใบส่งมอบ
- [11-warranties.md](./11-warranties.md) — ใบรับประกัน
- [12-billing-hub.md](./12-billing-hub.md) — Billing Hub UX overview
- [06-service-orders.md](./06-service-orders.md) — SO detail + tabs
- [07-quotations.md](./07-quotations.md) — QT detail + approve
