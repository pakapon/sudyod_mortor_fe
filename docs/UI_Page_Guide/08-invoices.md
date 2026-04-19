# ใบแจ้งหนี้ (Invoices)

> ดู common conventions → [00-common.md](./00-common.md)

---

## 8.1 หน้า List

**Route:** `/invoices`
**Permission:** `invoices.can_view`

- Filter: `status` (draft/issued/paid/overdue/cancelled), `type` (service/sale/retail), `branch_id`
- Table: เลข INV, type, ลูกค้า, ยอดรวม, จ่ายแล้ว, ค้าง, สถานะ, due_date
- **สี overdue แดงเด่น** — INV ที่เลย due_date + ยังไม่จ่าย

---

## 8.2 สร้าง Invoice — 3 ทาง

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

---

## 8.3 หน้า Detail Invoice

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

---

## 8.4 Invoice Status Flow

```
draft → issued → paid
               → overdue (อัตโนมัติ — Job ตรวจทุกคืน)
       → cancelled
```

---

## 8.5 วิธีชำระเงิน 3 แบบ

| วิธี | Flow | หมายเหตุ |
|------|------|---------|
| **เงินสด / โอน** | Payment → INV paid → Receipt | ง่ายที่สุด |
| **ไฟแนนซ์** | สร้าง Loan Application → อนุมัติ → Payment (จากไฟแนนซ์) | ลูกค้าไม่จ่ายเอง |
| **ผ่อนร้าน** | สร้าง Store Loan → จ่ายงวดทุกเดือน → Payment ทีละงวด | ร้านเป็นเจ้าหนี้เอง |

---

## ดูเพิ่มเติม
- [07-quotations.md](./07-quotations.md) — สร้าง Invoice จาก QT
- [09-deposits.md](./09-deposits.md) — มัดจำที่หักในยอด Invoice (Flow B2)
- [10-delivery-notes.md](./10-delivery-notes.md) — สร้าง DN หลัง paid
- [11-warranties.md](./11-warranties.md) — สร้างรับประกันหลัง paid
- [15-loans-finance.md](./15-loans-finance.md) — ชำระผ่านไฟแนนซ์ / ผ่อนร้าน
- [20-flows.md](./20-flows.md) — Flow A, B1, B2, C
