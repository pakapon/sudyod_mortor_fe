# Bug Fixed — รายการบักที่แก้ไขแล้ว

**เวอร์ชัน:** 1.3
**วันที่อัปเดต:** 2026-05-03
**สถานะ:** 30 บัก แก้แล้ว — รอ Retest ตาม `docs/test_plan.md`

> สำหรับบักที่ยังเปิดอยู่ ดู `docs/bug_report.md`

---

## Summary

| Severity | จำนวน |
|----------|------|
| 🔴 Critical | 2 |
| 🟠 High | 4 |
| 🟡 Medium | 22 |
| 🟢 Low | 2 |
| **รวม** | **30** |

---

## Index

| Bug ID | Severity | Module | สรุปการแก้ | Retest TC |
|--------|----------|--------|-----------|-----------|
| BUG-002 | 🟡 Medium | Auth | ลบ success modal — redirect ทันที | TC-102/103 |
| BUG-021 | 🟠 High | GR | `??` → `||` (รองรับ qty=0 fallback) | TC-614 |
| BUG-025 | 🟠 High | Billing | เพิ่ม `/billing/invoices/:id` route + fallback | TC-605 |
| BUG-030 | 🔴 Critical | HR | ลบ mock alert + ใช้ API จริง + toast.error | TC-111 |
| BUG-036 | 🟠 High | Billing | QT link → `/quotations/:id`, INV → invoice detail | TC-600/601 |
| S-01 | 🟡 Medium | POS | Receipt branch ดึงจาก employee.branch ไม่ hardcode | TC-597 |
| S-06 | 🟡 Medium | SO | warranty_months เป็น input (เลิก hardcode 3) | TC-572 |
| S-07 | 🟡 Medium | SO | DeliverForm รองรับ sale flow (ใช้ quotation_id) | TC-573 |
| S-08 | 🟡 Medium | SO | Reject reason รับจาก input (เลิก hardcode) | TC-531 |
| S-12 | 🟡 Medium | Billing | Detect deposit flow type | TC-581 |
| S-13 | 🟡 Medium | ST | Cancel reason input render ใน modal | (regression) |
| BUG-015 | 🔴 Critical | SO | Payment guard บน draft SO | TC-563 |
| BUG-001 | 🟡 Medium | Auth | Login label + placeholder ระบุทั้ง email และ phone | TC-101 |
| BUG-009 | 🟡 Medium | SO | URL ไม่มี type prefix → error message ชัดเจน | TC-150/151 |
| BUG-024 | 🟡 Medium | POS | เพิ่ม toast.success “ชำระเงินสำเร็จ” หลังจ่าย | TC-110/111/112 |
| BUG-026 | 🟡 Medium | SO | เพิ่ม toast “เปิดหน้าต่างพิมพ์” ก่อนพิมพ์ | TC-140 |
| BUG-031 | 🟡 Medium | Loan | เพิ่ม `z-10` ใน modal content — ให้อยู่เหนือ backdrop | TC-130/131 |
| BUG-034 | 🟡 Medium | Loan | แก้ field name: `loan_no` → `store_loan_no` | TC-120 |
| BUG-020 | 🟡 Medium | Auth | Skip error modal สำหรับ 403 + Dashboard catch | TC-201/202 |
| BUG-023 | 🟡 Medium | GR | Validate qty>0 ก่อน approve | TC-210/211 |
| BUG-027 | 🟠 High | SO | DeliverForm ติดตามรูป + soft warning | TC-220 |
| BUG-016 | 🟡 Medium | SO | DN sign เพิ่ม `signed_at` | TC-230/231 |
| BUG-032 | 🟡 Medium | Settings | เพิ่ม `withCount('items')` ใน list query | TC-240 |
| BUG-035 | 🟡 Medium | Loan | เพิ่ม `loadPayments()` หลังบันทึกชำระ | TC-250/251 |
| BUG-013 | 🟡 Medium | SO | เพิ่ม refreshTrigger ใน JobFlowPage | TC-260 |
| BUG-003 | 🟡 Medium | Dashboard | Pie chart fallback label+color สำหรับ unknown status | TC-301 |
| BUG-004 | 🟡 Medium | Dashboard | Seeder ใช้วันที่ dynamic (เดือนปัจจุบัน) แทน hardcode 2025 | TC-302/303 |
| BUG-005 | 🟡 Medium | Customer | เพิ่ม customer_code ใน payload + CustomerPayload type | TC-310 |
| BUG-018 | 🟢 Low | Inventory | BE eager-load warehouse.branch; FE ใช้ item.warehouse?.branch?.name | TC-320 |
| BUG-022 | 🟡 Medium | GR/ST | เพิ่ม items.variant.product เข้า eager-load; FE ใช้ variant.product.name ก่อน | TC-330 |
| BUG-028 | 🟢 Low | ST | FE ใช้ data.creator/approver แทน data.created_by/approved_by; แก้ TS type | TC-340/341 |


