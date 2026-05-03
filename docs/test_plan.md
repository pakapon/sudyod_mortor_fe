# แผนการทดสอบระบบ — สุดยอดมอเตอร์ Frontend

**เวอร์ชัน:** 3.0
**วันที่:** 2026-05-02
**สภาพแวดล้อม:** localhost:5173 (Frontend) + localhost:8009 (Backend API)
**Account:**
- Admin: `admin@sudyodmotor.com` / `P@ssw0rd!2026`
- Employee: `test@sudyodmotor.com` / `P@ssw0rd!2026`

---

## ⚠️ กฎเหล็กสำหรับ AI / Agent (อ่านก่อนเริ่มทุกครั้ง)

**ไฟล์นี้คือไฟล์ "เทส" เท่านั้น — ห้ามแก้โค้ดในระหว่างเทส**

### ลำดับการทำงานที่ถูกต้อง

```
1. อ่าน test_plan.md   → เลือก TC ที่จะเทส
2. รัน TC              → บันทึกผล Pass/Fail
3. ถ้า Fail            → เพิ่ม entry ใน bug_report.md (ห้ามแก้โค้ดทันที)
4. รอ user สั่ง        → "แก้ BUG-XXX" จึงค่อยแก้โค้ด
5. หลังแก้เสร็จ        → ย้าย entry → bug_fixed.md + รัน TC ซ้ำ
```

### ห้ามอย่างเด็ดขาด

- ❌ **ห้ามแก้โค้ดถ้า user ยังไม่สั่ง** — แม้เห็นบักชัดเจน ให้บันทึกใน bug_report.md เท่านั้น
- ❌ **ห้ามแก้หลายบักพร้อมกัน** — แก้ทีละ BUG-XXX ตามที่ user สั่ง แล้ว stop รอคำสั่งถัดไป
- ❌ **ห้ามแก้นอกขอบเขต BUG-XXX ที่กำลังทำ** — ห้าม refactor, rename, จัด layout, เพิ่ม feature
- ❌ **ห้ามสร้างไฟล์ใหม่ถ้าไม่จำเป็น** — ถ้าจำเป็น ให้แจ้ง user ขออนุญาตก่อน
- ❌ **ห้ามแก้โค้ดใน Ask mode** — ทำได้เฉพาะ Edit/Agent mode

### คำสั่งที่ user ใช้

| คำสั่ง | ความหมาย |
|--------|----------|
| "เทส TC-XXX" / "เริ่ม Phase X" | เทสอย่างเดียว — บันทึกผลใน bug_report.md ถ้า Fail |
| "แก้ BUG-XXX" | แก้บัก 1 ตัว แล้ว **หยุด** รอคำสั่งถัดไป |
| "แก้ BUG-XXX, BUG-YYY" | แก้ตามลิสต์ที่ระบุเท่านั้น ห้ามเกิน |
| "Phase X ทั้งหมด" | แก้ทุกบักใน phase นั้น (ทีละตัว — confirm ก่อนไปตัวถัดไป) |

### ก่อนแก้โค้ดทุกครั้ง — ต้อง confirm กับ user ว่า:
1. อยู่ใน mode ที่แก้ได้ (Edit/Agent)
2. ขอบเขตชัดเจน — แก้ไฟล์ไหน บรรทัดไหน
3. ไม่มีการแก้ "พ่วง" ที่ user ไม่ได้สั่ง

---

## โครงสร้างเอกสาร 3 ไฟล์

| ไฟล์ | วัตถุประสงค์ | ใครแก้ |
|------|-------------|--------|
| `docs/test_plan.md` (ไฟล์นี้) | รายการ TC ทั้งหมด | คนเขียนแผน |
| `docs/bug_report.md` | บักที่ค้นพบ ยังไม่แก้ | AI เพิ่ม entry เมื่อ TC Fail |
| `docs/bug_fixed.md` | บักที่แก้เสร็จแล้ว | AI ย้าย entry หลังแก้ + retest pass |

---

## ภาพรวม

| รายการ | ค่า |
|--------|-----|
| Routes | 78 |
| Test Cases | 173 |
| Phase | 5 |
| Bugs Open | ดู `bug_report.md` |
| Bugs Fixed | ดู `bug_fixed.md` |

---

## การแบ่ง Phase

| Phase | ขอบเขต | ความเสี่ยง |
|-------|--------|-----------|
| **Phase 1** | UI / Label / Trivial | ต่ำ |
| **Phase 2** | Logic / Validation | กลาง |
| **Phase 3** | Data display / Field path | กลาง |
| **Phase 4A** | Medium features (Check-in, CRM lookup) | สูง |
| **Phase 4B** | Large features (GPS Photo, Catalog) | สูงสุด |
| **Phase 4C** | Open decisions (รอ user ตัดสินใจ) | — |
| **Phase 5** | Regression: Billing / Inventory / POS | สูงสุด |

