# Billing Hub (ศูนย์กลางการเรียกเก็บเงิน)

> ดู common conventions → [00-common.md](./00-common.md)  
> ดู API sequence จริงที่ [20-flows.md](./20-flows.md)

---

## ภาพรวม

Billing Hub คือ UI hub ที่รวมทุก flow การเรียกเก็บเงินไว้ที่เดียว แบ่งเป็น 4 หน้าหลัก:

| หน้า | Route | คำอธิบาย |
|------|-------|---------|
| Billing Hub | `/billing` | Summary + job list + 3 flow cards |
| Job Flow | `/billing/jobs/:id` | ติดตาม/ดำเนินการแต่ละ job |
| Document Browser | `/billing/documents` | ค้นหาเอกสาร 8 ประเภท |
| Retail POS | `/billing/pos` | ขายปลีก (Flow C) |

> ⚠️ **หน้าทั้งหมดยังใช้ MOCK data** — ยังไม่ integrate API จริง (ณ วันที่ 30 เม.ย. 2026)

---

## 12.1 Billing Hub (`/billing`)

**Permission:** `invoices.can_view`

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  Summary Cards (4 ช่อง)                              │
│  [ใบแจ้งหนี้ค้างชำระ] [รายได้วันนี้] [งานรอดำเนิน] [อื่นๆ] │
├─────────────────────────────────────────────────────┤
│  Job List                            [+ สร้างงานใหม่] │
│  ตาราง: Reference, ลูกค้า, สถานะ, ขั้นตอน, ยอดเงิน    │
├─────────────────────────────────────────────────────┤
│  Flow Cards (3 การ์ด)                                │
│  [🔧 ซ่อมรถ]  [📦 ขายอะไหล่]  [🛒 ขายปลีก (POS)]      │
└─────────────────────────────────────────────────────┘
```

**Summary Cards (planned API):**
- ใบแจ้งหนี้ค้างชำระ → ดึงจาก `GET /invoices?status=issued&overdue=true`
- รายได้วันนี้ → `GET /dashboard/stats`
- งานรอดำเนิน → `GET /billing/jobs?status=pending`

**Job List (planned API):**
- `GET /api/v1/billing/jobs?page=1&limit=20`
- ดูสเปค endpoint ที่ [20-flows.md](./20-flows.md#get-billingjobs--unified-job-list-planned)
- Filter: status, type (repair/sale), branch_id, search
- คลิก row → `/billing/jobs/:id`

**Flow Cards:**
- "ซ่อมรถ" → `/billing/new/repair` → สร้าง SO ใหม่
- "ขายอะไหล่" → `/billing/new/sale` → สร้าง QT ใหม่ (type=sale)
- "ขายปลีก (POS)" → `/billing/pos`

---

## 12.2 Job Flow (`/billing/jobs/:id`)

**Purpose:** ติดตามและดำเนินการแต่ละ job ตาม flow  
**Flow type** กำหนดจาก source document (SO = repair, QT sale = sale)

### Flow: ซ่อมรถ (repair) — 8 ขั้นตอน

| Step | Label (UI) | API step | ดู Flow A |
|------|-----------|---------|-----------|
| 1 | รับรถ | `receive` | A-1, A-2 |
| 2 | ตรวจสภาพ | `assess` | A-3, A-4 |
| 3 | เสนอราคา | `quote` | A-5 ถึง A-8 |
| 4 | อนุมัติ | `approve` | A-9, A-10 |
| 5 | ออกใบแจ้งหนี้ | `invoice` | A-14, A-15, A-16 |
| 6 | ซ่อม | `repair_wk` | A-11, A-12, A-13 |
| 7 | ชำระเงิน | `payment` | A-17, A-18 |
| 8 | ส่งมอบ | `deliver` | A-19 ถึง A-25 |

> ⚠️ หน้า UI แสดง current step จาก status mapping — ไม่ใช่ field ใน DB โดยตรง

---

### Flow: ขายอะไหล่ ไม่มีมัดจำ (sale_no_deposit) — 4 ขั้นตอน

| Step | Label (UI) | API step | ดู Flow B1 |
|------|-----------|---------|-----------|
| 1 | เสนอราคา | `quote` | B1-1, B1-2, B1-3 |
| 2 | อนุมัติ | `approve` | B1-3 |
| 3 | ชำระเงิน | `payment` | B1-4 ถึง B1-7 |
| 4 | ส่งมอบ | `deliver` | B1-8, B1-9 |

---

### Flow: ขายอะไหล่ มีมัดจำ (sale_deposit) — 5 ขั้นตอน

| Step | Label (UI) | API step | ดู Flow B2 |
|------|-----------|---------|-----------|
| 1 | เสนอราคา | `quote` | B2-1, B2-2, B2-3 |
| 2 | รับมัดจำ | `deposit` | B2-4, B2-5 |
| 3 | ออกใบแจ้งหนี้ | `invoice` | B2-6, B2-7 |
| 4 | ชำระเงิน | `payment` | B2-8, B2-9 |
| 5 | ส่งมอบ | `deliver` | B2-10 |

---

**Job Detail Layout:**

```
┌────────────────────────────────────────────┐
│  SO-2026-0042 | นายมนัส ใจดี | in_progress  │
│  Progress Bar: [■■■■■□□□] 5/8 steps         │
├────────────────────────────────────────────┤
│  Step Timeline (vertical)                  │
│  ✅ รับรถ    ✅ ตรวจสภาพ   ✅ เสนอราคา       │
│  ✅ อนุมัติ  ⏳ ซ่อม      □ ออก INV         │
│  □ ชำระ     □ ส่งมอบ                       │
├────────────────────────────────────────────┤
│  [Action Button สำหรับ step ปัจจุบัน]       │
│  เช่น "ซ่อมเสร็จ" → transition in_progress   │
└────────────────────────────────────────────┘
```

**Action ที่ทำได้ใน Job Flow:**
- แต่ละ step มี action button ที่เรียก API ที่เกี่ยวข้อง
- กดแล้ว → refetch job status → อัปเดต timeline
- Action buttons map ตาม step ปัจจุบัน (ดู [06-service-orders.md](./06-service-orders.md) §6.3)

---

## 12.3 Document Browser (`/billing/documents`)

**Permission:** `invoices.can_view`

**Layout:** Tabs + Table

**8 Tabs:**

| Tab | ประเภทเอกสาร | API |
|-----|------------|-----|
| SO | ใบสั่งซ่อม | `GET /api/v1/service-orders` |
| QT | ใบเสนอราคา | `GET /api/v1/quotations` |
| INV | ใบแจ้งหนี้ | `GET /api/v1/invoices` |
| RCP | ใบเสร็จรับเงิน | (ไม่มี list endpoint แยก — planned) |
| DP | ใบรับมัดจำ | `GET /api/v1/deposits` |
| DN | ใบส่งมอบ | (ไม่มี list endpoint แยก — planned) |
| WR | ใบรับประกัน | `GET /api/v1/warranties` |

**Common Columns (ทุก Tab):**
- เลขเอกสาร, ลูกค้า, วันที่, ยอดเงิน (ถ้ามี), สถานะ
- คลิก row → navigate ไปหน้า detail ของเอกสารนั้น

**Search/Filter:**
- `search`: ค้นเลขเอกสาร / ชื่อลูกค้า
- `status`: กรองสถานะ (ต่างกันตาม Tab)
- `date_from`, `date_to`: ช่วงวันที่
- `branch_id`: กรองสาขา

---

## 12.4 Retail POS (`/billing/pos`)

**Permission:** `invoices.can_create`

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  Product Search / Barcode Scanner                    │
│  [🔍 ค้นสินค้าหรือสแกนบาร์โค้ด]                      │
├──────────────────────┬──────────────────────────────┤
│  Product List        │  Cart                         │
│  ─────────────────── │  ──────────────────────────── │
│  ผ้าเบรกหน้า  ฿850  │  ผ้าเบรกหน้า   x1   ฿850      │
│  น้ำมันเครื่อง ฿350  │  น้ำมันเครื่อง x2   ฿700      │
│  ไส้กรอง      ฿120  │  ─────────────────────────── │
│                      │  ยอดรวม              ฿1,550  │
│                      │  VAT 7%               ฿108.50│
│                      │  ────────────────────────── │
│                      │  รวมทั้งสิ้น          ฿1,658.50│
│                      │                              │
│                      │  [ชำระเงิน]                  │
└──────────────────────┴──────────────────────────────┘
```

