# Billing Hub — ทำที่ค้างทั้งหมดให้จบ

แผนนี้ครอบคลุม **ทุกอย่างที่ยังค้าง** จากการ audit code ปัจจุบัน สรุปออกเป็น 6 Phase:

---

## สรุปปัญหาที่พบ

| # | ปัญหา | ไฟล์ |
|---|-------|------|
| 1 | **BillingHubPage** ใช้ `MOCK_JOBS` array — ข้อมูลหลอก ไม่ดึง API | `BillingHubPage.tsx` |
| 2 | **JobFlowPage** hardcode `flowType='repair'` + mock `jobData` | `JobFlowPage.tsx` |
| 3 | **StepForms** ทุกฟอร์มเป็น local state — ไม่ call API จริง | `StepForms.tsx` |
| 4 | **DocumentBrowserPage** ใช้ `MOCK_DOCS` — ไม่ดึงเอกสารจาก API | `DocumentBrowserPage.tsx` |
| 5 | **RetailPosPage** ใช้ `MOCK_PRODUCTS` — ไม่ดึงจาก product API | `RetailPosPage.tsx` |
| 6 | **PaymentModal** ไม่เชื่อม API — ยืนยันแล้วไม่บันทึก | `PaymentModal.tsx` |
| 7 | ไม่มี Type & Service สำหรับ Invoice, Deposit, DeliveryNote, Warranty | `src/types/`, `src/api/` |
| 8 | ไม่มี routes `/billing/new/repair` & `/billing/new/sale` | `routes/index.tsx` |

---

## Phase 1 — Types & API Services (Foundation)

สร้างไฟล์ type + service ที่ยังไม่มี

### Types

#### [NEW] `src/types/invoice.ts`
- `Invoice` — `id, invoice_no, type(service|sale|retail), status(draft|issued|paid|cancelled), customer_id, quotation_id, items[], subtotal, vat_percent, vat_amount, grand_total, due_date, paid_at`
- `InvoiceItem` — `id, product_id, description, quantity, unit_price, discount, subtotal`
- `Payment` — `id, invoice_id, amount, method(cash|transfer|card), reference, paid_at`
- `Receipt` — `id, invoice_id, receipt_no, issued_at`
- Payloads: `CreateInvoiceFromQTPayload`, `CreateRetailInvoicePayload`, `CreatePaymentPayload`
- `InvoiceListParams` — `search, page, limit, status, type`

#### [NEW] `src/types/deposit.ts`
- `Deposit` — `id, deposit_no, quotation_id, customer_id, amount, payment_method, receipt_number, status(collected|refunded), created_at`
- `CreateDepositPayload`, `DepositListParams`

#### [NEW] `src/types/deliveryNote.ts`
- `DeliveryNote` — `id, delivery_note_no, owner_type, owner_id, items[], signed_at, signed_by, created_at`
- `CreateDeliveryNotePayload`, `SignDeliveryNotePayload`

#### [NEW] `src/types/warranty.ts`
- `Warranty` — `id, warranty_no, owner_type, owner_id, warranty_months, warranty_km, start_date, end_date, conditions, created_at`
- `CreateWarrantyPayload`, `WarrantyListParams`

#### [NEW] `src/types/billing.ts`
- `BillingJob` — unified type merge จาก SO + QT:
  ```ts
  { id, sourceType: 'repair'|'sale', sourceId: number, jobNumber, flowType,
    customerName, description, currentStep, assignedTo, status, updatedAt }
  ```
- `BillingSummary`, `BillingJobListParams`

---

### API Services

#### [NEW] `src/api/invoiceService.ts`
| Method | Endpoint |
|--------|----------|
| `getInvoices(params)` | `GET /invoices` |
| `getInvoice(id)` | `GET /invoices/{id}` |
| `createFromQuotation(payload)` | `POST /invoices/from-quotation` |
| `createRetail(payload)` | `POST /invoices/retail` |
| `issue(id)` | `POST /invoices/{id}/issue` |
| `getPayments(id)` | `GET /invoices/{id}/payments` |
| `addPayment(id, payload)` | `POST /invoices/{id}/payments` |
| `issueReceipt(id)` | `POST /invoices/{id}/issue-receipt` |

#### [NEW] `src/api/depositService.ts`
| Method | Endpoint |
|--------|----------|
| `getDeposits(params)` | `GET /deposits` |
| `getDeposit(id)` | `GET /deposits/{id}` |
| `create(payload)` | `POST /deposits` |

