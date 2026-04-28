# 🗂️ Master Data Flow — ฉบับสมบูรณ์

**ระบบข้อมูลหลัก · Brand · Category · Unit · Product · BOM · Warehouse Location**
สุดยอดมอเตอร์ | Version 1.0 | เมษายน 2026

---

## ลำดับการสร้าง Master Data (ต้องทำตามลำดับ)

Master data บางตัวต้องมีก่อนจึงจะสร้างตัวอื่นได้

| ลำดับ | ตาราง | หมายเหตุ |
|------|-------|---------|
| **①** | **product_units** (หน่วยสินค้า) | ชิ้น, กล่อง, ลัง, พาเลท — ต้องมีก่อนสร้าง Product |
| **②** | **brands** (แบรนด์) | Honda, Yamaha, Castrol — ต้องมีก่อนสร้าง Product |
| **③** | **product_categories** (กลุ่มสินค้า) | อะไหล่ → เครื่องยนต์ → ลูกสูบ (hierarchy หลายชั้น) |
| **④** | **vendors** (ผู้จัดจำหน่าย) | บริษัท ฮอนด้า TH, ร้านอะไหล่ A — optional ก่อนสร้าง Product |
| **⑤** | **products** (สินค้า/SKU) | สร้าง SKU แต่ละตัว ระบุ product_type (standard / bom / service) |
| **⑥** | **product_unit_conversions** (แปลงหน่วย) | ผูกสูตรแปลง: 1 ลัง = 24 กล่อง = 2,400 ตัว (เฉพาะสินค้าที่มีหลายหน่วย) |
| **⑦** | **product_bom** (ผูกชุด/เซ็ต) | ผูก component เข้า parent BOM (เฉพาะ product_type=bom) |
| **⑧** | **warehouses + locations** (คลัง + ตำแหน่ง) | สร้างคลัง → สร้าง Shelf → สร้าง Location — ก่อนรับสินค้าเข้าคลัง |

---

## หน่วยสินค้า (Product Units) — Unit Conversion

ระบบรองรับ multi-level unit conversion: สินค้าชิ้นเดียวมีหลายหน่วย รับเข้าหน่วยใหญ่ เบิกใช้หน่วยเล็ก
**สต็อกเก็บเป็น base_unit เสมอ** — ระบบแปลงให้อัตโนมัติเวลารับ/เบิก

**ตัวอย่าง Unit Conversion:**

| สินค้า | base_unit (เก็บสต็อก) | purchase_unit (รับเข้า) | สูตรแปลง |
|-------|---------------------|----------------------|---------|
| นอต M6 | ตัว (pcs) | ลัง | 1 ลัง = 24 กล่อง = 2,400 ตัว |
| น้ำมันเครื่อง | กล่อง 1L | พาเลท | 1 พาเลท = 10 ลัง = 120 กล่อง |
| ผ้าเบรก | ชิ้น (pcs) | กล่อง | 1 กล่อง = 4 ชิ้น |
| Honda Wave 125 | คัน | — | 1 หน่วย (ไม่มีแปลง) |

| หัวข้อ | รายละเอียด |
|--------|-----------|
| base_unit_id | หน่วยที่ระบบใช้เก็บ inventory.quantity เสมอ — ทุก transaction คิดเป็นหน่วยนี้ |
| รับสินค้า (GR) | ระบุ "รับ 2 ลัง" → ระบบแปลง: 2 ลัง × 2,400 = **4,800 ตัว** → สต็อก +4,800 |
| เบิกใช้ | ระบุ "เบิก 4 ตัว" → ระบบตัดสต็อก 4 ตัวโดยตรง |
| ตรวจสต็อก | แสดงผลในหลาย unit พร้อมกัน เช่น "2,400 ตัว (1 ลัง)" |

---

## ประเภทสินค้า (product_type) — standard / bom / service

| product_type | ความหมาย | มีสต็อก? | รับเข้าคลัง? | ตัดสต็อก |
|-------------|---------|---------|------------|---------|
| **standard** | สินค้าทั่วไป อะไหล่ รถมอเตอร์ไซค์ | ✅ | ✅ | ตัดตัวเอง |
| **bom** | สินค้าเซ็ต/ชุด เช่น ชุดซ่อมเบรก | — (virtual) | — | ตัด component อัตโนมัติ (atomic) |
| **service** | ค่าแรง บริการ | — | — | ไม่มีสต็อก |

---

## ราคาสินค้า (Product Pricing) — 3 ระดับ (★ NEW)

| Field | คำอธิบาย | ตัวอย่าง |
|-------|---------|----------|
| `cost_price` | ราคาทุน | 2,500 บาท |
| `selling_price` | ราคาขายปกติ | 3,500 บาท |
| `min_price` | ราคาต่ำสุดที่อนุญาต (ส่วนลดไม่ลดต่ำกว่านี้) | 3,000 บาท |

