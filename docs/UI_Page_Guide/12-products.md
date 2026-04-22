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

**Form Fields (ชื่อ field ที่ UI ส่ง → API จะ map ให้อัตโนมัติ):**
| Field (UI ส่ง) | Type | Required | DB Column | หมายเหตุ |
|----------------|------|----------|-----------|---------|
| `sku` | Text | ✅ | `sku` | |
| `name` | Text | ✅ | `name` | |
| `type` | Select | ✅ | `product_type` | `goods` → `standard`, `service` → `service` |
| `brand_id` | Select | ❌ | `brand_id` | dropdown — `GET /brands` |
| `category_id` | Select | ✅ | `category_id` | dropdown — `GET /product-categories` |
| `unit_id` | Select | ✅ | `base_unit_id` | dropdown — `GET /product-units` |
| `vendor_id` | Select | ❌ | `vendor_id` | ผู้จัดจำหน่าย (integer FK) — `GET /vendors` |
| `vat_code` | Select | ❌ | `vat_code` | รหัส VAT (เช่น `VAT 7%`, `vat0`, `exempt`) |
| `description` | Textarea | ❌ | `description` | |
| `selling_price` | Number | ❌ | — | ราคาขาย — บันทึกไปที่ pricing tier `ปลีก` โดยอัตโนมัติ; เมื่อ GET จะดึงจาก `pricing_tiers[0].selling_price` |
| `tags` | Array\<string\> | ❌ | — | `["of-genuine", "Honda"]` — sync ทั้งหมด (สร้าง tag ใหม่อัตโนมัติถ้ายังไม่มี) |
| `min_stock` | Number | ❌ | `min_quantity` | สำหรับ low stock alert |
| `is_active` | Boolean | ❌ | `is_active` | default true |
| `weight` | Number | ❌ | `weight_grams` | น้ำหนัก (กรัม) |
| `height` | Number | ❌ | `height_cm` | ความสูง (ซม.) |
| `width` | Number | ❌ | `width_cm` | ความกว้าง (ซม.) |
| `length` | Number | ❌ | `length_cm` | ความยาว (ซม.) |

> **หมายเหตุ:** `main_supplier` (text) ไม่รองรับ — ต้องส่งเป็น `vendor_id` (integer) แทน

**Response (GET /products/{id}):**
```json
{
  "success": true,
  "message": "สำเร็จ",
  "data": {
    "id": 1,
    "sku": "PRD-001",
    "name": "กรองอากาศ Honda Wave",
    "product_type": "standard",
    "brand": { "id": 1, "name": "Honda" },
    "category": { "id": 2, "name": "กรองอากาศ" },
    "base_unit": { "id": 1, "name": "ชิ้น" },
    "vendor": { "id": 3, "name": "TTB Parts Co., Ltd." },
    "vendor_id": 3,
    "vat_code": "VAT 7%",
    "description": "รายละเอียดสินค้า",
    "is_active": true,
    "images": [],
    "tags": [],
    "created_at": "2026-04-20T10:00:00",
    "updated_at": "2026-04-20T10:00:00"
  }
}
```

> **หมายเหตุ:** `vendor` เป็น object `{ id, name }` — หน้าบ้านใช้ `data.vendor.name` แสดงชื่อผู้จำหน่าย

**Request Body ตัวอย่าง (PUT /products/{id}):**
```json
{
  "sku": "SKU-WAVE110I",
  "name": "Honda Wave 110i (2025)",
  "type": "goods",
  "brand_id": 15,
  "category_id": 19,
  "unit_id": 1,
  "vendor_id": 3,
  "vat_code": "VAT 7%",
  "description": "รายละเอียดสินค้า",
  "selling_price": 55900,
  "tags": ["ของแท้", "Honda", "มอเตอร์ไซค์"],
  "min_stock": 5,
  "is_active": true,
  "weight": 100,
  "height": 100,
  "width": 100,
  "length": 100
}
```

---

## 12.3 หน้า Detail สินค้า

**Tab-based:**

