import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProtectedRoute, PermissionGuard } from '@/routes/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { AuditLogPage } from '@/pages/audit-logs/AuditLogPage'

import { EmployeeListPage } from '@/pages/hr/EmployeeListPage'
import { EmployeeFormPage } from '@/pages/hr/EmployeeFormPage'
import { RoleManagementPage } from '@/pages/hr/RoleManagementPage'
import { PermissionMatrixPage } from '@/pages/settings/PermissionMatrixPage'
import { RoleDetailPage } from '@/pages/settings/RoleDetailPage'
import { MyProfilePage } from '@/pages/settings/MyProfilePage'
import { WorkScheduleListPage } from '@/pages/hr/WorkScheduleListPage'
import { CustomerListPage } from '@/pages/customers/CustomerListPage'
import { CustomerFormPage } from '@/pages/customers/CustomerFormPage'
import { CustomerDetailPage } from '@/pages/customers/CustomerDetailPage'
import { WorkScheduleFormPage } from '@/pages/hr/WorkScheduleFormPage'
import { AttendanceListPage } from '@/pages/hr/AttendanceListPage'
import { HolidayListPage } from '@/pages/hr/HolidayListPage'
import { HolidayFormPage } from '@/pages/hr/HolidayFormPage'
import { BranchListPage } from '@/pages/settings/BranchListPage'
import { BranchFormPage } from '@/pages/settings/BranchFormPage'
import { PositionListPage } from '@/pages/settings/PositionListPage'
import { PositionFormPage } from '@/pages/settings/PositionFormPage'
import { FinanceCompanyListPage } from '@/pages/settings/FinanceCompanyListPage'
import { FinanceCompanyFormPage } from '@/pages/settings/FinanceCompanyFormPage'
import { FinanceCompanyDetailPage } from '@/pages/settings/FinanceCompanyDetailPage'
import { BrandListPage } from '@/pages/settings/BrandListPage'
import { QuotationListPage } from '@/pages/quotations/QuotationListPage'
import { QuotationFormPage } from '@/pages/quotations/QuotationFormPage'
import { QuotationDetailPage } from '@/pages/quotations/QuotationDetailPage'
import { LoanApplicationListPage } from '@/pages/loans/LoanApplicationListPage'
import { LoanApplicationFormPage } from '@/pages/loans/LoanApplicationFormPage'
import { LoanApplicationDetailPage } from '@/pages/loans/LoanApplicationDetailPage'
import { StoreLoanListPage } from '@/pages/loans/StoreLoanListPage'
import { StoreLoanFormPage } from '@/pages/loans/StoreLoanFormPage'
import { StoreLoanDetailPage } from '@/pages/loans/StoreLoanDetailPage'
import { LoanSearchPage } from '@/pages/loans/LoanSearchPage'
import { CategoryListPage } from '@/pages/settings/CategoryListPage'
import { UnitListPage } from '@/pages/settings/UnitListPage'
import { VendorListPage } from '@/pages/settings/VendorListPage'
import { VendorFormPage } from '@/pages/settings/VendorFormPage'
import { VehicleInspectionListPage } from '@/pages/settings/VehicleInspectionListPage'
import { VehicleInspectionFormPage } from '@/pages/settings/VehicleInspectionFormPage'

import { ProductListPage } from '@/pages/products/ProductListPage'
import { ProductFormPage } from '@/pages/products/ProductFormPage'
import { ProductDetailPage } from '@/pages/products/ProductDetailPage'
import { WarehouseListPage } from '@/pages/inventory/WarehouseListPage'
import { WarehouseFormPage } from '@/pages/inventory/WarehouseFormPage'
import { WarehouseDetailPage } from '@/pages/inventory/WarehouseDetailPage'
import { StockBalancePage } from '@/pages/inventory/StockBalancePage'
import { GoodsReceiptListPage } from '@/pages/inventory/GoodsReceiptListPage'
import { GoodsReceiptFormPage } from '@/pages/inventory/GoodsReceiptFormPage'
import { GoodsReceiptDetailPage } from '@/pages/inventory/GoodsReceiptDetailPage'
import { StockTransferListPage } from '@/pages/inventory/StockTransferListPage'
import { StockTransferFormPage } from '@/pages/inventory/StockTransferFormPage'
import { StockTransferDetailPage } from '@/pages/inventory/StockTransferDetailPage'