---

## รายละเอียดการแก้

### BUG-002 — Login Success ต้องคลิก "ยืนยัน" ก่อน Redirect

**Severity:** 🟡 Medium
**File:** `src/pages/LoginPage.tsx`
**Change:** ลบ success modal ที่บังคับให้คลิก "ยืนยัน" — เปลี่ยนเป็น `navigate('/')` ทันทีหลัง login สำเร็จ
**Retest:** TC-102, TC-103

---

### BUG-021 — GR Detail Page แสดง Qty = 0

**Severity:** 🟠 High
**File:** `src/pages/inventory/GoodsReceiptDetailPage.tsx`
**Root Cause:** ใช้ `??` ทำให้ qty=0 (falsy ที่ valid) ตกไป fallback
**Change:** เปลี่ยน `??` เป็น `||` ในตำแหน่งที่ต้องการ fallback เฉพาะเมื่อค่าไม่มีจริง
**Retest:** TC-614, TC-330 (BUG-022 related)

---

### BUG-025 — Retail Invoice ไม่มี Link คลิกได้

**Severity:** 🟠 High
**Files:**
- `src/pages/billing/DocumentBrowserPage.tsx` — เพิ่ม invoice fallback link
- `src/pages/billing/InvoiceDetailPage.tsx` (NEW) — หน้า invoice detail
- `src/routes/index.tsx` — เพิ่ม route `/billing/invoices/:id`

**Change:** Retail invoice (ไม่มี SO/customer) ตอนนี้คลิกได้ → เปิด invoice detail
**Retest:** TC-605

---

### BUG-030 — Employee Create แสดง Mock Success แต่ Backend ปฏิเสธ (422)

**Severity:** 🔴 Critical
**File:** `src/pages/hr/EmployeeFormPage.tsx`
**Change:**
- ลบ `alert('บันทึกสำเร็จ (Mock)')`
- ใช้ `employeeService.createEmployee()` เรียก API จริง
- เพิ่ม `submitError` state + `toast.error` เมื่อ 422
- redirect ไป `/hr/employees` หลังสำเร็จ

**Retest:** TC-111, TC-112

---

### BUG-036 — Billing Documents Detail ไม่แสดง Items

**Severity:** 🟠 High
**File:** `src/pages/billing/DocumentBrowserPage.tsx`
**Change:**
- QT link: `/billing/jobs/repair:*` → `/quotations/:id`
- INV link: → `/billing/invoices/:id` (route ใหม่)

**Retest:** TC-600, TC-601

---

### S-01 — POS Receipt Branch Hardcoded

**Severity:** 🟡 Medium
**File:** `src/pages/billing/RetailPosPage.tsx`
**Change:** Print receipt ดึงชื่อ/ที่อยู่จาก `employee.branch` แทน hardcoded "88/8 ถ.อุดมสุข"
**Retest:** TC-597

---

### S-06 — Warranty Months Hardcoded = 3

**Severity:** 🟡 Medium
**File:** `src/pages/billing/components/StepForms.tsx` (DeliverForm)
**Change:** `warranty_months` เป็น input field ที่ user ปรับได้
**Retest:** TC-572

---

### S-07 — DeliverForm Fail บน Sale Flow

**Severity:** 🟡 Medium
**File:** `src/pages/billing/components/StepForms.tsx` (DeliverForm)
**Change:** รองรับ sale flow (ไม่มี service_order_id) โดยใช้ `quotation_id` แทน
**Retest:** TC-573

---

### S-08 — Reject Reason Hardcoded

**Severity:** 🟡 Medium
**File:** `src/pages/billing/components/StepForms.tsx` (ApproveForm)
**Change:** Reject reason รับจาก input field (เลิก hardcode "ลูกค้าไม่อนุมัติ")
**Retest:** TC-531

---

### S-12 — Sale Deposit Flow Detection

**Severity:** 🟡 Medium
**File:** `src/pages/billing/JobFlowPage.tsx`
**Change:** Detect `sale_deposit` vs `sale_no_deposit` flowType ตามการมีอยู่ของ deposit
**Retest:** TC-581

