# 🔧 Service Order Flow — ฉบับสมบูรณ์

**ระบบบริการ & ซ่อม · Service Order Flow**
สุดยอดมอเตอร์ | รวม v1.0 + v1.1 + v2.0 | เมษายน 2026

---

## ภาพรวม

Service Order (SO) คือ **ใบรับรถ** — เอกสารหลักที่ครอบคลุมทุกขั้นตอนตั้งแต่รับรถจนถึงส่งมอบ มี 2 Scenario ตามประเภทงาน

| Scenario | คำอธิบาย | จำนวน status |
|----------|---------|-------------|
| **A — ซ่อมปกติ** | รับรถ → ถ่ายรูป → ช่างตรวจ → เสนอราคา → อนุมัติ → ซ่อม → ส่งมอบ | 9 ขั้น (ครบ) |
| **B — ซ่อมด่วน** | รับรถ → ถ่ายรูป → ส่งตรวจ → อนุมัติตรง (ข้าม QT) → ซ่อม → ส่งมอบ | 8 ขั้น (ข้าม pending_quote) |

---

## Status Flow 9 ขั้น

```
draft → pending_review → pending_quote → approved → in_progress
     → completed → pending_payment → pending_pickup → closed
```

| # | Status | ความหมาย | เปลี่ยนเมื่อ | ใครเปลี่ยนได้ | Permission | Trigger ที่เกิด |
|---|--------|---------|------------|-------------|----------|----------------|
| 1 | **draft** | เปิดใบรับรถ | พนักงานเปิดใบ | พนักงาน | can_create | ถ่าย pre_intake ได้ |
| 2 | **pending_review** | รอผู้จัดการตรวจ | กด "ส่งตรวจสอบ" | พนักงาน | can_edit | — |
| 3 | **pending_quote** | รอช่างประเมิน+เสนอราคา | ผู้จัดการ approve | ผู้จัดการ | can_approve | ถ่าย damage_spot ได้ |
| 4 | **approved** | ลูกค้าอนุมัติ QT | ลูกค้า/พนักงาน approve QT | พนักงาน+ลูกค้า | can_approve | เบิกอะไหล่จากคลังได้ |
| 5 | **in_progress** | กำลังซ่อม | ช่างกด "เริ่มซ่อม" | ช่าง | can_edit | ★ ตัดสต็อก / ถ่าย pre_repair |
| 6 | **completed** | ซ่อมเสร็จ | ช่างกด "ซ่อมเสร็จ" | ช่าง | can_edit | ถ่าย pre_delivery / สร้าง INV ได้ |
| 7 | **pending_payment** | รอชำระเงิน | พนักงานกด transition | พนักงาน | can_edit | รับชำระ / ออกใบเสร็จได้ |
| 8 | **pending_pickup** | ชำระแล้ว รอรับรถ | พนักงานกด transition | พนักงาน | can_edit | ถ่าย delivery / สร้าง DN+WR |
| 9 | **closed** | ปิดงาน | ถ่าย delivery + DN เซ็น | พนักงาน | can_edit | SO ปิด — แก้ไขไม่ได้อีก |

---

## Scenario A — ซ่อมปกติ (ครบ 9 ขั้น)

```
draft → pending_review → pending_quote → approved → in_progress
     → completed → pending_payment → pending_pickup → closed
```

**ขั้นตอนละเอียด:**