import { BillingHubPage } from '@/pages/billing/BillingHubPage'
import { JobFlowPage } from '@/pages/billing/JobFlowPage'
import { RetailPosPage } from '@/pages/billing/RetailPosPage'
import { DocumentBrowserPage } from '@/pages/billing/DocumentBrowserPage'
import { InvoiceDetailPage } from '@/pages/billing/InvoiceDetailPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout title="แดชบอร์ด" />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
        ],
      },

      // ─── HR ───
      {
        element: <PermissionGuard module="employees" />,
        children: [
          {
            element: <AppLayout title="พนักงาน" />,
            children: [
              { path: '/hr/employees', element: <EmployeeListPage /> },
              { path: '/hr/employees/create', element: <EmployeeFormPage /> },
              { path: '/hr/employees/:id', element: <EmployeeFormPage /> },
            ],
          },
        ],
      },
      {
        element: <PermissionGuard module="attendance" />,
        children: [
          {
            element: <AppLayout title="ลงเวลา" />,
            children: [
              { path: '/hr/attendance', element: <AttendanceListPage /> },
            ],
          },
        ],
      },
      {
        element: <PermissionGuard module="holidays" />,
        children: [
          {
            element: <AppLayout title="วันหยุด" />,
            children: [
              { path: '/hr/holidays', element: <HolidayListPage /> },
              { path: '/hr/holidays/create', element: <HolidayFormPage /> },
              { path: '/hr/holidays/:id/edit', element: <HolidayFormPage /> },
            ],
          },
        ],
      },

      // ─── Settings ───
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout title="สาขา" />,
            children: [
              { path: '/settings/branches', element: <BranchListPage /> },
              { path: '/settings/branches/create', element: <BranchFormPage /> },
              { path: '/settings/branches/:id/edit', element: <BranchFormPage /> },
            ],
          },
        ],
      },
      {
        element: <PermissionGuard module="positions" />,
        children: [
          {
            element: <AppLayout title="ตำแหน่ง" />,
            children: [
              { path: '/settings/positions', element: <PositionListPage /> },
              { path: '/settings/positions/create', element: <PositionFormPage /> },
              { path: '/settings/positions/:id/edit', element: <PositionFormPage /> },
            ],
          },
        ],
      },
      {
        element: <PermissionGuard module="positions" />,
        children: [
          {
            element: <AppLayout title="บทบาท & สิทธิ์" />,
            children: [
              { path: '/settings/roles', element: <RoleManagementPage /> },
              { path: '/settings/roles/:id', element: <RoleDetailPage /> },
            ],
          },
          {
            element: <AppLayout title="สิทธิ์การใช้งาน" />,
            children: [{ path: '/settings/permissions', element: <PermissionMatrixPage /> }],
          },
        ],
      },
      {
        element: <PermissionGuard module="work_schedules" />,
        children: [
          {
            element: <AppLayout title="ตารางเวลาทำงาน" />,
            children: [
              { path: '/settings/work-schedules', element: <WorkScheduleListPage /> },
              { path: '/settings/work-schedules/create', element: <WorkScheduleFormPage /> },
              { path: '/settings/work-schedules/edit/:id', element: <WorkScheduleFormPage /> },
            ],
          },
        ],
      },
      {
        element: <PermissionGuard module="brands" />,
        children: [
          {
            element: <AppLayout title="ยี่ห้อ" />,
            children: [
              { path: '/settings/brands', element: <BrandListPage /> },
            ],
          },
        ],
      },
      {
        element: <PermissionGuard module="product_categories" />,
        children: [
          {
            element: <AppLayout title="หมวดสินค้า" />,
            children: [
              { path: '/settings/categories', element: <CategoryListPage /> },
            ],
          },
        ],
      },
      {
        element: <PermissionGuard module="product_units" />,
        children: [
          {
            element: <AppLayout title="หน่วยนับ" />,
            children: [
              { path: '/settings/units', element: <UnitListPage /> },
            ],
          },
        ],
      },
      {
        element: <PermissionGuard module="vendors" />,
        children: [
          {
            element: <AppLayout title="Supplier" />,
            children: [
              { path: '/settings/vendors', element: <VendorListPage /> },
              { path: '/settings/vendors/create', element: <VendorFormPage /> },
              { path: '/settings/vendors/:id/edit', element: <VendorFormPage /> },
            ],
          },
          {
            element: <AppLayout title="บริษัทไฟแนนซ์" />,
            children: [
              { path: '/settings/finance-companies', element: <FinanceCompanyListPage /> },
              { path: '/settings/finance-companies/create', element: <FinanceCompanyFormPage /> },
              { path: '/settings/finance-companies/:id', element: <FinanceCompanyDetailPage /> },
              { path: '/settings/finance-companies/:id/edit', element: <FinanceCompanyFormPage /> },
            ],
          },
        ],
      },

      {
        element: <PermissionGuard module="vehicle_inspection_checklists" />,
        children: [
          {
            element: <AppLayout title="แม่แบบรายการตรวจสอบรถ" />,
            children: [
              { path: '/settings/vehicle-inspection-checklists', element: <VehicleInspectionListPage /> },
              { path: '/settings/vehicle-inspection-checklists/create', element: <VehicleInspectionFormPage /> },
              { path: '/settings/vehicle-inspection-checklists/:id/edit', element: <VehicleInspectionFormPage /> },
            ],
          },
        ],
      },

      // ─── Products & Inventory ───
      {
        element: <PermissionGuard module="products" />,
        children: [
          {
            element: <AppLayout title="สินค้า" />,
            children: [
              { path: '/products', element: <ProductListPage /> },
              { path: '/products/create', element: <ProductFormPage /> },
              { path: '/products/:id', element: <ProductDetailPage /> },
              { path: '/products/:id/edit', element: <ProductFormPage /> },
            ],
          },
        ],
      },
      {
        element: <PermissionGuard module="warehouses" />,
        children: [
          {
            element: <AppLayout title="คลังสินค้า" />,
            children: [
              { path: '/warehouses', element: <WarehouseListPage /> },
              { path: '/warehouses/create', element: <WarehouseFormPage /> },
              { path: '/warehouses/:id', element: <WarehouseDetailPage /> },
              { path: '/warehouses/:id/edit', element: <WarehouseFormPage /> },
            ],
          },
        ],
      },
      {
        element: <PermissionGuard module="inventory" />,
        children: [
          {
            element: <AppLayout title="สต็อกสินค้า" />,
            children: [
              { path: '/inventory', element: <StockBalancePage /> },
            ],
          },
        ],
      },
      {
        element: <PermissionGuard module="goods_receipts" />,
        children: [
          {
            element: <AppLayout title="ใบรับสินค้า" />,
            children: [
              { path: '/goods-receipts', element: <GoodsReceiptListPage /> },
              { path: '/goods-receipts/create', element: <GoodsReceiptFormPage /> },
              { path: '/goods-receipts/:id', element: <GoodsReceiptDetailPage /> },
              { path: '/goods-receipts/:id/edit', element: <GoodsReceiptFormPage /> },
            ],
          },
        ],
      },
      {
        element: <PermissionGuard module="stock_transfers" />,
        children: [
          {
            element: <AppLayout title="โอนย้ายสต็อก" />,
            children: [
              { path: '/stock-transfers', element: <StockTransferListPage /> },
              { path: '/stock-transfers/create', element: <StockTransferFormPage /> },
              { path: '/stock-transfers/:id', element: <StockTransferDetailPage /> },
              { path: '/stock-transfers/:id/edit', element: <StockTransferFormPage /> },
            ],
          },
        ],
      },
      // ─── Other modules (TODO: implement pages) ───
      {
        element: <PermissionGuard module="customers" />,
        children: [
          {
            element: <AppLayout title="ลูกค้า" />,
            children: [
              { path: '/customers', element: <CustomerListPage /> },
              { path: '/customers/create', element: <CustomerFormPage /> },
              { path: '/customers/:id', element: <CustomerDetailPage /> },
              { path: '/customers/:id/edit', element: <CustomerFormPage /> },
            ],
          },
        ],
      },
      // ─── Quotations ───
      {
        element: <PermissionGuard module="quotations" />,
        children: [
          {
            element: <AppLayout title="ใบเสนอราคา" />,
            children: [
              { path: '/quotations', element: <QuotationListPage /> },
              { path: '/quotations/create', element: <QuotationFormPage /> },
              { path: '/quotations/:id', element: <QuotationDetailPage /> },
              { path: '/quotations/:id/edit', element: <QuotationFormPage /> },
            ],
          },
        ],
      },

      // ─── Loan Applications ───
      {
        element: <PermissionGuard module="loan_applications" />,
        children: [
          {
            element: <AppLayout title="สมัครไฟแนนซ์" />,
            children: [
              { path: '/loan-applications', element: <LoanApplicationListPage /> },
              { path: '/loan-applications/create', element: <LoanApplicationFormPage /> },
              { path: '/loan-applications/:id', element: <LoanApplicationDetailPage /> },
              { path: '/loan-applications/:id/edit', element: <LoanApplicationFormPage /> },
            ],
          },
        ],
      },

      // ─── Store Loans ───
      {
        element: <PermissionGuard module="store_loans" />,
        children: [
          {
            element: <AppLayout title="สินเชื่อร้าน" />,
            children: [
              { path: '/store-loans', element: <StoreLoanListPage /> },
              { path: '/store-loans/create', element: <StoreLoanFormPage /> },
              { path: '/store-loans/:id', element: <StoreLoanDetailPage /> },
            ],
          },
        ],
      },

      // ─── Loan Search ───
      {
        element: <PermissionGuard module="loan_applications" />,
        children: [
          {
            element: <AppLayout title="ค้นหาสินเชื่อ" />,
            children: [
              { path: '/loans/search', element: <LoanSearchPage /> },
            ],
          },
        ],
      },

      // ─── Profile (no permission required) ───
      {
        element: <AppLayout title="ข้อมูลส่วนตัว" />,
        children: [{ path: '/profile', element: <MyProfilePage /> }],
      },

      // ─── Billing Hub ───
      {
        element: <PermissionGuard module="service_orders" />,
        children: [
          {
            element: <AppLayout title="บิล / เอกสาร" />,
            children: [
              { path: '/billing', element: <BillingHubPage /> },
              { path: '/billing/jobs/:id', element: <JobFlowPage /> },
              { path: '/billing/new/repair', element: <JobFlowPage /> },
              { path: '/billing/new/sale', element: <JobFlowPage /> },
              { path: '/billing/pos', element: <RetailPosPage /> },
              { path: '/billing/documents', element: <DocumentBrowserPage /> },
              { path: '/billing/invoices/:id', element: <InvoiceDetailPage /> },
            ],
          },
        ],
      },

      // ─── Legacy redirects → Billing Hub ───
      { path: '/invoices', element: <Navigate to="/billing" replace /> },
      { path: '/invoices/*', element: <Navigate to="/billing" replace /> },
      { path: '/deposits', element: <Navigate to="/billing" replace /> },
      { path: '/deposits/*', element: <Navigate to="/billing" replace /> },
      { path: '/delivery-notes', element: <Navigate to="/billing" replace /> },
      { path: '/delivery-notes/*', element: <Navigate to="/billing" replace /> },
      { path: '/warranties', element: <Navigate to="/billing" replace /> },
      { path: '/warranties/*', element: <Navigate to="/billing" replace /> },

      // ─── Audit & Notification (TODO: determine permission) ───
      {
        element: <PermissionGuard module="audit_logs" />,
        children: [
          {
            element: <AppLayout title="Audit Log" />,
            children: [
              { path: '/audit-logs', element: <AuditLogPage /> },
            ],
          },
        ],
      },
      {
        element: <AppLayout title="แจ้งเตือน" />,
        children: [
          { path: '/notifications', element: <NotificationsPage /> },
        ],
      },
    ],
  },
  // ─── Catch-all: redirect unknown paths to root ───
  { path: '*', element: <Navigate to="/" replace /> },
])