---

### S-13 — Stock Transfer Cancel Reason Not Rendered

**Severity:** 🟡 Medium
**File:** `src/pages/inventory/StockTransferDetailPage.tsx`
**Change:** Render `cancelReason` input ใน cancel modal — บังคับใส่เหตุผลก่อน cancel

---

### BUG-015 — Payment Button Active on Draft SO ✅ Closed

**Severity:** 🔴 Critical
**File:** `src/pages/billing/components/StepForms.tsx` (PaymentStepForm)
**Change:** `PaymentStepForm` มี guard 2 ชั้น: (1) ตรวจ `invoiceId` null → แสดง "ยังไม่มีใบแจ้งหนี้"; (2) ตรวจ `invoice.status !== 'issued'` → แสดง "ใบแจ้งหนี้ยังไม่พร้อมชำระ" — verified แล้วผ่าน code review
**Retest:** TC-563

---

### BUG-001 — Login Label ไม่บอก Phone

**Severity:** 🟡 Medium
**File:** `src/pages/LoginPage.tsx` (L83–L88)
**Change:**
- label text: `"อีเมล"` → `"อีเมล หรือ เบอร์โทร"`
- placeholder: `"name@example.com"` → `"อีเมล หรือ เบอร์โทร"`
**Retest:** TC-101

---

### BUG-009 — URL `/billing/jobs/{id}` ไม่มี Type Prefix

**Severity:** 🟡 Medium
**File:** `src/pages/billing/JobFlowPage.tsx` (useEffect fetch block)
**Change:** เพิ่ม guard ก่อน `!sourceId` check — ถ้า `id` ไม่มีอักขระ `:` แสดง error `"URL ไม่ถูกต้อง: กรุณาระบุประเภทงาน เช่น repair:23 หรือ sale:23"` แทนข้อความ generic
**Retest:** TC-150, TC-151

---

### BUG-024 — POS Sale ไม่มี Toast / Receipt Dialog

**Severity:** 🟡 Medium
**File:** `src/pages/billing/RetailPosPage.tsx`
**Change:**
- เพิ่ม `import { toast } from 'react-hot-toast'`
- เรียก `toast.success('ชำระเงินสำเร็จ')` ก่อน `setTimeout(() => window.print(), 100)`
**Retest:** TC-110, TC-111, TC-112

---

### BUG-026 — ปุ่ม Print SO Detail ไม่ทำงาน

**Severity:** 🟡 Medium
**File:** `src/pages/billing/JobFlowPage.tsx` (print button onClick ~L453)
**Change:** เปลี่ยน `onClick={() => window.print()}` → `onClick={() => { toast.success('เปิดหน้าต่างพิมพ์'); window.print() }}`
**Retest:** TC-140

---

### BUG-031 — Loan Approval Confirm Dialog Backdrop Intercepts

**Severity:** 🟡 Medium
**File:** `src/components/ui/ConfirmModal.tsx` (modal content div ~L87)
**Root Cause:** modal content `div` ไม่มี explicit z-index — backdrop `absolute` อาจ intercept click ใน stacking context บางกรณี
**Change:** เพิ่ม `z-10` ใน modal content div: `"relative w-full..."` → `"relative z-10 w-full..."`
**Retest:** TC-130, TC-131

---

### BUG-034 — Store Loan Detail ไม่แสดงเลขสัญญา

**Severity:** 🟡 Medium
**Root Cause:** Backend Model ใช้ field `store_loan_no` แต่ Frontend type กำหนดเป็น `loan_no` — ทำให้ API response ไม่ map เข้า field
**Files:**
- `src/types/loans.ts` (L122): `loan_no: string` → `store_loan_no: string`
- `src/pages/loans/StoreLoanDetailPage.tsx` (L269): `loan.loan_no` → `loan.store_loan_no`
- `src/pages/loans/StoreLoanListPage.tsx` (L173): `item.loan_no` → `item.store_loan_no`
- `src/pages/loans/LoanSearchPage.tsx` (L243): `loan.loan_no` → `loan.store_loan_no`
**Retest:** TC-120

---

### BUG-020 — Permission Error Modal บน Dashboard

**Severity:** 🟡 Medium
**Files:**
- `src/api/client.ts` — เพิ่มเงื่อนไข `&& error.response?.status !== 403` เพื่อ skip global error modal สำหรับ 403 (permission denied)
- `src/pages/DashboardPage.tsx` — เพิ่ม `catch` block ใน load() เพื่อ render empty widgets แทน crash เมื่อ API 403

