# 📦 Inventory Flow — ฉบับสมบูรณ์

**ระบบคลังสินค้า · Inventory & Warehouse Flow**
สุดยอดมอเตอร์ | รวม v1.0 + v2.0 | เมษายน 2026

---

## ภาพรวมระบบ

ระบบมี 7 operation หลักที่เคลื่อนย้ายสต็อก ทุก operation บันทึกลง inventory_transactions เสมอ

| ชื่อ | ทิศทาง | ความหมาย |
|------|--------|--------|
| 📥 รับสินค้า (Goods Receipt) | + | รับเข้าจาก vendor |
| 📤 เบิกใช้ (Service Use) | − | ช่างเบิกอะไหล่ตามงานซ่อม |
| 🛒 ตัดจากขาย (Sale) | − | ตัดสต็อกเมื่อ INV issued (B1/B2/C) |
| ↩️ คืนสินค้า (Return) | + | ลูกค้าคืนสินค้า (Returns/Refunds) |
| 🔄 โอนย้าย (Stock Transfer) | +/− | ย้ายระหว่างคลัง/สาขา |
| 🔧 ปรับสต็อก (Adjust) | +/− | แก้ยอดผิดพลาด |
| 📋 นับสต็อก (Cycle Count) | +/− | นับจริงแล้ว reconcile |

---

## 8 Transaction Types

| transaction_type | +/− | ความหมาย | reference_type |
|-----------------|----|---------|----------------|
| goods_receipt | + | รับสินค้าจากผู้จัดจำหน่าย | goods_receipts |
| service_use | − | เบิกอะไหล่ใช้ในใบงานซ่อม | service_orders |
| sale | − | ตัดจากขาย (INV issued type=sale/retail) | invoices |
| return | + | คืนสินค้าจากลูกค้า (Returns/Refunds) | returns |
| transfer_out | − | โอนออกจากคลังนี้ | stock_transfers |
| transfer_in | + | โอนเข้าคลังนี้ | stock_transfers |
| adjust | +/− | ปรับสต็อกโดย admin | — |
| cycle_count | +/− | ผลต่างจากการนับสต็อก | — |

> ทุก transaction บันทึก quantity_before และ quantity_after เสมอ — ดูประวัติย้อนหลังได้ทุก action

---

## Scenario A — รับสินค้าเข้าคลัง (Goods Receipt)

```
สร้างใบรับ (draft) → ระบุสินค้า + จำนวน + ราคา → ยืนยันรับ (received) → สต็อก + อัตโนมัติ
```

| หัวข้อ | รายละเอียด |
|--------|-----------|
| ผู้ดำเนินการ | พนักงานคลัง (ต้องมีสิทธิ์ can_create ใน goods_receipts) |
| เลขที่ใบรับ | GR-{ปี}-{เลขลำดับ} เช่น GR-2026-0021 |
| Status Flow | draft → approved (หรือ cancelled ทุก status) |
| สร้างใบรับ (draft) | เลือก vendor, warehouse, วันที่รับ → บันทึกเป็น draft ก่อน |
| ระบุรายการ | เพิ่ม product_variant + จำนวนที่รับจริง + ราคาต่อหน่วย + location — แก้ไขได้จนกว่าจะ approve |
| ยืนยันรับ (approve) | กด "ยืนยันรับสินค้า" → status=approved → ระบบสร้าง inventory_transaction type=goods_receipt ให้อัตโนมัติ (atomic) |
| ผลต่อสต็อก | inventory.quantity += quantity ที่รับ บันทึก quantity_before / quantity_after |
| ยกเลิก | ยกเลิกได้ทุก status — ถ้า approved แล้ว ระบบ reverse stock อัตโนมัติ |

**ตัวอย่าง Scenario A — รับ Honda Wave + Click จาก vendor:**

| ขั้น | ผู้ดำเนินการ | รายละเอียด |
|-----|------------|-----------|
| ① สร้างใบรับ GR-2026-0021 | คลัง (สมหมาย) | vendor: บริษัท ฮอนด้า TH │ warehouse: คลังสาขา 1 │ วันที่: 10/04/2026 |
| ② ระบุรายการ | คลัง | Honda Wave 125 สีแดง × 5 คัน @ 35,000 │ Honda Click 125 สีขาว × 3 คัน @ 42,000 |
| ③ ยืนยันรับ | คลัง | กด "ยืนยันรับ" → status=received |
| ④ สต็อกอัปเดต | ระบบ | Wave 125 สีแดง: 0 → 5 คัน │ Click 125 สีขาว: 2 → 5 คัน |

---

## Scenario B — เบิกอะไหล่ใช้งาน (Service Use)