> ★ เก็บใน `product_pricing` table แยกจาก products table — FK product_id

---

## จุดแจ้งเตือนสต็อกต่ำ (min_quantity) — ★ NEW

| ระดับ | Table | Field | คำอธิบาย |
|------|-------|-------|----------|
| Global default | `products` | `min_quantity` (INT DEFAULT 0) | จุดแจ้งเตือนรวมทุกคลัง |
| Per warehouse | `inventory` | `min_quantity` (INT NULL) | override ต่อคลัง (ถ้า NULL → ใช้ products.min_quantity) |

> **Logic**: threshold = `inventory.min_quantity` ?? `products.min_quantity` ?? 0 → ถ้า qty < threshold → แจ้งเตือน

**Logic สินค้า BOM:**

| หัวข้อ | รายละเอียด |
|--------|-----------|
| สต็อก BOM | ไม่เก็บสต็อกตัวเอง — คำนวณ available qty จาก component: `available = MIN(component_stock ÷ bom_quantity)` ทุก component |
| ถ้า component ไม่ครบ | BOM แสดง qty=0 — ไม่สามารถเบิกหรือขายได้ |
| component ขายแยก | component (standard) ขายแยกได้ปกติ — ถ้าขายแยกจนสต็อกน้อย กระทบ BOM ที่ใช้ component นั้น |
| เบิก BOM 1 ชุด | ระบบตัด component ทุกชิ้นพร้อมกัน (atomic) สร้าง inventory_transaction type=service_use ต่อ component |

---

## การผูกชุดสินค้า (Product BOM) — ตัวอย่าง ชุดซ่อมเบรก

**ชุดซ่อมเบรกหน้า Honda Wave (SKU: BSET-001) — product_type=bom:**

| component SKU | ชื่อ | จำนวนต่อ 1 ชุด | หน่วย | ขายแยก? |
|-------------|-----|--------------|------|--------|
| BRK-PAD-001 | ผ้าเบรกหน้า Honda Wave | 2 | ชิ้น | ขายแยก 120 บาท/ชิ้น |
| BRK-SPRING-001 | สปริงเบรก | 1 | ชิ้น | ขายแยก 45 บาท/ชิ้น |
| BOLT-M6-8 | นอต M6×8 | 4 | ตัว | ขายแยก 5 บาท/ตัว |

**Logic สต็อก ณ เวลาตรวจสอบ:**

| component | สต็อกปัจจุบัน | คำนวณได้กี่ชุด |
|---------|------------|-------------|
| ผ้าเบรก | 15 ชิ้น | 15÷2 = 7.5 → 7 ชุด |
| สปริงเบรก | 20 ชิ้น | 20÷1 = 20 ชุด |
| นอต M6×8 | 24 ตัว | 24÷4 = 6 ชุด |
| **BOM available** | | **MIN(7, 20, 6) = 6 ชุด** |

**ขายแยกผ้าเบรกออกไป 10 ชิ้น → ผ้าเบรก: 15→5 → 5÷2=2 → BOM available = MIN(2,20,6) = 2 ชุด**

---

## คลังสินค้า & ตำแหน่ง (Warehouse Location)

**โครงสร้าง Hierarchy:**

| หัวข้อ | รายละเอียด |
|--------|-----------|
| Warehouse (โกดัง) | สาขา 1 มีได้หลายโกดัง เช่น "คลังหลัก", "คลังอะไหล่" — ผูกกับ branch_id |
| Shelf (ตู้/ชั้นวาง) | ตัวอักษร A, B, C, D — สร้างตามจำนวนที่มีจริง |
| Row/Level (ชั้น) | ตัวเลข 1, 2, 3, 4 |
| Position (ช่อง) | ตัวเลข 01, 02, 03 |
| Location Code | Shelf + Row + Position เช่น **A101** = Shelf A, ชั้น 1, ช่อง 01 — ระบบ generate ให้อัตโนมัติ |

**ตัวอย่าง: คลังสาขา B (4 Shelf × 4 ชั้น):**

| Shelf | ชั้น | ช่อง | Location Code | ตัวอย่างสินค้า |
|------|-----|-----|-------------|------------|
| A | 1 | 01 | A101 | ผ้าเบรกหน้า Honda Wave |
| A | 1 | 02 | A102 | ผ้าเบรกหลัง Honda Wave |
| A | 2 | 01 | A201 | สปริงเบรก |
| A | 2 | 02 | A202 | นอต M6 (ลัง) |
| B | 1 | 01 | B101 | Honda Wave 125 สีแดง |
| B | 1 | 02 | B102 | Honda Wave 125 สีน้ำเงิน |
| B | 2 | 01 | B201 | Honda Click 125 |
| C | 1 | 01 | C101 | น้ำมันเครื่อง Castrol 10W-30 |

