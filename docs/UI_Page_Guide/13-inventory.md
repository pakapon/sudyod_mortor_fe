# คลังสินค้า & สต็อก (Inventory)

> ดู common conventions → [00-common.md](./00-common.md)

---

## 13.1 รายการคลังสินค้า (Warehouses)

**Route:** `/warehouses`
**Permission:** `warehouses.can_view` / `warehouses.can_create` / `warehouses.can_edit` / `warehouses.can_delete`

- Table: ชื่อคลัง, สาขา, รายละเอียด, ที่อยู่, default, สถานะ
- Filter: `search` (ชื่อคลัง), `branch_id`, `is_active`

**Fields (Create / Edit):**
| Field | Required | หมายเหตุ |
|-------|----------|---------|
| `name` | ✅ | max 200 |
| `branch_id` | ✅ | สาขาที่คลังตั้งอยู่ |
| `description` | ❌ | |
| `address` | ❌ | |
| `manager_id` | ❌ | employee id ผู้ดูแล |
| `is_default` | ❌ | คลังหลักของสาขา |
| `is_active` | ❌ | default true |

**APIs:**
| Method | Endpoint | หมายเหตุ |
|--------|----------|---------|
| GET | `/warehouses` | query: `search`, `branch_id`, `is_active`, `page`, `limit` |
| POST | `/warehouses` | |
| GET | `/warehouses/{id}` | |
| PUT | `/warehouses/{id}` | |
| DELETE | `/warehouses/{id}` | ⚠️ ลบไม่ได้ถ้ามี inventory อ้างอิง |

---

## 13.2 รายละเอียดคลัง (Warehouse Detail)

**Route:** `/warehouses/{id}`
**Permission:** `warehouses.can_view` (ดู), `inventory.can_view` (Tab สต็อก/ประวัติ), `inventory.can_edit` (ปรับ/นับ)

### 13.2.0 Header (ส่วนบนของหน้า)

แสดงข้อมูลคลังจาก `GET /warehouses/{id}` — response include `branch`, `manager`, `locations`

| ฟิลด์ที่แสดง | ที่มา | หมายเหตุ |
|-------------|-------|---------|
| ชื่อคลัง | `name` | หัวเรื่องใหญ่ |
| Badge "คลังหลัก" | `is_default` | แสดงถ้า true |
| Badge สถานะ | `is_active` | active/inactive |
| สาขา | `branch.name` | |
| ที่อยู่ | `address` | |
| ผู้ดูแล | `manager.first_name + last_name` | nullable |
| รายละเอียด | `description` | nullable |
| ปุ่ม "แก้ไข" | — | ถ้า `warehouses.can_edit` |
| ปุ่ม "ลบ" | — | ถ้า `warehouses.can_delete` (โชว์ ConfirmModal) |

### โครงสร้าง Tabs

| Tab | Section | Permission |
|-----|---------|-----------|
| ตำแหน่งจัดเก็บ | 13.2.1 | `warehouses.can_view` |
| สต็อกในคลัง | 13.2.2 | `inventory.can_view` |
| ปรับสต็อก | 13.2.3 (modal/form) | `inventory.can_edit` |
| นับสต็อก | 13.2.4 (modal/form) | `inventory.can_edit` |

---

### 13.2.1 Tab ตำแหน่งจัดเก็บ (Locations)

**UI:**
- Table: `location_code`, `zone`, `shelf`, `level`, `description`, สถานะใช้งาน
- ปุ่ม "เพิ่มตำแหน่ง" → เปิด Modal ฟอร์ม
- 1 row = 1 ช่องเก็บของในคลัง (ใช้อ้างอิงตอนรับเข้า/โอน)

**Fields (Add Location):**
| Field | Required | หมายเหตุ |
|-------|----------|---------|
| `zone` | ❌ | โซน เช่น A, B (1–20 chars) |
| `shelf` | ❌ | ชั้นวาง (1–20 chars) |
| `level` | ❌ | ชั้น/ช่อง (1–20 chars) |
| `location_code` | ❌ | รหัสตำแหน่ง (ถ้าไม่ส่ง ระบบ generate `{zone}-{shelf}-{level}`) |
| `description` | ❌ | |
| `is_available` | ❌ | default true |

**APIs:**
| Method | Endpoint | หมายเหตุ |
|--------|----------|---------|
| GET | `/warehouses/{id}/locations` | list all locations |
| POST | `/warehouses/{id}/locations` | สร้าง location ใหม่ |

---

### 13.2.2 Tab สต็อกในคลัง (Inventory)

