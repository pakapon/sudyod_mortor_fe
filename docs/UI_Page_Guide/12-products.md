# สินค้า (Products)

> ดู common conventions → [00-common.md](./00-common.md)

---

## 12.1 หน้า List สินค้า

**Route:** `/products`
**Permission:** `products.can_view`

- Search: SKU / ชื่อสินค้า
- Filter: `brand_id`, `category_id`, `type` (goods/service)
- Table: SKU, ชื่อ, ยี่ห้อ, หมวด, ราคาขาย, สต็อกรวม
- Export: `GET /products/export`
- API: `GET /products?search=xxx&brand_id=1&page=1&limit=20`

---

## 12.2 หน้า สร้าง/แก้ไข สินค้า

**Form Fields:**
| Field | Type | Required | หมายเหตุ |
|-------|------|----------|---------|
| `sku` | Text | ✅ | |
| `name` | Text | ✅ | |
| `type` | Select: goods / service | ✅ | |
| `brand_id` | Select | ❌ | dropdown — `GET /brands` |
| `category_id` | Select | ✅ | dropdown — `GET /product-categories` |
| `unit_id` | Select | ✅ | dropdown — `GET /product-units` |
| `description` | Textarea | ❌ | |
| `cost_price` | Number | ❌ | |
| `selling_price` | Number | ✅ | |
| `min_stock` | Number | ❌ | สำหรับ low stock alert |

---

## 12.3 หน้า Detail สินค้า

**Tab-based:**

**Tab รูปภาพ:**
- Gallery รูปสินค้า (drag to reorder)
- อัปโหลด: `POST /products/{id}/images` (multipart)
- ลบ: `DELETE /products/{id}/images/{iid}`
- เรียงลำดับ: `PUT /products/{id}/images/reorder`

**Tab ราคา (Pricing):**
- ตารางราคาหลายระดับ (ขายปลีก, ขายส่ง, ราคาพิเศษ)
- API: `GET /products/{id}/pricing`, `PUT /products/{id}/pricing`

**Tab แปลงหน่วย (Unit Conversions):**
- เช่น 1 กล่อง = 12 ชิ้น
- API: CRUD `/products/{id}/unit-conversions`

**Tab BOM (Bill of Materials):**
- สำหรับ "ชุด" — แสดงส่วนประกอบ
- เช่น "ชุดเปลี่ยนถ่าย" = น้ำมันเครื่อง 4L + กรอง 1 ชิ้น + ...
- API: CRUD `/products/{id}/bom`
- เช็คสต็อก BOM: `GET /products/{id}/bom/availability` → แสดงว่าทำได้กี่ชุด

---

## ดูเพิ่มเติม
- [13-inventory.md](./13-inventory.md) — สต็อกสินค้าในคลัง
- [17-settings.md](./17-settings.md) — จัดการยี่ห้อ (Brands), หมวดสินค้า (Categories), หน่วยนับ (Units)
