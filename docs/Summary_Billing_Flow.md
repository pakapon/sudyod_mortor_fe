# 🧾 Billing Flow — ฉบับสมบูรณ์

**ระบบบิล & เอกสาร · Document & Billing Flow**
สุดยอดมอเตอร์ | รวม v1.0 + v2.0 + v3.0 | เมษายน 2026

---

## เอกสารทั้งหมดในระบบ (7 ประเภท)

| รหัส | ชื่อเอกสาร | เลขอ้างอิง | ออกเมื่อ | ใช้กับ | PDF |
|------|-----------|-----------|---------|--------|-----|
| **SO** | ใบรับรถ Service Order | SO-2026-XXXX | ลูกค้านำรถเข้าซ่อม | ซ่อมเท่านั้น | ✓ |
| **QT** | ใบเสนอราคา Quotation | QT-2026-XXXX | ช่างตรวจ (service) / เซลเสนอ (sale) | service & sale | ✓ |
| **DP** | ใบมัดจำ Deposit | DP-2026-XXXX | ลูกค้าวางมัดจำ — ออกใบเสร็จมัดจำทันที | sale เท่านั้น | ✓ |
| **INV** | ใบแจ้งหนี้ Invoice | INV-2026-XXXX | ซ่อมเสร็จ / ยืนยันซื้อ (หักมัดจำถ้ามี) | ทุก type | ✓ |
| **RCP** | ใบเสร็จรับเงิน Receipt | RCP-2026-XXXX | **พนักงานกดออกเอง** พร้อมเลือกวิธีชำระ | ทุก type | ✓ |
| **DN** | ใบส่งมอบ Delivery Note | DN-2026-XXXX | ก่อนส่งมอบรถ/สินค้า — ลูกค้าเซ็น | ซ่อม & ขายรถ | ✓ |
| **WR** | ใบรับประกัน Warranty | WR-2026-XXXX | ออกพร้อม DN ตอนส่งมอบ | ซ่อม & ขายรถ | ✓ |

> ★ **ใบเสร็จ (RCP) ต้องกดออกเอง — ไม่ออกอัตโนมัติ**

---

## 4 Billing Scenarios

| Scenario | Flow | จุดเริ่มต้น |
|----------|------|-----------|
| **A — ซ่อมรถ** | SO → QT(service) → INV → RCP → DN → WR | เปิดใบรับรถ |
| **B1 — ขายไม่มัดจำ** | QT(sale) → INV → RCP → DN → WR | เซลเสนอราคา |
| **B2 — ขายมีมัดจำ** | QT(sale) → DP(+RCP PDF ทันที) → INV(หักมัดจำ) → RCP → DN → WR | วางมัดจำก่อน |
| **C — ของชิ้นเล็ก (Retail)** | INV(retail) → RCP | ไม่ต้องมี QT |

---

## Scenario A — ซ่อมรถ

```
SO → QT(service) → INV → RCP → DN → WR
```

| ขั้น | เอกสาร | รายละเอียด |
|-----|--------|-----------|
| **①** | SO draft | พนักงานเปิดใบรับรถ กรอก ชื่อลูกค้า, ทะเบียน, อาการ → ถ่ายรูป GPS pre_intake |
| **②** | QT service | ช่างระบุอะไหล่+ค่าแรง → SO.status=pending_quote ระบบ copy ข้อมูลจาก SO |
| **③** | QT approved | ลูกค้า/ผู้จัดการ approve → SO.status=approved → ตัดสต็อก → in_progress |
| **④** | INV | SO.status=completed → ออก INV ได้ ระบบ copy รายการจาก QT (แก้ได้) |
| **⑤** | RCP | พนักงาน **กดออกเอง** → เลือกวิธีชำระ → Generate PDF → Upload DO Spaces |
| **⑥** | DN | สร้างก่อนส่งรถ → ลูกค้าเซ็น → signed_at ≠ NULL |
| **⑦** | WR | ออกพร้อม DN → ผูก service_order_id |

**ตัวอย่าง Scenario A — Toyota Camry เปลี่ยนหม้อน้ำ:**