**Flow:**

1. ค้นสินค้า → `GET /api/v1/products?search={term}&limit=10`
2. เพิ่มลง Cart (local state)
3. กด "ชำระเงิน" → modal เลือกช่องทาง
4. `POST /api/v1/invoices/retail { items: [...] }` → ได้ INV id
5. `POST /api/v1/invoices/{id}/issue` → ตัดสต็อก
6. `POST /api/v1/invoices/{id}/payments { amount, method }` → บันทึกชำระ
7. `POST /api/v1/invoices/{id}/issue-receipt` → พิมพ์ใบเสร็จ thermal

**ดู API ครบที่ [20-flows.md](./20-flows.md#flow-c--retail-pos-scenario-c)**

---

## 12.5 Navigation ไปหน้า Billing

```
/billing              → Billing Hub (overview)
/billing/new/repair   → สร้าง SO ใหม่ (→ /service-orders/create)
/billing/new/sale     → สร้าง QT ใหม่ (→ /quotations/create?type=sale)
/billing/jobs/:id     → Job Flow tracker
/billing/documents    → Document Browser
/billing/pos          → Retail POS
```

---

## ดูเพิ่มเติม

- [20-flows.md](./20-flows.md) — API sequence ทุก flow
- [06-service-orders.md](./06-service-orders.md) — SO detail page
- [07-quotations.md](./07-quotations.md) — QT detail page
- [08-invoices.md](./08-invoices.md) — Invoice detail + payment
- [09-deposits.md](./09-deposits.md) — Deposit (Flow B2)
- [10-delivery-notes.md](./10-delivery-notes.md) — Delivery Note
- [11-warranties.md](./11-warranties.md) — Warranty
