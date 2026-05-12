import type { Role, SubRole } from '@prisma/client'
import type { LucideIcon } from 'lucide-react'

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface ApiError {
  error: string | Record<string, string[]>
}

export interface SoftDeletePayload {
  alasan: string
}

export interface NavigationItem {
  label: string
  href: string
  icon: LucideIcon
  roles?: Role[]
  subRoles?: SubRole[]
}

export type StatusBadgeVariant =
  | 'UPCOMING'
  | 'ONGOING'
  | 'SELESAI'
  | 'DIBATALKAN'
  | 'PENDING'
  | 'DIKONFIRMASI'
  | 'DITOLAK'
  | 'DRAFT'
  | 'AKTIF'
  | 'KADALUARSA'
  | 'NONAKTIF'
