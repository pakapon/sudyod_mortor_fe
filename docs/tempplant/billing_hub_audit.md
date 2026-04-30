# 🔍 Billing Hub — Integration Audit Report

> **Scope:** Compare production UI (`src/pages/billing/*`) against documentation (`docs/UI_Page_Guide/06–11, 20-flows.md`)
> **Date:** 2026-04-30

---

## 1. Executive Summary

| Area | Status |
|------|--------|
| **BillingHubPage** | ✅ Working — uses mock data, needs live API |
| **JobFlowPage** (Flow A/B1/B2) | ✅ Working — stepper + print, uses mock data |
| **RetailPosPage** (Flow C) | ✅ Working — POS + thermal receipt print, uses mock data |
| **StepForms** | ✅ Working — all 9 form components rendered |
| **DocumentBrowserPage** | ✅ Working — search/filter UI, mock data |
| **20-flows.md** | ✅ Accurate — API sequences match backend design |
| **Missing API Services** | ⚠️ `invoiceService.ts`, `depositService.ts`, `deliveryNoteService.ts`, `warrantyService.ts` do NOT exist |
| **Live API Integration** | ❌ Not started — all pages use `MOCK_JOBS` / `MOCK_PRODUCTS` |

---

## 2. UI Pages vs Documentation — Gap Analysis

### 2.1 BillingHubPage (`/billing`)

| UI Feature | Doc Reference | Status | Notes |
|---|---|---|---|
| Summary cards (active/waiting/completed/revenue) | Not in any doc | ⚠️ **Undocumented** | Add to docs or derive from `GET /service-orders/summary` |
| 3 flow quick-actions (repair/sale/pos) | 20-flows §Flow A/B/C | ✅ Match | Permission-gated correctly |
| Job list table with status filter | 06-service-orders §6.1 | ⚠️ **Partial** | Uses simplified `JobStatus` (active/waiting/completed/cancelled) vs doc's 9-status SO model. Needs mapping layer |
| Search by job#/customer | 06 §6.1 | ✅ Match | |
| Link to `/billing/documents` | N/A | ✅ OK | |
| MOCK_JOBS hardcoded | — | ❌ **Must replace** | Wire to `serviceOrderService.getServiceOrders()` |

### 2.2 JobFlowPage (`/billing/jobs/:id`)

| UI Feature | Doc Reference | Status | Notes |
|---|---|---|---|
| `FLOW_STEPS.repair` (8 steps) | 20-flows §Flow A (24 API steps) | ✅ **Correct abstraction** | 8 UI steps collapse 24 API calls into logical groups |
| `FLOW_STEPS.sale_no_deposit` (4 steps) | 20-flows §Flow B1 (7 steps) | ✅ Match | |
| `FLOW_STEPS.sale_deposit` (5 steps) | 20-flows §Flow B2 (9 steps) | ✅ Match | |
| FlowStepper component | N/A (new) | ✅ OK | Desktop horizontal + mobile vertical |
| StepContent permission check | All docs mention permissions | ✅ Match | Uses `hasPermission()` from `lib/permissions.ts` |
| Print button → `window.print()` | print-document.instructions.md | ✅ Match | IIFE pattern with `print:hidden` / `print:block` |
| `STEP_DOC_CONFIG` (9 doc types) | 20-flows all doc types | ✅ Match | QT/INV/RCP/DN/DP/SO/ASM all covered |
| A4 paginated print layout | print-document.instructions.md | ✅ Match | `ROWS_PER_PAGE=10`, signature block on last page |
| Mock job data | — | ❌ **Must replace** | Hardcoded `jobData` object |

### 2.3 RetailPosPage (`/billing/pos`)

| UI Feature | Doc Reference | Status | Notes |
|---|---|---|---|
| Barcode scan input | 20-flows §C-1 | ✅ Match | Auto-focus, Enter to scan |
| Product grid (search by name/SKU/barcode) | 08 §8.2 "ทาง 2" | ✅ Match | |
| Cart with qty +/- | 08 §8.2 | ✅ Match | |
| Customer phone lookup (optional) | 08 §8.2 note "ลูกค้า optional" | ✅ Match | |
| VAT 7% calculation | 20-flows §C-1 | ✅ Match | |
| Payment method (cash/transfer/card) | 08 §8.5 | ⚠️ **Partial** | Missing `cheque`, `store_installment`, `finance_loan` |
| Cash change calculation | N/A | ✅ OK | Good UX addition |
| Thermal receipt print (monospace) | print-document.instructions.md | ✅ Match | IIFE pattern, `hidden print:block`, 280px max-width |
| MOCK_PRODUCTS hardcoded | — | ❌ **Must replace** | Wire to `productService.getProducts()` |
| No INV creation API call | 20-flows §C-1 to C-4 | ❌ **Missing** | Must call `POST /invoices/retail` → issue → payment → receipt |

