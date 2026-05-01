# ใบสั่งซ่อม (Service Orders) — DEPRECATED UI

> ⚠️ **หน้า UI `/service-orders` ถูกลบแล้ว** — ทุกฟีเจอร์ย้ายไปอยู่ใน Billing Hub
> ดู [12-billing-hub.md](./12-billing-hub.md) เป็นหลัก

---

## การ Map ที่ใหม่

| ของเดิม (ลบแล้ว) | ของใหม่ |
|---|---|
| `/service-orders` (list) | `/billing/documents?type=service_order` |
| `/service-orders/create` | `/billing/new/repair` (ผ่าน Receive Vehicle step ของ Job Flow) |
| `/service-orders/:id` (detail) | `/billing/jobs/repair:{id}` (Job Flow Page) |
| `/service-orders/:id/edit` | ❌ ไม่มีหน้า edit ตรงๆ — แก้ผ่าน step ใน Job Flow |
| ปุ่ม "สร้างใบสั่งซ่อม" | ปุ่ม "สร้างงานใหม่ (ซ่อมรถ)" ใน Billing Hub |
| Kanban board | ใช้ `/billing` (Billing Hub) — แสดงตาม flow step |

## Backend API (ยังคงอยู่)

API endpoint `/api/v1/service-orders/*` **ยังใช้งานอยู่** — Billing Hub เรียกผ่าน endpoint เดิม
ดู [20-flows.md](./20-flows.md) สำหรับ API sequence จริง

## Cross-References

- [12-billing-hub.md](./12-billing-hub.md) — Hub overview + Job Flow Page
- [20-flows.md](./20-flows.md) — full flow per scenario (A/B1/B2/C)
- [Summary_ServiceOrder_Flow.md](./Summary_ServiceOrder_Flow.md) — backend SO flow
