import { useEffect, useMemo, useRef, useState } from 'react'
import type { AuditLogItem } from '@/types/auditLog'
import {
  AUDIT_LOG_ACTION_LABEL,
  AUDIT_LOG_ACTION_COLOR,
  AUDIT_LOG_ENTITY_LABEL,
} from '@/types/auditLog'

interface AuditLogDetailDrawerProps {
  item: AuditLogItem | null
  onClose: () => void
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function entityLabel(entityType: string): string {
  return AUDIT_LOG_ENTITY_LABEL[entityType] ?? entityType
}

function fullName(emp?: AuditLogItem['employee']): string {
  if (!emp) return '—'
  return `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim() || '—'
}

interface DiffRow {
  key: string
  oldValue: unknown
  newValue: unknown
  changed: boolean
}

function buildDiff(
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
): DiffRow[] {
  const keys = new Set<string>()
  if (oldValues) Object.keys(oldValues).forEach((k) => keys.add(k))
  if (newValues) Object.keys(newValues).forEach((k) => keys.add(k))

  const rows: DiffRow[] = []
  for (const key of keys) {
    const oldValue = oldValues?.[key] ?? undefined
    const newValue = newValues?.[key] ?? undefined
    const changed = JSON.stringify(oldValue) !== JSON.stringify(newValue)
    rows.push({ key, oldValue, newValue, changed })
  }
  rows.sort((a, b) => a.key.localeCompare(b.key))
  return rows
}

function renderValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

export function AuditLogDetailDrawer({ item, onClose }: AuditLogDetailDrawerProps) {
  const [showAll, setShowAll] = useState(false)
  const [copied, setCopied] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (item) {
      setShowAll(false)
      setCopied(false)
      closeRef.current?.focus()
    }
  }, [item])

  useEffect(() => {
    if (!item) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, onClose])

  const diff = useMemo(
    () => (item ? buildDiff(item.old_values, item.new_values) : []),
    [item],
  )
  const visibleDiff = useMemo(
    () => (item?.action === 'update' && !showAll ? diff.filter((r) => r.changed) : diff),
    [diff, item?.action, showAll],
  )

  if (!item) return null

  const actionColor = AUDIT_LOG_ACTION_COLOR[item.action]
  const actionLabel = AUDIT_LOG_ACTION_LABEL[item.action]

  const handleCopyJson = async () => {
    const json = JSON.stringify(
      { old_values: item.old_values, new_values: item.new_values },
      null,
      2,
    )
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-black/40"
        onClick={onClose}
        role="presentation"
      />
      <aside className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">รายละเอียด Audit Log</h2>
            <p className="mt-0.5 text-xs text-gray-500">ID #{item.id}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="ปิด"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">เวลา</p>
              <p className="mt-1 text-gray-900">{formatDateTime(item.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">การกระทำ</p>
              <p className="mt-1">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${actionColor}`}>
                  {actionLabel}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">พนักงาน</p>
              <p className="mt-1 text-gray-900">{fullName(item.employee)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">โมดูล</p>
              <p className="mt-1 text-gray-900">{entityLabel(item.entity_type)}</p>
              <p className="text-xs text-gray-400">{item.entity_type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Entity ID</p>
              <p className="mt-1 font-mono text-gray-900">{item.entity_id ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">IP Address</p>
              <p className="mt-1 font-mono text-gray-900">{item.ip_address ?? '—'}</p>
            </div>
          </div>

          {/* Diff */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">
                การเปลี่ยนแปลง
                {item.action === 'update' && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({diff.filter((r) => r.changed).length} จาก {diff.length} field)
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {item.action === 'update' && diff.some((r) => !r.changed) && (
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {showAll ? 'แสดงเฉพาะที่เปลี่ยน' : 'แสดงทั้งหมด'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <CopyIcon />
                  {copied ? 'คัดลอกแล้ว' : 'คัดลอก JSON'}
                </button>
              </div>
            </div>

            {visibleDiff.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
                ไม่มีข้อมูลการเปลี่ยนแปลง
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium text-gray-600 w-1/4">Field</th>
                      {item.action !== 'create' && (
                        <th className="px-3 py-2 font-medium text-gray-600">ก่อน</th>
                      )}
                      {item.action !== 'delete' && (
                        <th className="px-3 py-2 font-medium text-gray-600">หลัง</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visibleDiff.map((row) => (
                      <tr key={row.key} className={row.changed ? '' : 'opacity-60'}>
                        <td className="px-3 py-2 align-top font-mono text-xs text-gray-700">
                          {row.key}
                        </td>
                        {item.action !== 'create' && (
                          <td className={`px-3 py-2 align-top ${row.changed ? 'bg-red-50' : ''}`}>
                            <pre className="whitespace-pre-wrap break-words font-sans text-xs text-gray-800">
                              {renderValue(row.oldValue)}
                            </pre>
                          </td>
                        )}
                        {item.action !== 'delete' && (
                          <td className={`px-3 py-2 align-top ${row.changed ? 'bg-green-50' : ''}`}>
                            <pre className="whitespace-pre-wrap break-words font-sans text-xs text-gray-800">
                              {renderValue(row.newValue)}
                            </pre>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
