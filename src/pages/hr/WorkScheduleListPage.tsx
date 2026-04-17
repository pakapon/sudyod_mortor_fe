import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { hrService } from '@/api/hrService'
import type { WorkSchedule } from '@/types/hr'
import { ActionIconLink, ActionIconButton } from '@/components/ui/ActionIconButton'
// Replaced with raw implementations for now

export function WorkScheduleListPage() {
  const [schedules, setSchedules] = useState<WorkSchedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [, setIsDeleting] = useState(false)
  const [, setScheduleToDelete] = useState<WorkSchedule | null>(null)
  
  // Basic mock fetch if no API available yet or to mix with true API
  const fetchSchedules = async () => {
    setIsLoading(true)
    try {
      const response = await hrService.getWorkSchedules()
      setSchedules(response.data?.data || [])
    } catch (e: any) {
      console.error("API Error fetching work schedules", e)
      setSchedules([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSchedules()
  }, [])

  const handleDeleteMock = async (targetRow: WorkSchedule) => {
    setIsDeleting(true)
    try {
      await hrService.deleteWorkSchedule(targetRow.id)
      setSchedules(prev => prev.filter(s => s.id !== targetRow.id))
      setScheduleToDelete(null)
    } catch (e) {
      console.error("Error deleting work schedule", e)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการตารางเวลาทำงาน (Work Schedules)</h1>
          <p className="mt-1 text-sm text-gray-500">สร้างและตั้งค่ากะเวลาการทำงานของพนักงานหรือตามตำแหน่ง</p>
        </div>
        <Link
          to="/settings/work-schedules/create"
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          สร้างตารางเวลาใหม่
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-500">
          <thead className="bg-gray-50 text-xs uppercase text-gray-700">
            <tr>
              <th className="px-6 py-3">รหัส</th>
              <th className="px-6 py-3">ชื่อตารางเวลา/กะ</th>
              <th className="px-6 py-3">ประเภท</th>
              <th className="px-6 py-3">ช่วงเวลาที่ให้ลงชื่อเข้า</th>
              <th className="px-6 py-3">สายได้ไม่เกิน (นาที)</th>
              <th className="px-6 py-3">สถานะ</th>
              <th className="px-6 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              <tr><td colSpan={7} className="px-6 py-4 text-center">กำลังโหลด...</td></tr>
            ) : schedules.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-4 text-center">ไม่พบข้อมูล</td></tr>
            ) : (
              schedules.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-gray-500">#{row.id}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{row.name}</td>
                  <td className="px-6 py-4">
                    <span className={row.owner_type === 'position' ? 'text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs' : 'text-purple-600 bg-purple-50 px-2 py-1 rounded text-xs'}>
                      {row.owner_type === 'position' ? 'ตามตำแหน่งงาน' : 'พนักงานเฉพาะบุคคล'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {row.login_start_time.substring(0,5)} น. - {row.login_end_time.substring(0,5)} น.
                  </td>
                  <td className="px-6 py-4">{row.grace_minutes} นาที</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${row.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>
                      {row.is_active ? 'ใช้งานอยู่' : 'ระงับการใช้งาน'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <ActionIconLink variant="edit" to={`/settings/work-schedules/edit/${row.id}`} />
                      <ActionIconButton
                        variant="delete"
                        onClick={() => {
                          if(window.confirm(`ต้องการลบตารางเวลา "${row.name}" ใช่หรือไม่?`)) {
                            setScheduleToDelete(row)
                            // The real delete would fire here, let's just cheat the state for this mock component since useEffect won't trigger delete automatically without the ConfirmModal
                            handleDeleteMock(row)
                          }
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