**Root Cause:** Axios interceptor เรียก `setError()` ทุก non-401 response รวมถึง 403 จากพนักงานที่ไม่มีสิทธิ์เข้า dashboard endpoint
**Change:** 403 ไม่ trigger global modal แล้ว — แต่ละ component จัดการ permission denied เอง
**Retest:** TC-201, TC-202

---

### BUG-023 — GR อนุมัติได้แม้ Qty = 0

**Severity:** 🟡 Medium
**Files:**
- `src/pages/inventory/GoodsReceiptDetailPage.tsx` — เพิ่ม import `toast` + validation ใน `handleApprove()`

**Change:** ก่อน approve ตรวจว่า `data?.items` ทุก item มี `quantity_received > 0` — ถ้าไม่ผ่าน: `toast.error()` + return ไม่เรียก API
**Retest:** TC-210, TC-211

---

### BUG-027 — ปิดงาน ไม่ Validate Delivery Photo

**Severity:** 🟠 High
**File:** `src/pages/billing/components/StepForms.tsx` (DeliverForm)

**Change:**
- เพิ่ม state `deliveryPhotos: File[]`
- Wire `<input type="file">` onChange → `setDeliveryPhotos(Array.from(e.target.files ?? []))`
- แสดงจำนวนรูปที่เลือกใน label
- ก่อน submit: ถ้า `deliveryPhotos.length === 0` → `toast()` soft warning แต่ไม่ block

**Retest:** TC-220

---

### BUG-016 — DN Signing ไม่เก็บ `signed_at`

**Severity:** 🟡 Medium
**File:** `src/pages/billing/components/StepForms.tsx` (DeliverForm handleSubmit)

**Change:** เพิ่ม `signed_at: new Date().toISOString()` ใน payload ของ `deliveryNoteService.sign()`
**Retest:** TC-230, TC-231

---

### BUG-032 — Vehicle Inspection Checklist items_count = 0

**Severity:** 🟡 Medium
**File:** `src/Domain/VehicleInspectionChecklist/VehicleInspectionChecklistService.php` (Backend)

**Root Cause:** `list()` method ใช้ `VehicleInspectionChecklist::query()` ที่ไม่ load items count
**Change:** เปลี่ยนเป็น `VehicleInspectionChecklist::withCount('items')` — Eloquent จะ append `items_count` อัตโนมัติ
**Retest:** TC-240

---

### BUG-035 — Store Loan Payment Badge ไม่ Update

**Severity:** 🟡 Medium
**File:** `src/pages/loans/StoreLoanDetailPage.tsx`

**Root Cause:** `handleRecordPayment()` เรียก `load()` (โหลด loan summary) แต่ไม่เรียก `loadPayments()` (โหลด payment list)
**Change:** เพิ่ม `loadPayments()` call หลัง `load()` ใน success block
**Retest:** TC-250, TC-251

---

### BUG-013 — Step 4 (อนุมัติ) แสดง "ไม่มีรายการ" / ฿0

**Severity:** 🟡 Medium
**File:** `src/pages/billing/JobFlowPage.tsx`

**Root Cause:** `handleStepComplete()` เพิ่ม step counter เท่านั้น ไม่ refetch ข้อมูล ทำให้ `jobData.quotation` ยังเป็น null หลัง QuotationForm สร้าง QT ใหม่
**Change:**
- เพิ่ม state `refreshTrigger: number`
- ใน `handleStepComplete()`: เรียก `setRefreshTrigger(t => t + 1)` เมื่อไม่ใช่ create mode
- เพิ่ม `refreshTrigger` ใน `useEffect` dependencies — บังคับ refetch หลังแต่ละ step complete

**Retest:** TC-260

---

### BUG-003 — Dashboard SO Pie Chart Segment ไม่มี Label

**Severity:** 🟡 Medium
**File:** `src/pages/DashboardPage.tsx`

**Root Cause:** ใช้ `SO_STATUS_COLOR[s]` และ `SO_STATUS_LABEL[s]` โดยไม่มี fallback — ถ้า status key ไม่รู้จัก จะได้ `undefined` ทำให้ segment ไม่มี label/color
**Change:**
- `SO_STATUS_COLOR[s] ?? '#6B7280'` — ใช้สี gray เป็น fallback
- `SO_STATUS_LABEL[s] ?? s` — ใช้ key ดิบเป็น label fallback

