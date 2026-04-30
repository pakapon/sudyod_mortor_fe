# ใบส่งมอบ (Delivery Notes)

> ดู common conventions → [00-common.md](./00-common.md)  
> **📋 Reference เท่านั้น** — ดู API sequence จริงตาม flow ที่ [20-flows.md](./20-flows.md)

---

## 10.1 สร้าง Delivery Note

**Permission:** `delivery_notes.can_create`

**API:** `POST /api/v1/delivery-notes`

**Request Body:**

| Field | Type | Required | หมายเหตุ |
|-------|------|----------|---------|
| `owner_type` | string | ✅ | `service_order` หรือ `quotation` |
| `owner_id` | int | ✅ | ID ของ SO หรือ QT |
| `customer_id` | int | ✅ | ID ลูกค้า |
| `note` | string | ❌ | หมายเหตุ |

```json
{
  "owner_type": "service_order",
  "owner_id": 42,
  "customer_id": 1,
  "note": "ส่งมอบรถหลังซ่อมเสร็จ"
}
```

> ❌ **ไม่มี `invoice_id`** — DN ผูกกับ SO หรือ QT เสมอ  
>
> | Scenario | `owner_type` | `owner_id` |
> |----------|-------------|-----------|
> | Flow A (ซ่อมรถ) | `service_order` | SO id |
> | Flow B1/B2 (ขาย) | `quotation` | QT id |

**Response:** DN object ที่มี `id`, `reference_no` (DN-2026-XXXX)

---

## 10.2 ดู Delivery Note

**Route:** `/delivery-notes/{id}` (UI)  
**API:** `GET /api/v1/delivery-notes/{id}`  
**Permission:** `delivery_notes.can_view`

**แสดงข้อมูล:**
- เลข DN (DN-2026-XXXX)
- ลูกค้า
- เจ้าของ: SO หรือ QT ที่ผูกอยู่ (link)
- รายการสินค้า/บริการ (ดึงจาก owner)
- สถานะการเซ็น: `signed_at` | `signed_by`
- หมายเหตุ

---

## 10.3 ลูกค้าเซ็นรับ DN

**API:** `PATCH /api/v1/delivery-notes/{id}/sign`  
**Permission:** `delivery_notes.can_edit`

```json
{ "signed_by": "นายมนัส ใจดี" }
```

> `signed_at` ถูกตั้งค่าโดย server อัตโนมัติ  
> หลังเซ็นแล้ว DN ถือว่าสมบูรณ์  
> **Flow A:** ต้องเซ็น DN ก่อน closed SO (ดู A-22, A-25 ใน [20-flows.md](./20-flows.md))

---

## 10.4 เงื่อนไขสำคัญ

- **Flow A:** DN บังคับก่อน closed SO
- **Flow B1/B2:** DN เป็น optional (ไม่บังคับ)
- DN ไม่มี status flow — มีแค่ `signed_at` ว่าเซ็นหรือยัง
- Soft Delete เท่านั้น (`deleted_at`) — เก็บเป็นหลักฐาน
- ไม่มี edit หลังสร้าง (ต้องลบและสร้างใหม่)

---

## 10.5 หน้า List Delivery Notes

**Route:** `/delivery-notes` หรือดูจาก DocumentBrowser → Tab "ใบส่งมอบ"  
**API:** (ไม่มี list endpoint แยก — ดูผ่าน Document Browser ใน Billing Hub)

> ดูหน้า Document Browser ที่ [12-billing-hub.md](./12-billing-hub.md) §12.3

---

## ดูเพิ่มเติม

- [20-flows.md](./20-flows.md) — A-21 (สร้าง DN), A-22 (เซ็น DN), A-25 (ปิดงาน)
- [06-service-orders.md](./06-service-orders.md) — SO Tab เอกสาร
- [08-invoices.md](./08-invoices.md) — Invoice ก่อนสร้าง DN
- [11-warranties.md](./11-warranties.md) — ใบรับประกัน (สร้างคู่กับ DN)
