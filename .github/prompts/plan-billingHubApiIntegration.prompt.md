# Plan: Billing Hub — Full API Integration

## Overview
5 phases, ~6 files modified, no new files needed.
All API service files already exist. Focus is replacing mock data and fixing create-mode redirect.

## Decisions (confirmed)
- Revenue in SummaryCards → compute from `invoiceService.getInvoices({ status: 'paid', date_from: today })`
- Sale jobs → merged into BillingHub list alongside repair SOs  
- DocumentBrowserPage → fetch SO + QT + INV only (3 parallel calls)

---

## Phase 1 — Type Fix `src/types/invoice.ts`

Fix `CreateRetailInvoicePayload` — backend (`CreateRetailInvoiceAction.php`) expects `{ customer_id?, vat_percent, due_date, note, items[] }`. Current type has wrong `payment_method` field.

**Change:**
- Remove `payment_method: PaymentMethod`
- Add `vat_percent?: number`, `due_date?: string`, `note?: string`

---

## Phase 2 — Create Mode Redirect + Invoice Tracking
**Files: `JobFlowPage.tsx` + `StepForms.tsx`**

**Bug:** After `ReceiveVehicleForm` creates a new SO in `/billing/new/repair`, it calls `onComplete()` with no id — so step 2+ have `jobData.serviceOrder === null` and fail.

**Changes:**

1. `FormProps` type → `onComplete: (meta?: { newId?: number; invoiceId?: number }) => void`
2. `ReceiveVehicleForm`: after `createServiceOrder()`, call `onComplete({ newId: so.id })`
3. `QuotationForm` (create mode): after `createQuotation()` + `send()`, call `onComplete({ newId: qt.id })`
4. `InvoiceForm`: after `createFromQuotation()` + `issue()`, call `onComplete({ invoiceId: inv.id })`
5. `PaymentStepForm`: use `jobData?.invoice?.id` directly instead of broken `invoiceService.getInvoices({ service_order_id })` call (backend doesn't support that filter)
6. `JobData` interface: add `invoice?: { id: number; invoice_no?: string } | null`
7. `buildJobData()`: fetch invoice from `invoiceService.getInvoices({ customer_id, quotation_id })` in `fetchData`
8. `handleStepComplete(meta?)`:
   - if `isCreateMode && meta?.newId` → navigate to `/billing/jobs/repair:N` or `/billing/jobs/sale:N`
   - if `meta?.invoiceId` → update `jobData.invoice = { id: meta.invoiceId }` then increment step
   - else → just increment step

---

## Phase 3 — BillingHubPage: Replace MOCK_JOBS
**File: `src/pages/billing/BillingHubPage.tsx`**

1. Remove `MOCK_JOBS` and mock `summary`
2. `useEffect` on mount — fetch in parallel:
   - `serviceOrderService.getSummary()` → count active/waiting/completed
   - `serviceOrderService.getServiceOrders({ page, limit: 20 })` → repair jobs
   - `quotationService.getQuotations({ type: 'sale', page, limit: 20 })` → sale jobs
   - `invoiceService.getInvoices({ status: 'paid', limit: 100 })` → sum `grand_total` for revenue
3. Map SO → `JobItem`: link = `/billing/jobs/repair:${so.id}`, status mapping:
   - `in_progress | pending_payment | pending_pickup` → `active`
   - `draft | pending_review | pending_quote | approved | completed` → `waiting`
   - `closed` → `completed`
   - `cancelled` → `cancelled`
4. Map sale QT → `JobItem`: link = `/billing/jobs/sale:${qt.id}`, status mapping:
   - `draft | sent` → `waiting`
   - `approved` → `active`
   - `rejected | expired` → `cancelled`
5. Merge both lists, sort by `updated_at` descending
6. `SummaryData.totalRevenue` = sum of paid invoices `grand_total`
7. Add loading state (skeleton rows), empty state, pagination (prev/next page buttons)

---

## Phase 4 — RetailPosPage: Replace Mock + Wire Checkout
**File: `src/pages/billing/RetailPosPage.tsx`**
*(depends on Phase 1 type fix)*

1. Add `useEffect` + debounced search (400ms) → `productService.getProducts({ search, limit: 20, is_active: true })`
2. Map `Product` from API → local `Product` interface (fields: `id, sku, name, selling_price, stock_qty, unit`)
3. On checkout confirm button:
   ```
   const inv = await invoiceService.createRetail({ customer_id?, vat_percent: 7, items: cart.map(...), due_date: today })
   await invoiceService.issue(inv.id)
   await invoiceService.addPayment(inv.id, { amount: total, method: paymentMethod, paid_at: now })
   await invoiceService.issueReceipt(inv.id)
   ```
4. Add `isSubmitting` guard, `toast.success`, clear cart after success

---

## Phase 5 — DocumentBrowserPage: Replace Mock
**File: `src/pages/billing/DocumentBrowserPage.tsx`**

1. Remove `MOCK_DOCS`
2. `useEffect` on mount → `Promise.all`:
   - `serviceOrderService.getServiceOrders({ limit: 50 })` → type `SO`
   - `quotationService.getQuotations({ limit: 50 })` → type `QT`
   - `invoiceService.getInvoices({ limit: 50 })` → type `INV`
3. Normalize each to `DocItem`:
   - SO: `docNumber = so_number`, `linkedJob = repair:${id}`
   - QT: `docNumber = quotation_no`, `linkedJob = sale:${id}` (or `repair:${so_id}` if `service_order_id` set)
   - INV: `docNumber = invoice_no`, `linkedJob = repair:${so_id}` or `sale:${qt_id}`
4. Merge + sort by `created_at` descending
5. Apply `typeFilter` client-side
6. Add loading state

---

## Backend Findings (verified)

| Endpoint | Supported Filters |
|----------|------------------|
| `GET /invoices` | `status, type, customer_id, date_from, date_to, search` — **NO `service_order_id`** |
| `GET /service-orders` | `status, branch_id, technician_id, date_from, date_to, search` |
| `GET /quotations` | `status, type, branch_id, customer_id, service_order_id` |
| `POST /invoices/retail` | Body: `customer_id?, vat_percent?, due_date?, note?, items[]` — **NO `payment_method`** |
| `POST /invoices/{id}/payments` | Body: `amount, method, reference?, note?, payment_date?` |

---

## Verification Plan

1. BillingHub shows real SO + sale QT data (not 5 hardcoded rows)
2. Create repair job → ReceiveVehicleForm → auto-redirects to `/billing/jobs/repair:${newId}`
3. Create sale job → QuotationForm → auto-redirects to `/billing/jobs/sale:${newId}`
4. Full repair flow: InvoiceForm creates invoice → `invoiceId` stored in jobData → PaymentStepForm uses it → payment + receipt recorded
5. RetailPOS: products load from API search; checkout creates retail invoice chain
6. DocumentBrowserPage: shows real SO+QT+INV data with correct job links
