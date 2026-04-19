# Checklist ระบบ — Sudyod Motor Frontend

> อัปเดตล่าสุด: 19 เมษายน 2026  
> Legend: ✅ เสร็จแล้ว | 🔧 กำลังทำ | ⬜ ยังไม่ทำ | 🔶 PlaceholderPage (มี route แล้ว ยังไม่มีหน้าจริง)

---

## Phase 0 — Foundation & Auth ✅ เสร็จแล้วทั้งหมด

| # | งาน | ไฟล์ | สถานะ |
|---|-----|------|--------|
| 0.1 | Axios client + JWT interceptors + refresh | `src/api/client.ts` | ✅ |
| 0.2 | Auth types | `src/types/auth.ts` | ✅ |
| 0.3 | Auth service (login/logout/me/forgotPw/verify/reset) | `src/api/authService.ts` | ✅ |
| 0.4 | Auth store (Zustand) | `src/stores/authStore.ts` | ✅ |
| 0.5 | LoginPage | `src/pages/LoginPage.tsx` | ✅ |
| 0.6 | ForgotPasswordPage (3 step: phone → OTP → reset) | `src/pages/ForgotPasswordPage.tsx` | ✅ |
| 0.7 | ProtectedRoute + PermissionGuard + time-based guard | `src/routes/ProtectedRoute.tsx` | ✅ |
| 0.8 | Route tree (createBrowserRouter) | `src/routes/index.tsx` | ✅ |
| 0.9 | Permission lib (hasPermission, MENU_PERMISSION_MAP) | `src/lib/permissions.ts` | ✅ |

---

## Phase 1 — Layout & Dashboard

| # | งาน | ไฟล์ | สถานะ |
|---|-----|------|--------|
| 1.1 | AppLayout (Sidebar + Navbar + Content) | `src/components/layout/AppLayout.tsx` | ✅ |
| 1.2 | Sidebar (เมนูตามสิทธิ์) | `src/components/layout/Sidebar.tsx` | ✅ |
| 1.3 | Navbar (branch selector, notification bell, profile) | `src/components/layout/Navbar.tsx` | ✅ |
| 1.4 | NotificationDropdown | `src/components/ui/NotificationDropdown.tsx` | ✅ |
| 1.5 | ProfileDrawer | `src/components/ui/ProfileDrawer.tsx` | ✅ |
| 1.6 | DashboardPage (stat cards + charts — ใช้ข้อมูล mock) | `src/pages/DashboardPage.tsx` | ✅ |
| 1.7 | เชื่อม DashboardPage กับ API จริง (`GET /dashboard/stats`, `/dashboard/charts`) | `src/api/dashboardService.ts` | ⬜ |
| 1.8 | MyProfilePage (ดู/แก้ไขโปรไฟล์, change password) | `src/pages/settings/MyProfilePage.tsx` | ✅ |
| 1.9 | Session Management (`GET /auth/sessions`, `DELETE /auth/sessions/:id`) | `src/pages/settings/MyProfilePage.tsx` | ⬜ |

---

## Phase 2 — HR Module ✅ เสร็จแล้วทั้งหมด

| # | งาน | ไฟล์ | สถานะ |
|---|-----|------|--------|
| 2.1 | HR types | `src/types/hr.ts` | ✅ |
| 2.2 | HR service (employees, roles, schedules, attendance, holidays) | `src/api/hrService.ts` | ✅ |
| 2.3 | EmployeeListPage (ค้นหา + filter + ตาราง + export) | `src/pages/hr/EmployeeListPage.tsx` | ✅ |
| 2.4 | EmployeeFormPage (สร้าง/แก้ไข) | `src/pages/hr/EmployeeFormPage.tsx` | ✅ |
| 2.5 | RoleManagementPage (CRUD บทบาท) | `src/pages/hr/RoleManagementPage.tsx` | ✅ |
| 2.6 | RoleDetailPage (Permission Matrix 30 modules × 6 actions) | `src/pages/settings/RoleDetailPage.tsx` | ✅ |
| 2.7 | PermissionMatrixPage (ดู/แก้สิทธิ์ภาพรวม) | `src/pages/settings/PermissionMatrixPage.tsx` | ✅ |
| 2.8 | WorkScheduleListPage | `src/pages/hr/WorkScheduleListPage.tsx` | ✅ |
| 2.9 | WorkScheduleFormPage (TimeSelect 24h) | `src/pages/hr/WorkScheduleFormPage.tsx` | ✅ |
| 2.10 | AttendanceListPage (filter, edit modal, export) | `src/pages/hr/AttendanceListPage.tsx` | ✅ |
| 2.11 | HolidayListPage (filter ปี/สาขา) | `src/pages/hr/HolidayListPage.tsx` | ✅ |
| 2.12 | HolidayFormPage (สร้าง/แก้ไข) | `src/pages/hr/HolidayFormPage.tsx` | ✅ |

