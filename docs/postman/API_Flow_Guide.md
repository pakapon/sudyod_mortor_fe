# Sudyod Motor — API Flow Guide (สำหรับ Frontend)

> เอกสารนี้อธิบายความสัมพันธ์ระหว่าง API แต่ละตัว ลำดับการเรียก และ field ที่เชื่อมโยงกัน
> Base URL: `{{base_url}}/api/v1`
> Auth: `Authorization: Bearer {{token}}` (ทุก endpoint ยกเว้น Public)

---

## สารบัญ

1. [ภาพรวมระบบ — Module Map](#1-ภาพรวมระบบ--module-map)
2. [ลำดับการตั้งค่าระบบ (Setup Order)](#2-ลำดับการตั้งค่าระบบ-setup-order)
3. [Flow A — ซ่อมรถ (Service Repair)](#3-flow-a--ซ่อมรถ-service-repair)
4. [Flow B1 — ขายไม่มีมัดจำ (Sale without Deposit)](#4-flow-b1--ขายไม่มีมัดจำ)
5. [Flow B2 — ขายมีมัดจำ (Sale with Deposit)](#5-flow-b2--ขายมีมัดจำ)
6. [Flow C — ขายปลีก walk-in (Retail)](#6-flow-c--ขายปลีก-walk-in)
7. [การชำระเงินซื้อรถ — 3 รูปแบบ](#7-การชำระเงินซื้อรถ--3-รูปแบบ)
8. [คลังสินค้า (Inventory)](#8-คลังสินค้า-inventory)
9. [สินเชื่อและการเงิน (Loan & Finance)](#9-สินเชื่อและการเงิน)
10. [ระบบลูกค้า (Customer Ecosystem)](#10-ระบบลูกค้า)
11. [สินค้า (Product Ecosystem)](#11-สินค้า)
12. [HR & เวลาทำงาน](#12-hr--เวลาทำงาน)
13. [Status Flow ทุก Module](#13-status-flow-ทุก-module)
14. [ตาราง Field ที่เชื่อมโยง](#14-ตาราง-field-ที่เชื่อมโยง)
15. [Permission & Auth](#15-permission--auth)
16. [Endpoint Reference ทั้งหมด](#16-endpoint-reference-ทั้งหมด)

---

## 1. ภาพรวมระบบ — Module Map

```
┌─────────────────────────────────────────────────────────────┐
│                    SUDYOD MOTOR SYSTEM                       │
├──────────────┬──────────────┬───────────────┬───────────────┤
│  Foundation  │  Master Data │  Operations   │  Support      │
├──────────────┼──────────────┼───────────────┼───────────────┤
│ • Branches   │ • Brands     │ • Customers   │ • Dashboard   │
│ • Positions  │ • Categories │ • Vehicles    │ • Notifications│
│ • Employees  │ • Units      │ • Service     │ • Audit Logs  │
│ • Roles      │ • Products   │   Orders      │ • Internal    │
│ • Schedules  │ • Vendors    │ • Billing     │   Jobs        │
│ • Holidays   │ • Finance    │ • Inventory   │               │
│ • Attendance │   Companies  │ • Loans       │               │
└──────────────┴──────────────┴───────────────┴───────────────┘
```

### ความสัมพันธ์หลักระหว่าง Module

```
Customer ─── Vehicle ─── Service Order ─── GPS Photo
                              │
                    ┌─────────┼──────────┐
                    ▼         ▼          ▼
               Quotation   SO Items   Technician
                    │                 (Employee)
                    ▼
               Invoice ────── Payment
                    │
              ┌─────┼─────┐
              ▼     ▼     ▼
           Receipt  DN  Warranty
```

---

## 2. ลำดับการตั้งค่าระบบ (Setup Order)

> ⚠️ ต้องสร้างตามลำดับนี้ เพราะแต่ละ module อ้างอิงกัน

```
Step 1: POST /branches                    ← สร้างสาขาก่อน (ทุกอย่างผูก branch_id)
Step 2: POST /positions                   ← สร้างตำแหน่งงาน
Step 3: POST /permissions/roles           ← สร้าง Role + กำหนดสิทธิ์
Step 4: POST /employees                   ← สร้างพนักงาน (ผูก branch, position, role)
Step 5: POST /work-schedules              ← สร้างตารางเวลาทำงาน
Step 6: POST /holidays                    ← สร้างวันหยุด

Step 7: POST /product-units               ← สร้างหน่วยนับ (ชิ้น, กล่อง, ลิตร)
Step 8: POST /brands                      ← สร้างยี่ห้อ
Step 9: POST /product-categories           ← สร้างหมวดสินค้า
Step 10: POST /products                    ← สร้างสินค้า (ผูก unit, brand, category)
Step 11: POST /vendors                     ← สร้าง Supplier
Step 12: POST /warehouses                  ← สร้างคลัง (ผูก branch)
Step 13: POST /finance-companies           ← สร้างไฟแนนซ์ (ถ้าใช้)

Step 14: POST /customers                   ← สร้างลูกค้า
Step 15: POST /customers/:id/vehicles      ← เพิ่มรถของลูกค้า
```

---

## 3. Flow A — ซ่อมรถ (Service Repair)

> ลูกค้านำรถเข้าซ่อม → ถ่ายรูป → ออกใบเสนอราคา → ซ่อม → เก็บเงิน → ส่งมอบ

### ลำดับ API (ต้องเรียกตามลำดับ)

```
 ① สร้างใบสั่งซ่อม (SO)
 │   POST /service-orders
 │   Body: { customer_id, vehicle_id, symptom, mileage, branch_id }
 │   Response: { data: { id: 1, so_number: "SO-2026-0001", status: "draft" } }
 │
 ② ถ่ายรูปรอบคัน (GPS - pre_intake) ★ บังคับ ≥1 รูป
 │   POST /service-orders/1/gps-photos
 │   Body: FormData { photo(file), photo_type: "pre_intake", latitude, longitude, taken_at }
 │   ⚠️ ต้องส่ง lat/lng + taken_at ทุกรูป (server ใส่ watermark ให้)
 │
 ③ ส่งให้ผู้จัดการ review
 │   PATCH /service-orders/1/transition
 │   Body: { action: "submit_review" }
 │   Status: draft → pending_review
 │   ❌ ถ้ายังไม่มีรูป pre_intake จะ error 422
 │
 ④ ผู้จัดการอนุมัติให้เสนอราคา
 │   PATCH /service-orders/1/transition
 │   Body: { action: "approve_for_quote" }
 │   Status: pending_review → pending_quote
 │
 ⑤ ช่างตรวจ + ถ่ายรูปจุดเสีย (optional)
 │   POST /service-orders/1/gps-photos
 │   Body: FormData { photo(file), photo_type: "damage_spot", ... }
 │
 ⑥ สร้างใบเสนอราคา (QT)
 │   POST /quotations
 │   Body: {
 │     type: "service",
 │     service_order_id: 1,
 │     customer_id: 5,
 │     branch_id: 1,
 │     validity_days: 30,
 │     items: [
 │       { product_id: 10, quantity: 2, unit_price: 500, discount: 0 },
 │       { product_id: 20, quantity: 1, unit_price: 1500, discount: 100 }
 │     ]
 │   }
 │   Response: { data: { id: 1, qt_number: "QT-2026-0001", status: "draft" } }
 │
 ⑦ อนุมัติใบเสนอราคา
 │   PATCH /quotations/1/approve
 │   ✅ Auto: SO status → approved
 │
 ⑧ มอบหมายช่าง (ต้องทำก่อน in_progress)
 │   PATCH /service-orders/1/assign
 │   Body: { technician_id: 12 }
 │
 ⑨ เริ่มซ่อม ★ ตัดสต็อกอัตโนมัติ
 │   PATCH /service-orders/1/transition
 │   Body: { action: "start_repair" }
 │   Status: approved → in_progress
 │   ⚠️ ระบบตัดสต็อกอะไหล่ทุกรายการจาก QT แบบ atomic
 │   ❌ ถ้าสต็อกไม่พอ จะ error 422 + บอกว่าสินค้าไหนไม่พอ
 │
 ⑩ ช่างซ่อมเสร็จ
 │   PATCH /service-orders/1/transition
 │   Body: { action: "complete_repair" }
 │   Status: in_progress → completed
 │
 ⑪ ออกใบแจ้งหนี้ (INV)
 │   POST /invoices/from-quotation
 │   Body: { quotation_id: 1, service_order_id: 1, due_date: "2026-05-01" }
 │   Response: { data: { id: 1, invoice_number: "INV-2026-0001", status: "draft" } }
 │   ✅ Auto: SO status → pending_payment
 │
 ⑫ Issue Invoice
 │   POST /invoices/1/issue
 │   Status: draft → issued
 │
 ⑬ บันทึกการชำระเงิน
 │   POST /invoices/1/payments
 │   Body: { amount: 3500, method: "cash", payment_date: "2026-04-16" }
 │   ✅ ถ้าจ่ายครบ: INV status → paid, SO status → pending_pickup
 │
 ⑭ กดออกใบเสร็จ ★ ต้องกดเอง (ไม่ออกอัตโนมัติ)
 │   POST /invoices/1/issue-receipt
 │   Response: { data: { receipt_number: "RCP-2026-0001", pdf_url: "..." } }
 │
 ⑮ ถ่ายรูปส่งมอบ (GPS - delivery) ★ บังคับ ≥1 รูป
 │   POST /service-orders/1/gps-photos
 │   Body: FormData { photo(file), photo_type: "delivery", ... }
 │
 ⑯ สร้างใบส่งมอบ (DN)
 │   POST /delivery-notes
 │   Body: { invoice_id: 1, branch_id: 1, items: [...] }
 │
 ⑰ ลูกค้าเซ็นรับ
 │   PATCH /delivery-notes/1/sign
 │   Body: { signed_by: "นายสมชาย" }
 │
 ⑱ สร้างใบรับประกัน (WR)
 │   POST /warranties
 │   Body: { service_order_id: 1, warranty_months: 3, warranty_km: 5000 }
 │
 ⑲ ปิดงาน
 │   PATCH /service-orders/1/transition
 │   Body: { action: "close" }
 │   Status: pending_pickup → closed
 │   ❌ ต้องมี: delivery GPS ≥1 + DN เซ็นแล้ว + INV paid + Receipt ออกแล้ว
```

### Quick Repair (ข้ามใบเสนอราคา)

```
① สร้าง SO → ② ถ่ายรูป pre_intake → ③ submit_review
→ ④ ผู้จัดการอนุมัติตรง (skip pending_quote → approved)
→ ⑤ มอบหมายช่าง → ⑥ เริ่มซ่อม → ... (ต่อเหมือน Step ⑩-⑲)
```

---

## 4. Flow B1 — ขายไม่มีมัดจำ

> ลูกค้ามาซื้อรถ/อะไหล่ จ่ายเต็มจำนวน

```
 ① สร้างใบเสนอราคา (ไม่มี SO)
 │   POST /quotations
 │   Body: { type: "sale", customer_id: 5, branch_id: 1, items: [...] }
 │
 ② อนุมัติใบเสนอราคา
 │   PATCH /quotations/1/approve
 │
 ③ ออกใบแจ้งหนี้
 │   POST /invoices/from-quotation
 │   Body: { quotation_id: 1 }
 │
 ④ Issue Invoice ★ ตัดสต็อกอัตโนมัติ
 │   POST /invoices/1/issue
 │   ⚠️ ระบบตัดสต็อกสินค้าแบบ atomic ตอนนี้
 │
 ⑤ รับชำระเงิน
 │   POST /invoices/1/payments
 │   Body: { amount: 50000, method: "transfer", payment_date: "2026-04-16" }
 │
 ⑥ กดออกใบเสร็จ
 │   POST /invoices/1/issue-receipt
 │
 ⑦ สร้าง DN (optional) + WR
 │   POST /delivery-notes
 │   POST /warranties
```

---

## 5. Flow B2 — ขายมีมัดจำ

> ลูกค้าวางมัดจำก่อน แล้วมาจ่ายส่วนที่เหลือทีหลัง

```
 ① สร้างใบเสนอราคา
 │   POST /quotations
 │   Body: { type: "sale", customer_id: 5, items: [...] }
 │
 ② อนุมัติใบเสนอราคา
 │   PATCH /quotations/1/approve
 │
 ③ รับมัดจำ ★ ออกใบเสร็จมัดจำอัตโนมัติ
 │   POST /deposits
 │   Body: { quotation_id: 1, amount: 10000, method: "cash" }
 │   Response: { data: { id: 1, receipt_number: "RCP-2026-0002", receipt_pdf_url: "..." } }
 │   ⚠️ ใบเสร็จมัดจำออกอัตโนมัติ ไม่ต้องกดเอง (ต่างจากใบเสร็จปกติ)
 │
 ④ ออกใบแจ้งหนี้ (หักมัดจำแล้ว)
 │   POST /invoices/from-quotation
 │   Body: { quotation_id: 1, deposit_id: 1 }
 │   ⚠️ grand_total = ยอดรวม − มัดจำ
 │
 ⑤ Issue Invoice ★ ตัดสต็อกอัตโนมัติ
 │   POST /invoices/1/issue
 │
 ⑥ รับชำระส่วนที่เหลือ
 │   POST /invoices/1/payments
 │   Body: { amount: 40000, method: "transfer" }
 │
 ⑦ กดออกใบเสร็จ (ใบที่ 2 — สำหรับส่วนที่เหลือ)
 │   POST /invoices/1/issue-receipt
 │
 ⑧ สร้าง DN + WR
 │   POST /delivery-notes
 │   POST /warranties
```

---

## 6. Flow C — ขายปลีก walk-in

> ลูกค้า walk-in ซื้อของชิ้นเล็ก ไม่ต้องมีใบเสนอราคา

```
 ① ออกใบแจ้งหนี้ตรงเลย
 │   POST /invoices/retail
 │   Body: {
 │     branch_id: 1,
 │     customer_id: null,     ← ไม่ต้องลงทะเบียนลูกค้า
 │     items: [
 │       { product_id: 10, quantity: 1, unit_price: 250 }
 │     ]
 │   }
 │
 ② Issue Invoice ★ ตัดสต็อก
 │   POST /invoices/1/issue
 │
 ③ รับชำระ
 │   POST /invoices/1/payments
 │
 ④ กดออกใบเสร็จ
 │   POST /invoices/1/issue-receipt
```

---

## 7. การชำระเงินซื้อรถ — 3 รูปแบบ

> Flow B1/B2 ขายรถ → ขั้นตอน "รับชำระ" มี 3 ทางเลือก

### แบบ 1: จ่ายเงินสด/โอน/บัตร (จบทันที)

```
POST /invoices/:id/payments
Body: { amount: 50000, method: "cash" }    ← method: cash | transfer | credit_card | cheque
```

### แบบ 2: ผ่อนผ่านไฟแนนซ์ภายนอก (ร้านรับเงินเต็ม)

```
 ① สร้าง Loan Application
 │   POST /loan-applications
 │   Body: {
 │     customer_id: 5,
 │     finance_company_id: 2,
 │     loan_amount: 200000,
 │     interest_rate: 3.5
 │   }
 │
 ② เพิ่มผู้ค้ำ (ถ้ามี)
 │   POST /loan-applications/1/guarantors
 │   Body: { name, phone, id_card, ... }
 │
 ③ ไฟแนนซ์อนุมัติ
 │   PATCH /loan-applications/1/approve
 │   Body: { approved_amount: 200000, approved_date: "2026-04-20" }
 │
 ④ บันทึกชำระจากไฟแนนซ์
 │   POST /invoices/:id/payments
 │   Body: { amount: 200000, method: "finance_loan", reference_no: "LA-001" }
 │
 ⑤ กดออกใบเสร็จ → DN → WR
```

### แบบ 3: ผ่อนกับร้าน (Store Loan)

```
 ① คำนวณค่างวด
 │   GET /store-loans/:id/calculate?principal=100000&down_payment=20000
 │       &interest_rate=5&term_months=12
 │   Response: { monthly_payment: 7083.33, total_interest: 5000 }
 │
 ② สร้างสัญญาผ่อน
 │   POST /store-loans
 │   Body: {
 │     customer_id: 5,
 │     invoice_id: 1,
 │     principal: 100000,
 │     down_payment: 20000,
 │     interest_rate: 5,
 │     term_months: 12,
 │     start_date: "2026-05-01"
 │   }
 │
 ③ บันทึกเงินดาวน์
 │   POST /invoices/:id/payments
 │   Body: { amount: 20000, method: "cash" }
 │
 ④ กดออกใบเสร็จ → DN → WR
 │
 ⑤ ลูกค้ามาจ่ายรายงวด (ทุกเดือน)
 │   POST /store-loans/1/payments
 │   Body: { amount: 7083.33, payment_date: "2026-06-01", method: "transfer" }
 │
 ⑥ ดูประวัติการจ่าย
 │   GET /store-loans/1/payments
```

---

## 8. คลังสินค้า (Inventory)

### 8.1 รับสินค้าเข้าคลัง (Goods Receipt)

```
 ① สร้างใบรับสินค้า
 │   POST /goods-receipts
 │   Body: {
 │     warehouse_id: 1,
 │     vendor_id: 3,
 │     reference_no: "PO-2026-0001",
 │     items: [
 │       { product_id: 10, quantity: 100, unit_cost: 50 }
 │     ]
 │   }
 │
 ② อนุมัติ → สต็อกเพิ่มอัตโนมัติ
 │   POST /goods-receipts/1/approve
 │   ✅ inventory.quantity += received_qty
```

### 8.2 โอนย้ายสินค้า (Stock Transfer)

```
 ① สร้างใบโอน
 │   POST /stock-transfers
 │   Body: {
 │     from_warehouse_id: 1,
 │     to_warehouse_id: 2,
 │     items: [{ product_id: 10, quantity: 20 }]
 │   }
 │
 ② อนุมัติ → สต็อกย้ายอัตโนมัติ
 │   POST /stock-transfers/1/approve
 │   ✅ warehouse_1.qty −= 20, warehouse_2.qty += 20
 │
 ③ ยืนยันรับของ
 │   POST /stock-transfers/1/complete
```

### 8.3 ปรับสต็อก / นับสต็อก

```
ปรับสต็อก:
  PATCH /warehouses/1/inventory/adjust
  Body: { product_id: 10, quantity: 95, reason: "นับได้ 95 ชิ้น" }

นับสต็อก (Cycle Count):
  POST /warehouses/1/inventory/cycle-count
  Body: { items: [{ product_id: 10, counted_qty: 95 }, ...] }

เช็คสต็อกต่ำ:
  GET /inventory/low-stock
  Response: [{ product_id: 10, product_name: "น้ำมันเครื่อง", qty: 3, min_qty: 10 }]

Export:
  GET /inventory/export?warehouse_id=1
```

### 8.4 จังหวะที่สต็อกถูกตัดอัตโนมัติ

| Scenario | จังหวะตัดสต็อก | API ที่ trigger |
|----------|--------------|----|
| **A: ซ่อมรถ** | SO: approved → in_progress | `PATCH /service-orders/:id/transition` |
| **B1/B2: ขาย** | INV: draft → issued | `POST /invoices/:id/issue` |
| **C: ขายปลีก** | INV: draft → issued | `POST /invoices/:id/issue` |

---

## 9. สินเชื่อและการเงิน

### 9.1 Loan Application (ผ่อนผ่านไฟแนนซ์)

```
POST /loan-applications           ← สร้างใบสมัคร
POST /loan-applications/:id/guarantors  ← เพิ่มผู้ค้ำ
PATCH /loan-applications/:id/approve    ← อนุมัติ
PATCH /loan-applications/:id/reject     ← ปฏิเสธ
DELETE /loan-applications/:id/guarantors/:gid  ← ลบผู้ค้ำ
```

### 9.2 Store Loan (ผ่อนกับร้าน)

```
GET /store-loans/:id/calculate    ← คำนวณค่างวด (PMT)
POST /store-loans                 ← สร้างสัญญาผ่อน
POST /store-loans/:id/payments    ← บันทึกจ่ายงวด
GET /store-loans/:id/payments     ← ดูประวัติจ่าย
```

### 9.3 Loan Search (Elasticsearch)

```
GET /loans/search?search=0812345678
GET /loans/search?search=1-2345-67890-12-3

Response: {
  "data": {
    "as_applicant": [...],      ← ค้นเจอในฐานะผู้กู้
    "as_guarantor": [...],      ← ค้นเจอในฐานะผู้ค้ำ
    "store_loans": [...]        ← ค้นเจอในสินเชื่อร้าน
  }
}
```

> ★ ค้นด้วยเบอร์โทรหรือเลขบัตรประชาชน ค้นข้ามทั้ง 3 ตารางพร้อมกัน

---

## 10. ระบบลูกค้า

### 10.1 Customer CRUD

```
GET  /customers                        ← รายการลูกค้า (filter: type, search, branch_id)
POST /customers                        ← สร้างลูกค้า
GET  /customers/:id                    ← รายละเอียด
PUT  /customers/:id                    ← แก้ไข
DELETE /customers/:id                  ← ลบ (soft delete)
GET  /customers/export                 ← Export CSV
```

### 10.2 Sub-resources ของลูกค้า

```
เบอร์โทร:
  GET  /customers/:id/phones            ← ดูเบอร์ทั้งหมด
  POST /customers/:id/phones            ← เพิ่มเบอร์

เอกสาร:
  GET  /customers/:id/documents          ← ดูเอกสาร
  POST /customers/:id/documents          ← อัปโหลด (FormData)

Timeline:
  GET  /customers/:id/timeline           ← ดูบันทึก
  POST /customers/:id/timeline           ← เพิ่มบันทึก

รถ:
  GET  /customers/:id/vehicles           ← ดูรถทั้งหมด
  POST /customers/:id/vehicles           ← เพิ่มรถ
  PUT  /customers/:id/vehicles/:vid      ← แก้ไขรถ

ที่อยู่ออกใบกำกับ (นิติบุคคล):
  GET  /customers/:id/billing-addresses
  POST /customers/:id/billing-addresses
  PUT  /customers/:id/billing-addresses/:aid

ประวัติ:
  GET  /customers/:id/purchase-history    ← ประวัติซื้อ
  GET  /customers/:id/service-history     ← ประวัติซ่อม
  GET  /customers/:id/warranty-history    ← ประวัติรับประกัน
```

### 10.3 ประเภทลูกค้า

| Field | personal | corporate |
|-------|----------|-----------|
| `type` | `"personal"` | `"corporate"` |
| `name` | ชื่อ-สกุล | ชื่อบริษัท |
| `tax_id` | — | ✅ เลขผู้เสียภาษี |
| `company_branch` | — | ✅ สาขาบริษัท |
| `contact_name` | — | ✅ ผู้ติดต่อ |
| `contact_position` | — | ✅ ตำแหน่ง |
| `billing_addresses` | — | ✅ หลายที่อยู่ได้ |

---

## 11. สินค้า

### 11.1 Product Ecosystem

```
POST /products                              ← สร้างสินค้า
PUT  /products/:id/pricing                  ← กำหนดราคา (cost, selling, min)
POST /products/:id/images                   ← อัปโหลดรูป (FormData)
PUT  /products/:id/images/reorder           ← เรียงลำดับรูป
POST /products/:id/unit-conversions         ← เพิ่มแปลงหน่วย (เช่น 1 กล่อง = 12 ชิ้น)
POST /products/:id/bom                      ← เพิ่มส่วนประกอบ BOM
GET  /products/:id/bom/availability         ← เช็คสต็อก BOM ว่าผลิตได้กี่ชุด
```

### 11.2 ประเภทสินค้า

| Type | คำอธิบาย | ตัดสต็อก? |
|------|---------|----------|
| `standard` | สินค้าปกติ | ✅ ตัดตรง |
| `bom` | สินค้าประกอบ (Bill of Materials) | ✅ ตัดส่วนประกอบ |
| `service` | บริการ (ค่าแรง, ค่าบริการ) | ❌ ไม่ตัดสต็อก |

### 11.3 BOM (Bill of Materials)

```
สินค้า "ชุดเปลี่ยนถ่ายน้ำมัน" (type: bom)
  ├── น้ำมันเครื่อง × 4 ลิตร
  ├── กรองน้ำมัน × 1 ชิ้น
  └── ค่าแรงช่าง × 1 (type: service → ไม่ตัดสต็อก)

เมื่อขาย 1 ชุด → ตัดสต็อก: น้ำมัน 4 ลิตร + กรอง 1 ชิ้น
```

---

## 12. HR & พนักงาน

### 12.1 ลำดับตั้งค่าระบบพนักงาน

> ⚠️ ต้องสร้างตามลำดับ เพราะแต่ละส่วนอ้างอิงกัน

```
 ① สร้างสาขา
 │   POST /branches
 │   Body: { name: "สุดยอดมอเตอร์ สาขาใหญ่", code: "HQ", address: "..." }
 │
 ② สร้างตำแหน่ง
 │   POST /positions
 │   Body: { name: "ช่างซ่อม", description: "ช่างซ่อมรถยนต์ทั่วไป" }
 │   ตัวอย่างตำแหน่ง: ผู้จัดการ, แอดมิน, ช่าง, เซลส์, แคชเชียร์, คลังสินค้า
 │
 ③ สร้าง Role + กำหนดสิทธิ์
 │   POST /permissions/roles
 │   Body: { name: "ช่างซ่อม", description: "..." }
 │   ↓
 │   PUT /permissions/roles/1
 │   Body: {
 │     permissions: {
 │       "service_orders": { "can_view": true, "can_create": false, "can_edit": true, ... },
 │       "inventory":      { "can_view": true, "can_create": false, ... },
 │       ... (22 modules × 6 actions)
 │     }
 │   }
 │
 ④ สร้างตารางเวลาทำงาน
 │   POST /work-schedules
 │   Body: {
 │     name: "เวลาปกติ",
 │     login_start_time: "08:00",
 │     login_end_time: "09:00",
 │     work_start_time: "08:30",
 │     work_end_time: "17:30",
 │     grace_period_minutes: 15,
 │     days: [
 │       { day_of_week: 1, is_working: true },   ← จันทร์
 │       { day_of_week: 2, is_working: true },   ← อังคาร
 │       ...
 │       { day_of_week: 7, is_working: false }    ← อาทิตย์
 │     ]
 │   }
 │
 ⑤ สร้างพนักงาน (ผูก branch + position + role + schedule)
 │   POST /employees
 │   Body: {
 │     first_name: "สมชาย",
 │     last_name: "ใจดี",
 │     email: "somchai@sudyodmotor.com",
 │     phone: "0812345678",
 │     password: "xxx",
 │     branch_id: 1,
 │     position_id: 3,
 │     role_ids: [2],
 │     work_schedule_id: 1,
 │     hire_date: "2026-01-15"
 │   }
 │   ⚠️ email หรือ phone ใช้ login ได้ทั้งคู่
```

### 12.2 พนักงานกับบทบาทในระบบ

> พนักงาน 1 คนอาจถูกอ้างถึงในหลาย module ด้วย field ต่างกัน

```
Employee (employees table)
  │
  ├── Login / Auth ─────── identifier (email หรือ phone)
  │     POST /auth/login { identifier, password }
  │     JWT payload: { employee_id, branch_id }
  │
  ├── Role & Permission ── employee_roles (many-to-many)
  │     GET /permissions/me → ดูสิทธิ์ตัวเอง (ใช้ซ่อน/แสดงเมนู)
  │     ⚠️ พนักงาน 1 คนมีได้หลาย role → สิทธิ์รวม union ทุก role
  │
  ├── ช่างซ่อม (Technician) ── service_orders.technician_id
  │     PATCH /service-orders/:id/assign { technician_id: 12 }
  │     ⚠️ ต้อง assign ก่อนเปลี่ยนเป็น in_progress
  │     ⚠️ UI ควร filter เฉพาะพนักงานที่เป็นช่าง (position หรือ role)
  │
  ├── ผู้สร้างเอกสาร ───── created_by (ทุกเอกสาร)
  │     ระบบบันทึกอัตโนมัติจาก JWT ไม่ต้องส่ง
  │     แสดงใน: SO, QT, INV, GR, ST, PO ฯลฯ
  │
  ├── ผู้อนุมัติ ──────── approved_by
  │     ระบบบันทึกอัตโนมัติจาก JWT ตอนกด approve
  │     แสดงใน: QT, GR, ST, Loan Application
  │
  ├── Attendance ───────── employee_id
  │     POST /attendance/check-in
  │     POST /attendance/check-out
  │     GET  /employees/:id/attendance ← ดูประวัติลงเวลาเฉพาะคน
  │
  ├── GPS Photo ────────── employee_id (คนถ่ายรูป)
  │     POST /service-orders/:id/gps-photos
  │     ระบบบันทึกอัตโนมัติจาก JWT
  │
  ├── Audit Log ────────── employee_id (คนทำ action)
  │     ทุก Create/Update/Delete บันทึกอัตโนมัติ
  │     GET /audit-logs ← ดูว่าใครทำอะไรเมื่อไหร่
  │
  └── Notification ─────── employee_id (ผู้รับแจ้งเตือน)
        GET /notifications ← ดูแจ้งเตือนของตัวเอง
```

### 12.3 ตัวอย่างบทบาทพนักงานและสิทธิ์ที่ควรกำหนด

| บทบาท | ตำแหน่งตัวอย่าง | Modules ที่ใช้หลัก | สิทธิ์หลัก |
|-------|----------------|-------------------|-----------|
| **ผู้จัดการ** | Manager | ทุก module | view, create, edit, approve, export ทั้งหมด |
| **แอดมิน** | Admin | customers, service_orders, quotations, invoices | view, create, edit |
| **ช่างซ่อม** | Technician | service_orders (view, edit), inventory (view) | รับมอบหมาย SO, ถ่าย GPS, อัปเดตสถานะซ่อม |
| **เซลส์** | Sales | customers, quotations, invoices, loans | view, create สำหรับการขาย |
| **แคชเชียร์** | Cashier | invoices, payments, deposits | view, create, edit — กดรับเงิน + ออกใบเสร็จ |
| **คลังสินค้า** | Warehouse Staff | products, inventory, goods_receipts, stock_transfers | view, create, edit สำหรับคลัง |

### 12.4 Flow: สร้าง + จัดการพนักงาน

```
 ★ สร้างพนักงานใหม่
 │   POST /employees
 │
 ★ ดูรายการพนักงาน (filter ตามสาขา)
 │   GET /employees?branch_id=1&search=สมชาย
 │
 ★ ดูรายละเอียด
 │   GET /employees/12
 │   Response: {
 │     "data": {
 │       "id": 12,
 │       "first_name": "สมชาย",
 │       "last_name": "ใจดี",
 │       "email": "somchai@sudyodmotor.com",
 │       "phone": "0812345678",
 │       "branch": { "id": 1, "name": "สาขาใหญ่" },
 │       "position": { "id": 3, "name": "ช่างซ่อม" },
 │       "roles": [{ "id": 2, "name": "ช่างซ่อม" }],
 │       "work_schedule": { "id": 1, "name": "เวลาปกติ" },
 │       "status": "active",
 │       "hire_date": "2026-01-15"
 │     }
 │   }
 │
 ★ แก้ไขพนักงาน (ย้ายสาขา, เปลี่ยน role ฯลฯ)
 │   PUT /employees/12
 │   Body: { branch_id: 2, role_ids: [2, 3] }
 │
 ★ ลบพนักงาน (soft delete)
 │   DELETE /employees/12
 │   ⚠️ พนักงานที่ถูกลบจะ login ไม่ได้ แต่ข้อมูลเก่าที่ reference ยังอยู่
```

### 12.5 ตารางเวลาและ Override

```
 ★ ตารางปกติ (Work Schedule) — ใช้ร่วมกันหลายคน
 │   POST /work-schedules
 │   Body: { name, login_start_time, login_end_time, work_start_time,
 │           work_end_time, grace_period_minutes, days: [...] }
 │           
 │   GET  /work-schedules           ← ดูตารางทั้งหมด
 │   GET  /work-schedules/:id       ← รายละเอียด (รวม days จ-อา)
 │   PUT  /work-schedules/:id       ← แก้ไข
 │   DELETE /work-schedules/:id     ← ลบ (ต้องไม่มีพนักงานผูกอยู่)
 │
 ★ Override เฉพาะคน (employee_schedule_overrides)
 │   ⚠️ จัดการผ่าน Employee API
 │   เช่น พนักงาน A ปกติทำ จ-ศ แต่สัปดาห์นี้ต้องมาวันเสาร์
 │   → สร้าง override: date=2026-04-19, is_working=true, start/end time
```

### 12.6 Attendance (ลงเวลา)

```
 ★ ลงเวลาเข้า
 │   POST /attendance/check-in
 │   Body: { latitude: 13.7563, longitude: 100.5018 }
 │   ⚠️ ระบบตรวจ 7 ขั้นตอนอัตโนมัติ (ดูด้านล่าง)
 │   Response: { data: { id: 1, status: "present", check_in_at: "08:25:00", is_late: false } }
 │
 ★ ลงเวลาออก
 │   POST /attendance/check-out
 │   Body: { latitude: 13.7563, longitude: 100.5018 }
 │   Response: { data: { ..., check_out_at: "17:35:00", total_hours: 9.17 } }
 │
 ★ ดูรายการลงเวลา (admin ดูทุกคน)
 │   GET /attendance?date=2026-04-16&branch_id=1
 │   GET /attendance?employee_id=12&start_date=2026-04-01&end_date=2026-04-30
 │
 ★ แก้ไขลงเวลา (admin only)
 │   PUT /attendance/1
 │   Body: { check_in_at: "08:30:00", status: "present", note: "ลืม check-in" }
 │
 ★ ดูประวัติลงเวลาของพนักงานคนเดียว
 │   GET /employees/12/attendance?start_date=2026-04-01&end_date=2026-04-30
 │
 ★ Export CSV
 │   GET /attendance/export?branch_id=1&month=2026-04
```

### 12.7 ลำดับตรวจ Check-in (ระบบทำอัตโนมัติ)

```
1. ตรวจวันหยุด (holidays table — ถ้าวันนี้เป็นวันหยุด → ❌ ไม่ให้ check-in)
2. ตรวจตารางทำงาน (work_schedule_days — วันนี้ is_working=true?)
3. ตรวจ override ส่วนตัว (employee_schedule_overrides — มี override ไหม?)
4. ตรวจเวลา login_start ≤ now ≤ login_end (อยู่ในช่วงเวลาที่ลงได้?)
5. ตรวจ IP (ถ้าสาขากำหนด allowed_ip_range)
6. ตรวจซ้ำ (check-in แล้ววันนี้? → ❌ ห้ามซ้ำ)
7. คำนวณสาย (now > work_start + grace_period → is_late=true)
```

### 12.8 วันหยุด (Holidays)

```
 ★ สร้างวันหยุด
 │   POST /holidays
 │   Body: {
 │     name: "สงกรานต์",
 │     date: "2026-04-13",
 │     branch_id: null        ← null = วันหยุดทุกสาขา, ใส่ค่า = เฉพาะสาขาเดียว
 │   }
 │
 ★ ดูวันหยุด
 │   GET /holidays?year=2026&branch_id=1
 │
 ★ Internal Job — Mark Absent อัตโนมัติ
 │   POST /api/internal/jobs/mark-absent  (ทำงาน 23:59 ทุกวัน)
 │   ✅ พนักงานที่ไม่ได้ check-in + ไม่ใช่วันหยุด → status="absent"
 │   ✅ วันหยุด → status="holiday"
```

### 12.9 พนักงานที่ถูกอ้างถึงในเอกสาร

> UI ควรแสดงชื่อพนักงานในเอกสารเหล่านี้

| เอกสาร | Field | ความหมาย | ตัวอย่าง UI |
|--------|-------|---------|------------|
| Service Order | `technician_id` | ช่างที่รับผิดชอบ | "ช่าง: สมชาย ใจดี" |
| Service Order | `created_by` | คนสร้างใบงาน | "สร้างโดย: วิภา รักงาน" |
| Quotation | `created_by` | คนออกใบเสนอราคา | "ออกโดย: วิภา รักงาน" |
| Quotation | `approved_by` | คนอนุมัติ | "อนุมัติโดย: สมศักดิ์ ผู้จัดการ" |
| Invoice | `created_by` | คนออกใบแจ้งหนี้ | "ออกโดย: วิภา รักงาน" |
| Receipt | `issued_by` | คนกดออกใบเสร็จ | "แคชเชียร์: มาลี ใจดี" |
| GPS Photo | `employee_id` | คนถ่ายรูป | "ถ่ายโดย: สมชาย ใจดี" |
| Goods Receipt | `created_by` | คนรับของ | "รับโดย: มานะ คลังสินค้า" |
| Goods Receipt | `approved_by` | คนอนุมัติ | "อนุมัติโดย: สมศักดิ์" |
| Stock Transfer | `created_by` | คนขอโอน | "ขอโอนโดย: มานะ" |
| Attendance | `employee_id` | เจ้าตัว | "สมชาย ใจดี — 08:25 ✓" |
| Audit Log | `employee_id` | คนทำ action | "สมชาย แก้ไข SO-2026-0001" |

### 12.10 การเลือกพนักงานใน UI

> API สำหรับ dropdown/autocomplete เลือกพนักงาน

```
 ★ Dropdown ช่าง (สำหรับ assign technician)
 │   GET /employees?branch_id=1&position_id=3&limit=100
 │   ⚠️ filter ตาม position (ช่าง) หรือ role ที่มีสิทธิ์ service_orders
 │
 ★ Dropdown พนักงานทั้งหมด (สำหรับ admin)
 │   GET /employees?branch_id=1&limit=100
 │
 ★ ค้นหาพนักงาน
 │   GET /employees?search=สมชาย
 │   ⚠️ search ค้นจาก first_name, last_name, email, phone
```

---

## 13. Status Flow ทุก Module

### Service Order (9 สถานะ)

```
draft → pending_review → pending_quote → approved → in_progress
  → completed → pending_payment → pending_pickup → closed

★ cancelled ได้เฉพาะ status ≤ pending_quote
★ reopen: closed → pending_pickup (ผู้จัดการเท่านั้น)
```

### Quotation

```
draft → sent → approved
              → rejected
              → expired (อัตโนมัติเมื่อเลย validity_days)
```

### Invoice

```
draft → issued → paid
               → overdue (อัตโนมัติเมื่อเลย due_date)
       → cancelled (ได้เฉพาะ draft/issued)
```

### Goods Receipt

```
draft → received (อนุมัติ = สต็อกเข้า)
      → cancelled (ได้เฉพาะ draft)
```

### Stock Transfer

```
draft → pending → approved (อนุมัติ = สต็อกย้าย)
                → rejected
```

### Store Loan

```
active → completed (จ่ายครบ)
       → overdue (เลยกำหนดจ่าย — job ตรวจอัตโนมัติ)
       → cancelled
```

### Loan Application

```
pending → approved
        → rejected
        → cancelled
```

---

## 14. ตาราง Field ที่เชื่อมโยง

### Document Chain

| จาก | ไป | Field ที่เชื่อม | หมายเหตุ |
|-----|-----|---------------|---------|
| Customer | Vehicle | `customer_id` | ลูกค้ามีรถหลายคัน |
| Vehicle | Service Order | `vehicle_id` | รถ 1 คัน มีหลายใบสั่งซ่อม |
| Service Order | GPS Photo | `service_order_id` | SO 1 ใบ มีหลายรูป |
| Service Order | Quotation | `service_order_id` | SO 1 ใบ = QT 1 ใบ (type=service) |
| Quotation | Invoice | `quotation_id` | QT 1 ใบ = INV 1 ใบ |
| Quotation | Deposit | `quotation_id` | QT 1 ใบ มี deposit ได้ |
| Invoice | Payment | `invoice_id` | INV 1 ใบ มีหลาย payment ได้ |
| Invoice | Receipt | `invoice_id` | INV 1 ใบ = Receipt 1 ใบ |
| Invoice | Delivery Note | `invoice_id` | INV 1 ใบ = DN 1 ใบ |
| Invoice | Store Loan | `invoice_id` | INV 1 ใบ = Store Loan 1 สัญญา |
| Service Order | Warranty | `service_order_id` | SO/QT 1 ใบ = WR 1 ใบ |
| Finance Company | Loan App | `finance_company_id` | ไฟแนนซ์ 1 แห่ง มีหลายใบสมัคร |
| Loan App | Guarantor | `loan_application_id` | ใบสมัคร 1 ใบ มีหลายผู้ค้ำ |

### Master Data References

| Entity | ต้องมีก่อน (FK) |
|--------|----------------|
| Employee | `branch_id`, `position_id` |
| Product | `brand_id`, `category_id`, `unit_id` |
| Warehouse | `branch_id` |
| Service Order | `customer_id`, `vehicle_id`, `branch_id` |
| Quotation | `customer_id`, `branch_id` + `service_order_id` (if service) |
| Invoice | `branch_id` + `quotation_id` (optional) + `service_order_id` (optional) |
| Goods Receipt | `warehouse_id`, `vendor_id` |
| Stock Transfer | `from_warehouse_id`, `to_warehouse_id` |
| Loan Application | `finance_company_id` |
| Store Loan | `customer_id`, `invoice_id` |

---

## 15. Permission & Auth

### 15.1 Login

```
POST /auth/login
Body: { identifier: "admin@sudyodmotor.com", password: "xxx" }
  ← identifier ใส่ email หรือเบอร์โทรก็ได้ (ถ้ามี @ = email, ไม่มี = phone)

Response: {
  "data": {
    "token": "eyJ...",
    "refresh_token": "abc...",
    "employee": { id, name, branch_id, ... }
  }
}
```

### 15.2 Token Management

```
POST /auth/refresh-token         ← ต่ออายุ token
GET  /auth/me                    ← ข้อมูลตัวเอง
PUT  /auth/change-password       ← เปลี่ยนรหัส
GET  /auth/sessions              ← ดู session ทั้งหมด
DELETE /auth/sessions/:id        ← kick session อื่น
POST /auth/logout                ← logout
```

### 15.3 Forgot Password (OTP)

```
POST /auth/forgot-password       ← ส่ง OTP ไป SMS (THAIBULKSMS)
Body: { phone: "0812345678" }

POST /auth/verify-otp            ← ตรวจ OTP
Body: { phone: "0812345678", otp_code: "123456" }
Response: { data: { reset_token: "xxx" } }

POST /auth/reset-password        ← ตั้งรหัสใหม่
Body: { reset_token: "xxx", new_password: "newpass123" }
```

### 15.4 Permission System

```
GET /permissions/me              ← ดูสิทธิ์ตัวเอง (ใช้แสดง/ซ่อนเมนู)
```

> ⚠️ **Response shape จริง — ต้องอ่านให้ถูกต้อง**

```json
{
  "success": true,
  "message": "สำเร็จ",
  "data": {
    "permissions": [
      "attendance.view", "attendance.create", "attendance.edit",
      "customers.view", "customers.create"
    ],
    "modules": {
      "attendance": { "can_view": true, "can_create": true, "can_edit": true, "can_delete": true, "can_approve": true, "can_export": true },
      "customers":  { "can_view": true, "can_create": true, "can_edit": true, "can_delete": true, "can_approve": true, "can_export": true },
      "service_orders": { "can_view": true, "can_create": true, "can_edit": true, "can_delete": true, "can_approve": true, "can_export": true }
    },
    "branch_ids": [1]
  }
}
```

> ❌ **ข้อผิดพลาดที่เคยเกิด (2 ครั้ง):**
> 1. คิดว่า `data.permissions` เป็น `RolePermission[]` → จริงๆ คือ array of strings เช่น `"customers.view"`
> 2. คิดว่า `data.roles` มีอยู่ → จริงๆ ไม่มี field นี้
>
> ✅ **ถูกต้อง:** ใช้ `data.modules` ซึ่งเป็น object keyed by module name แล้ว convert เป็น `RolePermission[]`:
> ```ts
> const permissions = Object.entries(data.modules).map(([module, perms]) => ({ module, ...perms }))
> ```

**Frontend behavior:**

| สถานะ `permissions` | พฤติกรรม Sidebar |
|---------------------|-----------------|
| `null` (โหลด API ไม่สำเร็จ) | **แสดงเมนูทั้งหมด** (ไม่ควรซ่อนเพราะไม่รู้สิทธิ์จริง) |
| `[]` empty array (ไม่มีสิทธิ์เลย) | ซ่อนทุก module ยกเว้น Dashboard + แจ้งเตือน |
| `[...modules]` มีข้อมูล | filter เมนูตาม `can_view` ของแต่ละ module |

**Flow หลังจาก login สำเร็จ:**

```
POST /auth/login  →  ได้ access_token + employee
       ↓
GET /permissions/me  (ส่ง JWT อัตโนมัติผ่าน interceptor)
       ↓
response.data.data.modules  →  Object.entries() → RolePermission[]
       ↓
เก็บใน authStore.permissions → Sidebar filter visibleMenuItems
```

> ⚠️ Frontend ใช้ `GET /permissions/me` ตอน login สำเร็จ **และ** ตอน refresh หน้า (checkAuth) เพื่อกำหนดว่าจะแสดงเมนู/ปุ่มไหน

### 15.5 Role Management (Admin)

```
GET  /permissions/roles           ← ดู role ทั้งหมด
POST /permissions/roles           ← สร้าง role
GET  /permissions/roles/:id       ← ดูสิทธิ์ของ role
PUT  /permissions/roles/:id       ← แก้ไขสิทธิ์ (22 modules × 6 actions = 132 permissions)
```

---

## 16. Endpoint Reference ทั้งหมด

### Auth (Public — ไม่ต้อง token)

| Method | Path | คำอธิบาย |
|--------|------|---------|
| POST | `/auth/login` | เข้าสู่ระบบ |
| POST | `/auth/forgot-password` | ส่ง OTP |
| POST | `/auth/verify-otp` | ตรวจ OTP |
| POST | `/auth/reset-password` | ตั้งรหัสใหม่ |

### Auth (JWT — ไม่ต้อง permission)

| Method | Path | คำอธิบาย |
|--------|------|---------|
| POST | `/auth/logout` | ออกจากระบบ |
| POST | `/auth/refresh-token` | ต่ออายุ token |
| GET | `/auth/me` | ข้อมูลตัวเอง |
| PUT | `/auth/change-password` | เปลี่ยนรหัสผ่าน |
| GET | `/auth/sessions` | ดู session ทั้งหมด |
| DELETE | `/auth/sessions/{id}` | kick session |

### Branches (JWT — ไม่ต้อง permission)

| Method | Path | คำอธิบาย |
|--------|------|---------|
| GET | `/branches` | รายการสาขา |
| POST | `/branches` | สร้างสาขา |
| GET | `/branches/{id}` | รายละเอียดสาขา |
| PUT | `/branches/{id}` | แก้ไขสาขา |
| DELETE | `/branches/{id}` | ลบสาขา |

### Permissions (JWT + Permission: roles)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/permissions/me` | — (self) | ดูสิทธิ์ตัวเอง |
| GET | `/permissions/roles` | roles.view | รายการ role |
| POST | `/permissions/roles` | roles.create | สร้าง role |
| GET | `/permissions/roles/{id}` | roles.view | ดูสิทธิ์ role |
| PUT | `/permissions/roles/{id}` | roles.edit | แก้ไขสิทธิ์ role |

### Positions (JWT + Permission: positions)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/positions` | view | รายการตำแหน่ง |
| POST | `/positions` | create | สร้างตำแหน่ง |
| GET | `/positions/{id}` | view | รายละเอียด |
| PUT | `/positions/{id}` | edit | แก้ไข |
| DELETE | `/positions/{id}` | delete | ลบ |

### Employees (JWT + Permission: employees)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/employees` | view | รายการพนักงาน |
| POST | `/employees` | create | สร้างพนักงาน |
| GET | `/employees/{id}` | view | รายละเอียด |
| PUT | `/employees/{id}` | edit | แก้ไข |
| DELETE | `/employees/{id}` | delete | ลบ |
| GET | `/employees/{id}/attendance` | attendance.view | ประวัติลงเวลา |

### Work Schedules (JWT + Permission: work_schedules)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/work-schedules` | view | รายการตาราง |
| POST | `/work-schedules` | create | สร้างตาราง |
| GET | `/work-schedules/{id}` | view | รายละเอียด |
| PUT | `/work-schedules/{id}` | edit | แก้ไข |
| DELETE | `/work-schedules/{id}` | delete | ลบ |

### Attendance (JWT + Permission: attendance)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/attendance` | view | รายการลงเวลา |
| POST | `/attendance/check-in` | create | ลงเวลาเข้า |
| POST | `/attendance/check-out` | create | ลงเวลาออก |
| PUT | `/attendance/{id}` | edit | แก้ไข (admin) |
| GET | `/attendance/export` | export | Export CSV |

### Holidays (JWT + Permission: holidays)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/holidays` | view | รายการวันหยุด |
| POST | `/holidays` | create | สร้างวันหยุด |
| PUT | `/holidays/{id}` | edit | แก้ไข |
| DELETE | `/holidays/{id}` | delete | ลบ |

### Customers (JWT + Permission: customers)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/customers` | view | รายการลูกค้า |
| POST | `/customers` | create | สร้างลูกค้า |
| GET | `/customers/{id}` | view | รายละเอียด |
| PUT | `/customers/{id}` | edit | แก้ไข |
| DELETE | `/customers/{id}` | delete | ลบ (soft) |
| GET | `/customers/export` | export | Export CSV |
| GET | `/customers/{id}/phones` | view | เบอร์โทร |
| POST | `/customers/{id}/phones` | edit | เพิ่มเบอร์ |
| GET | `/customers/{id}/documents` | view | เอกสาร |
| POST | `/customers/{id}/documents` | edit | อัปโหลดเอกสาร |
| GET | `/customers/{id}/timeline` | view | Timeline |
| POST | `/customers/{id}/timeline` | edit | เพิ่มบันทึก |
| GET | `/customers/{id}/vehicles` | vehicles.view | รถทั้งหมด |
| POST | `/customers/{id}/vehicles` | vehicles.create | เพิ่มรถ |
| PUT | `/customers/{id}/vehicles/{vid}` | vehicles.edit | แก้ไขรถ |
| GET | `/customers/{id}/billing-addresses` | view | ที่อยู่ออกบิล |
| POST | `/customers/{id}/billing-addresses` | edit | เพิ่มที่อยู่ |
| PUT | `/customers/{id}/billing-addresses/{aid}` | edit | แก้ที่อยู่ |
| GET | `/customers/{id}/purchase-history` | view | ประวัติซื้อ |
| GET | `/customers/{id}/service-history` | view | ประวัติซ่อม |
| GET | `/customers/{id}/warranty-history` | view | ประวัติรับประกัน |

### Vendors (JWT + Permission: vendors)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/vendors` | view | รายการ Supplier |
| POST | `/vendors` | create | สร้าง |
| GET | `/vendors/{id}` | view | รายละเอียด |
| PUT | `/vendors/{id}` | edit | แก้ไข |
| DELETE | `/vendors/{id}` | delete | ลบ |
| GET | `/vendors/{id}/phones` | view | เบอร์โทร |
| POST | `/vendors/{id}/phones` | edit | เพิ่มเบอร์ |
| GET | `/vendors/{id}/documents` | view | เอกสาร |
| POST | `/vendors/{id}/documents` | edit | อัปโหลด |

### Brands (JWT + Permission: brands)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/brands` | view | รายการยี่ห้อ |
| POST | `/brands` | create | สร้าง |
| GET | `/brands/{id}` | view | รายละเอียด |
| PUT | `/brands/{id}` | edit | แก้ไข |
| DELETE | `/brands/{id}` | delete | ลบ |

### Product Categories (JWT + Permission: product_categories)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/product-categories` | view | รายการหมวด |
| POST | `/product-categories` | create | สร้าง |
| GET | `/product-categories/{id}` | view | รายละเอียด |
| PUT | `/product-categories/{id}` | edit | แก้ไข |
| DELETE | `/product-categories/{id}` | delete | ลบ |

### Product Units (JWT + Permission: products)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/product-units` | view | รายการหน่วย |
| POST | `/product-units` | create | สร้าง |
| GET | `/product-units/{id}` | view | รายละเอียด |
| PUT | `/product-units/{id}` | edit | แก้ไข |
| DELETE | `/product-units/{id}` | delete | ลบ |

### Products (JWT + Permission: products)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/products` | view | รายการสินค้า |
| POST | `/products` | create | สร้างสินค้า |
| GET | `/products/{id}` | view | รายละเอียด |
| PUT | `/products/{id}` | edit | แก้ไข |
| DELETE | `/products/{id}` | delete | ลบ |
| GET | `/products/export` | export | Export CSV |
| GET | `/products/{id}/images` | view | รูปสินค้า |
| POST | `/products/{id}/images` | edit | อัปโหลดรูป |
| DELETE | `/products/{id}/images/{iid}` | edit | ลบรูป |
| PUT | `/products/{id}/images/reorder` | edit | เรียงลำดับรูป |
| GET | `/products/{id}/pricing` | view | ดูราคา |
| PUT | `/products/{id}/pricing` | edit | กำหนดราคา |
| GET | `/products/{id}/unit-conversions` | view | ดูแปลงหน่วย |
| POST | `/products/{id}/unit-conversions` | edit | เพิ่มแปลงหน่วย |
| PUT | `/products/{id}/unit-conversions/{cid}` | edit | แก้ไข |
| DELETE | `/products/{id}/unit-conversions/{cid}` | edit | ลบ |
| GET | `/products/{id}/bom` | view | ดูส่วนประกอบ BOM |
| POST | `/products/{id}/bom` | edit | เพิ่มส่วนประกอบ |
| PUT | `/products/{id}/bom/{cid}` | edit | แก้ไข |
| DELETE | `/products/{id}/bom/{cid}` | edit | ลบ |
| GET | `/products/{id}/bom/availability` | view | เช็คสต็อก BOM |

### Warehouses (JWT + Permission: warehouses)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/warehouses` | view | รายการคลัง |
| POST | `/warehouses` | create | สร้างคลัง |
| GET | `/warehouses/{id}` | view | รายละเอียด |
| PUT | `/warehouses/{id}` | edit | แก้ไข |
| DELETE | `/warehouses/{id}` | delete | ลบ |
| GET | `/warehouses/{id}/locations` | view | ดูตำแหน่งในคลัง |
| POST | `/warehouses/{id}/locations` | edit | เพิ่มตำแหน่ง |
| GET | `/warehouses/{id}/inventory` | inventory.view | สต็อกในคลัง |
| PATCH | `/warehouses/{id}/inventory/adjust` | inventory.edit | ปรับสต็อก |
| POST | `/warehouses/{id}/inventory/cycle-count` | inventory.edit | นับสต็อก |

### Inventory (JWT + Permission: inventory)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/inventory` | view | ดูสต็อกทั้งหมด |
| GET | `/inventory/low-stock` | view | สต็อกต่ำ |
| GET | `/inventory/transactions` | view | ประวัติเคลื่อนไหวสต็อก |
| GET | `/inventory/export` | export | Export CSV |

### Goods Receipts (JWT + Permission: goods_receipts)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/goods-receipts` | view | รายการใบรับสินค้า |
| POST | `/goods-receipts` | create | สร้าง |
| GET | `/goods-receipts/{id}` | view | รายละเอียด |
| POST | `/goods-receipts/{id}/approve` | approve | อนุมัติ → สต็อกเข้า |
| POST | `/goods-receipts/{id}/cancel` | delete | ยกเลิก |

### Stock Transfers (JWT + Permission: stock_transfers)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/stock-transfers` | view | รายการโอนย้าย |
| POST | `/stock-transfers` | create | สร้าง |
| GET | `/stock-transfers/{id}` | view | รายละเอียด |
| POST | `/stock-transfers/{id}/approve` | approve | อนุมัติ → สต็อกย้าย |
| POST | `/stock-transfers/{id}/complete` | approve | ยืนยันรับ |

### Purchase Orders (JWT + Permission: purchase_orders)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/purchase-orders` | view | รายการ PO |
| POST | `/purchase-orders` | create | สร้าง |
| GET | `/purchase-orders/{id}` | view | รายละเอียด |
| PUT | `/purchase-orders/{id}` | edit | แก้ไข |
| POST | `/purchase-orders/{id}/send` | edit | ส่งให้ Vendor |
| POST | `/purchase-orders/{id}/receive` | edit | รับของ |

### Service Orders (JWT + Permission: service_orders)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/service-orders` | view | รายการใบสั่งซ่อม |
| POST | `/service-orders` | create | สร้าง |
| GET | `/service-orders/{id}` | view | รายละเอียด |
| PATCH | `/service-orders/{id}` | edit | แก้ไข |
| GET | `/service-orders/{id}/items` | view | ดูรายการ |
| POST | `/service-orders/{id}/items` | edit | เพิ่มรายการ |
| DELETE | `/service-orders/{id}/items/{iid}` | edit | ลบรายการ |
| PATCH | `/service-orders/{id}/transition` | edit | เปลี่ยนสถานะ |
| PATCH | `/service-orders/{id}/assign` | edit | มอบหมายช่าง |
| POST | `/service-orders/{id}/cancel` | delete | ยกเลิก |
| PATCH | `/service-orders/{id}/reopen` | approve | เปิดงานอีกครั้ง |
| GET | `/service-orders/summary` | view | สรุปภาพรวม |
| GET | `/service-orders/export` | export | Export CSV |

### GPS Photos (JWT + Permission: service_orders)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/service-orders/{id}/gps-photos` | view | ดูรูป |
| POST | `/service-orders/{id}/gps-photos` | edit | อัปโหลด (FormData) |
| DELETE | `/service-orders/{id}/gps-photos/{pid}` | edit | ลบรูป |

### Quotations (JWT + Permission: quotations)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/quotations` | view | รายการใบเสนอราคา |
| POST | `/quotations` | create | สร้าง |
| GET | `/quotations/{id}` | view | รายละเอียด |
| PATCH | `/quotations/{id}` | edit | แก้ไข |
| PATCH | `/quotations/{id}/approve` | approve | อนุมัติ |
| PATCH | `/quotations/{id}/reject` | approve | ปฏิเสธ |

### Deposits (JWT + Permission: deposits)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/deposits` | view | รายการมัดจำ |
| POST | `/deposits` | create | รับมัดจำ |
| GET | `/deposits/{id}` | view | รายละเอียด |
| PATCH | `/deposits/{id}/refund` | edit | คืนมัดจำ |
| GET | `/deposits/{id}/receipt` | view | ดูใบเสร็จมัดจำ (PDF) |

### Invoices (JWT + Permission: invoices)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/invoices` | view | รายการใบแจ้งหนี้ |
| POST | `/invoices/from-quotation` | create | สร้างจาก QT |
| POST | `/invoices/retail` | create | สร้างขายปลีก |
| GET | `/invoices/{id}` | view | รายละเอียด |
| PUT | `/invoices/{id}` | edit | แก้ไข |
| POST | `/invoices/{id}/issue` | edit | Issue (ตัดสต็อก sale) |
| POST | `/invoices/{id}/cancel` | delete | ยกเลิก |
| POST | `/invoices/{id}/issue-receipt` | edit | ★ กดออกใบเสร็จ |

### Payments (JWT + Permission: payments)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| POST | `/invoices/{id}/payments` | create | บันทึกชำระ |
| GET | `/invoices/{id}/payments` | view | ดูประวัติชำระ |

### Delivery Notes (JWT + Permission: delivery_notes)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| POST | `/delivery-notes` | create | สร้างใบส่งมอบ |
| GET | `/delivery-notes/{id}` | view | รายละเอียด |
| PATCH | `/delivery-notes/{id}/sign` | edit | ลูกค้าเซ็นรับ |

### Warranties (JWT + Permission: warranties)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/warranties` | view | รายการรับประกัน |
| POST | `/warranties` | create | สร้าง |
| GET | `/warranties/{id}` | view | รายละเอียด |

### Finance Companies (JWT + Permission: finance_companies)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/finance-companies` | view | รายการไฟแนนซ์ |
| POST | `/finance-companies` | create | สร้าง |
| GET | `/finance-companies/{id}` | view | รายละเอียด |
| PUT | `/finance-companies/{id}` | edit | แก้ไข |
| DELETE | `/finance-companies/{id}` | delete | ลบ |

### Loan Applications (JWT + Permission: loan_applications)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/loan-applications` | view | รายการใบสมัคร |
| POST | `/loan-applications` | create | สร้าง |
| GET | `/loan-applications/{id}` | view | รายละเอียด |
| PUT | `/loan-applications/{id}` | edit | แก้ไข |
| PATCH | `/loan-applications/{id}/approve` | approve | อนุมัติ |
| PATCH | `/loan-applications/{id}/reject` | approve | ปฏิเสธ |
| PATCH | `/loan-applications/{id}/cancel` | delete | ยกเลิก |
| POST | `/loan-applications/{id}/guarantors` | edit | เพิ่มผู้ค้ำ |
| DELETE | `/loan-applications/{id}/guarantors/{gid}` | edit | ลบผู้ค้ำ |

### Loan Search (JWT + Permission: loan_applications)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/loans/search` | view | ค้นเบอร์โทร/บัตร ปชช. |

### Store Loans (JWT + Permission: store_loans)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/store-loans` | view | รายการสินเชื่อร้าน |
| POST | `/store-loans` | create | สร้างสัญญา |
| GET | `/store-loans/{id}` | view | รายละเอียด |
| PATCH | `/store-loans/{id}/cancel` | delete | ยกเลิก |
| GET | `/store-loans/{id}/calculate` | view | คำนวณค่างวด |
| POST | `/store-loans/{id}/payments` | edit | บันทึกจ่ายงวด |
| GET | `/store-loans/{id}/payments` | view | ดูประวัติจ่าย |

### Dashboard (JWT + Permission: dashboard)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/dashboard/stats` | view | สถิติภาพรวม |
| GET | `/dashboard/charts` | view | กราฟ |

### Notifications (JWT — ไม่ต้อง permission)

| Method | Path | คำอธิบาย |
|--------|------|---------|
| GET | `/notifications` | รายการแจ้งเตือน |
| GET | `/notifications/unread-count` | จำนวนยังไม่อ่าน |
| PATCH | `/notifications/{id}/read` | อ่านแล้ว |
| PATCH | `/notifications/read-all` | อ่านทั้งหมด |

### Audit Logs (JWT + Permission: audit_logs)

| Method | Path | Permission | คำอธิบาย |
|--------|------|-----------|---------|
| GET | `/audit-logs` | view | ดู log |
| GET | `/audit-logs/export` | export | Export CSV |

### Internal Jobs (ไม่ใช้ JWT — ใช้ X-Job-Secret header)

| Method | Path | คำอธิบาย | เวลา |
|--------|------|---------|------|
| POST | `/api/internal/jobs/mark-absent` | Auto-mark absent/holiday | 23:59 ทุกวัน |
| POST | `/api/internal/jobs/check-overdue` | ตรวจ overdue | 01:00 ทุกวัน |
| POST | `/api/internal/jobs/service-reminder` | แจ้งเตือนเช็คระยะ | 08:00 ทุกวัน |

---

## Quick Reference — ข้อควรระวังสำคัญ

| หัวข้อ | รายละเอียด |
|--------|-----------|
| ⚠️ ใบเสร็จต้องกดเอง | `POST /invoices/:id/issue-receipt` ไม่ออกอัตโนมัติ |
| ⚠️ ใบเสร็จมัดจำออกอัตโนมัติ | ตอน `POST /deposits` พร้อมรับเงิน |
| ⚠️ ตัดสต็อกซ่อม | ตอน SO: approved → in_progress |
| ⚠️ ตัดสต็อกขาย | ตอน INV: draft → issued |
| ⚠️ GPS photo บังคับ | pre_intake ≥1 ก่อน pending_review, delivery ≥1 ก่อน closed |
| ⚠️ ช่างต้องมอบหมายก่อน | ต้อง assign technician ก่อน in_progress |
| ⚠️ DN ต้องเซ็นก่อนปิด | DN.signed_at ≠ null ก่อน SO closed |
| ⚠️ Status ไปข้างหน้าเท่านั้น | ยกเว้น reopen: closed → pending_pickup |
| ⚠️ Datetime ไม่มี Z | ใช้ Bangkok timezone เสมอ (format: YYYY-MM-DDTHH:mm:ss) |
| ⚠️ Pagination | ทุก list: `?page=1&limit=20` (min 10, max 100, export limit=0) |
| ⚠️ i18n | ส่ง `Accept-Language: th` หรือ `en` header |
| ⚠️ File upload | ใช้ `multipart/form-data` (GPS photos, documents, product images) |