```
SO status=in_progress → รายการ QT ช่างระบุอะไหล่ → ตรวจสต็อก → เบิกจากคลัง → สต็อก − อัตโนมัติ
```

| หัวข้อ | รายละเอียด |
|--------|-----------|
| จุดเริ่มต้น | service_order status=in_progress (เปลี่ยนจาก approved) |
| รายการอะไหล่ | ช่างระบุใน quotation_items ก่อนอนุมัติ |
| ตรวจสต็อกก่อนเบิก | ระบบตรวจ inventory.quantity ≥ จำนวนที่ต้องการ ถ้าไม่พอ → แจ้งเตือน + แนะนำ warehouse อื่น |
| บันทึกการเบิก | สร้าง inventory_transaction type=service_use reference_type=service_orders, reference_id=service_order_id |
| ผลต่อสต็อก | inventory.quantity −= จำนวนที่เบิก บันทึก quantity_before / quantity_after |
| Low-stock Alert | ถ้า quantity หลังเบิก < min_quantity → ระบบแจ้งเตือนผู้จัดการคลัง |

> **min_quantity logic ★**: ใช้ `inventory.min_quantity` (per warehouse override) ถ้ามีค่า; ถ้า NULL → fallback ใช้ `products.min_quantity` (global default)

**★ Stock Deduction Rules ตาม Product Type:**

| Product Type | วิธีตัด | หมายเหตุ |
|-------------|--------|---------|
| standard | ตัด inventory โดยตรง | ลดจำนวนใน inventory table |
| bom | ตัด component ทุกชิ้นตาม product_bom | atomic — rollback ถ้าขาดแม้แต่ชิ้นเดียว |
| service | ข้าม (skip) | ค่าแรง ไม่มีสต็อก |

> สต็อกไม่พอ → rollback ทั้งหมด + error ระบุว่าขาดอะไร เหลือเท่าไหร่

**ตัวอย่าง Scenario B — ช่างเบิกหม้อน้ำสำหรับ SO-2026-0042:**

| ขั้น | ผู้ดำเนินการ | รายละเอียด |
|-----|------------|-----------|
| ① งานซ่อม | ช่าง | SO-2026-0042 │ Toyota Camry เปลี่ยนหม้อน้ำ │ QT: หม้อน้ำ Toyota × 1 |
| ② ตรวจสต็อก | ระบบ | คลังสาขา 1: หม้อน้ำ Toyota Camry = 3 ชิ้น ✅ พอ |
| ③ เบิกอะไหล่ | ช่าง | เบิก 1 ชิ้น → สต็อก: 3 → 2 ชิ้น |
| ④ transaction log | ระบบ | type=service_use │ ref=SO-0042 │ qty_change=−1 │ before=3 │ after=2 |

---

## BOM (Bill of Materials) — การตัดสต็อกแบบ BOM

| หัวข้อ | รายละเอียด |
|--------|-----------|
| สูตรคำนวณ | available = MIN(component_stock ÷ bom_quantity) ทุก component |
| ตัวอย่าง | ชุดซ่อมเบรก: ผ้าเบรก 8 ชิ้น (bom=2), น้ำมันเบรก 12 ขวด (bom=1), สายเบรก 6 เส้น (bom=2) → available = MIN(8÷2, 12÷1, 6÷2) = MIN(4, 12, 3) = 3 ชุด |
| BOM ไม่มีสต็อกตัวเอง | คำนวณจาก component เท่านั้น |
| component ไม่ครบ | BOM qty=0 ทันที |
| Atomic | ตัด component ทุกชิ้นพร้อมกัน — ถ้าล้มเหลวคืน rollback ทั้งหมด |

---

## Scenario C — โอนย้ายสินค้า (Stock Transfer)

```
สร้างใบโอน (draft) → อนุมัติ (approved) → ยืนยันรับปลายทาง (completed) → สต็อกต้นทาง − / ปลายทาง + (atomic)
```

| หัวข้อ | รายละเอียด |
|--------|----------|
| เลขที่ | ST-{ปี}-{เลขลำดับ} เช่น ST-2026-0008 |
| Status Flow | draft → approved → completed (หรือ cancelled ก่อน complete) |
| สร้างใบโอน | เลือก from_warehouse → to_warehouse → เพิ่มรายการสินค้า + จำนวน |
| อนุมัติ | ผู้มีสิทธิ์ can_approve ใน stock_transfers — ตรวจสต็อกต้นทางพอหรือไม่ (**ยังไม่ตัดสต็อก**) |
| ยืนยันรับ (complete) | ต้องการสิทธิ์ can_approve — ตัดสต็อกต้นทาง + เพิ่มปลายทาง (atomic) |
| ผลต่อสต็อกเมื่อ completed | from_warehouse: quantity −= จำนวน (transfer_out) + to_warehouse: quantity += จำนวน (transfer_in) — ทั้งสอง transaction สร้างพร้อมกัน (atomic) |
| ข้ามสาขา | โอนข้ามสาขาได้ถ้ามีสิทธิ์ can_approve ระดับ branch หรือ admin |