---

## Phase 3 — Settings (Master Data) ✅ เสร็จแล้วทั้งหมด

| # | งาน | ไฟล์ | สถานะ |
|---|-----|------|--------|
| 3.1 | BranchListPage + BranchFormPage | `src/pages/settings/Branch*.tsx` | ✅ |
| 3.2 | PositionListPage + PositionFormPage | `src/pages/settings/Position*.tsx` | ✅ |
| 3.3 | FinanceCompanyListPage + FinanceCompanyFormPage | `src/pages/settings/FinanceCompany*.tsx` | ✅ |
| 3.3a | FinanceCompanyDetailPage (2 tabs: ข้อมูล + เอกสาร, logo upload multipart, doc upload multipart) | `src/pages/settings/FinanceCompanyDetailPage.tsx` | ✅ |
| 3.4 | BrandListPage (ยี่ห้อ — modal CRUD) | `src/pages/settings/BrandListPage.tsx` | ✅ |
| 3.5 | CategoryListPage (หมวดสินค้า — modal CRUD + parent_id) | `src/pages/settings/CategoryListPage.tsx` | ✅ |
| 3.6 | UnitListPage (หน่วยนับ — modal CRUD) | `src/pages/settings/UnitListPage.tsx` | ✅ |
| 3.7 | VendorListPage + VendorFormPage (Supplier) | `src/pages/settings/Vendor*.tsx` | ✅ |

---

## Shared Components ✅

| Component | ไฟล์ | รายละเอียด |
|-----------|------|------------|
| ActionIconButton / ActionIconLink | `src/components/ui/ActionIconButton.tsx` | Icon button สำหรับ edit/delete/view/config — ใช้ทุกหน้า list |
| TimeSelect24h | `src/components/ui/TimeSelect24h.tsx` | Dropdown เลือกเวลา 24h (HH:MM) — ใช้ใน WorkScheduleFormPage |
| SortableHeader | `src/components/ui/SortableHeader.tsx` | Column header พร้อม sort arrow — ใช้ทุกหน้า list |
| ConfirmModal | `src/components/ui/ConfirmModal.tsx` | Modal ยืนยันการลบ/action |
| ApiErrorModal | `src/components/ui/ApiErrorModal.tsx` | Global error modal กลางจอ — รับ message จาก API response ผ่าน errorStore |
| errorStore | `src/stores/errorStore.ts` | Zustand store สำหรับ global error state — ถูกเรียกจาก Axios interceptor |

---

## Phase 4 — ลูกค้า (Customers) ✅ เสร็จแล้วทั้งหมด

