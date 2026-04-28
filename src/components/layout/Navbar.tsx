import { cn } from '@/lib/utils'
import { NotificationDropdown } from '@/components/ui/NotificationDropdown'
import { ProfileDrawer } from '@/components/ui/ProfileDrawer'

interface NavbarProps {
  title?: string
  sidebarCollapsed?: boolean
}

export function Navbar({ title = 'แดชบอร์ด', sidebarCollapsed }: NavbarProps) {
  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 transition-all duration-300 print:hidden',
        sidebarCollapsed ? 'left-16' : 'left-60',
      )}
    >
      {/* Left: Page title */}
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold text-gray-900">🏠</span>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <NotificationDropdown />
        <ProfileDrawer />
      </div>
    </header>
  )
}