### 2.4 StepForms (9 Components)

| Component | Maps to Flow Step | API Calls Needed | Status |
|---|---|---|---|
| `ReceiveVehicleForm` | A-1 to A-5 | `POST /customers`, `POST /vehicles`, `POST /service-orders`, `POST /gps-photos`, `PATCH /transition` | ❌ No API calls |
| `AssessmentForm` | A-6, A-7 | `PATCH /transition`, `POST /service-orders/{id}/items` | ❌ No API calls |
| `QuotationForm` | A-8, A-9 | `POST /quotations`, `PATCH /quotations/{id}/send` | ❌ No API calls |
| `ApproveForm` | A-10, A-11 | `PATCH /quotations/{id}/approve`, `PATCH /service-orders/{id}/transition` | ❌ No API calls |
| `InvoiceForm` | A-16, A-17 | `POST /invoices/from-quotation`, `POST /invoices/{id}/issue` | ❌ No API calls |
| `RepairWorkForm` | A-12 to A-14 | `PATCH /assign`, `PATCH /transition` ×2 | ❌ No API calls |
| `PaymentStepForm` | A-18, A-19, A-20 | `POST /invoices/{id}/payments`, `POST /invoices/{id}/issue-receipt`, `PATCH /transition` | ❌ No API calls |
| `DeliverForm` | A-21 to A-25 | `POST /gps-photos`, `POST /delivery-notes`, `PATCH /dn/{id}/sign`, `PATCH /transition`, `POST /warranties` | ❌ No API calls |
| `DepositForm` | B2-3 | `POST /deposits` | ❌ No API calls |

> [!IMPORTANT]
> **All 9 StepForms are UI-only.** No API integration exists. This is the #1 priority for live backend connection.

---

## 3. Complete API Endpoint Inventory

Below is every API endpoint the Billing Hub UI needs, with request/response payloads from `20-flows.md`.

### 3.1 Customer & Vehicle

| # | Method | Endpoint | Request Body | Response |
|---|--------|----------|-------------|----------|
| 1 | `GET` | `/customers?search={q}&limit=10` | — | `PaginatedResponse<Customer>` |
| 2 | `POST` | `/customers` | `{ type, first_name, last_name, phone }` | `{ data: { id } }` |
| 3 | `GET` | `/customers/{id}/vehicles` | — | `{ data: Vehicle[] }` |
| 4 | `POST` | `/customers/{id}/vehicles` | `{ license_plate, province, brand, model, year }` | `{ data: { id } }` |

### 3.2 Service Orders

| # | Method | Endpoint | Request Body | Response |
|---|--------|----------|-------------|----------|
| 5 | `GET` | `/service-orders?status=&branch_id=&page=&limit=` | — | `PaginatedResponse<ServiceOrder>` |
| 6 | `GET` | `/service-orders/{id}` | — | `{ data: ServiceOrder }` |
| 7 | `POST` | `/service-orders` | `{ customer_id, vehicle_id, received_date, symptom, mileage?, expected_completion_date? }` | `{ data: { id, so_number, status:"draft" } }` |
| 8 | `PATCH` | `/service-orders/{id}` | `{ symptom?, received_date?, mileage?, ... }` | `{ data: ServiceOrder }` |
| 9 | `PATCH` | `/service-orders/{id}/transition` | `{ status: "pending_review"\|"pending_quote"\|"approved"\|"in_progress"\|"completed"\|"pending_payment"\|"pending_pickup"\|"closed" }` | `{ data: ServiceOrder }` |
| 10 | `PATCH` | `/service-orders/{id}/assign` | `{ technician_id }` | `{ data: ServiceOrder }` |
| 11 | `POST` | `/service-orders/{id}/cancel` | `{ note? }` | `{ data: ServiceOrder }` |
| 12 | `PATCH` | `/service-orders/{id}/reopen` | `{}` | `{ data: ServiceOrder }` |
| 13 | `GET` | `/service-orders/summary` | — | `{ data: ServiceOrderSummary }` |