| # | งาน | ไฟล์ | สถานะ |
|---|-----|------|--------|
| 4.1 | Customer types | `src/types/customer.ts` | ✅ |
| 4.2 | Customer service (`GET/POST/PUT/DELETE /customers`, sub-resources) | `src/api/customerService.ts` | ✅ |
| 4.3 | CustomerListPage (search + filter type/branch + export) | `src/pages/customers/CustomerListPage.tsx` | ✅ |
| 4.4 | CustomerFormPage (สร้าง/แก้ไข — individual/corporate toggle) | `src/pages/customers/CustomerFormPage.tsx` | ✅ |
| 4.5 | CustomerDetailPage (tab: ข้อมูล / เบอร์โทร / ที่อยู่ออกบิล / รถ / เอกสาร / timeline / ประวัติ) | `src/pages/customers/CustomerDetailPage.tsx` | ✅ |
| 4.5a | ⚠️ **TODO** ประวัติการซื้อ — ปุ่มเลขเอกสารยังแสดง toast แทนการ navigate เพราะ ServiceOrderDetailPage (7.5) และ InvoiceDetailPage (8.8) ยังไม่ได้สร้าง — ต้องกลับมาแก้เมื่อ Phase 7 / 8 เสร็จ | `CustomerDetailPage.tsx` บรรทัด `onClick` ของ invoice button | ⬜ |
| 4.6 | เพิ่ม route `/customers/create`, `/customers/:id`, `/customers/:id/edit` | `src/routes/index.tsx` | ✅ |

---

## Phase 5 — สินค้า (Products)

| # | งาน | ไฟล์ | สถานะ |
|---|-----|------|--------|
| 5.1 | Product types (Product, ProductImage, BOM, UnitConversion) | `src/types/product.ts` | ⬜ |
| 5.2 | Product service (`GET/POST/PUT/DELETE /products`, images, pricing, BOM, unit-conversions) | `src/api/productService.ts` | ⬜ |
| 5.3 | ProductListPage (ค้นหา + filter category/brand/unit + export) | `src/pages/products/ProductListPage.tsx` | ⬜ |
| 5.4 | ProductFormPage (สร้าง/แก้ไข + อัปโหลดรูป) | `src/pages/products/ProductFormPage.tsx` | ⬜ |
| 5.5 | ProductDetailPage (tab: ข้อมูล / รูป / ราคา / แปลงหน่วย / BOM) | `src/pages/products/ProductDetailPage.tsx` | ⬜ |
| 5.6 | เพิ่ม route สินค้า | `src/routes/index.tsx` | ⬜ |

---

## Phase 6 — คลังสินค้า & สต็อก (Inventory)

| # | งาน | ไฟล์ | สถานะ |
|---|-----|------|--------|
| 6.1 | Inventory/Warehouse types | `src/types/inventory.ts` | ⬜ |
| 6.2 | Warehouse service | `src/api/warehouseService.ts` | ⬜ |
| 6.3 | WarehouseListPage + WarehouseFormPage | `src/pages/inventory/Warehouse*.tsx` | ⬜ |
| 6.4 | StockBalancePage (สินค้าคงเหลือ + filter + low-stock alert) | `src/pages/inventory/StockBalancePage.tsx` | ⬜ |
| 6.5 | GoodsReceiptListPage + GoodsReceiptFormPage (ใบรับสินค้า) | `src/pages/inventory/GoodsReceipt*.tsx` | ⬜ |
| 6.6 | StockTransferListPage + StockTransferFormPage (โอนย้ายสต็อก) | `src/pages/inventory/StockTransfer*.tsx` | ⬜ |
| 6.7 | StockAdjustPage (ปรับสต็อก + cycle count) | `src/pages/inventory/StockAdjustPage.tsx` | ⬜ |
| 6.8 | เพิ่ม route คลัง/สต็อก | `src/routes/index.tsx` | ⬜ |

---

## Phase 7 — ใบสั่งซ่อม (Service Orders) ⭐ หัวใจของระบบ

