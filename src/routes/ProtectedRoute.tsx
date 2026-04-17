import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import type { ModuleKey, PermissionAction } from '@/lib/permissions'
import { Spinner } from 'flowbite-react'

/**
 * คืนค่า true ถ้าเวลาปัจจุบันอยู่ในช่วง [startTime, endTime] (HH:mm)
 * รองรับกรณีข้ามวัน เช่น 22:00–06:00
 */
function isWithinWorkHours(startTime: string, endTime: string): boolean {
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startMinutes = sh * 60 + sm
  const endMinutes = eh * 60 + em

  if (startMinutes <= endMinutes) {
    // ปกติ: เช่น 08:00–17:00
    return nowMinutes >= startMinutes && nowMinutes <= endMinutes
  } else {
    // ข้ามวัน: เช่น 22:00–06:00
    return nowMinutes >= startMinutes || nowMinutes <= endMinutes
  }
}

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, employee, logout } = useAuthStore()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="xl" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // ตรวจสอบเวลาเข้างาน (ถ้ามี work_schedule กำหนดไว้)
  const schedule = employee?.work_schedule
  if (schedule && !isWithinWorkHours(schedule.login_start_time, schedule.login_end_time)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 p-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <svg className="h-10 w-10 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">นอกเวลาทำงาน</h1>
          <p className="mt-2 text-gray-500">
            ระบบอนุญาตให้เข้าใช้งานระหว่าง{' '}
            <span className="font-semibold text-gray-700">
              {schedule.login_start_time} – {schedule.login_end_time} น.
            </span>
          </p>
          {schedule.name && (
            <p className="mt-1 text-sm text-gray-400">ตารางเวลา: {schedule.name}</p>
          )}
        </div>
        <button
          onClick={() => logout()}
          className="rounded-lg bg-red-500 px-6 py-2 text-sm font-medium text-white transition hover:bg-red-600"
        >
          ออกจากระบบ
        </button>
      </div>
    )
  }

  return <Outlet />
}

interface PermissionGuardProps {
  module: ModuleKey
  action?: PermissionAction
}

export function PermissionGuard({ module, action = 'can_view' }: PermissionGuardProps) {
  const { permissions } = useAuthStore()

  if (!hasPermission(permissions, module, action)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
