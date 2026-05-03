# Bug Report — รายการบักรอการทดสอบ

**เวอร์ชัน:** 2.4
**วันที่อัปเดต:** 2026-05-02
**สถานะ:** 8 บัก รอแก้ + retest

> สำหรับบักที่แก้ไขแล้ว ดู `docs/bug_fixed.md`
> สำหรับ test cases ดู `docs/test_plan.md`

---

## Summary

| Severity | จำนวน |
|----------|------|
| 🔴 Critical | 1 |
| 🟠 High | 6 |
| 🟡 Medium | 1 |
| 🟢 Low | 0 |
| **รวม** | **8** |

---

## Index

| Bug ID | Severity | Module | สรุป | Phase |
|--------|----------|--------|------|-------|
| BUG-019 | 🔴 Critical | Loan Search | Elasticsearch ไม่ทำงาน — 500 | ⏭ Skip (BE infra) |
| BUG-017 | 🟠 High | SO | "เสร็จสิ้น" แต่ DN ไม่เซ็น | ⏭ Skip (data) |
| BUG-029 | 🟠 High | HR | ไม่มี Employee Self-Service Check-In | P4A |
| BUG-008 | 🟠 High | SO | New SO Form ไม่มี CRM Lookup | P4A |
| BUG-010 | 🟠 High | GPS Photo | Step 1 ไม่มี pre_intake photo | P4B |
| BUG-011 | 🟠 High | GPS Photo | Photo upload ไม่เก็บ GPS | P4B |
| BUG-012 | 🟠 High | SO | QT items free-text ไม่เชื่อม catalog | P4B |
| BUG-014 | 🟡 Medium | SO | Stepper "ออกบิล" ไม่ตรง spec | P4C (decision) |

---

## Defect Register

### 🔴 BUG-019 — Elasticsearch Loan Search Crash (500) ⏭ Skip

| Field | Detail |
|-------|--------|
| Severity | 🔴 Critical |
| Route | `/loans/search` |

**Actual:** `"No alive nodes. All the 1 nodes seem to be down."`
**Note:** Backend infrastructure issue — ไม่ใช่ FE bug

---

### 🟠 BUG-017 — SO "เสร็จสิ้น" แต่ DN ยังไม่เซ็น ⏭ Skip

| Field | Detail |
|-------|--------|
| Severity | 🟠 High |
| Route | `/billing/jobs/repair:22` |

**Note:** ข้อมูลเก่าใน DB inconsistent — FE แสดงตาม status จริง

---

### 🟠 BUG-029 — ไม่มี Employee Self-Service Check-In

| Field | Detail |
|-------|--------|
| Severity | 🟠 High |
| Route | `/`, `/hr/attendance` |

**Repro:** Login employee → หา Check-in / Check-out
**Expected:** ปุ่มเช็คอิน/เช็คเอาท์ใน dashboard
**Actual:** ไม่มี UI — `/hr/attendance` redirect ไปทันทีถ้าไม่มีสิทธิ์
**Phase:** P4A

---

### 🟠 BUG-008 — New SO Form ไม่มี CRM Lookup

| Field | Detail |
|-------|--------|
| Severity | 🟠 High |
| Route | `/billing/new/repair` |

**Expected:** typeahead ค้นหาลูกค้าจาก CRM
**Actual:** free-text ไม่เชื่อมกับ customer DB
**Impact:** ข้อมูลซ้ำ ไม่เห็น SO history
**Phase:** P4A

---

### 🟠 BUG-010 — Step 1 ไม่มี GPS Pre-Intake Photo

| Field | Detail |
|-------|--------|
| Severity | 🟠 High |
| Route | `/billing/jobs/repair:*` Step 1 |

**Expected:** upload `pre_intake` photo + GPS metadata บังคับก่อน `pending_review`
**Actual:** ไม่มีส่วน upload เลย
**Phase:** P4B

---

### 🟠 BUG-011 — Photo Upload ไม่เก็บ GPS Coordinates

| Field | Detail |
|-------|--------|
| Severity | 🟠 High |
| Route | upload section ใน SO step ต่างๆ |

**Expected:** browser GPS permission + เก็บ lat/lng/taken_at + watermark preview
**Actual:** plain `<input type="file">`
**Phase:** P4B

---

### 🟠 BUG-012 — Quotation Items Free-Text ไม่เชื่อม Catalog

| Field | Detail |
|-------|--------|
| Severity | 🟠 High |
| Route | `/billing/jobs/repair:*` Step 3 |

**Expected:** typeahead product catalog + auto stock deduction
**Actual:** free-text input
**Note:** บางส่วนแก้แล้วใน QT form แต่ใน Step 3 ยังเป็น free-text
**Phase:** P4B

---

### 🟡 BUG-014 — SO Stepper มีขั้น "ออกบิล" ไม่ตรง Spec

| Field | Detail |
|-------|--------|
| Severity | 🟡 Medium |
| Route | `/billing/jobs/repair:*` |

**Expected:** 9 status ตาม spec ไม่มี "ออกบิล"
**Actual:** มี "ออกบิล" ระหว่าง "อนุมัติ" กับ "ซ่อม", "completed" หาย
**Phase:** P4C — รอ user ตัดสินใจ

## Process

1. แก้ตามลำดับ Phase 1 → 2 → 3 → 4A → 4B
2. หลังแก้ — ย้าย bug ไปไฟล์ `docs/bug_fixed.md`
3. Run test cases ที่เกี่ยวกับ bug นั้นจาก `docs/test_plan.md`
4. ถ้า Pass → ปิด bug (เก็บไว้ใน `bug_fixed.md` เป็นประวัติ)
5. ถ้า Fail → แก้ใหม่ + เพิ่มหมายเหตุใน entry
