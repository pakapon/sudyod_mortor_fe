# การแจ้งเตือน (Notifications)

> ดู common conventions → [00-common.md](./00-common.md)

---

**Permission:** ไม่ต้องการ permission พิเศษ — ทุก user ดูได้เฉพาะของตัวเอง

## Bell Icon (Header)
- Dropdown แสดง 10 รายการล่าสุด + ปุ่ม "ดูทั้งหมด"
- Badge: จำนวนที่ยังไม่ได้อ่าน → `GET /notifications/unread-count`
- คลิกรายการ → mark read + navigate ไปหน้าเอกสารที่เกี่ยวข้อง

## หน้า Notifications

**Route:** `/notifications`

- Filter: `read` (read/unread)
- Table: ข้อความ, วันที่, สถานะ (อ่าน/ยังไม่อ่าน)
- คลิก → mark read: `PATCH /notifications/{id}/read`
- ปุ่ม "อ่านทั้งหมด": `PATCH /notifications/read-all`
- API: `GET /notifications?page=1&limit=20`

## ตัวอย่าง Notifications
- SO มอบหมายช่างให้คุณ (SO-2026-0123)
- INV #INV-2026-0456 เกินกำหนดชำระ
- รถ ทะเบียน กข 1234 ถึงรอบเช็คระยะแล้ว

---

## ดูเพิ่มเติม
- [11-warranties.md](./11-warranties.md) — แจ้งเตือนรอบเช็คระยะ (warranty)
- [00-common.md](./00-common.md) — Layout Shell + Bell icon position
