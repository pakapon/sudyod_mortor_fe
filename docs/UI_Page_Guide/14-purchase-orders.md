# ใบสั่งซื้อ (Purchase Orders)

> ดู common conventions → [00-common.md](./00-common.md)

---

**Route:** `/purchase-orders`
**Permission:** `purchase_orders.can_view`

## 14.1 หน้า List + สร้าง

- Filter: `vendor_id`, `status`, `branch_id`
- Table: เลข PO, Vendor, ยอดรวม, สถานะ

**สร้าง PO:**
- Fields: Vendor autocomplete (`GET /vendors`), `branch_id`, `note`
- Items: เลือกสินค้า + จำนวน + cost_price
- API: `POST /purchase-orders`

## 14.2 Detail PO

- ปุ่ม "ส่งให้ Supplier" → `POST /purchase-orders/{id}/send`
- ปุ่ม "รับของ" → `POST /purchase-orders/{id}/receive` → สร้าง Goods Receipt อัตโนมัติ → ไปอนุมัติ GR

**Status:** `draft → sent → received / cancelled`

---

## ดูเพิ่มเติม
- [13-inventory.md](./13-inventory.md) — Goods Receipt ที่สร้างจาก PO