**Tab รูปภาพ:**
- Gallery รูปสินค้า (drag to reorder)
- อัปโหลด: `POST /products/{id}/images` (multipart)
- ลบ: `DELETE /products/{id}/images/{iid}`
- เรียงลำดับ: `PUT /products/{id}/images/reorder`

**Tab ราคา (Pricing):**
- ตารางราคาหลายระดับ (Tiers) — ปลีก, ส่ง, ราคาพิเศษ
- API: `GET /products/{id}/pricing`, `PUT /products/{id}/pricing`

**คอลัมน์ตารางราคา:**
| คอลัมน์ | ชนิด | หมายเหตุ |
|---------|------|---------|
| `tier_name` | Text | ชื่อระดับราคา (เช่น ปลีก, ส่ง) |
| `selling_price` | Decimal | ราคาขาย |
| `cost_price` | Decimal | ราคาทุน |
| `min_price` | Decimal | ราคาต่ำสุดที่ยอมให้ขาย |
| `currency` | Text | สกุลเงิน (default: THB) |
| `include_tax` | Boolean | รวม VAT หรือไม่ |
| `min_qty` | Integer | จำนวนขั้นต่ำสำหรับ tier นี้ |
| `min_discount_pct` | Decimal | % ส่วนลดขั้นต่ำที่อนุญาต |
| `max_discount_pct` | Decimal | % ส่วนลดสูงสุดที่อนุญาต |
| `effective_date` | Date | วันที่มีผล (YYYY-MM-DD) |

**Request Body (PUT /products/{id}/pricing):**
```json
{
  "tiers": [
    {
      "tier_name": "ปลีก",
      "cost_price": 85.00,
      "selling_price": 160.00,
      "min_price": 130.00,
      "currency": "THB",
      "include_tax": true,
      "min_qty": 1,
      "min_discount_pct": 0,
      "max_discount_pct": 10,
      "effective_date": "2026-01-01"
    },
    {
      "tier_name": "ส่ง",
      "cost_price": 85.00,
      "selling_price": 140.00,
      "min_price": 120.00,
      "currency": "THB",
      "include_tax": true,
      "min_qty": 10,
      "min_discount_pct": 0,
      "max_discount_pct": 15,
      "effective_date": "2026-01-01"
    }
  ]
}
```

**Tab แปลงหน่วย (Unit Conversions):**
- เช่น 1 กล่อง = 12 ชิ้น
- API: CRUD `/products/{id}/unit-conversions`

**Tab BOM (Bill of Materials):**
- สำหรับ "ชุด" — แสดงส่วนประกอบ
- เช่น "ชุดเปลี่ยนถ่าย" = น้ำมันเครื่อง 4L + กรอง 1 ชิ้น + ...
- API: CRUD `/products/{id}/bom`
- เช็คสต็อก BOM: `GET /products/{id}/bom/availability` → แสดงว่าทำได้กี่ชุด

**Tab Tags:**
- ป้ายกำกับสินค้า (ของแท้, สต็อกน้อย, โปรโมชัน ฯลฯ)
- API:
  - `GET /products/{id}/tags` — รายการ tags
  - `POST /products/{id}/tags` — เพิ่ม tag
  - `DELETE /products/{id}/tags/{tid}` — ลบ tag

**Request Body (POST /products/{id}/tags):**
```json
{ "name": "ของแท้" }
```

**Response (GET /products/{id}/tags):**
```json
{
  "success": true,
  "message": "สำเร็จ",
  "data": [
    {
      "id": 3,
      "name": "ของแท้",
      "created_at": "2026-04-22T16:53:26.000000Z",
      "updated_at": "2026-04-22T16:53:26.000000Z",
      "pivot": { "product_id": 12, "tag_id": 3 }
    }
  ]
}
```

> **หมายเหตุ:** `tags` ใน `GET /products/{id}` ส่งกลับเป็น object array (ไม่ใช่ string[]) — frontend normalize เป็น string โดยดึง `.name` ก่อน render / load เข้า form