### 3.3 SO Items

| # | Method | Endpoint | Request Body | Response |
|---|--------|----------|-------------|----------|
| 14 | `GET` | `/service-orders/{id}/items` | — | `{ data: ServiceOrderItem[] }` |
| 15 | `POST` | `/service-orders/{id}/items` | `{ product_id, quantity, unit_price, pricing_type:"part"\|"labor"\|"service", discount?, notes? }` | `{ data: ServiceOrderItem }` |
| 16 | `DELETE` | `/service-orders/{id}/items/{iid}` | — | `{ data: null }` |

### 3.4 GPS Photos

| # | Method | Endpoint | Request Body | Response |
|---|--------|----------|-------------|----------|
| 17 | `GET` | `/service-orders/{id}/gps-photos` | — | `{ data: GpsPhoto[] }` |
| 18 | `POST` | `/service-orders/{id}/gps-photos` | `multipart: photo, photo_type, latitude, longitude, taken_at` | `{ data: GpsPhoto }` |
| 19 | `DELETE` | `/service-orders/{id}/gps-photos/{pid}` | — | `{ data: null }` |

### 3.5 Quotations

| # | Method | Endpoint | Request Body | Response |
|---|--------|----------|-------------|----------|
| 20 | `GET` | `/quotations?status=&type=&page=&limit=` | — | `PaginatedResponse<Quotation>` |
| 21 | `GET` | `/quotations/{id}` | — | `{ data: Quotation }` |
| 22 | `POST` | `/quotations` | `{ customer_id, type:"service"\|"sale", service_order_id?, items[], validity_days, vat_percent, note? }` | `{ data: { id, qt_number, status:"draft", valid_until } }` |
| 23 | `PATCH` | `/quotations/{id}` | `{ items[]?, validity_days?, note? }` | `{ data: Quotation }` |
| 24 | `PATCH` | `/quotations/{id}/send` | `{}` | `{ data: { status:"sent" } }` |
| 25 | `PATCH` | `/quotations/{id}/approve` | `{}` | `{ data: { status:"approved" } }` |
| 26 | `PATCH` | `/quotations/{id}/reject` | `{ reject_reason }` | `{ data: { status:"rejected" } }` |

### 3.6 Invoices ⚠️ NO `invoiceService.ts` EXISTS

| # | Method | Endpoint | Request Body | Response |
|---|--------|----------|-------------|----------|
| 27 | `GET` | `/invoices?status=&type=&page=&limit=` | — | `PaginatedResponse<Invoice>` |
| 28 | `GET` | `/invoices/{id}` | — | `{ data: Invoice }` |
| 29 | `POST` | `/invoices/from-quotation` | `{ quotation_id, due_date?, note? }` | `{ data: { id, inv_number, total, status:"draft" } }` |
| 30 | `POST` | `/invoices/retail` | `{ customer_id?, items[], vat_percent, due_date }` | `{ data: { id, inv_number, status:"draft" } }` |
| 31 | `POST` | `/invoices/{id}/issue` | `{}` | `{ data: { status:"issued" } }` |
| 32 | `POST` | `/invoices/{id}/cancel` | `{ cancel_reason }` | `{ data: Invoice }` |

### 3.7 Payments

| # | Method | Endpoint | Request Body | Response |
|---|--------|----------|-------------|----------|
| 33 | `GET` | `/invoices/{id}/payments` | — | `{ data: Payment[] }` |
| 34 | `POST` | `/invoices/{id}/payments` | `{ amount, method:"cash"\|"transfer"\|"credit_card"\|"cheque"\|"store_installment"\|"finance_loan", payment_date, reference_no?, note? }` | `{ data: Payment }` |

### 3.8 Receipts

| # | Method | Endpoint | Request Body | Response |
|---|--------|----------|-------------|----------|
| 35 | `POST` | `/invoices/{id}/issue-receipt` | `{}` | `{ data: { receipt_number } }` |

### 3.9 Deposits ⚠️ NO `depositService.ts` EXISTS

