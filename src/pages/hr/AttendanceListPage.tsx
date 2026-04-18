import { useState, useEffect, useMemo } from 'react'
import { hrService } from '@/api/hrService'
import type { Attendance, AttendanceStatus, Branch } from '@/types/hr'
import { cn, sortRows } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { ActionIconButton } from '@/components/ui/ActionIconButton'
import { SortableHeader } from '@/components/ui/SortableHeader'

const STATUS_MAP: Record<AttendanceStatus, { label: string; className: string }> = {
  normal: { label: 'ปกติ', className: 'bg-emerald-100 text-emerald-800' },
  late: { label: 'สาย', className: 'bg-yellow-100 text-yellow-800' },
  absent: { label: 'ขาด', className: 'bg-red-100 text-red-800' },
  holiday: { label: 'วันหยุด', className: 'bg-gray-100 text-gray-600' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('th-TH', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function getMonthStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function AttendanceListPage() {
  const [records, setRecords] = useState<Attendance[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStartDate, setFilterStartDate] = useState(getMonthStart())
  const [filterEndDate, setFilterEndDate] = useState(getToday())
  const [filterBranch, setFilterBranch] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null)
  const [editNote, setEditNote] = useState('')
  const [editStatus, setEditStatus] = useState<AttendanceStatus>('normal')
  const { permissions } = useAuthStore()

  useEffect(() => {
    hrService.getBranches().then((res) => setBranches(res.data.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    fetchData()
  }, [filterStartDate, filterEndDate, filterBranch])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const res = await hrService.getAttendance({
        start_date: filterStartDate || undefined,
        end_date: filterEndDate || undefined,
        branch_id: filterBranch ? Number(filterBranch) : undefined,
      })
      setRecords(res.data.data || [])
    } catch {
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterStatus && r.status !== filterStatus) return false
      if (search) {
        const term = search.toLowerCase()
        const name = `${r.employee?.first_name || ''} ${r.employee?.last_name || ''}`.trim()
        const code = r.employee?.employee_code || ''
        return `${name} ${code}`.toLowerCase().includes(term)
      }
      return true
    })
  }, [records, filterStatus, search])

  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const sortedRecords = sortRows(
    filteredRecords,
    sortKey,
    sortDir,
    sortKey === 'employee_name'
      ? (r) => `${r.employee?.first_name || ''} ${r.employee?.last_name || ''}`.trim()
      : undefined,
  )

  const handleEdit = (record: Attendance) => {
    setEditingRecord(record)
    setEditNote(record.note || '')
    setEditStatus(record.status)
  }

  const handleEditSave = async () => {
    if (!editingRecord) return
    try {
      await hrService.updateAttendance(editingRecord.id, {
        status: editStatus,
        note: editNote,
      })
      setEditingRecord(null)
      fetchData()
    } catch {
      alert('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง')
    }
  }

  const handleExport = async () => {
    const month = filterStartDate.slice(0, 7) // "2026-04"
    try {
      const res = await hrService.exportAttendance({
        branch_id: filterBranch ? Number(filterBranch) : undefined,
        month,
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `attendance_${month}.csv`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('ไม่สามารถ export ข้อมูลได้')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ลงเวลาทำงาน</h1>
          <p className="text-sm text-gray-500">
            ดูบันทึกการเข้า-ออกงานของพนักงาน
            {filterStartDate && filterEndDate ? ` (${formatDate(filterStartDate)} - ${formatDate(filterEndDate)})` : ''}
          </p>
        </div>
        {hasPermission(permissions, 'attendance', 'can_export') && (
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export CSV</span>
          </button>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Filters */}
        <div className="border-b border-gray-100 p-4 flex flex-wrap gap-4">
          <div className="relative w-full max-w-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="ค้นหาชื่อ, รหัสพนักงาน..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pl-10 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterStartDate}
              max={filterEndDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
            />
            <span className="text-sm text-gray-500">ถึง</span>
            <input
              type="date"
              value={filterEndDate}
              min={filterStartDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
            />
          </div>

          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
          >
            <option value="">ทุกสาขา</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
          >
            <option value="">ทุกสถานะ</option>
            {Object.entries(STATUS_MAP).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700">
              <tr>
                <SortableHeader label="พนักงาน" sortKey="employee_name" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-6 py-4 font-semibold">สาขา</th>
                <SortableHeader label="วันที่" sortKey="date" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-6 py-4 font-semibold text-center">เข้างาน</th>
                <th className="px-6 py-4 font-semibold text-center">ออกงาน</th>
                <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
                <th className="px-6 py-4 font-semibold text-center">ชั่วโมง</th>
                <th className="px-6 py-4 font-semibold text-center">สาย</th>
                <th className="px-6 py-4 text-right font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    ไม่พบข้อมูลการลงเวลา
                  </td>
                </tr>
              ) : (
                sortedRecords.map((rec) => {
                  const statusInfo = STATUS_MAP[rec.status] || STATUS_MAP.normal
                  return (
                    <tr key={rec.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {rec.employee ? `${rec.employee.first_name} ${rec.employee.last_name}` : '-'}
                        </div>
                        <div className="text-xs text-gray-500">{rec.employee?.employee_code || ''}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{rec.branch?.name || '-'}</td>
                      <td className="px-6 py-4 text-gray-700">{formatDate(rec.date)}</td>
                      <td className="px-6 py-4 text-center text-xs text-gray-700">
                        {formatDateTime(rec.check_in_time)}
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-gray-700">
                        {formatDateTime(rec.check_out_time)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                          statusInfo.className,
                        )}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-700">
                        {rec.work_minutes != null ? (rec.work_minutes / 60).toFixed(1) : '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {rec.late_minutes > 0 ? (
                          <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">สาย {rec.late_minutes} น.</span>
                        ) : rec.status === 'normal' ? (
                          <span className="text-xs text-gray-400">-</span>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {hasPermission(permissions, 'attendance', 'can_edit') && rec.status !== 'holiday' && (
                          <ActionIconButton variant="edit" onClick={() => handleEdit(rec)} />
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              แก้ไขบันทึกเวลา — {editingRecord.employee ? `${editingRecord.employee.first_name} ${editingRecord.employee.last_name}` : `พนักงาน #${editingRecord.employee_id}`}
            </h2>
            <p className="text-sm text-gray-500">{formatDate(editingRecord.date)}</p>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">สถานะ</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as AttendanceStatus)}
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
              >
                {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">หมายเหตุ</label>
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                rows={3}
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500"
                placeholder="เช่น ลืม check-in, แก้ไขเวลาย้อนหลัง"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleEditSave}
                className="inline-flex items-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                บันทึก
              </button>
              <button
                onClick={() => setEditingRecord(null)}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