| เอกสาร | เลขที่ | ราคา |
|--------|--------|------|
| **① SO** | SO-2026-0042 | นายสมชาย │ Toyota Camry กข-1234 │ อาการ: เครื่องร้อน |
| **② QT** | QT-2026-0038 | หม้อน้ำ 3,385 + ค่าแรง 1,500 = 4,885 |
| **③ INV** | INV-2026-0035 | after_discount=4,885 + VAT 7%(342) = **5,227.00 บาท** |
| **④ RCP** | RCP-2026-0031 | ชำระเงินสด 5,227 บาท → PDF สร้าง → upload DO Spaces |
| **⑤ DN** | DN-2026-0028 | ลูกค้าเซ็น 11/04/2026 15:30 |
| **⑥ WR** | WR-2026-0021 | รับประกัน 3 เดือน / 5,000 กม. |
---

## ใบรับประกัน (WR) — Warranty Fields (★ NEW)

| Field | Type | คำอธิบาย | ตัวอย่าง |
|-------|------|---------|----------|
| `warranty_no` | VARCHAR UNIQUE | เลขที่ใบรับประกัน | WR-2026-0021 |
| `warranty_months` | INT | จำนวนเดือนรับประกัน | 3 |
| `warranty_km` | INT NULL | จำนวน km รับประกัน (NULL = ไม่จำกัด) | 5000 |
| `conditions` | TEXT NULL | เงื่อนไขรับประกัน (free text) | "ไม่ครอบคลุมอุบัติเหตุ" |
| `start_date` | DATE | วันเริ่มรับประกัน (= วันส่งมอบ) | 2026-04-11 |
| `end_date` | DATE | วันหมดรับประกัน (auto: start + months) | 2026-07-11 |
| `warranty_pdf_url` | VARCHAR NULL | PDF URL บน DO Spaces | |

> ★ Polymorphic: owner_type = `service_order` (ซ่อม) หรือ `quotation` (ขาย)
> ★ end_date คำนวณอัตโนมัติ: start_date + warranty_months
---

## Scenario B1 — ขายสินค้า (ไม่มีมัดจำ)

```
QT(sale) → INV → RCP → DN → WR
```

| ขั้น | รายละเอียด |
|-----|-----------|
| **①** | เซลเปิด QT type=sale เลือก product + ลูกค้า |
| **②** | ลูกค้าตกลง → approve QT → ออก INV ได้ทันที |
| **③** | พนักงานกดออก RCP → เลือกวิธีชำระ |
| **④** | ออก DN + WR ตอนส่งมอบ |

---

## Scenario B2 — ขายสินค้า (มีมัดจำ)

```
QT(sale) → DP (+RCP PDF ทันที) → INV (หักมัดจำ) → RCP → DN → WR
```

| ขั้น | รายละเอียด |
|-----|-----------|
| **①** | เซลเปิด QT type=sale |
| **②** | ลูกค้าวางมัดจำ → ออก DP → ระบบสร้าง RCP PDF สำหรับมัดจำทันที |
| **③** | ออก INV → ระบบหักมัดจำออกอัตโนมัติ: grand_total − deposit |
| **④** | ชำระส่วนที่เหลือ → กดออก RCP ครั้งสุดท้าย |

**ตัวอย่าง Scenario B2 — ขาย Honda Wave 125 วางมัดจำ 2,000:**

| เอกสาร | เลขที่ | ราคา |
|--------|--------|------|
| **① QT** | QT-2026-0041 | Honda Wave 125 สีแดง × 1 คัน = 55,000 บาท |
| **② DP** | DP-2026-0006 | มัดจำ 2,000 บาท → RCP PDF ออกทันที |
| **③ INV** | INV-2026-0038 | subtotal 55,000 + VAT 7%(3,850) = 58,850 − มัดจำ 2,000 = **56,850 บาท** |
| **④ RCP** | RCP-2026-0035 | ชำระ 56,850 โอน → PDF |
| **⑤ DN+WR** | — | ส่งมอบรถ + ใบรับประกัน |

---

## Scenario C — ของชิ้นเล็ก / Retail

```
INV (retail) → RCP
```

