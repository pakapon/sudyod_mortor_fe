# สินค้า (Products)

> ดู common conventions → [00-common.md](./00-common.md)

---

## 12.1 หน้า List สินค้า

**Route:** `/products`
**Permission:** `products.can_view`

- Search: SKU / ชื่อสินค้า
- Filter: `brand_id`, `category_id`, `type` (goods/service), `variant_sku`
- Table: SKU, ชื่อ, ยี่ห้อ, หมวด, ราคาขาย, สต็อกรวม
- Export: `GET /products/export`
- API: `GET /products?search=xxx&brand_id=1&variant_sku=BRK-001&page=1&limit=20`

---

## 12.2 หน้า สร้าง/แก้ไข สินค้า

**Layout หน้าสร้าง/แก้ไขสินค้า:**
- ซ้าย: form หลัก (ชื่อ, ยี่ห้อ, หมวด, ราคา, description ฯลฯ) + tabs ด้านล่าง
- ขวา: อัปโหลดรูปภาพ, ไฟล์แนบ (progress bar)

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
| `status` | Select | ❌ | `status` | `draft` = แบบร่าง, `active` = เปิดใช้งาน (default), `inactive` = ปิดงาน, `discontinued` = เลิกการ |
| `description` | Textarea | ❌ | `description` | Rich text editor |
| `selling_price` | Number | ❌ | — | ราคาขาย — บันทึกไปที่ pricing tier `ปลีก` โดยอัตโนมัติ; เมื่อ GET จะดึงจาก `pricing_tiers[0].selling_price` |
| `tags` | Array\<string\> | ❌ | — | `["of-genuine", "Honda"]` — sync ทั้งหมด (สร้าง tag ใหม่อัตโนมัติถ้ายังไม่มี) |
| `min_stock` | Number | ❌ | `min_quantity` | สำหรับ low stock alert |
| `is_active` | Boolean | ❌ | `is_active` | derive จาก `status` — `active` = true, อื่นๆ = false |
| `weight` | Number | ❌ | `weight_grams` | น้ำหนักสินค้า (กรัม) — product-level (ไม่ใช่ variant) |
| `height` | Number | ❌ | `height_cm` | ความสูง (ซม.) |
| `width` | Number | ❌ | `width_cm` | ความกว้าง (ซม.) |
| `length` | Number | ❌ | `length_cm` | ความยาว (ซม.) |

**Status Dropdown Values:**
| ค่า (ส่งไป API) | ป้ายใน UI |
|----------------|---------------|
| `draft` | แบบร่าง |
| `active` | เปิดใช้งาน |
| `inactive` | ปิดงาน |
| `discontinued` | เลิกการ |

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

**Layout หน้า Detail:**
```
┌─────────────────────────────────┬────────────────┐
│  Product Form (ชื่อ, แบรนด์,    │  รูปภาพสินค้า  │
│  หมวด, VAT, สถานะ, ราคา,       │  [Upload area] │
│  น้ำหนัก, ขนาด, description)   ├────────────────┤
│                                 │  ไฟล์แนบ       │
│                                 │  [file list]   │
├─────────────────────────────────┴────────────────┤
│  Tabs: สินค้า │ รูปภาพ │ ราคา │ BOM │ Tags │ ...  │
├──────────────────────────────────────────────────┤
│  + เพิ่มสินค้าใหม่  [Variant Table]              │
│  ┌──────┬──────────┬────────┬──────┬───┬───┬───┐ │
│  │ SKU  │ ชื่อ     │แบบสนค.│บาร์โค้ด│หนว่│ lot│...│ │
│  ├──────┼──────────┼────────┼──────┼───┼───┼───┤ │
│  │ BRK-001A │ ...  │ S/ขาว  │ 885.../- │ชิ้น│✓│...│ │
│  └──────┴──────────┴────────┴──────┴───┴───┴───┘ │
│  [Panel: แปลงหน่วย] [Panel: LOT/EXP] [Panel: ROP]│
└──────────────────────────────────────────────────┘
```