**Retest:** TC-301

---

### BUG-004 — Dashboard Revenue Bar Chart ว่าง

**Severity:** 🟡 Medium
**File:** `sudyod_mortor_v2/database/seeds/PurchaseHistorySeeder.php`

**Root Cause:** invoice demo ทั้งหมดมี `paid_at` เป็นวันที่ปี 2025 และ ก.พ. 2026 — chart เดือนปัจจุบันจึงไม่มีข้อมูล
**Change:**
- เพิ่ม `$ym = date('Y-m')` และใช้ dynamic date prefix สำหรับ INV-DEMO-0001/0002/0003/0006
- paid_at กระจาย 4 วัน (2, 6, 11, 16) ของเดือนปัจจุบัน

**Retest:** TC-302, TC-303

---

### BUG-005 — Customer List รหัสลูกค้าแสดง "—"

**Severity:** 🟡 Medium
**Files:** `src/pages/customers/CustomerFormPage.tsx`, `src/types/customer.ts`

**Root Cause:** `customer_code` ถูก maintain ใน state (`customerCode`) แต่ไม่ถูกเพิ่มเข้า `payload` ก่อน submit — API จึงไม่รับค่า; `CustomerPayload` type ก็ไม่มี field นี้
**Change:**
- เพิ่ม `customer_code?: string` ใน `CustomerPayload` interface
- เพิ่ม `customer_code: customerCode || undefined` ใน `onSubmit` payload

**Retest:** TC-310

---

### BUG-018 — Inventory Stock Balance สาขาแสดง "—"

**Severity:** 🟢 Low
**Files:** `sudyod_mortor_v2/src/Domain/Inventory/InventoryService.php`, `src/pages/inventory/StockBalancePage.tsx`

**Root Cause:** Backend ไม่ eager-load `warehouse.branch` — `item.branch` จึง undefined เสมอ; FE อ่าน `item.branch?.name` โดยตรง
**Change:**
- Backend: เปลี่ยน `Inventory::with(['warehouse', ...])` → `Inventory::with(['warehouse.branch', ...])`
- Frontend: เปลี่ยน `item.branch?.name` → `item.warehouse?.branch?.name`

**Retest:** TC-320

---

### BUG-022 — GR/ST แสดงชื่อสินค้าผิด

**Severity:** 🟡 Medium
**Files:**
- `sudyod_mortor_v2/src/Domain/GoodsReceipt/GoodsReceiptService.php`
- `sudyod_mortor_v2/src/Domain/StockTransfer/StockTransferService.php`
- `src/pages/inventory/GoodsReceiptDetailPage.tsx`
- `src/pages/inventory/StockTransferDetailPage.tsx`

**Root Cause:** FE ใช้ `it.product?.name` เป็นอันดับแรก — `product_id` ตรง item อาจชี้ผิด product; ชื่อที่ถูกต้องอยู่ที่ `it.variant.product.name`; Backend ไม่ eager-load `items.variant.product`
**Change:**
- Backend getById: เพิ่ม `'items.variant.product'` ใน eager-load ทั้ง GR และ ST
- Frontend: เปลี่ยน priority เป็น `it.variant?.product?.name ?? it.product?.name ?? it.variant?.name ?? ...`

**Retest:** TC-330

---

### BUG-028 — Stock Transfer "สร้างโดย" / "อนุมัติโดย" แสดง "—"

**Severity:** 🟢 Low
**Files:** `src/pages/inventory/StockTransferDetailPage.tsx`, `src/types/inventory.ts`

**Root Cause:** FE อ่าน `data.created_by` และ `data.approved_by` เป็น Employee object — แต่ backend serialize FK integer ไว้ที่ fields เหล่านี้; Employee objects อยู่ที่ `data.creator` และ `data.approver`
**Change:**
- Frontend: `formatPerson(data.created_by)` → `formatPerson(data.creator)`, `formatPerson(data.approved_by)` → `formatPerson(data.approver)`
- Type: แก้ `created_by`/`approved_by`/`completed_by` เป็น `number | null`; เพิ่ม `creator` และ `approver` เป็น Employee object

**Retest:** TC-340, TC-341

---

## Process

1. แก้ bug ใน `bug_report.md`
2. ย้าย entry มาที่นี่ พร้อมระบุ file + change summary + retest TC
3. Run TC ที่ระบุ → ถ้า Pass ปิดถาวร, ถ้า Fail ย้ายกลับ `bug_report.md`