**UI:**
- Filter: `product_variant_id` (search dropdown), `low_stock_only` (checkbox)
- Table: SKU (`variant.sku`), ชื่อสินค้า (`variant.name`), จำนวนคงเหลือ, หน่วย (`variant.unit.name`), ตำแหน่งจัดเก็บ, badge "ต่ำกว่า reorder" (ถ้า `low_stock_only`)
- ทุก column ใช้ข้อมูลจาก `variant.*` เป็น primary — **ไม่ fallback ไป `product.*`**
- ⚠️ **Backend filter:** API คืนเฉพาะ records ที่ `product_variant_id IS NOT NULL` — records เก่า (legacy product-level) จะไม่ปรากฏ

**APIs:**
| Method | Endpoint | หมายเหตุ |
|--------|----------|----------|
| GET | `/warehouses/{id}/inventory` | query: `product_variant_id`, `low_stock_only`, `page`, `limit` |

---

### 13.2.3 ปรับสต็อก (Adjust)

**UI:** Form ด้านข้าง — dropdown เลือกสินค้า, ใส่จำนวนใหม่ (ตัวเลขเต็ม = ค่าจริงใหม่), กรอกเหตุผล

> 💡 **UX (Variant-centric):** dropdown แสดง **variants ทุกตัวในระบบ** (ไม่จำกัดเฉพาะที่มีสต็อกในคลังนี้) — option text: `{sku} — {name} ({color} {year}) — คงเหลือ {qty} ชิ้น` โดย `qty = 0` ถ้า variant ยังไม่เคยมีสต็อกในคลังนี้  
> Blue card แสดงจำนวนปัจจุบัน (0 ถ้ายังไม่มี) เมื่อเลือก variant แล้ว

**Fields:**
| Field | Required | หมายเหตุ |
|-------|----------|---------|
| `product_variant_id` | ✅ | int positive |
| `quantity` | ✅ | int ≥ 0 — ค่าจำนวนจริงใหม่ (ไม่ใช่บวก/ลบ) |
| `reason` | ✅ | string 1–500 chars |

**Behavior:**
- ตรวจ `branch_id` ของคลังต้องอยู่ใน `branch_ids_accessible` ของผู้ใช้ (มิฉะนั้น 403 `branch_access_denied`)
- บันทึก `inventory_transactions` type `adjust` พร้อม `created_by = employee_id`
- `quantity` คือชัดเจนใหม่เลย — ระบบคำนวณ diff เอง

**APIs:**
| Method | Endpoint | หมายเหตุ |
|--------|----------|---------|
| PATCH | `/warehouses/{id}/inventory/adjust` | คืน inventory row ที่อัปเดตแล้ว (include `warehouse`, `product`, `variant`, `location`) |

---

### 13.2.4 นับสต็อก (Cycle Count)

**UI:** ฟอร์มหลายแถว — แต่ละแถว = 1 สินค้า (variant) + จำนวนที่นับได้จริง → กดบันทึก ระบบจะคำนวณ diff + ปรับสต็อกอัตโนมัติ

**Body:**
```json
{
  "items": [
    { "product_variant_id": 10, "actual_quantity": 5 },
    { "product_variant_id": 12, "actual_quantity": 0 }
  ]
}
```

**Item fields:**
| Field | Required | หมายเหตุ |
|-------|----------|---------|
| `product_variant_id` | ✅ | |
| `actual_quantity` | ✅ | จำนวนที่นับได้จริง (≥ 0) |

**Behavior:**
- ตรวจ branch access เหมือน adjust
- เทียบกับ `inventory.quantity` ปัจจุบัน → คำนวณ diff
- บันทึก `inventory_transactions` type `cycle_count` ต่อรายการ
- Atomic — ถ้ามี item ใดผิด rollback ทั้งชุด

**APIs:**
| Method | Endpoint | หมายเหตุ |
|--------|----------|---------|
| POST | `/warehouses/{id}/inventory/cycle-count` | คืน array ผลลัพธ์ต่อ item (`product_variant_id`, `before`, `actual_quantity`, `diff`) |

---

## 13.3 ภาพรวมสต็อก (Inventory Overview)

**Route:** `/inventory`
**Permission:** `inventory.can_view` / `inventory.can_export`

- Table: สินค้า, คลัง, สาขา, จำนวน (`quantity`), จอง (`reserved_quantity`), พร้อมขาย (computed: `quantity - reserved_quantity`), ที่ตั้ง, สถานะต่ำกว่าขั้นต่ำ
- Filter: `warehouse_id`, `product_id`, `low_stock_only` (boolean)