**Tab ไฟล์แนบ (Attachments):**
- เอกสารประกอบ เช่น datasheet, คู่มือ, ใบรับประกัน
- Allowed: `pdf`, `doc`, `docx`, `xls`, `xlsx`, `jpg`, `png`, `webp`
- API:
  - `GET /products/{id}/attachments` — รายการไฟล์แนบ
  - `POST /products/{id}/attachments` — อัปโหลด (multipart/form-data, field: `file`)
  - `DELETE /products/{id}/attachments/{aid}` — ลบไฟล์แนบ

**Response (GET /products/{id}/attachments):**
```json
{
  "success": true,
  "message": "สำเร็จ",
  "data": [
    {
      "id": 1,
      "filename": "datasheet.pdf",
      "file_url": "https://spaces.example.com/products/1/attachments/datasheet.pdf",
      "mime_type": "application/pdf",
      "size_bytes": 102400,
      "created_at": "2026-04-19T10:00:00"
    }
  ]
}
```

**Tab Variants (SKU):**
- รูปแบบย่อยของสินค้า เช่น สี, ขนาด
- API:
  - `GET /products/{id}/variants` — รายการ variants
  - `POST /products/{id}/variants` — สร้าง variant ใหม่
  - `PUT /products/{id}/variants/{vid}` — แก้ไข variant (ทุก field optional)
  - `DELETE /products/{id}/variants/{vid}` — ลบ variant (soft delete)

**Fields (POST/PUT /products/{id}/variants):**
| Field | Type | Required | หมายเหตุ |
|-------|------|----------|---------|
| `sku` | Text | ✅ (POST) | unique across all variants |
| `name` | Text | ✅ (POST) | |
| `cost_price` | Decimal | ❌ | |
| `selling_price` | Decimal | ❌ | |
| `description` | Text | ❌ | คุณลักษณะสินค้า (rich text / plain text) |
| `barcode` | Text | ❌ | บาร์โค้ดหลัก (EAN-13, UPC หรืออื่นๆ) — **ถ้าไม่ส่ง server จะ auto-gen 13 หลักให้** |
| `barcode_secondary` | Text | ❌ | บาร์โค้ดรอง (OEM code, รหัสสำรอง) — **ถ้าไม่ส่ง server จะ auto-gen 13 หลักให้** |
| `attributes` | Object | ❌ | `{"1": "S", "2": "ขาว"}` — axis → value; ส่ง `{}` เมื่อไม่มี attribute (ไม่ใช่ `null`) |
| `is_active` | Boolean | ❌ | default true |
| `unit_id` | Integer | ❌ | dropdown — `GET /product-units` |
| `unit_quantity` | Decimal | ❌ | จำนวนต่อหน่วย เช่น 1, 600, 3 |
| `min_stock` | Integer | ❌ | จำนวนสต็อกขั้นต่ำ (alert) |
| `reorder_point` | Integer | ❌ | จุด reorder |
| `track_lot_expiry` | Boolean | ❌ | ติดตาม lot/วันหมดอายุ |
| `track_serial` | Boolean | ❌ | ติดตาม serial number |
| `dimension_width` | Decimal | ❌ | ความกว้าง (ซม.) |
| `dimension_height` | Decimal | ❌ | ความสูง (ซม.) |
| `dimension_length` | Decimal | ❌ | ความยาว (ซม.) |
| `weight_kg` | Decimal | ❌ | น้ำหนัก (กิโลกรัม) |

**Request Body (POST /products/{id}/variants):**
```json
{
  "sku": "V-001",
  "name": "สีแดง ขนาด S",
  "cost_price": 100.00,
  "selling_price": 150.00,
  "description": "คุณลักษณะสินค้า...",
  "barcode": "8851234567890",
  "barcode_secondary": "OEM-001",
  "attributes": { "1": "S", "2": "แดง" },
  "is_active": true,
  "unit_id": 1,
  "unit_quantity": 1,
  "min_stock": 5,
  "reorder_point": 10,
  "track_lot_expiry": false,
  "track_serial": false,
  "dimension_width": 10,
  "dimension_height": 5,
  "dimension_length": 3,
  "weight_kg": 0.25
}
```

