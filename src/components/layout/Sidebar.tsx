import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission, MENU_PERMISSION_MAP, ROUTE_PERMISSION_MAP } from '@/lib/permissions'

/* ─── Icons (inline SVG for zero deps) ─── */
const icons = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  customer: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  service: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  finance: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  product: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  credit: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  team: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  auditLog: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  notification: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  chevron: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
}

interface MenuItem {
  id: string
  label: string
  icon: keyof typeof icons
  path?: string
  children?: { label: string; path: string }[]
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'แดชบอร์ด', icon: 'dashboard', path: '/' },
  { id: 'customer', label: 'ลูกค้า', icon: 'customer', path: '/customers' },
  { id: 'service', label: 'ใบสั่งซ่อม', icon: 'service', path: '/service-orders' },
  {
    id: 'finance', label: 'การเงิน', icon: 'finance',
    children: [
      { label: 'ใบเสนอราคา', path: '/quotations' },
      { label: 'ใบแจ้งหนี้', path: '/invoices' },
      { label: 'มัดจำ', path: '/deposits' },
      { label: 'ใบส่งมอบ', path: '/delivery-notes' },
      { label: 'ใบรับประกัน', path: '/warranties' },
    ],
  },
  {
    id: 'product', label: 'สินค้า & สต็อก', icon: 'product',
    children: [
      { label: 'สินค้า', path: '/products' },
      { label: 'คลังสินค้า', path: '/warehouses' },
      { label: 'สต็อกในคลัง', path: '/inventory' },
      { label: 'ใบรับสินค้า', path: '/goods-receipts' },
      { label: 'โอนย้ายสต็อก', path: '/stock-transfers' },
      { label: 'ใบสั่งซื้อ', path: '/purchase-orders' },
    ],
  },
  {
    id: 'credit', label: 'สินเชื่อ', icon: 'credit',
    children: [
      { label: 'สมัครไฟแนนซ์', path: '/loan-applications' },
      { label: 'สินเชื่อร้าน', path: '/store-loans' },
      { label: 'ค้นหาสินเชื่อ', path: '/loans/search' },
    ],
  },
  {
    id: 'team', label: 'HR', icon: 'team',
    children: [
      { label: 'พนักงาน', path: '/hr/employees' },
      { label: 'ลงเวลา', path: '/hr/attendance' },
      { label: 'วันหยุด', path: '/hr/holidays' },
    ],
  },
  {
    id: 'settings', label: 'ตั้งค่า', icon: 'settings',
    children: [
      { label: 'สาขา', path: '/settings/branches' },
      { label: 'ตำแหน่ง', path: '/settings/positions' },
      { label: 'บทบาท & สิทธิ์', path: '/settings/roles' },
      { label: 'ตารางเวลา', path: '/settings/work-schedules' },
      { label: 'ยี่ห้อ', path: '/settings/brands' },
      { label: 'หมวดสินค้า', path: '/settings/categories' },
      { label: 'หน่วยนับ', path: '/settings/units' },
      { label: 'Supplier', path: '/settings/vendors' },
      { label: 'บริษัทไฟแนนซ์', path: '/settings/finance-companies' },
      { label: 'ตัวเลือกแบบสินค้า', path: '/settings/product-attributes' },
      { label: 'รายการตรวจสอบสภาพรถ', path: '/settings/vehicle-inspection-checklists' },
    ],
  },
  { id: 'auditLog', label: 'Audit Log', icon: 'auditLog', path: '/audit-logs' },
  { id: 'notification', label: 'แจ้งเตือน', icon: 'notification', path: '/notifications' },
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const location = useLocation()
  const { permissions } = useAuthStore()

  const visibleMenuItems = useMemo(() => {
    // If permissions not loaded yet (null), show all menu items
    if (permissions === null) return menuItems

    return menuItems
      .map((item) => {
        // Dashboard and notification always visible
        if (item.id === 'dashboard' || item.id === 'notification') return item

        const mapping = MENU_PERMISSION_MAP[item.id]
        if (!mapping) return null

        // Parent without children → single module check
        if (!item.children) {
          const module = typeof mapping === 'string' ? mapping : mapping[0]
          return hasPermission(permissions, module) ? item : null
        }

        // Parent with children → filter children by permission
        const visibleChildren = item.children.filter((child) => {
          const childModule = ROUTE_PERMISSION_MAP[child.path]
          if (!childModule) return true
          return hasPermission(permissions, childModule)
        })

        if (visibleChildren.length === 0) return null
        return { ...item, children: visibleChildren }
      })
      .filter(Boolean) as MenuItem[]
  }, [permissions])

  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(() => {
    // Auto-expand the menu that contains current path
    const expanded = new Set<string>()
    for (const item of menuItems) {
      if (item.children?.some((child) => location.pathname.startsWith(child.path))) {
        expanded.add(item.id)
      }
    }
    return expanded
  })

  const toggleMenu = (id: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <aside
      className={cn(
        'sidebar fixed left-0 top-0 z-40 flex h-screen flex-col bg-[#DC2626] text-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <img src="/logo.svg" alt="สุดยอดมอเตอร์" className="h-8 brightness-0 invert" />
        )}
        <button
          onClick={onToggle}
          className="rounded-md p-1.5 hover:bg-white/10 transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 sidebar-scrollbar">
        {visibleMenuItems.map((item) => {
          const isActive = item.path
            ? location.pathname === item.path
            : item.children?.some((c) => location.pathname.startsWith(c.path))
          const isExpanded = expandedMenus.has(item.id) || !!isActive

          return (
            <div key={item.id} className="mb-0.5">
              {/* Top-level link or expandable */}
              {item.path ? (
                <NavLink
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-white/80 hover:bg-white/10 hover:text-white',
                    collapsed && 'justify-center px-2',
                  )}
                >
                  <span className="shrink-0">{icons[item.icon]}</span>
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ) : (
                <button
                  onClick={() => toggleMenu(item.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white',
                    collapsed && 'justify-center px-2',
                  )}
                >
                  <span className="shrink-0">{icons[item.icon]}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <span className={cn(
                        'shrink-0 transition-transform duration-200',
                        isExpanded && 'rotate-180',
                      )}>
                        {icons.chevron}
                      </span>
                    </>
                  )}
                </button>
              )}

              {/* Children */}
              {item.children && !collapsed && (
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-200',
                    isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
                  )}
                >
                  <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-white/20 pl-4">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive: active }) =>
                          cn(
                            'rounded-md px-3 py-2 text-sm transition-colors',
                            active
                              ? 'bg-white/15 text-white font-medium'
                              : 'text-white/70 hover:text-white hover:bg-white/10',
                          )
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Version */}
      {!collapsed && (
        <div className="border-t border-white/10 px-4 py-3 text-xs text-white/40">
          v0.1.0
        </div>
      )}
    </aside>
  )
}