**InventoryItem response fields (เส้น API จริง):**
| Field | คำอธิบาย | หมายเหตุ |
|-------|------------|----------|
| `product_variant_id` | id ของ variant | **required** (`number`) — ไม่มี `undefined` |
| `quantity` | จำนวนคงเหลือ | |
| `reserved_quantity` | จอง | nullable |
| `min_quantity` | สต็อกขั้นต่ำ (reorder point) | nullable |
| `variant` | nested object (sku, name, color, year, unit) | primary source สำหรับแสดงผล |
| `warehouse`, `branch`, `location` | nested objects | nullable |
| `product` | nested object | **deprecated** — ไม่ใช้เป็น primary source อีกต่อไป |

> ⚠️ API **ไม่ส่ง** `available` หรือ `cost` — คำนวณ available ที่ UI: `quantity - (reserved_quantity ?? 0)`  
> ✅ ทุก column SKU/ชื่อ/หน่วย ใช้ `variant.sku`, `variant.name`, `variant.unit.name` — **ไม่ fallback ไป `product.*`**  
> ⚠️ **Backend filter (ทั้ง 4 endpoints):** `/inventory`, `/inventory/low-stock`, `/inventory/transactions`, `/warehouses/{id}/inventory` คืนเฉพาะ records ที่ `product_variant_id IS NOT NULL` — records เก่า (legacy product-level) ถูก filter ออกอัตโนมัติ

**APIs:**
| Method | Endpoint | หมายเหตุ |
|--------|----------|---------|
| GET | `/inventory` | query: `warehouse_id`, `product_id`, `low_stock_only`, `page`, `limit` |
| GET | `/inventory/low-stock` | สินค้าต่ำกว่า reorder_point |
| GET | `/inventory/transactions` | ประวัติเข้า/ออก — query: `warehouse_id`, `product_id`, `transaction_type`, `date_from`, `date_to` |
| GET | `/inventory/export` | export รายการสต็อกทั้งหมด (`limit=0`) |

**`transaction_type` enum:** `goods_receipt` | `service_use` | `transfer_in` | `transfer_out` | `adjust` | `cycle_count` | `sale` | `return`

---

## 13.4 ใบรับสินค้า (Goods Receipts)

**Route:** `/goods-receipts`
**Permission:** `goods_receipts.can_view` / `goods_receipts.can_create` / `goods_receipts.can_edit` / `goods_receipts.can_approve` / `goods_receipts.can_delete`

- Table: `gr_no`, สาขา, คลัง, vendor, วันที่รับ, reference_no, จำนวนรายการ, สถานะ
- Filter: `vendor_id`, `warehouse_id`, `status`, `branch_id`, `date_from`, `date_to`

### Fields (Create)

| Field | Required | หมายเหตุ |
|-------|----------|---------|
| `vendor_id` | ✅ | |
| `warehouse_id` | ✅ | |
| `received_date` | ❌ | default = วันนี้ |
| `reference_no` | ❌ | เลขใบส่งของจาก vendor |
| `notes` | ❌ | |
| `items` | ✅ | array — ต้องไม่ว่าง |

**Item fields:** `product_variant_id`, `quantity_ordered`, `quantity_received`, `unit_cost`, `location_id` (optional), `note` (optional)

> 💡 **UX (Dedup):** dropdown เลือกสินค้าในแต่ละแถวจะ **filter variant ที่ถูกเลือกไปแล้วในแถวอื่นออก** — ป้องกัน duplicate ใน items list (เปรียบด้วย `product_variant_id`)

### APIs

| Method | Endpoint | หมายเหตุ |
|--------|----------|---------|
| GET | `/goods-receipts` | list + filter |
| POST | `/goods-receipts` | สร้าง draft, `gr_no` auto-generate `GR-YYYY-XXXX` |
| GET | `/goods-receipts/{id}` | include `branch`, `vendor`, `warehouse`, `creator`, `approver`, `items[].product`, `items[].variant`, `documents[]` |
| POST | `/goods-receipts/{id}/approve` | สต็อกเข้าคลังทันที (atomic) — บันทึก transaction `goods_receipt` |
| POST | `/goods-receipts/{id}/cancel` | ได้ทุกสถานะ; ถ้า `approved` แล้ว → reverse stock อัตโนมัติ |

### Tab เอกสารแนบ (Documents)

