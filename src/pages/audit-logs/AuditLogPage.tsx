import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { auditLogService } from '@/api/auditLogService'
import { hrService } from '@/api/hrService'
import {
  type AuditLogAction,
  type AuditLogItem,
  AUDIT_LOG_ACTION_COLOR,
  AUDIT_LOG_ACTION_LABEL,
  AUDIT_LOG_ENTITY_LABEL,
} from '@/types/auditLog'
import type { Employee } from '@/types/hr'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { AuditLogDetailDrawer } from './AuditLogDetailDrawer'

const LIMIT = 20

const ACTION_OPTIONS: AuditLogAction[] = ['create', 'update', 'delete']

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function todayISO(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(0, 0, 0, 0)
  // Use local YYYY-MM-DD
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function relativeTime(iso: string): string {
  const now = Date.now()
  const t = new Date(iso).getTime()
  const diffSec = Math.round((now - t) / 1000)
  if (diffSec < 60) return 'เมื่อสักครู่'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} นาทีที่แล้ว`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ชั่วโมงที่แล้ว`
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)} วันที่แล้ว`
  return formatDateTime(iso)
}

function entityLabel(entityType: string): string {
  return AUDIT_LOG_ENTITY_LABEL[entityType] ?? entityType
}

function fullName(emp?: AuditLogItem['employee']): string {
  if (!emp) return '—'
  return `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim() || '—'
}