**ตัวอย่าง Scenario C — โอน Honda Wave สาขา 1 → สาขา 2:**

| ขั้น | ผู้ดำเนินการ | รายละเอียด |
|-----|------------|-----------|
| ① สร้าง ST-2026-0008 | คลัง สาขา 1 | จาก: คลังสาขา 1 → ไป: คลังสาขา 2 │ Honda Wave 125 สีแดง × 2 คัน |
| ② อนุมัติ | ผู้จัดการ | status: draft → approved (ตรวจสต็อก — ยังไม่ตัด) |
| ③ ยืนยันรับ | คลังสาขา 2 | status: approved → completed |
| ④ สต็อกอัปเดต | ระบบ (atomic) | สาขา 1: Wave 125 → 5 → 3 คัน (transfer_out) │ สาขา 2: Wave 125 → 0 → 2 คัน (transfer_in) |

---

## Scenario D1 — ปรับสต็อก (Adjust)

```
พบยอดผิด → ระบุเหตุผล (บังคับ) → ปรับยอด type=adjust → สต็อกอัปเดต +/−
```

| หัวข้อ | รายละเอียด |
|--------|-----------|
| ผู้ดำเนินการ | ต้องมีสิทธิ์ can_edit ใน inventory (ปกติ admin คลัง หรือผู้จัดการ) |
| reason บังคับ | กรอกเหตุผลบังคับ เช่น "สินค้าเสียหาย", "ยอดผิดจากการรับสินค้า" |
| ผลต่อสต็อก | inventory.quantity เปลี่ยนทันที บันทึก transaction type=adjust พร้อม before/after และ reason |
| ไม่ต้องอนุมัติ | ปรับได้ทันที แต่ log เก็บทุก action ตรวจสอบย้อนหลังได้ |

---

## Scenario D2 — นับสต็อก (Cycle Count)

```
เปิดรอบนับ → กรอกยอดจริงทุก product → ระบบ compare จริง vs บัญชี → ยืนยัน → type=cycle_count
```

| หัวข้อ | รายละเอียด |
|--------|-----------|
| วิธีการ | เลือก warehouse → ระบบแสดงรายการสินค้าทั้งหมดพร้อมยอดบัญชี → พนักงานนับยอดจริงแล้วกรอก |
| ผลต่าง | ระบบคำนวณ: ยอดจริง − ยอดบัญชี = ผลต่าง สีเขียว=ตรง, สีแดง=ต่าง |
| ยืนยันผลนับ | สร้าง inventory_transaction type=cycle_count สำหรับทุก item ที่ต่างกัน → สต็อกอัปเดตตามยอดจริง |
| ต้องอนุมัติ | ถ้าผลต่างเกินกำหนด (เช่น > 5%) ต้องให้ผู้จัดการ approve ก่อน |

---

## สรุปเปรียบเทียบทุก Scenario

✅ = ใช่ | — = ไม่มี

| Scenario | ผู้ดำเนินการ | การเคลื่อนไหว | สต็อก | Status Flow | อนุมัติ | เลขเอกสาร |
|---------|------------|--------------|-------|-----------|--------|---------|
| A — รับสินค้า | คลัง | vendor → warehouse | + | draft → approved | — | GR-xxx |
| B — เบิกช่าง | ช่าง/ระบบ | warehouse → งานซ่อม | − | อัตโนมัติจาก SO approved | — | — |
| C — โอนย้าย | คลัง | warehouse → warehouse | +/− | draft→approved→completed | ผู้จัดการ | ST-xxx |
| D1 — ปรับสต็อก | admin/ผู้จัดการ | manual | +/− | ทันที (log เก็บ) | — | — |
| D2 — นับสต็อก | คลัง | นับจริง vs บัญชี | +/− | ยืนยันผลนับ | ถ้าต่างมาก | — |

---

## API Endpoints

