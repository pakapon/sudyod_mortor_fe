# Dashboard

> ดู common conventions → [00-common.md](./00-common.md)

---

**Route:** `/dashboard`
**Permission:** `dashboard.can_view`

## Components:

**Stats Cards (แถวบน):**
- ใบสั่งซ่อมวันนี้ / เดือนนี้
- รายรับวันนี้ / เดือนนี้
- จำนวนลูกค้าใหม่
- สินค้าสต็อกต่ำ
- ใบแจ้งหนี้ค้างชำระ (overdue)
- API: `GET /dashboard/stats?branch_id=1`

**Charts (กลาง):**
- กราฟรายรับรายจ่ายรายเดือน
- กราฟจำนวนใบสั่งซ่อมรายสัปดาห์
- กราฟสินค้าขายดี
- API: `GET /dashboard/charts?branch_id=1&period=monthly`

**Quick Actions:**
- ปุ่ม "สร้างใบสั่งซ่อม" → ไป `/service-orders/create`
- ปุ่ม "ขายหน้าร้าน" → ไป `/invoices/create-retail`
- ปุ่ม "รับรถเข้า" → ไป `/service-orders/create`

**Recent Activity:**
- SO ล่าสุด 5 รายการ + status badge
- Invoice ค้างชำระ
- Low stock alerts

**Links ไปหน้าอื่น:**
- คลิก stat card → ไปหน้า list ที่เกี่ยวข้อง
- คลิก SO → ไปหน้า detail ของ SO นั้น

---

## ดูเพิ่มเติม
- [06-service-orders.md](./06-service-orders.md) — สร้างใบสั่งซ่อม
- [08-invoices.md](./08-invoices.md) — ขายหน้าร้าน / invoice ค้างชำระ
- [13-inventory.md](./13-inventory.md) — สินค้าสต็อกต่ำ
