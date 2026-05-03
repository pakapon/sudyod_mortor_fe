import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  title?: string
}

export function AppLayout({ title }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 1024)
  const location = useLocation()

  // Auto close sidebar on narrow screens when route changes
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarCollapsed(true)
    }
  }, [location.pathname])

  // Handle resize events
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true)
      } else {
        setSidebarCollapsed(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Backdrop */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden transition-opacity"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className={cn(
        "flex-1 flex flex-col min-h-screen transition-all duration-300",
        sidebarCollapsed ? 'lg:ml-16 ml-0' : 'lg:ml-60 ml-0'
      )}>
        <Navbar 
          title={title} 
          sidebarCollapsed={sidebarCollapsed} 
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main className="flex-1 pt-16 min-w-0 print:ml-0 print:pt-0">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