---

# Phase 1 — Quick UI / Label

## P1.1 Login Label

| TC# | Test Case | Route | Expected | Bug |
|-----|-----------|-------|----------|-----|
| TC-101 | Label login บอก "อีเมล หรือ เบอร์โทร" | `/login` | label/placeholder ระบุทั้ง 2 รูปแบบ | BUG-001 |
| TC-102 | Login ด้วย email สำเร็จ | `/login` | redirect → `/` | regression |
| TC-103 | Login ด้วยเบอร์โทรสำเร็จ | `/login` | redirect → `/` | regression |

## P1.2 POS Sale Toast

| TC# | Test Case | Route | Expected | Bug |
|-----|-----------|-------|----------|-----|
| TC-110 | POS ขายสำเร็จ → toast "ชำระเงินสำเร็จ" | `/billing/pos` | toast เขียวขึ้น | BUG-024 |
| TC-111 | Receipt no แสดงในจอ | `/billing/pos` | `lastReceiptNo` ปรากฏ | regression |
| TC-112 | Cart reset หลังขาย | `/billing/pos` | ตะกร้าว่าง | regression |

## P1.3 Store Loan Number

| TC# | Test Case | Route | Expected | Bug |
|-----|-----------|-------|----------|-----|
| TC-120 | Store Loan detail แสดงเลขสัญญา | `/store-loans/:id` | `loan_no`/`contract_no` ไม่เป็น "—" | BUG-034 |

## P1.4 Confirm Modal Z-Index

| TC# | Test Case | Route | Expected | Bug |
|-----|-----------|-------|----------|-----|
| TC-130 | Loan approval — confirm dialog คลิกได้ | `/loan-applications/:id` | dialog button คลิกได้ | BUG-031 |
| TC-131 | ยกเลิก SO — confirm dialog คลิกได้ | `/billing/jobs/repair:*` | ไม่ถูก backdrop block | regression |

## P1.5 SO Print

| TC# | Test Case | Route | Expected | Bug |
|-----|-----------|-------|----------|-----|
| TC-140 | คลิกพิมพ์บน SO detail | `/billing/jobs/repair:*` | print preview เปิด + toast | BUG-026 |

## P1.6 SO URL Without Type Prefix

| TC# | Test Case | Route | Expected | Bug |
|-----|-----------|-------|----------|-----|
| TC-150 | URL `/billing/jobs/23` (ไม่มี prefix) | `/billing/jobs/23` | error ชัดเจน "URL ไม่ถูกต้อง..." | BUG-009 |
| TC-151 | URL `/billing/jobs/repair:23` ปกติ | `/billing/jobs/repair:23` | โหลด SO id 23 | regression |

---

# Phase 2 — Logic / Validation

## P2.1 Dashboard Permission Errors

| TC# | Test Case | Route | Expected | Bug |
|-----|-----------|-------|----------|-----|
| TC-201 | Employee เปิด dashboard | `/` | ไม่ขึ้น modal "เกิดข้อผิดพลาด" | BUG-020 |
| TC-202 | Admin เปิด dashboard | `/` | KPI/charts ครบ | regression |

## P2.2 GR Approve Validation

| TC# | Test Case | Route | Expected | Bug |
|-----|-----------|-------|----------|-----|
| TC-210 | GR ทุก item qty=0 → กดอนุมัติ | `/goods-receipts/:id` | warning + ปุ่ม disabled / confirm | BUG-023 |
| TC-211 | GR qty>0 → อนุมัติได้ | `/goods-receipts/:id` | สำเร็จ stock เพิ่ม | regression |

## P2.3 Delivery Photo Soft Warning

| TC# | Test Case | Route | Expected | Bug |
|-----|-----------|-------|----------|-----|
| TC-220 | ปิดงานไม่มี delivery photo | `/billing/jobs/repair:*` Step 8 | warning ก่อนส่ง API | BUG-027 |

## P2.4 DN signed_at

| TC# | Test Case | Route | Expected | Bug |
|-----|-----------|-------|----------|-----|
| TC-230 | DN sign ส่ง `signed_at` | network | payload มี ISO timestamp | BUG-016 |
| TC-231 | DN signed_at ≠ NULL ใน DB | DB / API | `signed_at IS NOT NULL` | BUG-016 |

## P2.5 Vehicle Inspection Items