| หัวข้อ | รายละเอียด |
|--------|-----------|
| สร้าง Location | Admin bulk generate เช่น "สร้าง Shelf A, 4 ชั้น, 4 ช่อง" → ระบบสร้าง A101–A404 (16 locations) |
| ผูกสินค้ากับ Location | ระบุ location_id ตอนรับสินค้าเข้าคลัง (Goods Receipt) — สินค้าชนิดเดียวอยู่ได้หลาย location |
| ไม่ track พื้นที่ | ระบบไม่เก็บ dimension/ความจุ — ใช้บอกตำแหน่งเท่านั้น ไม่บอกว่าเต็ม/ว่าง |

---

## กลุ่มสินค้า (product_categories) — Hierarchy หลายชั้น

**ตัวอย่าง Category Tree:**

| id | ชื่อ | parent_id | code |
|----|-----|----------|------|
| 1 | อะไหล่รถมอเตอร์ไซค์ | NULL (root) | PART |
| 2 | ├─ เครื่องยนต์ | 1 | ENG |
| 3 | │   ├─ ลูกสูบ | 2 | ENG-PISTON |
| 4 | │   └─ แหวนลูกสูบ | 2 | ENG-RING |
| 5 | ├─ ระบบเบรก | 1 | BRAKE |
| 6 | │   ├─ ผ้าเบรก | 5 | BRAKE-PAD |
| 7 | │   └─ นอตเบรก | 5 | BRAKE-BOLT |
| 8 | น้ำมันหล่อลื่น | NULL (root) | OIL |
| 9 | ├─ น้ำมันเครื่อง | 8 | OIL-ENG |
| 10 | รถมอเตอร์ไซค์ | NULL (root) | MOTO |

> ★ category รองรับ hierarchy ลึกได้ไม่จำกัด — parent_id=NULL คือ root

---

## กฎสำคัญ

| กฎ | รายละเอียด |
|----|-----------|
| ลำดับสร้าง | units → brands → categories → vendors → products → conversions → bom → warehouses |
| BOM ไม่มีสต็อก | BOM qty คำนวณ real-time จาก MIN(component÷bom_qty) — ไม่เก็บใน inventory |
| base_unit เสมอ | สต็อกเก็บเป็น base_unit — ระบบแปลงทุก transaction อัตโนมัติ |
| Soft Delete | ทุก master data ใช้ deleted_at — ไม่ hard delete |
| location code auto | ระบบ generate A101, A102 ให้อัตโนมัติตามค่า Shelf/Row/Position ที่กำหนด |
| Inspection Template | vehicle_inspection_checklists ไม่ผูก branch_id — เป็น global template |

---

## แม่แบบรายการตรวจสอบรถ (Vehicle Inspection Checklists)

Template สำหรับกำหนดชุดรายการตรวจสอบตามรถแต่ละรุ่น/ปี ใช้เปิดในหน้าสร้างใบงานซ่อม

**โครงสร้าง:**

| Table | คำอธิบาย |
|-------|---------|
| `vehicle_inspection_checklists` | parent — ระบุ vehicle_type, brand, model, year (NULL = ทุกปี), is_active |
| `vehicle_inspection_checklist_items` | รายการตรวจสอบ — name, sort_order, FK → checklist (CASCADE) |

**กฎ:**
- Global (ไม่มี branch_id) — ใช้ร่วมกันทุกสาขา
- Hard Delete — ไม่ใช้ soft delete (master data ที่ไม่มี reference จากใบงาน)
- PUT items = Full Replace — ส่ง array ทั้งหมด ลบเก่า insert ใหม่ใน transaction
- year=NULL หมายถึง template ใช้ได้กับทุกปี

**ตัวอย่าง:**

| vehicle_type | brand | model | year | items |
|-------------|-------|-------|------|-------|
| มอเตอร์ไซค์ | Honda | PCX | 2023 | เบรกยาง, หม้อน้ำ, น้ำมันเครื่อง, ยางรถ |
| มอเตอร์ไซค์ | Honda | Wave 125 | NULL (ทุกปี) | เบรกหน้า, เบรกหลัง, น้ำมันเครื่อง, โซ่ |
| สกูตเตอร์ | Yamaha | NMAX | 2024 | ผ้าเบรก, ยาง, ไฟหน้า, น้ำมันเครื่อง |

---

*สุดยอดมอเตอร์ — Master Data Flow | Version 1.0 | เมษายน 2026*