| หัวข้อ | รายละเอียด |
|--------|-----------|
| **จุดเริ่มต้น** | ลูกค้า walk-in ซื้อของชิ้นเล็ก เช่น หมวก ถุงมือ น้ำมัน |
| **ลูกค้า** | optional — ไม่ต้องมีในระบบก็ได้ |
| **เอกสาร** | INV type=retail → ออกได้โดยไม่ต้องมี QT หรือ SO |
| **ชำระ** | กดออก RCP ทันทีหลังสร้าง INV |

**ตัวอย่าง Scenario C — ลูกค้าซื้อหมวก + แจ็กเก็ต:**

| เอกสาร | รายละเอียด |
|--------|-----------|
| **INV** | INV-2026-0039 │ หมวก 590 + แจ็กเก็ต 1,360 = 1,950 + VAT 140 = **2,090 บาท** |
| **RCP** | RCP-2026-0036 │ เงินสด 2,090 บาท → PDF |

---

## สูตรคำนวณใบแจ้งหนี้ (Invoice Formula)

| ขั้น | สูตร | ตัวอย่าง |
|-----|------|---------|
| **1. subtotal** | SUM(qty × unit_price) | 50,000 |
| **2. discount_total** | SUM(item.discount) | 500 |
| **3. after_discount** | subtotal − discount_total | 49,500 |
| **4. vat_amount** | after_discount × (vat_percent/100) | 49,500 × 7% = 3,465 |
| **5. grand_total** | after_discount + vat_amount − deposit | 52,965 − 2,000 = **50,965** |

---

## กระบวนการออกใบเสร็จ (RCP)

★ **พนักงานต้องกดออกเองเสมอ — ไม่ออกอัตโนมัติ**

| ขั้น | รายละเอียด |
|-----|-----------|
| **1** | พนักงานกดปุ่ม "ออกใบเสร็จ" บนหน้า Invoice |
| **2** | เลือกวิธีชำระเงิน + กรอกข้อมูลชำระ |
| **3** | ระบบ Generate receipt_no (running number รายปี) |
| **4** | สร้าง PDF ใบเสร็จ server-side |
| **5** | Upload PDF → DO Spaces → เก็บ receipt_pdf_url ใน invoices |

---

## วิธีชำระเงิน (6 วิธี)

| วิธี | รหัส | ใช้ได้กับ |
|-----|------|---------|
| เงินสด | `cash` | ทุก scenario |
| โอนเงิน | `transfer` | ทุก scenario |
| บัตรเครดิต | `credit_card` | ทุก scenario |
| เช็ค | `cheque` | ทุก scenario |
| ผ่อนร้าน | `store_installment` | B1, B2 (ผูก store_loan) |
| ผ่อนไฟแนนซ์ | `finance_loan` | B1, B2 (ผูก loan_application) |

---

## ใบส่งมอบ (DN) — Delivery Note

| หัวข้อ | รายละเอียด |
|--------|-----------|
| **Polymorphic** | owner_type = `service_order` (ซ่อม) หรือ `quotation` (ขาย) |
| **ลูกค้าเซ็น** | `signed_at` + `signed_by` — ระบบบันทึกทันที |
| **★ บล็อก SO** | SO ปิดงาน (pending_pickup → closed) ไม่ได้ถ้า DN ยังไม่เซ็น (signed_at=NULL) |
| **API** | PATCH `/delivery-notes/:id/sign` |

---

## สรุปเปรียบเทียบ 4 Scenarios

| รายการ | A ซ่อมรถ | B1 ขายไม่มัดจำ | B2 ขายมัดจำ | C ของชิ้นเล็ก |
|--------|---------|--------------|------------|-------------|
| SO | ✅ บังคับ | — | — | — |
| QT | ✅ บังคับ | ✅ บังคับ | ✅ บังคับ | — |
| DP | — | — | ✅ มี | — |
| INV | ✅ | ✅ | ✅ (หักมัดจำ) | ✅ retail |
| RCP | ✅ กดเอง | ✅ กดเอง | ✅ กดเอง (×2) | ✅ กดเอง |
| DN | ✅ บังคับ | ✅ (ถ้ามี) | ✅ (ถ้ามี) | — |
| WR | ✅ | ✅ | ✅ | — |
| ลูกค้าบังคับ | ✅ | ✅ | ✅ | — (walk-in) |