| TC# | Test Case | Route | Expected | Bug |
|-----|-----------|-------|----------|-----|
| TC-240 | Inspection list — column "จำนวนรายการ" | `/settings/vehicle-inspection-checklists` | ไม่เป็น 0 ทุกแถว | BUG-032 |

## P2.6 Store Loan Payment Badge

| TC# | Test Case | Route | Expected | Bug |
|-----|-----------|-------|----------|-----|
| TC-250 | Store Loan detail — badge "ประวัติชำระ" | `/store-loans/:id` | จำนวนถูก ตั้งแต่โหลด | BUG-035 |
| TC-251 | บันทึกชำระ → badge +1 | `/store-loans/:id` | อัปเดตทันที | BUG-035 |

## P2.7 Approve Step Items

| TC# | Test Case | Route | Expected | Bug |
|-----|-----------|-------|----------|-----|
| TC-260 | Step 4 (อนุมัติ) แสดง items | `/billing/jobs/repair:*` Step 4 | items + ยอด ตรงกับ Step 3 | BUG-013 |

---

# Phase 3 — Data Display / Field Path

## P3.1 Dashboard Charts

| TC# | Test Case | Route | Expected | Bug |
|-----|-----------|-------|----------|-----|
| TC-301 | SO Pie chart — legend ทุกสี | `/` | legend ครบ | BUG-003 |
| TC-302 | Revenue bar chart — ทุกวันตามจริง | `/` | ไม่เป็น 0 ถ้ามียอด | BUG-004 |
| TC-303 | KPI ยอดเดือน = sum(bar) | `/` | ตรงกัน | BUG-004 |

## P3.2 Customer Code

| TC# | Test Case | Route | Expected | Bug |
|-----|-----------|-------|----------|-----|
| TC-310 | Customer list — รหัสลูกค้า | `/customers` | column ไม่เป็น "—" | BUG-005 |

## P3.3 Inventory Branch Name

| TC# | Test Case | Route | Expected | Bug |
|-----|-----------|-------|----------|-----|
| TC-320 | Stock Balance — ชื่อสาขา | `/inventory` | ไม่เป็น "—" | BUG-018 |

## P3.4 GR Product Name

| TC# | Test Case | Route | Expected | Bug |
|-----|-----------|-------|----------|-----|
| TC-330 | GR detail — ชื่อสินค้าตรง SKU | `/goods-receipts/:id` | name ตรง catalog | BUG-022 |

## P3.5 ST Created/Approved By

| TC# | Test Case | Route | Expected | Bug |
|-----|-----------|-------|----------|-----|
| TC-340 | ST detail — "สร้างโดย" | `/stock-transfers/:id` | ชื่อพนักงาน | BUG-028 |
| TC-341 | ST detail — "อนุมัติโดย" | `/stock-transfers/:id` | ชื่อพนักงาน | BUG-028 |

---

# Phase 4A — Medium Features

## P4A.1 Employee Self-Service Check-In (BUG-029)

| TC# | Test Case | Route | Expected |
|-----|-----------|-------|----------|
| TC-401 | Employee → Dashboard มี Check-In | `/` | CheckInWidget แสดง |
| TC-402 | กด Check-In | `/` | POST `/attendance/check-in` → ปุ่มเป็น Check-Out |
| TC-403 | กด Check-Out | `/` | POST `/attendance/check-out` |
| TC-404 | Holiday | `/` | UI block "วันหยุด" |
| TC-405 | นอกเวลาทำงาน | `/` | warning / block |

## P4A.2 SO Customer Lookup (BUG-008)

| TC# | Test Case | Route | Expected |
|-----|-----------|-------|----------|
| TC-410 | Step 1 พิมพ์เบอร์ลูกค้าเดิม | `/billing/new/repair` | typeahead จาก CRM |
| TC-411 | เลือก typeahead → autofill | `/billing/new/repair` | ชื่อ + customer_id fill |
| TC-412 | เบอร์ใหม่ → สร้างใหม่ | `/billing/new/repair` | POST customer ก่อน SO |

---

# Phase 4B — Large Features

## P4B.1 GPS Photo (BUG-010 + BUG-011)

| TC# | Test Case | Route | Expected | Bug |
|-----|-----------|-------|----------|-----|
| TC-420 | Step 1 มี upload pre_intake | Step 1 | upload component + GPS request | BUG-010 |
| TC-421 | Photo upload ขอ GPS | upload | browser prompt + lat/lng | BUG-011 |
| TC-422 | Payload มี lat/lng/taken_at | network | request body ครบ | BUG-011 |
| TC-423 | Watermark preview 4 บรรทัด | UI | lat/lng + datetime + ref + branch | BUG-011 |
| TC-424 | Pre_intake บังคับก่อน pending_review | flow | ปุ่มถัดไป disabled | BUG-010 |
| TC-425 | Delivery photo บังคับก่อน closed | flow | ปุ่มปิด disabled | BUG-010+027 |

