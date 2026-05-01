# คู่มือหน้า UI — Sudyod Motor ERP

> เอกสารนี้เป็น **index** ชี้ไปยังไฟล์ย่อยแต่ละหน้าใน `docs/UI_Page_Guide/`
> เขียนสำหรับ Frontend Developer

---

## สารบัญ

| ไฟล์ | เนื้อหา |
|------|--------|
| [UI_Page_Guide/00-common.md](./UI_Page_Guide/00-common.md) | ส่วนกลาง — ภาพรวมระบบ, Layout Shell, Navigation, Quick Reference |
| [UI_Page_Guide/02-login-auth.md](./UI_Page_Guide/02-login-auth.md) | Login, Forgot Password, Change Password, Session Management |
| [UI_Page_Guide/04-dashboard.md](./UI_Page_Guide/04-dashboard.md) | Dashboard — stats cards, charts, quick actions |
| [UI_Page_Guide/05-customers.md](./UI_Page_Guide/05-customers.md) | ลูกค้า — CRUD, รถ, ที่อยู่ออกบิล, เอกสาร, timeline |
| [UI_Page_Guide/06-service-orders.md](./UI_Page_Guide/06-service-orders.md) | ใบสั่งซ่อม — status flow, GPS photos, items, transition rules |
| [UI_Page_Guide/07-quotations.md](./UI_Page_Guide/07-quotations.md) | ใบเสนอราคา — service & sale types, approve/reject |
| [UI_Page_Guide/08-invoices.md](./UI_Page_Guide/08-invoices.md) | ใบแจ้งหนี้ — 3 วิธีสร้าง, payment, receipt |
| [UI_Page_Guide/09-deposits.md](./UI_Page_Guide/09-deposits.md) | มัดจำ — Flow B2 เท่านั้น |
| [UI_Page_Guide/10-delivery-notes.md](./UI_Page_Guide/10-delivery-notes.md) | ใบส่งมอบ — sign flow |
| [UI_Page_Guide/11-warranties.md](./UI_Page_Guide/11-warranties.md) | ใบรับประกัน |
| [UI_Page_Guide/12-products.md](./UI_Page_Guide/12-products.md) | สินค้า — images, pricing, BOM, unit conversions |
| [UI_Page_Guide/13-inventory.md](./UI_Page_Guide/13-inventory.md) | คลังสินค้า — warehouses, goods receipts, stock transfers |
| [UI_Page_Guide/14-purchase-orders.md](./UI_Page_Guide/14-purchase-orders.md) | ใบสั่งซื้อ |
| [UI_Page_Guide/15-loans-finance.md](./UI_Page_Guide/15-loans-finance.md) | สินเชื่อไฟแนนซ์, ผ่อนร้าน, Elasticsearch loan search |
| [UI_Page_Guide/16-hr.md](./UI_Page_Guide/16-hr.md) | พนักงาน, เวลาทำงาน, วันหยุด |
| [UI_Page_Guide/17-settings.md](./UI_Page_Guide/17-settings.md) | ตั้งค่า — Branches, Roles & Permission Matrix, Work Schedules, Categories, Finance Companies |
| [UI_Page_Guide/18-notifications.md](./UI_Page_Guide/18-notifications.md) | Bell icon, notification list |
| [UI_Page_Guide/19-audit-log.md](./UI_Page_Guide/19-audit-log.md) | Audit Log — read-only |
| [UI_Page_Guide/20-flows.md](./UI_Page_Guide/20-flows.md) | Cross-page flows A/B1/B2/C + Quick Reference table |

---

## Scenario Summary

| Scenario | Flow | ไฟล์หลัก |
|----------|------|---------|
| **A: ซ่อมรถ** | SO → QT(service) → INV → Receipt → DN → WR | [06](./UI_Page_Guide/06-service-orders.md) → [07](./UI_Page_Guide/07-quotations.md) → [08](./UI_Page_Guide/08-invoices.md) |
| **B1: ขายไม่มัดจำ** | QT(sale) → INV → Receipt → [DN] → WR | [07](./UI_Page_Guide/07-quotations.md) → [08](./UI_Page_Guide/08-invoices.md) |
| **B2: ขายมีมัดจำ** | QT(sale) → Deposit → INV(หักมัดจำ) → Receipt → [DN] → WR | [07](./UI_Page_Guide/07-quotations.md) → [09](./UI_Page_Guide/09-deposits.md) → [08](./UI_Page_Guide/08-invoices.md) |
| **C: ของชิ้นเล็ก** | INV(retail) → Receipt | [08](./UI_Page_Guide/08-invoices.md) |

ดูรายละเอียดแต่ละ Flow ได้ที่ [UI_Page_Guide/20-flows.md](./UI_Page_Guide/20-flows.md)
