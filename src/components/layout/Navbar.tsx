import { cn } from '@/lib/utils'
import { NotificationDropdown } from '@/components/ui/NotificationDropdown'
import { ProfileDrawer } from '@/components/ui/ProfileDrawer'

interface NavbarProps {
  title?: string
  sidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}

export function Navbar({ title = 'แดชบอร์ด', sidebarCollapsed, onToggleSidebar }: NavbarProps) {
  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 transition-all duration-300 print:hidden',
        sidebarCollapsed ? 'lg:left-16 left-0' : 'lg:left-60 left-0',
      )}
    >
      {/* Left: Page title & Mobile Menu Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 -ml-1.5 mr-1 text-gray-500 hover:text-gray-900 focus:outline-none rounded-md hover:bg-gray-100 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        <span className="text-lg font-semibold text-gray-900 hidden sm:inline">🏠</span>
        <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{title}</h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <NotificationDropdown />
        <ProfileDrawer />
      </div>
    </header>
  )
}