#### [NEW] `src/api/deliveryNoteService.ts`
| Method | Endpoint |
|--------|----------|
| `getDeliveryNote(id)` | `GET /delivery-notes/{id}` |
| `create(payload)` | `POST /delivery-notes` |
| `sign(id, payload)` | `PATCH /delivery-notes/{id}/sign` |

#### [NEW] `src/api/warrantyService.ts`
| Method | Endpoint |
|--------|----------|
| `getWarranties(params)` | `GET /warranties` |
| `getWarranty(id)` | `GET /warranties/{id}` |
| `create(payload)` | `POST /warranties` |

#### [NEW] `src/api/billingService.ts`
Frontend-only unified service: ดึง SO + QT จาก API → merge → sort → return `BillingJob[]`

| Method | Logic |
|--------|-------|
| `getJobs(params)` | `Promise.all([serviceOrderService.getServiceOrders(), quotationService.getQuotations()])` → merge + map status → `BillingJob[]` |
| `getSummary()` | นับ active/waiting/completed/revenue จาก merged list |

---

## Phase 2 — BillingHubPage → API จริง

#### [MODIFY] `src/pages/billing/BillingHubPage.tsx`
- **ลบ** `MOCK_JOBS` array + mock summary
- **เพิ่ม** `useEffect` + `useState` ดึง `billingService.getJobs()` เมื่อ mount
- **เพิ่ม** `billingService.getSummary()` → feed SummaryCards
- **เพิ่ม** loading spinner + error state + empty state
- **เพิ่ม** pagination (`page`, `limit`, `total`)
- **แก้** link → `/billing/jobs/repair:${so.id}` หรือ `/billing/jobs/sale:${qt.id}` (encode type+id ใน URL)
- **แก้** search filter → ใช้ server-side params (ถ้า API รองรับ) หรือ client-side filter

---

## Phase 3 — JobFlowPage → Fetch ข้อมูลจริง

#### [MODIFY] `src/pages/billing/JobFlowPage.tsx`
- **Parse** URL param: `/billing/jobs/repair:15` → `sourceType='repair', sourceId=15`
- **ลบ** mock `jobData`, mock `flowType`, hardcoded `currentStep`
- **เพิ่ม** `useEffect` fetch:
  - repair → `serviceOrderService.getServiceOrder(id)` + `quotationService.getQuotations({ service_order_id: id })`
  - sale → `quotationService.getQuotation(id)`
- **คำนวณ** `currentStep` จาก SO status mapping:
  | SO Status | Step |
  |-----------|------|
  | `draft` | 0 (receive) |
  | `pending_review` | 1 (assess) |
  | `pending_quote` | 2 (quote) |
  | `approved` | 3 (approve) |
  | `in_progress` | 5 (repair) |
  | `pending_payment` | 6 (payment) |
  | `pending_pickup` | 7 (deliver) |
  | `completed/closed` | 7 ✓ |
- **ส่ง** `jobData` (real data) เป็น prop ลงไปที่ `StepContent`
- **แก้** ปุ่ม Print → ใช้ข้อมูลจาก API จริง
- **เพิ่ม** loading + error states

---

## Phase 4 — StepForms → เชื่อม API calls

#### [MODIFY] `src/pages/billing/components/StepForms.tsx`
ทุกฟอร์มจะรับ `jobData` prop + call API จริงเมื่อ submit:

| Form | Submit Action |
|------|--------------|
| `ReceiveVehicleForm` | `serviceOrderService.createServiceOrder()` → `uploadGpsPhoto()` → `onComplete(newSO)` |
| `AssessmentForm` | `serviceOrderService.addItem()` (loop items) → `transition({ target_status: 'pending_quote' })` |
| `QuotationForm` | `quotationService.createQuotation()` → `quotationService.send()` |
| `ApproveForm` | `quotationService.approve()` หรือ `quotationService.reject()` |
| `InvoiceForm` | `invoiceService.createFromQuotation()` → `invoiceService.issue()` |
| `RepairWorkForm` | `serviceOrderService.transition({ target_status: 'in_progress' })` → `transition({ target_status: 'completed' })` |
| `PaymentStepForm` | `invoiceService.addPayment()` → `invoiceService.issueReceipt()` |
| `DeliverForm` | `deliveryNoteService.create()` → `deliveryNoteService.sign()` → `warrantyService.create()` (optional) |
| `DepositForm` | `depositService.create()` |

