# Phase 3-4: Billing Hub API Integration

## Phase 3 — JobFlowPage → Fetch ข้อมูลจริง
- [/] Parse URL param `repair:15` / `sale:22` + detect create mode from `/billing/new/*`
- [/] Fetch real data: SO via `serviceOrderService` / QT via `quotationService`
- [/] Compute `currentStep` from SO status mapping
- [/] Pass `jobData` (real) to StepContent as prop
- [/] Loading + Error states
- [/] Add create mode routes to `routes/index.tsx`

## Phase 4 — StepForms → เชื่อม API calls
- [/] Add `JobData` interface + pass to all forms
- [/] ReceiveVehicleForm → `serviceOrderService.createServiceOrder()`
- [/] AssessmentForm → `serviceOrderService.addItem()` + `transition(pending_quote)`
- [/] QuotationForm → `quotationService.createQuotation()` + `quotationService.send()`
- [/] ApproveForm → `quotationService.approve()` / `reject()`
- [/] InvoiceForm → `invoiceService.createFromQuotation()` (placeholder until Phase 1 invoice service exists)
- [/] RepairWorkForm → `serviceOrderService.transition(in_progress → completed)`
- [/] PaymentStepForm → `invoiceService.addPayment()` (placeholder)
- [/] DeliverForm → `serviceOrderService.transition(closed)`
- [/] DepositForm → `depositService.create()` (placeholder)
- [ ] Toast notifications + error handling
- [ ] isSubmitting guard on all forms