| # | งาน | ไฟล์ | สถานะ |
|---|-----|------|--------|
| 7.1 | Service Order types (SO, SOItem, GPSPhoto, status 9 แบบ) | `src/types/serviceOrder.ts` | ⬜ |
| 7.2 | Service Order service (`/service-orders`, `/items`, `/gps-photos`, transitions) | `src/api/serviceOrderService.ts` | ⬜ |
| 7.3 | ServiceOrderListPage (search + filter status × branch × technician + summary bar + export) | `src/pages/service-orders/ServiceOrderListPage.tsx` | 🔶 |
| 7.4 | ServiceOrderFormPage (สร้าง — เลือกลูกค้า + รถ + ข้อมูล SO) | `src/pages/service-orders/ServiceOrderFormPage.tsx` | ⬜ |
| 7.5 | ServiceOrderDetailPage ⭐ (header + action buttons ตาม status + 4 tabs) — **⚠️ ต้องการด้วย: CustomerDetailPage ใช้ navigate ไปที่ `/service-orders/:id`** | `src/pages/service-orders/ServiceOrderDetailPage.tsx` | ⬜ |
| 7.5a | — Tab: รายการอะไหล่/ค่าแรง (SO Items + สรุปยอด) | ภายใน Detail | ⬜ |
| 7.5b | — Tab: GPS Photos (upload + watermark + จัดกลุ่ม photo_type) | ภายใน Detail | ⬜ |
| 7.5c | — Tab: เอกสารที่เกี่ยวข้อง (links ไป QT/INV/DN/WR) | ภายใน Detail | ⬜ |
| 7.5d | — Tab: Audit Log / History timeline | ภายใน Detail | ⬜ |
| 7.6 | เพิ่ม route `/service-orders`, `/service-orders/create`, `/service-orders/:id` | `src/routes/index.tsx` | ⬜ |

---

## Phase 8 — เอกสารการเงิน (Financial Documents)

### ใบเสนอราคา (Quotations)
| # | งาน | สถานะ |
|---|-----|--------|
| 8.1 | Quotation types + service | ⬜ |
| 8.2 | QuotationListPage (filter status/type/branch) | ⬜ |
| 8.3 | QuotationFormPage (สร้าง/แก้ไข — from SO หรือ sale standalone) | ⬜ |
| 8.4 | QuotationDetailPage (status action buttons: sent/approve/reject + items + print PDF) | ⬜ |

### ใบแจ้งหนี้ (Invoices)
| # | งาน | สถานะ |
|---|-----|--------|
| 8.5 | Invoice types + service | ⬜ |
| 8.6 | InvoiceListPage (filter status/branch + overdue highlight) | ⬜ |
| 8.7 | InvoiceFormPage — from QT / retail walk-in | ⬜ |
| 8.8 | InvoiceDetailPage (issue / cancel / payments / issue-receipt) — **⚠️ ต้องการด้วย: CustomerDetailPage ใช้ navigate ไปที่ `/invoices/:id`** | ⬜ |

### มัดจำ (Deposits)
| # | งาน | สถานะ |
|---|-----|--------|
| 8.9 | Deposit types + service | ⬜ |
| 8.10 | DepositFormPage (สร้าง + ออกใบเสร็จมัดจำ + คืนเงิน) | ⬜ |

### ใบส่งมอบ (Delivery Notes)
| # | งาน | สถานะ |
|---|-----|--------|
| 8.11 | DeliveryNote types + service | ⬜ |
| 8.12 | DeliveryNoteDetailPage (สร้าง + ลูกค้าเซ็นรับ digital signature) | ⬜ |

### ใบรับประกัน (Warranties)
| # | งาน | สถานะ |
|---|-----|--------|
| 8.13 | Warranty types + service | ⬜ |
| 8.14 | WarrantyListPage + WarrantyDetailPage | ⬜ |

---

## Phase 9 — สินเชื่อ & ไฟแนนซ์ (Loans & Finance)

| # | งาน | ไฟล์ | สถานะ |
|---|-----|------|--------|
| 9.1 | Loan types (LoanApplication, Guarantor, StoreLoan, StorePayment) | `src/types/loan.ts` | ⬜ |
| 9.2 | Loan service (loan-applications, store-loans, loan-search) | `src/api/loanService.ts` | ⬜ |
| 9.3 | LoanApplicationListPage (filter status/branch) | `src/pages/loans/LoanApplicationListPage.tsx` | ⬜ |
| 9.4 | LoanApplicationFormPage (สร้าง + เพิ่มผู้ค้ำ + approve/reject) | `src/pages/loans/LoanApplicationFormPage.tsx` | ⬜ |
| 9.5 | StoreLoanListPage | `src/pages/loans/StoreLoanListPage.tsx` | ⬜ |
| 9.6 | StoreLoanFormPage (PMT calculator + สร้างสัญญา + บันทึกจ่ายงวด) | `src/pages/loans/StoreLoanFormPage.tsx` | ⬜ |
| 9.7 | LoanSearchPage (ค้นด้วยเบอร์/เลขบัตร — ค้นข้ามทั้ง 3 ตาราง) | `src/pages/loans/LoanSearchPage.tsx` | ⬜ |
| 9.8 | เพิ่ม route สินเชื่อ | `src/routes/index.tsx` | ⬜ |

