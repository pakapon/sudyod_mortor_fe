# ใบรับประกัน (Warranties)

> ดู common conventions → [00-common.md](./00-common.md)

---

**Route:** `/warranties`
**Permission:** `warranties.can_view`

## เมื่อไหร่ใช้?
- สร้างหลัง Invoice paid + ส่งมอบแล้ว
- ผูกกับ SO (ซ่อม) หรือ Invoice (ขาย)

## 11.1 สร้าง Warranty
- Route: `/warranties/create?invoice_id={id}` หรือ `?service_order_id={id}`
- Fields: `owner_type` (service_order/invoice), `owner_id`, `warranty_months`, `start_date`, `conditions`
- API: `POST /warranties`

## 11.2 List + Detail
- Table: เลข WR, ลูกค้า, ระยะรับประกัน, วันหมดอายุ, สถานะ (active/expired)
- Detail: ข้อมูลรับประกัน + เงื่อนไข + link ไป SO/INV
- ⚠️ Job `service-reminder` ตรวจรถที่ใกล้เช็คระยะ → แจ้งเตือน

---

## ดูเพิ่มเติม
- [06-service-orders.md](./06-service-orders.md) — SO ที่ผูกกับ Warranty
- [08-invoices.md](./08-invoices.md) — Invoice ที่ผูกกับ Warranty
- [18-notifications.md](./18-notifications.md) — แจ้งเตือนถึงรอบเช็คระยะ