| ขั้น | Action | รายละเอียด |
|-----|--------|-----------|
| **① draft** | พนักงานเปิดใบรับรถ | กรอก: customer_id, vehicle_id, symptom, mileage, received_date |
| | ถ่าย pre_intake | ★ บังคับก่อน pending_review — รูปรถรอบคัน GPS watermark |
| **② pending_review** | กด "ส่งตรวจสอบ" | SO.status → pending_review — ผู้จัดการเห็นในรายการรอตรวจ |
| **③ pending_quote** | ผู้จัดการ approve | SO.status → pending_quote — ช่างรับงาน ถ่าย damage_spot |
| | สร้าง Quotation (QT) | QT type=service ผูก service_order_id — ระบุอะไหล่+ค่าแรง |
| **④ approved** | ลูกค้า/พนักงาน approve QT | QT.status=approved → SO.status=approved |
| **⑤ in_progress** | ช่างกด "เริ่มซ่อม" | ★ **ตัดสต็อกอะไหล่อัตโนมัติ** — ถ่าย pre_repair |
| | เบิกอะไหล่ | สร้าง inventory_transaction type=service_use |
| **⑥ completed** | ช่างกด "ซ่อมเสร็จ" | ถ่าย pre_delivery — พนักงานสร้าง Invoice (INV) |
| | **พนักงานกด "รอชำระ"** | ★ Manual — เรียก transition completed → pending_payment |
| **⑦ pending_payment** | รับชำระเงิน | บันทึก payment → INV.status=paid |
| | **กดออกใบเสร็จเอง** | ★ พนักงานกดออก RCP — เลือกวิธีชำระ |
| | **พนักงานกด "รอรับรถ"** | ★ Manual — เรียก transition pending_payment → pending_pickup |
| **⑧ pending_pickup** | ถ่าย delivery | ★ บังคับก่อน closed — รูปรถตอนส่งมอบจริง |
| | สร้าง DN + WR | ลูกค้าเซ็น DN รับรถ |
| **⑨ closed** | กด "ส่งมอบแล้ว" | SO.status → closed — ปิดถาวร |

**ตัวอย่าง Scenario A:**

| เอกสาร | เลขที่ | รายละเอียด |
|--------|--------|-----------|
| **① ใบรับรถ** | SO-2026-0042 | นายสมชาย │ Toyota Camry กข-1234 │ อาการ: เครื่องร้อน │ ถ่าย pre_intake 4 รูป |
| **② ส่งตรวจ** | pending_review | ผู้จัดการรับทราบ |
| **③ ใบเสนอราคา** | QT-2026-0038 | ช่างถ่าย damage_spot 2 รูป → ค่าแรง 1,500 + หม้อน้ำ 3,385 = VAT = **5,227 บาท** |
| **④ อนุมัติ** | approved | ลูกค้า approve QT |
| **⑤ ซ่อม** | in_progress | ถ่าย pre_repair → เบิกหม้อน้ำ A101 → เริ่มซ่อม |
| **⑥ เสร็จ** | INV-2026-0035 | ถ่าย pre_delivery 3 รูป → INV ยอด 5,227 บาท |
| **⑦ ชำระ** | RCP-2026-0031 | โอน 5,227 → INV=paid → **พนักงานกด "ออกใบเสร็จ"** → เลือก: โอนเงิน |
| **⑧ รับรถ** | DN-2026-0028 | ถ่าย delivery 4 รูป → สร้าง DN + WR ประกัน 3 เดือน |
| **⑨ ปิดงาน** | closed | ลูกค้าเซ็น DN → SO.status=closed |

---

## Scenario B — ซ่อมด่วน / ข้าม Quotation

```
draft → pending_review → approved → in_progress → completed → pending_payment → pending_pickup → closed
```

**เงื่อนไข:** งานเล็ก ราคาคงที่ หรือลูกค้าบอกให้ซ่อมได้เลยโดยไม่ต้องเสนอราคา

| ขั้น | Action | รายละเอียด |
|-----|--------|----------|
| **① draft** | พนักงานเปิดใบ + ถ่าย pre_intake | เหมือน Scenario A |
| **② pending_review** | กด "ส่งตรวจสอบ" | ผู้จัดการตรวจข้อมูล |
| **③ approved** | ผู้จัดการ approve ตรง | **ข้าม pending_quote** → ไม่ต้องมี QT |
| **④–⑧** | เหมือน Scenario A | in_progress → completed → INV → RCP → DN → WR → closed |

**INV โดยไม่มี QT:** สร้าง Invoice type=service โดยตรง — กรอก items ใน INV ได้เลย ไม่บังคับ quotation_id

**ตัวอย่าง Scenario B:**

