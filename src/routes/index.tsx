import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProtectedRoute, PermissionGuard } from '@/routes/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

import { EmployeeListPage } from '@/pages/hr/EmployeeListPage'
import { EmployeeFormPage } from '@/pages/hr/EmployeeFormPage'
import { RoleManagementPage } from '@/pages/hr/RoleManagementPage'
import { PermissionMatrixPage } from '@/pages/settings/PermissionMatrixPage'
import { RoleDetailPage } from '@/pages/settings/RoleDetailPage'
import { MyProfilePage } from '@/pages/settings/MyProfilePage'
import { WorkScheduleListPage } from '@/pages/hr/WorkScheduleListPage'
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
import { CategoryListPage } from '@/pages/settings/CategoryListPage'
import { UnitListPage } from '@/pages/settings/UnitListPage'
import { VendorListPage } from '@/pages/settings/VendorListPage'
import { VendorFormPage } from '@/pages/settings/VendorFormPage'

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
        element: <PermissionGuard module="branches" />,
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
        element: <PermissionGuard module="roles" />,
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

      // ─── Other modules (TODO: implement pages) ───
      {
        element: <PermissionGuard module="customers" />,
        children: [
          {
            element: <AppLayout title="ลูกค้า" />,
            children: [
              { path: '/customers', element: <PlaceholderPage title="ลูกค้า" /> },
            ],
          },
        ],
      },
      {
        element: <PermissionGuard module="service_orders" />,
        children: [
          {
            element: <AppLayout title="ใบสั่งซ่อม" />,
            children: [
              { path: '/service-orders', element: <PlaceholderPage title="ใบสั่งซ่อม" /> },
            ],
          },
        ],
      },

      // ─── Profile (no permission required) ───
      {
        element: <AppLayout title="ข้อมูลส่วนตัว" />,
        children: [{ path: '/profile', element: <MyProfilePage /> }],
      },

      // ─── Audit & Notification (TODO: determine permission) ───
      {
        element: <AppLayout title="Audit Log" />,
        children: [
          { path: '/audit-logs', element: <PlaceholderPage title="Audit Log" /> },
        ],
      },
      {
        element: <AppLayout title="แจ้งเตือน" />,
        children: [
          { path: '/notifications', element: <PlaceholderPage title="แจ้งเตือน" /> },
        ],
      },
    ],
  },
  // ─── Catch-all: redirect unknown paths to root ───
  { path: '*', element: <Navigate to="/" replace /> },
])