- Multipart upload หลายไฟล์ (เรียกซ้ำได้)
- รองรับ: `application/pdf`, `image/jpeg`, `image/png`, `application/msword`, `docx`, `xls`, `xlsx`

**Body fields ต่อไฟล์:**
| Field | Required | หมายเหตุ |
|-------|----------|---------|
| `file` | ✅ | binary (multipart) |
| `file_type` | ❌ | `invoice` \| `delivery_note` \| `receipt` \| `other` (default `other`) |
| `file_name` | ❌ | ถ้าไม่ส่ง ใช้ชื่อไฟล์เดิม |
| `note` | ❌ | |

**APIs:**
| Method | Endpoint | หมายเหตุ |
|--------|----------|---------|
| GET | `/goods-receipts/{id}/documents` | |
| POST | `/goods-receipts/{id}/documents` | multipart |
| DELETE | `/goods-receipts/{id}/documents/{docId}` | |

**Status:** `draft → approved` (หรือ `cancelled`)

---

## 13.5 โอนย้ายสต็อก (Stock Transfers)

**Route:** `/stock-transfers`
**Permission:** `stock_transfers.can_view` / `stock_transfers.can_create` / `stock_transfers.can_edit` / `stock_transfers.can_approve` / `stock_transfers.can_delete`

- Table: `transfer_no`, สาขา, คลังต้นทาง → คลังปลายทาง, จำนวนรายการ, สถานะ, ผู้สร้าง
- Filter: `from_warehouse_id`, `to_warehouse_id`, `status`, `branch_id`

### Fields (Create / Edit Draft)

| Field | Required | หมายเหตุ |
|-------|----------|---------|
| `from_warehouse_id` | ✅ | |
| `to_warehouse_id` | ✅ | ต้อง ≠ `from_warehouse_id` (error: `transfer_same_warehouse`) |
| `reason` | ❌ | เหตุผลการโอน |
| `items` | ✅ | array — ต้องไม่ว่าง |

**Item fields:** `product_variant_id`, `quantity`, `notes` (optional)

> 💡 **UX:** dropdown เลือกสินค้าแสดงยอดคงเหลือของคลังต้นทางใน option text (e.g. `SKU-WAVE110I — Honda Wave 110i (2025) (14 ชิ้น)`) — โหลดผ่าน `GET /inventory?warehouse_id=X&limit=500` เมื่อเลือกคลังต้นทาง (`product_variant_id` ใน response)

### APIs

| Method | Endpoint | หมายเหตุ |
|--------|----------|---------|
| GET | `/stock-transfers` | list + filter |
| POST | `/stock-transfers` | `transfer_no` auto-generate `ST-YYYY-XXXX` |
| GET | `/stock-transfers/{id}` | include `branch`, `fromWarehouse`, `toWarehouse`, `creator`, `approver`, `items[].product`, `items[].variant` |
| PATCH | `/stock-transfers/{id}` | แก้ได้เฉพาะ `draft` — ส่ง `items` ใหม่จะ replace ทั้งชุด |
| DELETE | `/stock-transfers/{id}` | hard delete — ได้เฉพาะ `draft` |
| POST | `/stock-transfers/{id}/approve` | ตรวจสต็อกต้นทางพอ (`stock_insufficient`) แล้วเปลี่ยน → `approved` **(ยังไม่ตัดสต็อก)** + ส่ง notification ให้คลังปลายทาง |
| POST | `/stock-transfers/{id}/complete` | ตัดต้นทาง + เพิ่มปลายทาง atomic → log `transfer_out` + `transfer_in` |
| POST | `/stock-transfers/{id}/cancel` | ได้เฉพาะ `draft` หรือ `approved` (ยังไม่ complete) — ไม่มี reverse stock |

**Notification:** เมื่อ approve → ส่งให้พนักงานคลังปลายทาง (สาขาของ `to_warehouse`) ที่มีสิทธิ์ `stock_transfers.can_view`
- Type: `stock_transfer_approved`
- Data: `{ stock_transfer_id, transfer_no }`

**Status:** `draft → approved → completed` (หรือ `cancelled` ก่อน complete)

---

## ดูเพิ่มเติม
- [12-products.md](./12-products.md) — ข้อมูลสินค้า (ราคา, BOM)
- [14-purchase-orders.md](./14-purchase-orders.md) — สั่งซื้อจาก Vendor → รับเข้าคลัง
- [18-notifications.md](./18-notifications.md) — รายการ notification types
- [20-flows.md](./20-flows.md) — Flow รับสินค้าเข้าคลัง + Flow โอนสต็อก