**Tabs ในหน้า Detail:**
| Tab | เนื้อหา |
|-----|--------|
| สินค้า (ผลิตภัณฑ์) | form หลัก + variant table |
| รูปภาพ/แบบสินค้า | gallery + reorder |
| ราคา & ราคาตาม tier | pricing tiers |
| BOM | สูตรส่วนประกอบ (เฉพาะ product_type=bom) |
| Tags | แท็ก/ป้ายกำกับ |
| ไฟล์แนบ | attachments |
| แปลงหน่วย | unit conversions |

**Panels ด้านล่าง Variant Table:**
- **แปลงหน่วย** — แสดงสรุป conversion ที่มีอยู่ เช่น `1 กล่อง = 6 ชิ้น, ขนาดกล่อง: 20×10×5 ซม.`
- **การตรวจสอบ LOT/EXP** — แสดงการตั้งค่า Lot/EXP tracking และ Serial tracking
- **Min / Reorder Point (ROP)** — แสดงค่า min_stock / reorder_point ต่อ SKU (สามารถ override ที่ Warehouse-level)

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
- สำหรับ `product_type = bom` ("ชุด") — แสดงส่วนประกอบระดับ Variant SKU
- **1 product มีหลาย variant (SKU) และแต่ละ parent SKU มี BOM ของตัวเอง**
- เช่น "ชุดเปลี่ยนถ่าย SET-A" = OIL-4L × 1 + FLT-001 × 1; "ชุดเปลี่ยนถ่าย SET-B" = OIL-4L-SYN × 1 + FLT-001 × 1
- API: `POST /products/{id}/bom` (replace all สำหรับ parent_sku นั้น), `GET /products/{id}/bom?parent_sku=SET-A`, `DELETE /products/{id}/bom/{cid}`
- เช็คสต็อก BOM: `GET /products/{id}/bom/availability?parent_sku=SET-A` → แสดงว่าทำได้กี่ชุด

**Component Dropdown Search — หา SKU ส่วนประกอบ:**
- UI ค้นหา component variants ผ่าน: `GET /product-variants?search=OIL&exclude_product_id={id}&limit=20`
- `search` — ค้นด้วย SKU หรือชื่อ variant (LIKE) ข้ามทุก product
- `exclude_product_id` — ส่ง id ของ product BOM ที่กำลังแก้ไข (กัน self-reference)
- `limit` — จำนวนรายการสูงสุด (default 20, max 100)

**Fields (POST /products/{id}/bom) — Replace All:**
| Field | Type | Required | หมายเหตุ |
|-------|------|----------|----------|
| `parent_sku` | Text | ✅ | SKU ของ variant ที่เป็น parent (ต้องอยู่ใน product นี้) |
| `components` | Array | ✅ | รายการส่วนประกอบ (ส่งครั้งเดียว แทนที่ทั้งหมด) |
| `components[].sku` | Text | ✅ | SKU ของ variant ที่ใช้เป็น component |
| `components[].quantity` | Decimal | ✅ | จำนวนที่ใช้ต่อ 1 ชุด |
| `bom_stock_policy` | Select | ❌ | `auto` = ตัดสต็อก components อัตโนมัติ; `manual` = ไม่ตัดสต็อก (update บน parent variant) |

> **หมายเหตุ:** POST นี้ **replace all** — ส่งรายการใหม่ครั้งเดียว แทนที่ทั้งหมดของ parent_sku นั้น; `child_product_id` และ `unit_id` auto-derive จาก variant

**Request Body (POST /products/{id}/bom):**
```json
{
  "parent_sku": "SET-A",
  "components": [
    { "sku": "OIL-4L", "quantity": 1 },
    { "sku": "FLT-001", "quantity": 1 }
  ],
  "bom_stock_policy": "auto"
}
```

**Response (GET /products/{id}/bom?parent_sku=SET-A):**
```json
{
  "success": true,
  "message": "สำเร็จ",
  "data": [
    {
      "id": 1,
      "parent_product_id": 10,
      "parent_variant_id": 2,
      "child_variant_id": 5,
      "child_product_id": 3,
      "unit_id": 1,
      "quantity": "1.0000",
      "parent_variant": { "id": 2, "sku": "SET-A", "name": "ชุดเปลี่ยนถ่าย A", "bom_stock_policy": "auto" },
      "child_variant": { "id": 5, "sku": "OIL-4L", "name": "น้ำมันเครื่อง 4L", "unit": { "id": 1, "name": "ขวด" } },
      "child_product": { "id": 3, "name": "น้ำมันเครื่อง" }
    }
  ]
}
```

