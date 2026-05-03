import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { notificationService, buildNotificationLink } from '@/api/notificationService'
import {
  type NotificationItem,
  type NotificationType,
  NOTIFICATION_TYPE_LABEL,
  NOTIFICATION_TYPE_COLOR,
} from '@/types/notification'

const TYPE_OPTIONS: NotificationType[] = [
  'so_assigned',
  'so_status_change',
  'invoice_overdue',
  'store_loan_overdue',
  'service_reminder',
  'low_stock',
  'permission_changed',
  'stock_transfer_approved',
]

const LIMIT = 20

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
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

export function NotificationsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Number(searchParams.get('page') ?? '1')
  const readFilter = searchParams.get('read') ?? '' // '', 'true', 'false'
  const typeFilter = searchParams.get('type') ?? ''

  const [items, setItems] = useState<NotificationItem[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value === '') next.delete(key)
    else next.set(key, value)
    if (key !== 'page') next.delete('page')
    setSearchParams(next)
  }

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await notificationService.getNotifications({
        page,
        limit: LIMIT,
        is_read: readFilter === '' ? undefined : readFilter === 'true',
        type: (typeFilter as NotificationType) || undefined,
      })
      setItems(res.data.data)
      setTotal(res.data.pagination.total)
    } catch {
      // interceptor handles
    } finally {
      setIsLoading(false)
    }
  }, [page, readFilter, typeFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRowClick = async (item: NotificationItem) => {
    if (item.read_at === null) {
      setItems((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, read_at: new Date().toISOString() } : x)),
      )
      try {
        await notificationService.markRead(item.id)
      } catch {
        fetchData()
      }
    }
    const link = buildNotificationLink(item)
    if (link) navigate(link)
  }

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true)
    try {
      await notificationService.markAllRead()
      fetchData()
    } catch {
      // interceptor handles
    } finally {
      setIsMarkingAll(false)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)
  const rowStart = total > 0 ? (page - 1) * LIMIT + 1 : 0
  const rowEnd = Math.min(page * LIMIT, total)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">การแจ้งเตือน</h1>
          <p className="mt-1 text-sm text-gray-500">รายการแจ้งเตือนทั้งหมดของคุณ</p>
        </div>
        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={isMarkingAll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <CheckIcon />
          {isMarkingAll ? 'กำลังดำเนินการ...' : 'อ่านทั้งหมด'}
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={readFilter}
            onChange={(e) => setParam('read', e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">สถานะ (ทั้งหมด)</option>
            <option value="false">ยังไม่อ่าน</option>
            <option value="true">อ่านแล้ว</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setParam('type', e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">ประเภท (ทั้งหมด)</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {NOTIFICATION_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap w-8"></th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">ข้อความ</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">ประเภท</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">วันที่</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-right">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-gray-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              )}
              {!isLoading &&
                items.map((item) => {
                  const isUnread = item.read_at === null
                  const typeLabel = NOTIFICATION_TYPE_LABEL[item.type as NotificationType] ?? item.type
                  const typeColor =
                    NOTIFICATION_TYPE_COLOR[item.type as NotificationType] ?? 'bg-gray-100 text-gray-600'
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleRowClick(item)}
                      className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                        isUnread ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            isUnread ? 'bg-blue-500' : 'bg-transparent'
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className={isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'}>
                          {item.title}
                        </p>
                        {item.body && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{item.body}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColor}`}
                        >
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        {formatDateTime(item.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            isUnread ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {isUnread ? 'ยังไม่อ่าน' : 'อ่านแล้ว'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <p className="text-sm text-gray-500">
            {total > 0
              ? `Showing ${rowStart.toLocaleString()}-${rowEnd.toLocaleString()} of ${total.toLocaleString()}`
              : 'ไม่พบข้อมูล'}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setParam('page', String(page - 1))}
                className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-40"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                return start + i
              })
                .filter((p) => p >= 1 && p <= totalPages)
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => setParam('page', String(p))}
                    className={`min-w-[32px] rounded-lg border px-2.5 py-1 text-sm ${
                      p === page
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              <button
                disabled={page >= totalPages}
                onClick={() => setParam('page', String(page + 1))}
                className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-40"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