---

## ★ Stock Deduction — ตัดสต็อกตอนออก Invoice (Scenario B1/B2)

| หัวข้อ | รายละเอียด |
|--------|-----------|
| **Trigger** | เมื่อ Invoice status เปลี่ยนเป็น `issued` |
| **Transaction type** | `sale` (inventory_transactions) |
| **ปลอดภัย** | Atomic + `lockForUpdate` ป้องกัน race condition |
| **สต็อกไม่พอ** | throw BusinessException — ไม่ออก INV |
| **ต่างจาก SO** | SO ตัดสต็อกตอน approved→in_progress (type=service_use), ขายตัดตอน INV issued (type=sale) |

---

## ★ DN สำหรับการขาย (B1/B2) — Optional

DN **ไม่บังคับ** สำหรับ Scenario B1/B2 (ต่างจาก A ที่บังคับ)
- ถ้ามี DN → ลูกค้าเซ็นรับสินค้าเหมือนปกติ
- ถ้าไม่มี DN → ปิดงานได้โดยไม่ต้องมี DN

---

## ★ Warranty Claims — เคลมรับประกัน

| หัวข้อ | รายละเอียด |
|--------|-----------|
| **วิธีเคลม** | เปิด SO ใหม่ โดยผูก `warranty_id` (FK ไปที่ warranties table) |
| **ตรวจสอบ** | ระบบเช็ค end_date ≥ วันนี้ ก่อนอนุญาตให้ผูก warranty_id |
| **ราคา** | ค่าแรง/อะไหล่ในใบเสนอราคาอาจเป็น 0 บาท (ฟรีภายใต้ warranty) |
| **ความเชื่อมโยง** | SO → warranty → original SO/QT ดูประวัติย้อนกลับได้ |

---

## Quotation Status Flow

```
draft → sent → approved / rejected / expired
```

| Status | คำอธิบาย |
|--------|---------|
| `draft` | ร่าง — แก้ไขได้ |
| `sent` | ส่งลูกค้าแล้ว — รอตอบกลับ |
| `approved` | ลูกค้าอนุมัติ — ออก INV ได้ |
| `rejected` | ลูกค้าปฏิเสธ |
| `expired` | หมดอายุ (ตั้ง validity_days) |

---

## Invoice Status Flow

```
draft → issued → paid / overdue / cancelled
```

| Status | คำอธิบาย |
|--------|---------|
| `draft` | ร่าง — แก้ไขได้ |
| `issued` | ออกแล้ว — **★ trigger ตัดสต็อก (sale type)** |
| `paid` | ชำระครบ — auto set เมื่อ total_paid ≥ grand_total |
| `overdue` | เกินกำหนด — job check-overdue ตั้งค่าอัตโนมัติ |
| `cancelled` | ยกเลิก — ได้เฉพาะ draft/issued (ถ้า issued ต้อง reverse stock) |

---

## กฎสำคัญ

| กฎ | รายละเอียด |
|----|-----------|
| **RCP ไม่ออกอัตโนมัติ** | พนักงานต้องกดออกเองเสมอ |
| **DN เซ็นก่อนปิด** | signed_at=NULL → SO ปิด closed ไม่ได้ |
| **มัดจำหักอัตโนมัติ** | INV grand_total = subtotal+VAT − deposit_amount |
| **VAT default 7%** | แก้ได้ต่อ invoice |
| **เลข running รายปี** | SO/QT/INV/RCP/DN/WR reset ทุกต้นปี |
| **Soft Delete** | ยกเลิกเอกสารได้เฉพาะ draft — ใช้ deleted_at |
| **PDF บน DO Spaces** | PDF ทุกประเภทเก็บ URL ใน DB — ไม่ generate ซ้ำ |

---

*สุดยอดมอเตอร์ — Billing Flow (รวม v1.0+v2.0+v3.0) | เมษายน 2026*