| ขั้น | เลขที่ | รายละเอียด |
|-----|--------|-----------|
| **① draft** | SO-2026-0050 | เปลี่ยนน้ำมันเครื่อง ราคาคงที่ 350 บาท — ถ่าย pre_intake |
| **② pending_review** | ส่งตรวจ | พนักงานกดส่งตรวจ → ผู้จัดการตรวจข้อมูล |
| **③ approved** | ข้าม QT | ผู้จัดการ approve ตรง (ข้าม pending_quote) |
| **③ ซ่อม** | in_progress | ถ่าย pre_repair → เปลี่ยนน้ำมัน 15 นาที |
| **④ เสร็จ** | INV-2026-0055 | ออก Invoice ยอด 350 บาท ตรง (ไม่ผ่าน QT) |
| **⑤ ปิด** | closed | RCP → DN → WR → เซ็น → closed |

---

## ★ SO Reopen — เปิดใบงานที่ปิดแล้วอีกครั้ง

| หัวข้อ | รายละเอียด |
|--------|-----------|
| **Transition** | `closed` → `pending_pickup` |
| **สิทธิ์** | เฉพาะผู้มี `can_approve` เท่านั้น |
| **Note บังคับ** | ต้องระบุเหตุผล (reopen_note) — ห้ามเว้นว่าง |
| **เมื่อไหร่ใช้** | ส่งมอบแล้วพบปัญหา, ลูกค้าไม่รับ, ต้องแก้ไขเอกสาร |
| **ผลกระทบ** | กลับเข้ารอส่งมอบ — DN/WR อาจต้องออกใหม่ |

**ตัวอย่าง:**
> SO-2026-0042 ปิดงานแล้ว แต่ลูกค้าโทรแจ้งว่ารถยังมีปัญหา → ผู้จัดการกด Reopen + note: "ลูกค้าแจ้งอาการเดิมกลับมา" → status กลับเป็น pending_pickup → ตรวจซ่อมเพิ่ม

---

## ★ Warranty Claims — เคลมรับประกัน

| หัวข้อ | รายละเอียด |
|--------|-----------|
| **วิธี** | เปิด SO ใหม่ ผูก `warranty_id` FK → `service_warranties` |
| **ตรวจสอบ** | ระบบเช็ค warranty ยังไม่หมดอายุ (start_date + warranty_months > วันนี้) |
| **ราคา** | ค่าแรง/อะไหล่อาจเป็น 0 บาท (ฟรีภายใต้ warranty) |
| **ย้อนกลับ** | SO ใหม่ → warranty → original SO/QT ดูประวัติได้ |

**ตัวอย่าง:**
> ลูกค้าคนเดิมจาก SO-2026-0042 (เปลี่ยนหม้อน้ำ, WR-2026-0021 ประกัน 3 เดือน) กลับมาเดือนถัดไปแจ้งหม้อน้ำรั่ว → พนักงานเปิด SO-2026-0088 ผูก warranty_id=WR-2026-0021 → ซ่อมฟรี

---

## ★ Stock Deduction — ตัดสต็อกตอน approved → in_progress

| product_type | วิธีตัด | หมายเหตุ |
|-------------|--------|---------|
| **standard** | ตัด inventory.quantity โดยตรง | ลดยอดใน inventory table |
| **bom** | ตัด component ทุกชิ้นตาม product_bom | Atomic — ทุกชิ้นใน DB Transaction เดียว |
| **service** | ข้าม | ค่าแรง บริการ ไม่มีสต็อก |

- ถ้าสต็อกไม่พอ → **rollback ทั้งหมด** + error ระบุว่าขาดอะไร เหลือเท่าไหร่
- สร้าง inventory_transaction `type=service_use` ทุก item ที่ตัด

---

## เอกสารที่สร้างได้แต่ละ Status