| # | Method | Endpoint | Request Body | Response |
|---|--------|----------|-------------|----------|
| 36 | `GET` | `/deposits` | — | `PaginatedResponse<Deposit>` |
| 37 | `POST` | `/deposits` | `{ quotation_id, amount, payment_method, reference_no?, note? }` | `{ data: { id, status:"collected" } }` |
| 38 | `PATCH` | `/deposits/{id}/refund` | `{}` | `{ data: Deposit }` |
| 39 | `GET` | `/deposits/{id}/receipt` | — | `Blob (PDF)` |

### 3.10 Delivery Notes ⚠️ NO `deliveryNoteService.ts` EXISTS

| # | Method | Endpoint | Request Body | Response |
|---|--------|----------|-------------|----------|
| 40 | `GET` | `/delivery-notes` | — | `PaginatedResponse<DeliveryNote>` |
| 41 | `POST` | `/delivery-notes` | `{ owner_type:"service_order"\|"quotation", owner_id, customer_id, note? }` | `{ data: { id, dn_number } }` |
| 42 | `PATCH` | `/delivery-notes/{id}/sign` | `{ signed_by }` | `{ data: DeliveryNote }` |

### 3.11 Warranties ⚠️ NO `warrantyService.ts` EXISTS

| # | Method | Endpoint | Request Body | Response |
|---|--------|----------|-------------|----------|
| 43 | `GET` | `/warranties` | — | `PaginatedResponse<Warranty>` |
| 44 | `POST` | `/warranties` | `{ owner_type:"service_order"\|"quotation", owner_id, warranty_months, start_date, warranty_km?, conditions? }` | `{ data: Warranty }` |

**Total: 44 endpoints** — 17 exist in service files, **27 are missing**.

---

## 4. Missing API Service Files

| File Needed | Endpoints | Priority |
|---|---|---|
| `src/api/invoiceService.ts` | #27–35 (9 endpoints) | 🔴 Critical |
| `src/api/depositService.ts` | #36–39 (4 endpoints) | 🟡 High |
| `src/api/deliveryNoteService.ts` | #40–42 (3 endpoints) | 🟡 High |
| `src/api/warrantyService.ts` | #43–44 (2 endpoints) | 🟢 Medium |

---

## 5. 20-flows.md — Readiness Assessment

### Flow A — ซ่อมรถ (24 steps)

| Step | API | Frontend Service Exists? | UI Component? | Verdict |
|------|-----|-------------------------|---------------|---------|
| A-1 | `GET/POST /customers` | ✅ `customerService` | ✅ ReceiveVehicleForm | 🟢 Ready to wire |
| A-2 | `GET/POST /vehicles` | ✅ `customerService` | ✅ ReceiveVehicleForm | 🟢 Ready to wire |
| A-3 | `POST /service-orders` | ✅ `serviceOrderService` | ✅ ReceiveVehicleForm | 🟢 Ready to wire |
| A-4 | `POST /gps-photos` | ✅ `serviceOrderService` | ✅ AssessmentForm | 🟢 Ready to wire |
| A-5 | `PATCH /transition` | ✅ `serviceOrderService` | ✅ ReceiveVehicleForm | 🟢 Ready to wire |
| A-6 | `PATCH /transition` | ✅ | ✅ AssessmentForm | 🟢 |
| A-7 | `POST /items` | ✅ | ✅ AssessmentForm | 🟢 |
| A-8 | `POST /quotations` | ✅ `quotationService` | ✅ QuotationForm | 🟢 |
| A-9 | `PATCH /send` | ✅ | ✅ QuotationForm | 🟢 |
| A-10 | `PATCH /approve` | ✅ | ✅ ApproveForm | 🟢 |
| A-11 | `PATCH /transition` | ✅ | ✅ ApproveForm | 🟢 |
| A-12 | `PATCH /assign` | ✅ | ✅ RepairWorkForm | 🟢 |
| A-13 | `PATCH /transition` | ✅ | ✅ RepairWorkForm | 🟢 |
| A-14 | `PATCH /transition` | ✅ | ✅ RepairWorkForm | 🟢 |
| A-15 | `PATCH /transition` | ✅ | ✅ PaymentStepForm | 🟢 |
| A-16 | `POST /invoices/from-quotation` | ❌ **No service** | ✅ InvoiceForm | 🔴 Blocked |
| A-17 | `POST /invoices/{id}/issue` | ❌ | ✅ InvoiceForm | 🔴 Blocked |
| A-18 | `POST /invoices/{id}/payments` | ❌ | ✅ PaymentStepForm | 🔴 Blocked |
| A-19 | `POST /issue-receipt` | ❌ | ✅ PaymentStepForm | 🔴 Blocked |
| A-20 | `PATCH /transition` | ✅ | ✅ PaymentStepForm | 🟢 |
| A-21 | `POST /gps-photos` | ✅ | ✅ DeliverForm | 🟢 |
| A-22 | `POST /delivery-notes` | ❌ **No service** | ✅ DeliverForm | 🔴 Blocked |
| A-23 | `PATCH /dn/{id}/sign` | ❌ | ✅ DeliverForm | 🔴 Blocked |
| A-24 | `PATCH /transition` | ✅ | ✅ DeliverForm | 🟢 |
| A-25 | `POST /warranties` | ❌ **No service** | ✅ DeliverForm | 🔴 Blocked |

