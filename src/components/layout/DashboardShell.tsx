'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import type { Session } from 'next-auth'

interface DashboardShellProps {
  session: Session
  children: React.ReactNode
}

export function DashboardShell({ session, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Tutup drawer otomatis saat user navigasi ke halaman lain
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Lock body scroll saat drawer terbuka di mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  return (
    <div className="flex h-screen min-h-[100dvh] overflow-hidden bg-gray-50">
      {/* Backdrop (mobile saja) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-out
          md:relative md:translate-x-0 md:z-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <Sidebar session={session} onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar session={session} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {children}
        </main>
      </div>
    </div>
  )
}