| Method | Endpoint | คำอธิบาย |
|--------|----------|---------|
| GET | /goods-receipts | รายการใบรับสินค้า (filter: status, vendor_id, warehouse_id, branch_id, date_from, date_to) |
| POST | /goods-receipts | สร้างใบรับใหม่ (draft) |
| GET | /goods-receipts/{id} | รายละเอียดใบรับ |
| PUT | /goods-receipts/{id} | แก้ไขใบรับ (เฉพาะ draft) |
| POST | /goods-receipts/{id}/approve | ยืนยันรับ → สต็อกเข้าคลัง atomic (ต้องการ can_approve) |
| POST | /goods-receipts/{id}/cancel | ยกเลิก; ถ้า approved แล้ว → reverse stock อัตโนมัติ |
| GET | /goods-receipts/{id}/documents | เอกสารแนบ |
| POST | /goods-receipts/{id}/documents | อัปโหลดเอกสารแนบ |
| DELETE | /goods-receipts/{id}/documents/{docId} | ลบเอกสารแนบ |
| GET | /stock-transfers | รายการใบโอนย้าย (filter: status, from_warehouse_id, to_warehouse_id, branch_id) |
| POST | /stock-transfers | สร้างใบโอนย้าย (draft) |
| GET | /stock-transfers/{id} | รายละเอียดใบโอน |
| PATCH | /stock-transfers/{id} | แก้ไขใบโอน (เฉพาะ draft) |
| DELETE | /stock-transfers/{id} | ลบใบโอน (เฉพาะ draft) |
| POST | /stock-transfers/{id}/approve | อนุมัติ → ตรวจสต็อก (ยังไม่ตัด) + notify ปลายทาง |
| POST | /stock-transfers/{id}/complete | ยืนยันรับปลายทาง → ตัดต้นทาง + เพิ่มปลายทาง (atomic) |
| POST | /stock-transfers/{id}/cancel | ยกเลิก (ได้เฉพาะ draft หรือ approved) |
| GET | /warehouses/{id}/inventory | สินค้าในคลัง (filter: product_variant_id, low_stock_only) |
| PATCH | /warehouses/{id}/inventory/adjust | ปรับสต็อก (body: product_variant_id, quantity, reason) |
| POST | /warehouses/{id}/inventory/cycle-count | บันทึกผลนับสต็อก (body: items[]) |
| GET | /inventory | ภาพรวมสต็อกทุกคลัง (filter: warehouse_id, product_id, low_stock_only) |
| GET | /inventory/low-stock | สินค้าต่ำกว่า min_quantity |
| GET | /inventory/transactions | ประวัติการเคลื่อนไหวสต็อก (filter: warehouse_id, product_id, transaction_type, date) |
| GET | /inventory/export | Export รายงานสต็อก CSV |

---

## กฎสำคัญ

| กฎ | รายละเอียด |
|----|-----------|
| Atomic Transaction | Goods Receipt approve, Stock Transfer complete, BOM deduction — ทั้งหมดอยู่ใน DB transaction เดียว |
| ตัดสต็อกตอน approved→in_progress | SO เปลี่ยนจาก approved → in_progress เท่านั้นที่ตัดสต็อก — ไม่ตัดก่อน |
| BOM = MIN formula | available BOM = MIN(component ÷ bom_qty) ทุก component — ถ้า component หนึ่งหมด BOM=0 |
| Rollback ถ้าสต็อกไม่พอ | ถ้า component ใดไม่พอ → rollback ทั้งหมด + error แจ้งรายละเอียด |
| reason บังคับใน Adjust | ทุกการปรับสต็อกต้องระบุเหตุผล — ไม่กรอก ไม่ผ่าน |
| product_variant_id | สต็อกติดตามที่ระดับ variant (ไม่ใช่ product) — ทุก operation ต้องส่ง product_variant_id; API list endpoints (`/inventory`, `/inventory/low-stock`, `/inventory/transactions`, `/warehouses/{id}/inventory`) filter `product_variant_id IS NOT NULL` เสมอ — records เก่าไม่โผล่ |
| ST approve ยังไม่ตัดสต็อก | approve เพียงตรวจสอบและ notify — ตัดสต็อกจริงตอน complete เท่านั้น |
| GR cancel หลัง approved | cancel ได้ทุก status — ถ้า approved แล้ว ระบบ reverse stock อัตโนมัติ (`deductStock` atomic) |
| GR approve (stock deduction) | `addStock()` ใช้ `variantId:` named arg ตรงกับ signature ของ `InventoryService::addStock(int $variantId)` — ห้ามใช้ `productId:` หรือชื่ออื่น |
| Low-stock Alert | quantity < min_quantity → แจ้งเตือนผู้จัดการคลัง อัตโนมัติ |
| Soft Delete | ยกเลิกเอกสารใช้ deleted_at — ไม่ hard delete |
| audit trail ครบ | ทุก transaction เก็บ quantity_before, quantity_after, employee_id, timestamp |

---

*สุดยอดมอเตอร์ — Inventory Flow (รวม v1.0+v2.0) | เมษายน 2026*