> **Summary:** 15/24 steps ready, **9 blocked** by missing service files.

### Flow B1/B2/C — Same pattern

All blocked steps are in Invoice, Deposit, DN, and Warranty — same 4 missing service files.

---

## 6. Documentation Update Recommendations

### 06-service-orders.md
- ✅ Accurate as-is. No changes needed.
- ℹ️ Consider adding note: "SO is now managed inside Billing Hub (`/billing/jobs/:id`), old route `/service-orders` redirected."

### 07-quotations.md
- ✅ API endpoints and payloads match `20-flows.md`.
- ⚠️ **Add:** `validity_days` send vs `valid_until` receive clarification is already there — good.
- ⚠️ **Update route:** Old `/quotations/create` route now handled inside `JobFlowPage` stepper. Add note.

### 08-invoices.md
- ✅ API structure matches.
- ⚠️ **Add note:** Old routes `/invoices/*` redirect to `/billing`. Invoice creation is now embedded in flow stepper.
- ⚠️ **Missing from doc:** `POST /invoices/{id}/payments` payload has `payment_date` in 20-flows but doc says `paid_at`. **Align to `payment_date`**.

### 09-deposits.md
- ✅ Accurate and minimal.
- ⚠️ **Add note:** Old route `/deposits/*` redirects to `/billing`. Deposit creation embedded in B2 flow stepper.
- ⚠️ **Missing field in doc:** `payment_method` (20-flows) vs `method` (doc). **Align to `payment_method`**.

### 10-delivery-notes.md
- ⚠️ **Update:** Doc says `POST /delivery-notes { invoice_id }`. 20-flows says `{ owner_type, owner_id, customer_id }`. **20-flows is correct** — DN can be linked to SO or QT, not just Invoice.
- ⚠️ **Add:** `signed_by` field to sign endpoint.

### 11-warranties.md
- ⚠️ **Update:** Doc says `owner_type` can be `service_order` or `invoice`. 20-flows says `service_order` or `quotation`. **Align to 20-flows** (quotation for B1/B2).
- ⚠️ **Add:** `warranty_km` field (exists in 20-flows A-25 but not in doc).

### 20-flows.md
- ✅ **No changes needed.** This is the source of truth and all API sequences are accurate.

---

## 7. Route Redirect Summary

These old routes now redirect to `/billing`:

```
/invoices      → /billing
/invoices/*    → /billing
/deposits      → /billing
/deposits/*    → /billing
/delivery-notes   → /billing
/delivery-notes/* → /billing
/warranties    → /billing
/warranties/*  → /billing
```

Old standalone pages for QT, INV, DP, DN, WR are **no longer needed** as separate pages — all managed through the flow stepper.

---

## 8. Priority Action Items

| # | Task | Effort | Blocking |
|---|------|--------|----------|
| 1 | Create `invoiceService.ts` (9 endpoints) | 1h | Flow A/B/C payment |
| 2 | Create `depositService.ts` (4 endpoints) | 30m | Flow B2 |
| 3 | Create `deliveryNoteService.ts` (3 endpoints) | 30m | Flow A close |
| 4 | Create `warrantyService.ts` (2 endpoints) | 20m | Optional close |
| 5 | Wire StepForms to live APIs | 4-6h | Full integration |
| 6 | Replace MOCK_JOBS in BillingHubPage | 1h | Dashboard accuracy |
| 7 | Replace MOCK_PRODUCTS in RetailPosPage | 1h | POS accuracy |
| 8 | Update docs 08-11 field name alignment | 30m | Documentation accuracy |
| 9 | Add RetailPosPage full API flow (C-1→C-4) | 2h | POS completion |