| Status | GPS Photo | Quotation | Invoice | Receipt | Delivery Note | Warranty |
|--------|----------|----------|--------|--------|--------------|--------|
| **draft** | pre_intake ✓ | — | — | — | — | — |
| **pending_review** | — | — | — | — | — | — |
| **pending_quote** | damage_spot ✓ | สร้าง QT ✓ | — | — | — | — |
| **approved** | — | QT approved | — | — | — | — |
| **in_progress** | pre_repair ✓ | — | — | — | — | — |
| **completed** | pre_delivery ✓ | — | สร้าง ✓ | — | — | — |
| **pending_payment** | — | — | INV ✓ | ออก ✓ | — | — |
| **pending_pickup** | delivery ✓ | — | — | — | สร้าง ✓ | สร้าง ✓ |
| **closed** | — | — | — | — | เซ็น ✓ | ✓ |

---

## Transition Rules ทั้งหมด

| การเปลี่ยน Status | ผู้ดำเนินการ | Permission | เงื่อนไขก่อนเปลี่ยน |
|-----------------|------------|----------|------------------|
| draft → pending_review | พนักงาน | can_edit | กรอกครบ: customer, vehicle, symptom + ถ่าย pre_intake แล้ว |
| pending_review → pending_quote | ผู้จัดการ | can_approve | ตรวจสอบข้อมูลถูกต้อง |
| pending_review → approved | ผู้จัดการ | can_approve | กรณีซ่อมด่วน (Scenario B) |
| pending_quote → approved | พนักงาน/ลูกค้า | can_approve | มี QT type=service และ QT.status=approved |
| approved → in_progress | ช่าง | can_edit | มี technician_id กำหนดแล้ว |
| in_progress → completed | ช่าง | can_edit | งานซ่อมเสร็จ |
| completed → pending_payment | พนักงาน | can_edit | ซ่อมเสร็จ + สร้าง Invoice แล้ว |
| pending_payment → pending_pickup | พนักงาน | can_edit | รับชำระ + ออกใบเสร็จแล้ว |
| pending_pickup → closed | พนักงาน | can_edit | ถ่าย delivery แล้ว + DN.signed_at ≠ NULL |

---

## กฎสำคัญ

| กฎ | รายละเอียด |
|----|-----------|
| **Forward Only** | ห้ามย้อน status — เดินหน้าเท่านั้น |
| **Reopen** | ผู้จัดการ (can_approve) reopen ได้: closed → pending_pickup พร้อม note เหตุผล |
| **Cancel** | ยกเลิก SO ได้เฉพาะ status ≤ pending_quote เท่านั้น |
| **Technician บังคับ** | ต้องกำหนด technician_id ก่อน → in_progress |
| **GPS pre_intake บังคับ** | ≥ 1 รูป ก่อน draft → pending_review |
| **GPS delivery บังคับ** | ≥ 1 รูป ก่อน pending_pickup → closed |
| **DN signed บังคับ** | DN.signed_at ≠ NULL ก่อน closed |
| **INV ก่อน pending_pickup** | ต้องสร้าง INV + รับเงินครบ + ออกใบเสร็จ |
| **Branch Isolation** | SO ผูก branch — ดูได้เฉพาะ SO ของสาขาตัวเองตาม JWT |
| **Soft Delete** | ยกเลิก = status=cancelled + deleted_at — ไม่ hard delete |
| **Closed = Final** | closed แก้ไขไม่ได้ — ยกเว้น reopen โดยผู้จัดการ |

---

## สรุปเปรียบเทียบ 2 Scenarios

| รายการ | Scenario A — ซ่อมปกติ | Scenario B — ซ่อมด่วน |
|--------|---------------------|---------------------|
| Quotation (QT) | ✓ บังคับ | — ข้ามได้ |
| status ที่ผ่าน | ครบ 9 ขั้น | 8 ขั้น (ข้าม pending_quote) |
| GPS Photo types | pre_intake, damage_spot, pre_repair, pre_delivery, delivery | pre_intake, pre_repair, pre_delivery, delivery |
| INV บังคับ | ✓ | ✓ |
| เหมาะกับ | งานซ่อมทั่วไปต้องเสนอราคาก่อน | งานเล็ก ราคาคงที่ ลูกค้าตกลงทันที |

---

*สุดยอดมอเตอร์ — Service Order Flow (รวม v1.0+v1.1+v2.0) | เมษายน 2026*
