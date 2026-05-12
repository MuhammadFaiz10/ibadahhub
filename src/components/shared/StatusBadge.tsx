import { cn } from '@/lib/utils'
import type { StatusBadgeVariant } from '@/types'

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  UPCOMING:     { bg: 'bg-status-upcoming',  text: 'text-status-upcomingText', label: 'Upcoming' },
  ONGOING:      { bg: 'bg-status-ongoing',   text: 'text-status-ongoingText',  label: 'Sedang Berlangsung' },
  SELESAI:      { bg: 'bg-status-done',      text: 'text-status-doneText',     label: 'Selesai' },
  DIBATALKAN:   { bg: 'bg-status-danger',    text: 'text-status-dangerText',   label: 'Dibatalkan' },
  PENDING:      { bg: 'bg-status-pending',   text: 'text-status-pendingText',  label: 'Pending' },
  DIKONFIRMASI: { bg: 'bg-status-success',   text: 'text-status-successText',  label: 'Dikonfirmasi' },
  DITOLAK:      { bg: 'bg-status-danger',    text: 'text-status-dangerText',   label: 'Ditolak' },
  DRAFT:        { bg: 'bg-status-done',      text: 'text-status-doneText',     label: 'Draft' },
  AKTIF:        { bg: 'bg-status-success',   text: 'text-status-successText',  label: 'Aktif' },
  KADALUARSA:   { bg: 'bg-status-danger',    text: 'text-status-dangerText',   label: 'Kadaluarsa' },
  NONAKTIF:     { bg: 'bg-status-done',      text: 'text-status-doneText',     label: 'Nonaktif' },
  KETUA:        { bg: 'bg-status-success',   text: 'text-status-successText',  label: 'Ketua' },
  BENDAHARA:    { bg: 'bg-status-ongoing',   text: 'text-status-ongoingText',  label: 'Bendahara' },
  SEKRETARIS:   { bg: 'bg-status-upcoming',  text: 'text-status-upcomingText', label: 'Sekretaris' },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    label: status,
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.bg,
        config.text,
        className
      )}
    >
      {config.label}
    </span>
  )
}