## P4B.2 Quotation Catalog Lookup (BUG-012)

| TC# | Test Case | Route | Expected |
|-----|-----------|-------|----------|
| TC-430 | QT form — typeahead สินค้า | `/quotations/create` | dropdown + price |
| TC-431 | เลือก variant → autofill | UI | ราคา + product_variant_id |
| TC-432 | Custom item | UI | ชื่อ + ราคา manual |
| TC-433 | SO approved → in_progress: ตัดสต็อก | flow | inventory.qty ลด |

---

# Phase 4C — Open Decisions

| TC# | Test Case | Bug | Decision |
|-----|-----------|-----|----------|
| TC-440 | SO Stepper "ออกบิล" — keep/remove? | BUG-014 | ❓ รอ user |

---

# Phase 5 — Regression (Critical Modules)

> รันหลังแก้ทุก phase แล้ว — กระทบเงิน/สต็อก

## P5.1 SO Repair Flow (Scenario A)

### Step 1 — รับรถ
| TC# | Test Case | Expected |
|-----|-----------|----------|
| TC-501 | สร้าง SO ลูกค้าใหม่ | POST customer → vehicle → SO |
| TC-502 | สร้าง SO ลูกค้าเดิม | ใช้ customer_id เดิม |
| TC-503 | ไม่มีชื่อลูกค้า | error required |
| TC-504 | ไม่มีทะเบียน | error required |
| TC-505 | ไม่มีอาการ | error required |
| TC-506 | draft → pending_review | PATCH transition |
| TC-507 | status ≠ draft → fields disabled | UI lock |

### Step 2 — ประเมิน
| TC# | Test Case | Expected |
|-----|-----------|----------|
| TC-510 | เพิ่ม checklist + บันทึก | POST items type=service |
| TC-511 | เพิ่มหลายรายการ | POST 3x → transition pending_quote |
| TC-512 | ไม่มีรายการ | skip POST → transition |

### Step 3 — เสนอราคา
| TC# | Test Case | Expected |
|-----|-----------|----------|
| TC-520 | เพิ่มสินค้า catalog | typeahead → price autofill |
| TC-521 | Inventory search ส่ง branch_id | network มี `branch_id=1` |
| TC-522 | เพิ่ม custom item | custom_name + unit_price |
| TC-523 | ไม่มี items | block submit |
| TC-524 | คำนวณ ฿1,000×2 VAT 7% | sub=2000, VAT=140, total=2140 |
| TC-525 | ส่วนลด | หักก่อน VAT |
| TC-526 | สร้าง QT + send | POST `/quotations` → PATCH `/send` |
| TC-527 | QT ผูก service_order_id | payload ครบ |

### Step 4 — อนุมัติ
| TC# | Test Case | Expected |
|-----|-----------|----------|
| TC-530 | อนุมัติ QT | PATCH `/quotations/:id/approve` |
| TC-531 | ปฏิเสธ QT + reason | PATCH reject + reason |
| TC-532 | ปุ่ม approve disabled ถ้าไม่มี QT | guard |

### Step 5 — ออกบิล
| TC# | Test Case | Expected |
|-----|-----------|----------|
| TC-540 | สร้าง INV จาก QT | POST `/invoices/from-quotation` → issue |
| TC-541 | INV items = QT items | ตรงทุก row |
| TC-542 | INV total = QT total | ตรง |
| TC-543 | ออกบิลซ้ำ | block |

### Step 6 — ซ่อม
| TC# | Test Case | Expected |
|-----|-----------|----------|
| TC-550 | tick checklist ครบ → enabled | guard |
| TC-551 | บันทึก → approved → in_progress → completed | 2 PATCH |

### Step 7 — ชำระเงิน
| TC# | Test Case | Expected |
|-----|-----------|----------|
| TC-560 | เงินสด ≥ total | POST payment + receipt |
| TC-561 | cash < total → disabled | guard |
| TC-562 | โอน / บัตร | method ตามเลือก |
| TC-563 | ปุ่มชำระ disabled บน draft SO | BUG-015 verify |

