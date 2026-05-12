'use client'

import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Bell, ChevronDown, LogOut, User, Menu } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { cn, getInisial } from '@/lib/utils'
import { useNotifikasiCount } from '@/hooks/useNotifikasi'
import type { Session } from 'next-auth'

const routeLabels: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/agama':      'Manajemen Agama',
  '/pengurus':   'Manajemen Pengurus',
  '/jemaah':     'Manajemen Jemaah',
  '/kegiatan':   'Kegiatan Ibadah',
  '/pengumuman': 'Pengumuman',
  '/donasi':     'Donasi',
  '/pengeluaran':'Pengeluaran',
  '/laporan':    'Laporan Keuangan',
  '/rekening':   'Rekening Pembayaran',
  '/aktivitas':  'Activity Log',
  '/notifikasi': 'Notifikasi',
  '/profil':     'Profil Saya',
}

interface TopBarProps {
  session: Session
  onMenuClick?: () => void
}

export function TopBar({ session, onMenuClick }: TopBarProps) {
  const pathname = usePathname()
  const unreadCount = useNotifikasiCount()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const pageTitle = Object.entries(routeLabels).find(([key]) =>
    pathname.startsWith(key)
  )?.[1] ?? 'IbadahHub'

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {/* Hamburger (mobile saja) */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-1 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="Buka menu"
        >
          <Menu size={20} />
        </button>
        <h2 className="text-sm sm:text-base font-semibold text-gray-800 truncate">
          {pageTitle}
        </h2>
      </div>

      <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
        {/* Notification Bell */}
        <Link href="/notifikasi" className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell size={20} className="text-gray-500" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 sm:px-3 py-2 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-primary">
                {getInisial(session.user.name ?? '')}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[140px] truncate">
              {session.user.name}
            </span>
            <ChevronDown size={14} className={cn('text-gray-400 transition-transform hidden sm:block', dropdownOpen && 'rotate-180')} />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                <Link
                  href="/profil"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <User size={15} />
                  Profil Saya
                </Link>
                <hr className="my-1 border-gray-100" />
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                >
                  <LogOut size={15} />
                  Keluar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