**Response (GET /products/{id}/bom/availability?parent_sku=SET-A):**
```json
{
  "success": true,
  "message": "สำเร็จ",
  "data": {
    "available_quantity": 5,
    "components": [
      {
        "parent_variant_id": 2,
        "parent_variant_sku": "SET-A",
        "child_variant_id": 5,
        "child_variant_sku": "OIL-4L",
        "required_quantity": "1.0000",
        "current_stock": 10,
        "possible_sets": 10
      }
    ]
  }
}
```

**Error Codes:**
| Code | HTTP | เมื่อไหร่ |
|------|------|----------|
| `product_not_bom_type` | 422 | product_type ≠ bom |
| `product_variant_not_found` | 404 | parent_sku หรือ component sku ไม่มีในระบบ |
| `bom_self_reference` | 422 | component sku เป็น variant ของ product นี้เอง |
| `duplicate_entry` | 422 | มี sku ซ้ำกันใน components array ที่ส่งมา |

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

**คอลัมน์ตาราง Variant (ใน Product Detail Page):**
| คอลัมน์ | ตัวอย่างข้อมูล | หมายเหตุ |
|---------|----------------|----------|
| รหัสสินค้า (SKU) | `BRK-001A` | |
| ชื่อสินค้า | `ผ้าเบรกหน้า Small` | |
| แบบสินค้า | `Size=S / สีขาว` | attribute values ที่เลือก |
| บาร์โค้ด | `8850001 / -` | primary / secondary |
| หน่วย | `ชิ้น` | |
| ล็อต/EXP | ✓ / ✗ | track_lot_expiry |
| ซีเรียล | ✓ / ✗ | track_serial |
| Min / Max | `10 / 20` | min_stock / reorder_point |
| มิติ | `30×20×15 ซม.` | dimensions text |
| น้ำหนัก | `1.5 กก.` | weight_kg |
| actions | `...` | เมนู: แก้ไข, ลบ |

**Variant Edit Modal — Layout:**
```
┌────────────────────────────────────────────────┐
│  แก้ไขข้อมูลสินค้า                             │
├────────────────────┬───────────────────────────┤
│  รหัสสินค้า (SKU)  │  ชื่อสินค้า               │
├───────┬────────┬───┴───────┬───────────────────┤
│ แบบ(1)│ แบบ(2) │  แบบ(3)   │  หน่วย            │
│ [drop]│ [drop] │  [drop]   │  [drop]           │
│ ─────  │ ─────  │           │                   │
│ S  🗑 │ ดำ  🗑 │           │                   │
│ M  🗑 │ ขาว 🗑 │           │                   │
│ L  🗑 │ แดง 🗑 │           │                   │
│+Add   │+Add    │           │                   │
├───────┴────────┴───────────┴───────────────────┤
│  บาร์โค้ด (รอง)                                │
├──────────────────────┬─────────────────────────┤
│  สต็อกขั้นต่ำ        │  จุดสั่งซื้อซ้ำ         │
├──────────────────────┼─────────────────────────┤
│  ติดตาม ล็อต/EXP 🔵  │  ติดตามซีเรียล ⚪       │
├──────────────────────┼─────────────────────────┤
│  มิติขนส่งมาตรฐาน   │  น้ำหนัก (กก.)          │
├──────────────────────┴─────────────────────────┤
│  [บันทึกสินค้า]         [ยกเลิก]               │
└────────────────────────────────────────────────┘
```

> **หมายเหตุ Modal Variant:** ในหน้า Edit Variant Modal — **แบบสินค้า (1)(2)(3)** แต่ละแกนแสดง dropdown เลือกค่า และมีรายการ inline ด้านล่างพร้อมปุ่มลบ 🗑 และ **+Add new** เพื่อเพิ่มตัวเลือกใหม่สำหรับแกนนั้นโดยตรง (ไม่ต้องออกไปที่ Settings)