---

## Phase 10 — ใบสั่งซื้อ (Purchase Orders)

| # | งาน | ไฟล์ | สถานะ |
|---|-----|------|--------|
| 10.1 | Purchase Order types + service | `src/types/purchaseOrder.ts` | ⬜ |
| 10.2 | PurchaseOrderListPage | `src/pages/purchasing/PurchaseOrderListPage.tsx` | ⬜ |
| 10.3 | PurchaseOrderFormPage (draft → sent → received) | `src/pages/purchasing/PurchaseOrderFormPage.tsx` | ⬜ |
| 10.4 | เพิ่ม route | `src/routes/index.tsx` | ⬜ |

---

## Phase 11 — แจ้งเตือน & Audit Log

| # | งาน | ไฟล์ | สถานะ |
|---|-----|------|--------|
| 11.1 | NotificationsPage (รายการแจ้งเตือน + mark read all) | `src/pages/NotificationsPage.tsx` | 🔶 |
| 11.2 | เชื่อม NotificationDropdown กับ API จริง (`GET /notifications/unread-count`, `PATCH /:id/read`) | `src/components/ui/NotificationDropdown.tsx` | ⬜ |
| 11.3 | AuditLogPage (filter date/module/user, read-only) | `src/pages/AuditLogPage.tsx` | 🔶 |

---

## สรุปภาพรวม

| Module | หน้า | เสร็จแล้ว | ยังไม่ทำ |
|--------|------|----------|---------|
| Auth & Layout | 9 | 9 | 0 |
| Dashboard | 1 | 1 (mock) | 0 (API จริง) |
| HR | 12 | 12 | 0 |
| Settings (Master Data) | 13 | 13 | 0 |
| Shared Components | — | ActionIconButton, TimeSelect24h | — |
| ลูกค้า (Customers) | 3 | 3 | 0 (4.5a pending Phase 7/8) |
| สินค้า (Products) | 3 | 0 | 3 |
| คลังสินค้า (Inventory) | 6 | 0 | 6 |
| ใบสั่งซ่อม (Service Orders) | 3+tabs | 0 | 3+tabs |
| เอกสารการเงิน (Financial Docs) | 6+ | 0 | 6+ |
| สินเชื่อ (Loans) | 4 | 0 | 4 |
| ใบสั่งซื้อ (Purchase Orders) | 2 | 0 | 2 |
| แจ้งเตือน & Audit | 2 | 0 | 2 |

**คืบหน้ารวม: ~50% (Phase 0–4 เสร็จแล้วทั้งหมด — รวม ApiErrorModal + Global Error Handling + Vite Proxy)**

---

## ลำดับแนะนำต่อไป (Dependency Order)

```
Phase 3 (Settings: Brands/Categories/Units/Vendors)  ← ต้องมีก่อน Products
    ↓
Phase 4 (Customers)      ← ต้องมีก่อน Service Orders + Quotations
Phase 5 (Products)       ← ต้องมีก่อน Inventory + SO Items
    ↓
Phase 6 (Inventory)      ← ต้องมีก่อน Goods Receipt + Stock Transfer
Phase 7 (Service Orders) ← ต้องมีลูกค้า + สินค้าแล้ว ← หัวใจหลัก
    ↓
Phase 8 (Financial Docs) ← Quotation → Invoice → Deposit → DN → Warranty
Phase 9 (Loans)          ← ต้องมี Invoice แล้ว
Phase 10 (Purchase Orders) ← ต้องมี Products + Vendors + Warehouses แล้ว
Phase 11 (Notifications & Audit) ← เชื่อมท้ายสุด
```
