'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Globe,
  Building2,
  Users,
  UserCheck,
  Calendar,
  Megaphone,
  HandCoins,
  TrendingDown,
  FileBarChart,
  CreditCard,
  UserCircle,
  Activity,
  Wallet,
} from 'lucide-react'
import { cn, getInisial } from '@/lib/utils'
import type { NavigationItem } from '@/types'
import type { Session } from 'next-auth'

const navItems: NavigationItem[] = [
  { label: 'Dashboard',    href: '/dashboard',   icon: LayoutDashboard, roles: ['SUPERADMIN', 'PENGURUS', 'JEMAAH'] },
  { label: 'Agama',        href: '/agama',        icon: Globe,           roles: ['SUPERADMIN'] },
  { label: 'Tempat Ibadah',href: '/tempat-ibadah',icon: Building2,       roles: ['SUPERADMIN'] },
  { label: 'Pengurus',     href: '/pengurus',     icon: UserCheck,       roles: ['SUPERADMIN', 'PENGURUS'], subRoles: ['KETUA'] },
  { label: 'Jemaah',       href: '/jemaah',       icon: Users,           roles: ['SUPERADMIN', 'PENGURUS'], subRoles: ['KETUA', 'SEKRETARIS'] },
  { label: 'Kegiatan',     href: '/kegiatan',     icon: Calendar,        roles: ['SUPERADMIN', 'PENGURUS', 'JEMAAH'], subRoles: ['KETUA', 'SEKRETARIS'] },
  { label: 'Pengumuman',   href: '/pengumuman',   icon: Megaphone,       roles: ['SUPERADMIN', 'PENGURUS', 'JEMAAH'], subRoles: ['KETUA', 'SEKRETARIS'] },
  { label: 'Donasi',       href: '/donasi',       icon: HandCoins,       roles: ['SUPERADMIN', 'PENGURUS', 'JEMAAH'], subRoles: ['KETUA', 'BENDAHARA'] },
  { label: 'Kas',          href: '/kas',          icon: Wallet,          roles: ['SUPERADMIN', 'PENGURUS'], subRoles: ['KETUA', 'BENDAHARA'] },
  { label: 'Laporan',      href: '/laporan',      icon: FileBarChart,    roles: ['SUPERADMIN', 'PENGURUS'], subRoles: ['KETUA', 'BENDAHARA'] },
  { label: 'Rekening',     href: '/rekening',     icon: CreditCard,      roles: ['SUPERADMIN', 'PENGURUS'], subRoles: ['KETUA'] },
  { label: 'Aktivitas',    href: '/aktivitas',    icon: Activity,        roles: ['SUPERADMIN'] },
  { label: 'Profil',       href: '/profil',       icon: UserCircle,      roles: ['SUPERADMIN', 'PENGURUS', 'JEMAAH'] },
]

interface SidebarProps {
  session: Session
  onNavigate?: () => void
}

export function Sidebar({ session, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const { role, subRole, name, tempatIbadahNama } = session.user

  const visibleItems = navItems.filter((item) => {
    if (!item.roles?.includes(role)) return false
    if (item.subRoles && role === 'PENGURUS') {
      return subRole != null && (item.subRoles as string[]).includes(subRole)
    }
    return true
  })

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full shadow-lg md:shadow-none">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <h1 className="font-serif text-xl font-bold text-primary-dark">IbadahHub</h1>
        <p className="text-xs text-gray-400 mt-0.5">Platform Ibadah Digital</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-light text-primary-dark'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon size={18} className={isActive ? 'text-primary' : 'text-gray-400'} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-primary">{getInisial(name ?? '')}</span>
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
            <p className="text-xs text-gray-400">
              {role === 'SUPERADMIN' ? 'Super Admin' : subRole ? subRole.charAt(0) + subRole.slice(1).toLowerCase() : role.charAt(0) + role.slice(1).toLowerCase()}
            </p>
          </div>
        </div>
        {tempatIbadahNama ? (
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-teal-700 bg-teal-50 px-2 py-1.5 rounded-md ring-1 ring-teal-100">
            <Building2 size={11} className="flex-shrink-0" />
            <span className="truncate" title={tempatIbadahNama}>{tempatIbadahNama}</span>
          </div>
        ) : role === 'SUPERADMIN' ? (
          <div className="mt-2.5 text-[11px] text-violet-700 bg-violet-50 px-2 py-1.5 rounded-md ring-1 ring-violet-100 text-center">
            Lintas tenant
          </div>
        ) : null}
      </div>
    </aside>
  )
}