**Fields (POST/PUT /products/{id}/variants):**
| Field | Type | Required | หมายเหตุ |
|-------|------|----------|---------|
| `sku` | Text | ✅ (POST) | unique across all variants |
| `name` | Text | ✅ (POST) | |
| `cost_price` | Decimal | ❌ | |
| `selling_price` | Decimal | ❌ | |
| `description` | Text | ❌ | คุณลักษณะสินค้า (rich text / plain text, max 2000 chars) |
| `barcode` | Text | ❌ | บาร์โค้ดหลัก (EAN-13, UPC หรืออื่นๆ) — **ถ้าไม่ส่ง server จะ auto-gen 13 หลักให้** — ต้อง unique ทุก variant |
| `barcode_secondary` | Text | ❌ | บาร์โค้ดรอง (OEM code, รหัสสำรอง) — **ถ้าไม่ส่ง server จะ auto-gen 13 หลักให้** — ต้อง unique ทุก variant |
| `attributes` | Object | ❌ | `{"1": "S", "2": "ขาว"}` — axis → value; ส่ง `{}` เมื่อไม่มี attribute (ไม่ใช่ `null`) |
| `is_active` | Boolean | ❌ | default true |
| `unit_id` | Integer | ❌ | dropdown — `GET /product-units` |
| `unit_quantity` | Decimal | ❌ | จำนวนต่อหน่วย เช่น 1, 6, 12 |
| `min_stock` | Integer | ❌ | จำนวนสต็อกขั้นต่ำ (low stock alert) |
| `reorder_point` | Integer | ❌ | จุดสั่งซื้อซ้ำ (ROP) |
| `track_lot_expiry` | Boolean | ❌ | ติดตาม lot/วันหมดอายุ |
| `track_serial` | Boolean | ❌ | ติดตาม serial/IMEI (เฉพาะราย) |
| `bom_stock_policy` | Select | ❌ | `auto` (default) = ตัดสต็อก components อัตโนมัติเมื่อขาย; `manual` = เพิ่มในบิลเท่านั้น ไม่ตัดสต็อก |
| `dimensions` | Text | ❌ | มิติขนส่งมาตรฐาน รูปแบบ text เช่น `"30×20×15"` (max 50 chars) |
| `dimension_width` | Decimal | ❌ | ความกว้าง (ซม.) — แยกเก็บเพื่อ sort/filter |
| `dimension_height` | Decimal | ❌ | ความสูง (ซม.) |
| `dimension_length` | Decimal | ❌ | ความยาว (ซม.) |
| `weight_kg` | Decimal | ❌ | น้ำหนัก (กิโลกรัม) |

> **หมายเหตุ `dimensions` vs `dimension_width/height/length`:**
> UI ส่ง `dimensions` (text) สำหรับแสดงผลในตาราง เช่น `"30×20×15"` และส่ง `dimension_width/height/length` (decimal แยก) พร้อมกันสำหรับ filter/sort ในอนาคต — backend รับ/บันทึกทั้งสองแบบ

> **Barcode Uniqueness:** `barcode` และ `barcode_secondary` ต้อง unique ทุก variant (รวม soft-deleted) — ถ้าซ้ำจะได้ `422 product_variant_barcode_duplicate`

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
  "bom_stock_policy": "auto",
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
      "bom_stock_policy": "auto",
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

**Tab Attribute Options (จัดการผ่าน Variant Modal โดยตรง):**

- ตัวเลือกแบบสินค้า (แบบสินค้า 1/2/3) จัดการได้ 2 ทาง:
  1. **Inline ใน Variant Edit Modal** — แต่ละแกนมีปุ่ม **+Add new** (เพิ่มค่า) และปุ่มลบ 🗑 ต่อแต่ละค่า
  2. **Settings Page** — `GET /product-attributes` จัดการแกนระดับ global
- API `/products/{id}/attribute-options` — CRUD ตัวเลือกของสินค้านี้เฉพาะ
- `POST` เพิ่มตัวเลือกใหม่ให้ axis, `DELETE` ลบตัวเลือก
- การเปลี่ยนแปลงที่นี่ส่งผลเฉพาะสินค้านี้เท่านั้น (product-scoped)


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