**Key changes:**
- ทุก form รับ `jobData?: { serviceOrder, quotation, invoice }` prop
- กรณี **create mode** (จาก `/billing/new/repair`) ฟอร์มจะสร้าง record ใหม่
- กรณี **view/edit mode** (จาก `/billing/jobs/repair:15`) ฟอร์มจะ pre-fill ข้อมูลจาก API
- เพิ่ม toast notification / error handling ทุก form
- เพิ่ม `isSubmitting` state ป้องกัน double-submit

---

## Phase 5 — DocumentBrowserPage & RetailPosPage → API จริง

#### [MODIFY] `src/pages/billing/DocumentBrowserPage.tsx`
- **ลบ** `MOCK_DOCS`
- **เพิ่ม** fetch จาก 4 API endpoints (invoices, deposits, warranties, quotations, service-orders) → merge → sort by date
- **เพิ่ม** pagination, loading state
- **แก้** "งาน" column → link ไป `/billing/jobs/repair:XX` หรือ `sale:XX` จริง

#### [MODIFY] `src/pages/billing/RetailPosPage.tsx`
- **ลบ** `MOCK_PRODUCTS`
- **เพิ่ม** fetch จาก `productService.getProducts({ search })` debounced
- **แก้** ปุ่มยืนยัน → `invoiceService.createRetail()` + `invoiceService.addPayment()` + `invoiceService.issueReceipt()`
- **เพิ่ม** customer lookup → `customerService.getCustomers({ search: phone })`

#### [MODIFY] `src/pages/billing/components/PaymentModal.tsx`
- **เพิ่ม** `invoiceId` prop → เมื่อ confirm → call `invoiceService.addPayment()` + `invoiceService.issueReceipt()`
- **เพิ่ม** loading + error states

---

## Phase 6 — Routes & Cleanup

#### [MODIFY] `src/routes/index.tsx`
เพิ่ม routes ภายใน billing group:
```tsx
{ path: '/billing/new/repair', element: <JobFlowPage /> },
{ path: '/billing/new/sale',   element: <JobFlowPage /> },
```

`JobFlowPage` detect ว่าเป็น create mode จาก path (`/billing/new/*`) vs view mode (`/billing/jobs/*`)

---

## Verification Plan

### Automated Tests
1. `npm run dev` — ตรวจ compile ไม่มี error
2. เปิด browser → login → ไป `/billing` → ตรวจ job list จาก API จริง
3. คลิกเข้า job → ตรวจ stepper + ข้อมูลจริง
4. ทดสอบ create flow: กดสร้างงานซ่อม → กรอกฟอร์ม → submit → ตรวจว่าสร้าง SO สำเร็จ
5. ไป `/billing/documents` → ตรวจเอกสารจาก API
6. ไป `/billing/pos` → ค้นสินค้าจาก API

### Manual Verification
- Flow A (Repair): สร้าง SO → ประเมิน → QT → Approve → INV → Repair → Pay → Deliver
- Flow B (Sale): QT → Approve → INV → Pay → Deliver
- Flow C (POS): เลือกสินค้า → ชำระ → ปริ้นใบเสร็จ

---

## Estimated Effort

| Phase | Files | Effort |
|-------|-------|--------|
| 1. Types & Services | 10 new files | ~30 min |
| 2. BillingHubPage | 1 file modify | ~20 min |
| 3. JobFlowPage | 1 file modify | ~30 min |
| 4. StepForms | 1 file modify (heavy) | ~45 min |
| 5. DocBrowser & POS | 3 files modify | ~30 min |
| 6. Routes & Cleanup | 1 file modify | ~10 min |
| **Total** | **~17 files** | **~2.5-3 hrs** |

> [!IMPORTANT]
> **ทำทั้งหมด 6 Phase จบครบ** — ตัด mock data ทุกจุด, เชื่อม API จริงทั้งหมด, เพิ่ม routes ที่ขาด

> [!NOTE]
> API endpoints ที่ return 422 (ready) หมายถึง endpoint มีอยู่แล้ว แค่ต้องส่ง payload ที่ถูกต้อง — ฟอร์มทุกตัวจะส่ง payload ตาม schema ที่ verify ไว้แล้ว
