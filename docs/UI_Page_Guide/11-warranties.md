# ใบรับประกัน (Warranties)

> ดู common conventions → [00-common.md](./00-common.md)  
> **📋 Reference เท่านั้น** — ดู API sequence จริงตาม flow ที่ [20-flows.md](./20-flows.md)

---

## 11.1 สร้างใบรับประกัน

**Permission:** `warranties.can_create`

**API:** `POST /api/v1/warranties`

**Request Body:**

| Field | Type | Required | หมายเหตุ |
|-------|------|----------|---------|
| `owner_type` | string | ✅ | `service_order` หรือ `quotation` |
| `owner_id` | int | ✅ | ID ของ SO หรือ QT |
| `warranty_months` | int | ✅ | จำนวนเดือนรับประกัน |
| `warranty_km` | int | ❌ | ระยะทาง km ที่รับประกัน (0 = ไม่จำกัด) |
| `conditions` | string | ❌ | เงื่อนไขการรับประกัน |
| `start_date` | date | ✅ | วันที่เริ่มรับประกัน (`YYYY-MM-DD`) |

```json
{
  "owner_type": "service_order",
  "owner_id": 42,
  "warranty_months": 3,
  "warranty_km": 5000,
  "conditions": "รับประกันชิ้นส่วนที่เปลี่ยน ไม่ครอบคลุมอุบัติเหตุและการใช้งานผิดวิธี",
  "start_date": "2026-04-30"
}
```

> ❌ **ไม่มี `owner_type = invoice`** — WR ผูกกับ SO หรือ QT เสมอ  
>
> | Scenario | `owner_type` | `owner_id` |
> |----------|-------------|-----------|
> | Flow A (ซ่อมรถ) | `service_order` | SO id |
> | Flow B1/B2 (ขาย) | `quotation` | QT id |

**Response:** WR object ที่มี `id`, `reference_no` (WR-2026-XXXX)

---

## 11.2 Route การสร้าง Warranty

**จากหน้า SO:**
- ปุ่มใน Tab "เอกสารที่เกี่ยวข้อง" หรือ Action ใน `/billing/jobs/repair:{id}`
- `owner_type: "service_order"`, `owner_id: {so_id}`

**จากหน้า Quotation:**
- ปุ่มใน `/quotations/{id}` (status = approved)
- `owner_type: "quotation"`, `owner_id: {qt_id}`

**จากหน้า Invoice:**
- ปุ่ม "สร้างใบรับประกัน" (Invoice status = paid)
- ต้องดึง owner จาก INV → QT หรือ SO

> **ไม่มี route `/warranties/create?invoice_id={id}`**  
> ต้องระบุ `owner_type` และ `owner_id` ตรงๆ

---

## 11.3 ดู Warranty

**API:** `GET /api/v1/warranties/{id}`  
**Permission:** `warranties.can_view`

**แสดงข้อมูล:**
- เลข WR (WR-2026-XXXX)
- ลูกค้า
- เจ้าของ: SO หรือ QT ที่ผูกอยู่ (link)
- วันที่เริ่ม / วันที่หมด (คำนวณจาก `start_date + warranty_months`)
- ระยะรับประกัน (km)
- เงื่อนไข

---

## 11.4 List Warranties

**API:** `GET /api/v1/warranties?page=1&limit=20`  
**Permission:** `warranties.can_view`

> ดูผ่าน Document Browser ที่ [12-billing-hub.md](./12-billing-hub.md) §12.3  
> หรือดูประวัติการรับประกันของลูกค้าผ่าน `GET /api/v1/customers/{id}/warranty-history`

---

## 11.5 เงื่อนไขสำคัญ

- WR ไม่มี status flow — ออกครั้งเดียวและสมบูรณ์
- ไม่มี edit หลังสร้าง
- Soft Delete เท่านั้น
- `owner_type` ต้องเป็น `service_order` หรือ `quotation` เท่านั้น — **ไม่ใช่ `invoice`**

---

## ดูเพิ่มเติม

- [20-flows.md](./20-flows.md) — A-24 (สร้าง WR), B1-9, B2-10
- [06-service-orders.md](./06-service-orders.md) — SO Tab เอกสาร
- [07-quotations.md](./07-quotations.md) — QT detail (สร้าง WR จาก sale QT)
- [10-delivery-notes.md](./10-delivery-notes.md) — DN (สร้างคู่กับ WR)
