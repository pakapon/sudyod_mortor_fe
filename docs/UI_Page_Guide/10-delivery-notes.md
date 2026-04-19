# ใบส่งมอบ (Delivery Notes)

> ดู common conventions → [00-common.md](./00-common.md)

---

**Route:** `/delivery-notes`
**Permission:** `delivery_notes.can_view`

## เมื่อไหร่ใช้?
- **Flow A (ซ่อม)**: บังคับ — ลูกค้าต้องเซ็นรับรถก่อน close SO
- **Flow B1/B2 (ขาย)**: ไม่บังคับ — แต่ควรทำเมื่อส่งสินค้าให้ลูกค้า

## 10.1 สร้าง DN
- Route: `/delivery-notes/create?invoice_id={id}`
- API: `POST /delivery-notes { invoice_id }`
- Items มาจาก Invoice อัตโนมัติ

## 10.2 Detail
- แสดงรายการสินค้าที่ส่งมอบ
- ปุ่ม "ลูกค้าเซ็นรับ" → `PATCH /delivery-notes/{id}/sign`
- ⚠️ `signed_at` ต้องไม่เป็น null ก่อน SO จะ close ได้ (Flow A)
- แสดง signature (ถ้ามี digital signature)

---

## ดูเพิ่มเติม
- [06-service-orders.md](./06-service-orders.md) — SO ต้องการ DN signed ก่อน closed
- [08-invoices.md](./08-invoices.md) — Invoice ที่ผูกกับ DN