export function AuditLogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { permissions, employee: currentEmployee } = useAuthStore()
  const canExport = hasPermission(permissions, 'audit_logs', 'can_export')

  const page = Number(searchParams.get('page') ?? '1')
  const employeeId = searchParams.get('employee_id') ?? ''
  const entityType = searchParams.get('entity_type') ?? ''
  const action = searchParams.get('action') ?? ''
  const dateFrom = searchParams.get('date_from') ?? todayISO(-6)
  const dateTo = searchParams.get('date_to') ?? todayISO(0)

  const [items, setItems] = useState<AuditLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [employeeMenuOpen, setEmployeeMenuOpen] = useState(false)
  const [entityTypes, setEntityTypes] = useState<string[]>([])
  const [selected, setSelected] = useState<AuditLogItem | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const setParam = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams)
    let resetPage = false
    for (const [key, value] of Object.entries(updates)) {
      if (value === '') next.delete(key)
      else next.set(key, value)
      if (key !== 'page') resetPage = true
    }
    if (resetPage) next.delete('page')
    setSearchParams(next)
  }

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await auditLogService.getAuditLogs({
        page,
        limit: LIMIT,
        employee_id: employeeId ? Number(employeeId) : undefined,
        entity_type: entityType || undefined,
        action: (action as AuditLogAction) || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      setItems(res.data.data ?? [])
      setTotal(res.data.pagination?.total ?? 0)
    } catch {
      setItems([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }, [page, employeeId, entityType, action, dateFrom, dateTo])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Load employee list once for dropdown
  useEffect(() => {
    hrService
      .getEmployees()
      .then((res) => setEmployees(res.data.data ?? []))
      .catch(() => setEmployees([]))
  }, [])

  // Load entity-types list
  useEffect(() => {
    auditLogService
      .getEntityTypes()
      .then((res) => setEntityTypes(res.data.data ?? []))
      .catch(() => setEntityTypes([]))
  }, [])

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase()
    if (!q) return employees.slice(0, 20)
    return employees
      .filter((e) => {
        const name = `${e.first_name} ${e.last_name}`.toLowerCase()
        return (
          name.includes(q) ||
          (e.employee_code ?? '').toLowerCase().includes(q) ||
          (e.email ?? '').toLowerCase().includes(q) ||
          (e.phone ?? '').toLowerCase().includes(q)
        )
      })
      .slice(0, 20)
  }, [employees, employeeSearch])

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === Number(employeeId)) ?? null,
    [employees, employeeId],
  )

  // Build entity type options sorted with friendly labels first
  const entityOptions = useMemo(() => {
    return entityTypes
      .map((t) => ({ value: t, label: entityLabel(t) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'th'))
  }, [entityTypes])

  const totalPages = Math.ceil(total / LIMIT)
  const rowStart = total > 0 ? (page - 1) * LIMIT + 1 : 0
  const rowEnd = Math.min(page * LIMIT, total)

  const applyPreset = (preset: 'today' | '7d' | '30d' | 'mine' | 'reset') => {
    if (preset === 'today') {
      setParam({ date_from: todayISO(0), date_to: todayISO(0) })
    } else if (preset === '7d') {
      setParam({ date_from: todayISO(-6), date_to: todayISO(0) })
    } else if (preset === '30d') {
      setParam({ date_from: todayISO(-29), date_to: todayISO(0) })
    } else if (preset === 'mine') {
      if (currentEmployee) setParam({ employee_id: String(currentEmployee.id) })
    } else if (preset === 'reset') {
      setParam({
        date_from: todayISO(-6),
        date_to: todayISO(0),
        employee_id: '',
        entity_type: '',
        action: '',
      })
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const res = await auditLogService.exportCsv({
        employee_id: employeeId ? Number(employeeId) : undefined,
        entity_type: entityType || undefined,
        action: (action as AuditLogAction) || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data as BlobPart])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit_logs_${dateFrom}_${dateTo}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      // interceptor handles
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="mt-1 text-sm text-gray-500">บันทึกการเปลี่ยนแปลงข้อมูลในระบบ</p>
        </div>
        {canExport && (
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <DownloadIcon />
            {isExporting ? 'กำลังส่งออก...' : 'ส่งออก CSV'}
          </button>
        )}
      </div>

      {/* Sticky filters */}
      <div className="sticky top-0 z-10 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          {/* Date range */}
          <div className="flex flex-col">
            <label className="mb-1 text-xs text-gray-500">ตั้งแต่</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setParam({ date_from: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-xs text-gray-500">ถึง</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setParam({ date_to: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Employee searchable dropdown */}
          <div className="relative flex flex-col">
            <label className="mb-1 text-xs text-gray-500">พนักงาน</label>
            <input
              type="text"
              value={
                employeeMenuOpen
                  ? employeeSearch
                  : selectedEmployee
                    ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
                    : ''
              }
              onChange={(e) => {
                setEmployeeSearch(e.target.value)
                setEmployeeMenuOpen(true)
              }}
              onFocus={() => {
                setEmployeeSearch('')
                setEmployeeMenuOpen(true)
              }}
              onBlur={() => setTimeout(() => setEmployeeMenuOpen(false), 150)}
              placeholder="ค้นหาพนักงาน (ทั้งหมด)"
              className="w-56 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {employeeMenuOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 max-h-72 w-72 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setParam({ employee_id: '' })
                    setEmployeeMenuOpen(false)
                  }}
                  className="block w-full border-b border-gray-100 px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
                >
                  พนักงานทั้งหมด
                </button>
                {filteredEmployees.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-gray-400">ไม่พบพนักงาน</p>
                ) : (
                  filteredEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setParam({ employee_id: String(emp.id) })
                        setEmployeeMenuOpen(false)
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      <span className="text-gray-900">
                        {emp.first_name} {emp.last_name}
                      </span>
                      {emp.employee_code && (
                        <span className="ml-2 text-xs text-gray-400">{emp.employee_code}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Entity type */}
          <div className="flex flex-col">
            <label className="mb-1 text-xs text-gray-500">โมดูล</label>
            <select
              value={entityType}
              onChange={(e) => setParam({ entity_type: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">ทั้งหมด</option>
              {entityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action */}
          <div className="flex flex-col">
            <label className="mb-1 text-xs text-gray-500">การกระทำ</label>
            <select
              value={action}
              onChange={(e) => setParam({ action: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">ทั้งหมด</option>
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {AUDIT_LOG_ACTION_LABEL[a]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick presets */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => applyPreset('today')}
            className="rounded-full border border-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-50"
          >
            วันนี้
          </button>
          <button
            type="button"
            onClick={() => applyPreset('7d')}
            className="rounded-full border border-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-50"
          >
            7 วัน
          </button>
          <button
            type="button"
            onClick={() => applyPreset('30d')}
            className="rounded-full border border-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-50"
          >
            30 วัน
          </button>
          <button
            type="button"
            onClick={() => applyPreset('mine')}
            className="rounded-full border border-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-50"
          >
            ของฉัน
          </button>
          <button
            type="button"
            onClick={() => applyPreset('reset')}
            className="rounded-full border border-gray-200 px-3 py-1 text-gray-500 hover:bg-gray-50"
          >
            ล้างตัวกรอง
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">เวลา</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">พนักงาน</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">การกระทำ</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">โมดูล</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Entity ID</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">IP</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-gray-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              )}
              {!isLoading &&
                items.map((item) => {
                  const actionColor = AUDIT_LOG_ACTION_COLOR[item.action]
                  const actionTxt = AUDIT_LOG_ACTION_LABEL[item.action]
                  return (
                    <tr
                      key={item.id}
                      className="cursor-pointer hover:bg-blue-50 transition-colors"
                      onClick={() => setSelected(item)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap" title={formatDateTime(item.created_at)}>
                        <div className="text-gray-900">{relativeTime(item.created_at)}</div>
                        <div className="text-xs text-gray-400">{formatDateTime(item.created_at)}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                        {fullName(item.employee)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${actionColor}`}>
                          {actionTxt}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        <div>{entityLabel(item.entity_type)}</div>
                        <div className="text-xs text-gray-400">{item.entity_type}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {item.entity_id ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {item.ip_address ?? '—'}
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setSelected(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          <EyeIcon />
                          ดูรายละเอียด
                        </button>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500">
              แสดง {rowStart}–{rowEnd} จาก {total.toLocaleString('th-TH')} รายการ
            </p>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setParam({ page: String(page - 1) })}
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
              >
                ก่อนหน้า
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setParam({ page: String(page + 1) })}
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>

      <AuditLogDetailDrawer item={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
