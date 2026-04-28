import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  title?: string
}

export function AppLayout({ title }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <Navbar title={title} sidebarCollapsed={sidebarCollapsed} />

      <main
        className={cn(
          'pt-16 transition-all duration-300 print:ml-0 print:pt-0',
          sidebarCollapsed ? 'ml-16' : 'ml-60',
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
