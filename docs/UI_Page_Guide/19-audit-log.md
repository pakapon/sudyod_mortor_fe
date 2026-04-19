# Audit Log

> ดู common conventions → [00-common.md](./00-common.md)

---

**Route:** `/audit-logs`
**Permission:** `audit_logs.can_view`

## หน้า List

- Table: วัน/เวลา, พนักงาน, action (create/update/delete), module, entity_id, รายละเอียด
- Filter: วันที่, พนักงาน, module, action
- Export: `GET /audit-logs/export`
- API: `GET /audit-logs?module=service_orders&employee_id=12&page=1&limit=20`

> ⚠️ ข้อมูล Audit Log อ่านอย่างเดียว — ไม่มี Create/Update/Delete
