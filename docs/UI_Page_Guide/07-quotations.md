# ใบเสนอราคา (Quotations)

> ดู common conventions → [00-common.md](./00-common.md)

---

## 7.1 หน้า List

**Route:** `/quotations`
**Permission:** `quotations.can_view`

**Components:**
- Search: เลข QT / ชื่อลูกค้า
- Filter: `status` (draft/sent/approved/rejected/expired), `type` (service/sale), `branch_id`
- Table: เลข QT, type, ลูกค้า, ยอดรวม, สถานะ, วันที่สร้าง, หมดอายุ
- API: `GET /quotations?status=draft&type=service&page=1&limit=20`

---

## 7.2 หน้า สร้าง/แก้ไข Quotation

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
| `validity_days` | Number | ✅ | จำนวนวันหมดอายุ (default 30) — backend แปลงเป็น `valid_until` ให้อัตโนมัติ |
| `note` | Textarea | ❌ | |

> **API Note:** ส่ง `validity_days` (int) ขึ้นมา — backend คำนวณ `valid_until = วันนี้ + validity_days` แล้วเก็บใน DB
> Response จะมี `valid_until` (date string `YYYY-MM-DD`) ไม่มี `validity_days`

**Items Table (เหมือน SO Items):**
- สินค้า/บริการ, จำนวน, ราคา, ส่วนลด
- สรุปยอด

**API:** `POST /quotations`, `PATCH /quotations/{id}`

---

## 7.3 หน้า Detail Quotation

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

## ดูเพิ่มเติม
- [06-service-orders.md](./06-service-orders.md) — SO ที่ผูกกับ QT (type=service)
- [08-invoices.md](./08-invoices.md) — สร้าง Invoice จาก QT
- [09-deposits.md](./09-deposits.md) — รับมัดจำ (Flow B2)
- [20-flows.md](./20-flows.md) — Flow A, B1, B2