### Step 8 — ส่งมอบ
| TC# | Test Case | Expected |
|-----|-----------|----------|
| TC-570 | tick DN + WR → ปิดงาน | 4 calls sequential |
| TC-571 | ปิดไม่มี WR | 3 calls (skip warranty) |
| TC-572 | warranty_months ปรับได้ | ไม่ hardcode 3 |
| TC-573 | sale flow ปิดได้ | DeliverForm รองรับ quotation_id |
| TC-574 | DN signed_at บันทึก | BUG-016 verify |
| TC-575 | Delivery photo + GPS | BUG-011 verify |

## P5.2 Sale Flow (B1/B2)

| TC# | Test Case | Expected |
|-----|-----------|----------|
| TC-580 | QT type=sale | ไม่มี service_order_id |
| TC-581 | Sale + deposit (B2) | DepositForm → Receipt |
| TC-582 | Sale ไม่มี deposit (B1) | INV → Payment → Receipt |
| TC-583 | Stock deduction ที่ INV issued | inventory ลด |

## P5.3 POS Retail (C)

| TC# | Test Case | Expected |
|-----|-----------|----------|
| TC-590 | ค้นหา text | API `/inventory?search=...&branch_id=1` |
| TC-591 | ค้น barcode (Enter) | limit=1 → addToCart |
| TC-592 | เพิ่มสินค้าซ้ำ | qty +1 idempotent |
| TC-593 | คำนวณเงินทอน | change = received - total |
| TC-594 | cash < total → disabled | guard |
| TC-595 | ชำระสำเร็จ — 4 calls | createRetail → issue → payment → receipt |
| TC-596 | Print receipt | window.print() |
| TC-597 | Receipt แสดงสาขาจริง | จาก employee.branch |
| TC-598 | Reset cart หลังชำระ | state ล้าง |

## P5.4 Document Browser

| TC# | Test Case | Expected |
|-----|-----------|----------|
| TC-600 | คลิก QT → detail | route แสดง items |
| TC-601 | คลิก INV → detail | route แสดง items |
| TC-602 | คลิก SO → job page | `/billing/jobs/repair:*` |
| TC-603 | Filter SO/QT/INV/RCP | ทำงาน |
| TC-604 | Date range filter | ครอบทุก type |
| TC-605 | Retail INV (ไม่มีลูกค้า) คลิกได้ | `/billing/invoices/:id` |

## P5.5 Inventory

| TC# | Test Case | Expected |
|-----|-----------|----------|
| TC-610 | Stock Balance ทุก SKU | GET `/inventory` |
| TC-611 | Filter low_stock | GET `/inventory/low-stock` |
| TC-612 | Filter transactions + date | history filter |
| TC-613 | Export CSV | download blob |
| TC-614 | GR CRUD + approve | stock เพิ่มจริง |
| TC-615 | ST CRUD + approve | stock โอน |

---

# Routes ยังไม่ Test (Edit Pages)

| Route | หมายเหตุ |
|-------|---------|
| `/customers/:id/edit` | edit form |
| `/products/:id/edit` | edit form |
| `/quotations/:id/edit` | edit form |
| `/loan-applications/:id/edit` | edit form |
| `/goods-receipts/:id/edit` | edit form |
| `/stock-transfers/:id/edit` | edit form |
| `/warehouses/:id/edit` | edit form |
| `/hr/holidays/:id/edit` | edit form |
| `/settings/positions/:id/edit` | edit form |
| `/settings/work-schedules/edit/:id` | edit form |
| `/settings/vendors/:id/edit` | edit form |
| `/settings/finance-companies/:id/edit` | edit form |
| `/billing/new/sale` | sale flow ยังไม่ test เต็ม |

---

# Definition of Done (เกณฑ์ Pass ต่อ TC)

- ✅ Action สำเร็จ ไม่มี error modal ที่ไม่คาดหวัง
- ✅ Network request ถูก (method, URL, payload)
- ✅ UI ตรง API response
- ✅ ไม่มี console error ที่เกี่ยวข้อง
- ✅ Navigation/redirect ถูก route

---

# Out of Scope

- Mobile/tablet responsive
- Performance / Load testing
- Playwright E2E automation
- Elasticsearch (BUG-019 — BE infra)
- Data inconsistency BUG-017 (DB เก่า)

---

# Template สำหรับเพิ่ม Bug Entry (ใน bug_report.md)

```markdown
### BUG-XXX — สรุปสั้นๆ

| Field | Detail |
|-------|--------|
| Severity | Critical / High / Medium / Low |
| Route | /path/to/page |
| TC | TC-XXX |

**Repro:** ขั้นตอน 1, 2, 3
**Expected:** ...
**Actual:** ...
**Phase:** P1 / P2 / P3 / P4A / P4B / P5
```
