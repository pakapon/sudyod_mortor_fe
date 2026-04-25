# คลังสินค้า & สต็อก (Inventory)

> ดู common conventions → [00-common.md](./00-common.md)

---

## 13.1 หน้า List คลังสินค้า

**Route:** `/warehouses`
**Permission:** `warehouses.can_view`

- Table: ชื่อคลัง, สาขา, จำนวนสินค้า, สถานะ
- API: `GET /warehouses`

---

## 13.2 หน้า Detail คลัง

**Route:** `/warehouses/{id}`

**Tab ตำแหน่ง (Locations):**
- Rack, ชั้น, ช่อง
- API: `GET /warehouses/{id}/locations`, `POST /warehouses/{id}/locations`

**Tab สต็อก (Inventory):**
- Table: สินค้า, จำนวน, ตำแหน่ง, cost price
- API: `GET /warehouses/{id}/inventory`

**Tab ปรับสต็อก:**
- ปุ่ม "ปรับสต็อก" → modal: เลือกสินค้า, จำนวนปรับ (+/-), เหตุผล
- API: `PATCH /warehouses/{id}/inventory/adjust`

**Tab นับสต็อก (Cycle Count):**
- API: `POST /warehouses/{id}/inventory/cycle-count`

---

## 13.3 หน้า Inventory Overview

**Route:** `/inventory`
**Permission:** `inventory.can_view`

- ดูสต็อกทั้งหมดทุกคลัง: `GET /inventory`
- สินค้าสต็อกต่ำ: `GET /inventory/low-stock` → แสดงเตือนสีแดง
- ประวัติเคลื่อนไหว: `GET /inventory/transactions` → table: วันที่, สินค้า, เข้า/ออก, จำนวน, อ้างอิง (SO/GR/ST)
- Export: `GET /inventory/export`

---

## 13.4 ใบรับสินค้า (Goods Receipts)

**Route:** `/goods-receipts`
**Permission:** `goods_receipts.can_view`

**สร้าง:**
- Fields: `warehouse_id` (select), `vendor_id` (select — `GET /vendors`), `received_date`, `reference_no` (เลขใบส่งของจาก vendor), `notes`
- Items: เลือกสินค้า + `quantity_ordered` + `quantity_received` + `unit_cost` + `location_id` (optional)
- API: `POST /goods-receipts`

**Detail:**
- ปุ่ม "อนุมัติรับ" → `POST /goods-receipts/{id}/approve` → สต็อกเข้าคลังทันที
- ปุ่ม "ยกเลิก" → `POST /goods-receipts/{id}/cancel` (ได้เฉพาะ draft; ถ้า approved แล้ว → reverse stock)

**Tab เอกสารแนบ (Documents):**
- Upload เอกสารจริงจาก vendor หลายไฟล์ (PDF / รูป / Word / Excel) — `multipart/form-data`
- Fields ต่อไฟล์: `file` (binary), `file_type` (`invoice` | `delivery_note` | `receipt` | `other`), `file_name` (optional), `note` (optional)
- ขนาดไฟล์: ตาม config global; รองรับ `application/pdf`, `image/jpeg`, `image/png`, `application/msword`, `docx`, `xls`, `xlsx`
- API:
  - `GET /goods-receipts/{id}/documents` — list
  - `POST /goods-receipts/{id}/documents` — upload (เรียกซ้ำได้หลายไฟล์)
  - `DELETE /goods-receipts/{id}/documents/{docId}` — ลบ
- Detail (`GET /goods-receipts/{id}`) จะ include `documents[]` มาให้ด้วย

**Status:** `draft → approved / cancelled`

---

## 13.5 โอนย้ายสต็อก (Stock Transfers)

**Route:** `/stock-transfers`
**Permission:** `stock_transfers.can_view`

**สร้าง:**
- Fields: `from_warehouse_id`, `to_warehouse_id` (2 dropdowns), `note`
- Items: เลือกสินค้า + จำนวน
- API: `POST /stock-transfers`

**Detail:**
- ปุ่ม "อนุมัติ" → `POST /stock-transfers/{id}/approve` → สต็อกย้ายทันที
- ปุ่ม "ยืนยันรับ" → `POST /stock-transfers/{id}/complete` (ปลายทางยืนยัน)

**Status:** `draft → pending → approved / rejected`

---

## ดูเพิ่มเติม
- [12-products.md](./12-products.md) — ข้อมูลสินค้า (ราคา, BOM)
- [14-purchase-orders.md](./14-purchase-orders.md) — สั่งซื้อจาก Vendor → รับเข้าคลัง
- [20-flows.md](./20-flows.md) — Flow รับสินค้าเข้าคลัง + Flow โอนสต็อก
