import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationService, buildNotificationLink } from '@/api/notificationService'
import type { NotificationItem } from '@/types/notification'

const POLL_INTERVAL_MS = 60_000
const DROPDOWN_LIMIT = 10

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffSec < 60) return 'เมื่อสักครู่'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} นาทีที่แล้ว`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ชั่วโมงที่แล้ว`
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)} วันที่แล้ว`
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

export function NotificationDropdown() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationService.getUnreadCount()
      setUnreadCount(res.data.data.unread_count)
    } catch {
      // interceptor handles
    }
  }, [])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await notificationService.getNotifications({ page: 1, limit: DROPDOWN_LIMIT })
      setItems(res.data.data)
    } catch {
      // interceptor handles
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  useEffect(() => {
    if (isOpen) {
      fetchItems()
    }
  }, [isOpen, fetchItems])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleItemClick = async (item: NotificationItem) => {
    setIsOpen(false)
    if (item.read_at === null) {
      setItems((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, read_at: new Date().toISOString() } : x)),
      )
      setUnreadCount((c) => Math.max(0, c - 1))
      try {
        await notificationService.markRead(item.id)
      } catch {
        fetchUnreadCount()
      }
    }
    const link = buildNotificationLink(item)
    if (link) navigate(link)
  }

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return
    try {
      await notificationService.markAllRead()
      setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })))
      setUnreadCount(0)
    } catch {
      // interceptor handles
    }
  }

  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label="แจ้งเตือน"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
            {badgeText}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 rounded-xl border border-gray-200 bg-white shadow-xl animate-fade-in z-50">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="font-semibold text-gray-900">แจ้งเตือน</h3>
            <button
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="text-xs font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              อ่านทั้งหมด
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="space-y-2 p-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
                ))}
              </div>
            )}
            {!loading && items.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">ไม่มีการแจ้งเตือน</p>
            )}
            {!loading &&
              items.map((item) => {
                const isUnread = item.read_at === null
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`flex w-full gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50 last:border-b-0 ${
                      isUnread ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 pt-1.5">
                      <span
                        className={`block h-2 w-2 rounded-full ${
                          isUnread ? 'bg-blue-500' : 'bg-transparent'
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {item.title}
                      </p>
                      {item.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{item.body}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">{formatRelativeTime(item.created_at)}</p>
                    </div>
                  </button>
                )
              })}
          </div>
          <div className="border-t px-4 py-2 text-center">
            <button
              onClick={() => {
                setIsOpen(false)
                navigate('/notifications')
              }}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              ดูทั้งหมด
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