**Response (GET /products/{id}/variants):**
```json
{
  "success": true,
  "message": "สำเร็จ",
  "data": [
    {
      "id": 1,
      "product_id": 1,
      "sku": "V-001",
      "name": "สีแดง ขนาด S",
      "cost_price": 100.00,
      "selling_price": 150.00,
      "description": "คุณลักษณะสินค้า...",
      "barcode": "8851234567890",
      "barcode_secondary": "OEM-001",
      "attributes": { "1": "S", "2": "แดง" },
      "is_active": true,
      "unit_id": 1,
      "unit": { "id": 1, "name": "ชิ้น" },
      "unit_quantity": 1,
      "min_stock": 5,
      "reorder_point": 10,
      "track_lot_expiry": false,
      "track_serial": false,
      "dimension_width": 10,
      "dimension_height": 5,
      "dimension_length": 3,
      "weight_kg": 0.25,
      "created_at": "2026-04-20T10:00:00",
      "updated_at": "2026-04-20T10:00:00"
    }
  ]
}
```

**Tab Attribute Options (อ่านอย่างเดียวในหน้าแก้ไขสินค้า):**

> ⚠️ **ย้ายไปที่ Settings แล้ว** — การเพิ่ม/ลบตัวเลือกแบบสินค้า ทำได้ที่
> **ตั้งค่า → ตัวเลือกแบบสินค้า** (`/settings/product-attributes`)
> ดูรายละเอียดที่ [17-settings.md § 17.8](./17-settings.md)

- หน้าแก้ไขสินค้า (`/products/:id/edit`) แสดงตัวเลือกที่มีอยู่แล้วเป็น chip (read-only)
- มีปุ่ม "จัดการตัวเลือกใน ตั้งค่า" (เปิด tab ใหม่) เพื่อไปจัดการที่หน้า Settings
- หน้า Settings ใช้ API `/product-units` สำหรับ CRUD (ชื่อ + ตัวย่อ)


**Request Body (POST /products/{id}/attribute-options):**
```json
{
  "axis": 1,
  "label": "ขนาด",
  "value": "S",
  "sort_order": 0
}
```

**Fields:**
| Field | Type | Required | หมายเหตุ |
|-------|------|----------|---------|
| `axis` | Integer | ✅ | 1, 2, หรือ 3 (แบบสินค้า 1/2/3) |
| `value` | Text | ✅ | ค่าตัวเลือก เช่น "S", "M", "L", "ขาว" (max 100 chars) |
| `label` | Text | ❌ | ชื่อแกน เช่น "ขนาด", "สี" (max 50 chars) |
| `sort_order` | Integer | ❌ | ลำดับการแสดงผล (default 0) |

**Response (GET /products/{id}/attribute-options):**
```json
{
  "success": true,
  "message": "สำเร็จ",
  "data": [
    { "id": 1, "product_id": 1, "axis": 1, "label": "ขนาด", "value": "S", "sort_order": 0 },
    { "id": 2, "product_id": 1, "axis": 1, "label": "ขนาด", "value": "M", "sort_order": 1 },
    { "id": 3, "product_id": 1, "axis": 1, "label": "ขนาด", "value": "L", "sort_order": 2 },
    { "id": 4, "product_id": 1, "axis": 2, "label": "สี", "value": "ขาว", "sort_order": 0 },
    { "id": 5, "product_id": 1, "axis": 2, "label": "สี", "value": "ดำ", "sort_order": 1 }
  ]
}
```

---

## ดูเพิ่มเติม
- [13-inventory.md](./13-inventory.md) — สต็อกสินค้าในคลัง
- [17-settings.md § 17.5](./17-settings.md) — จัดการยี่ห้อ (Brands), หมวดสินค้า (Categories), หน่วยนับ (Units)
- [17-settings.md § 17.8](./17-settings.md) — จัดการตัวเลือกแบบสินค้า (Product Attribute Options)
