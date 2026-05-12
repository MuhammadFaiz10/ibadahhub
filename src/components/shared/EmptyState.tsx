import { PackageSearch } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({
  title = 'Tidak ada data',
  description = 'Belum ada data yang tersedia.',
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <PackageSearch className="w-12 h-12 text-gray-300 mb-4" />
      <h3 className="text-base font-semibold text-gray-600">{title}</h3>
      <p className="text-sm text-gray-400 mt-1 max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
