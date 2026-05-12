import { Loader2 } from 'lucide-react'

export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
      <Loader2 size={28} className="animate-spin text-primary mb-3" />
      <p className="text-sm">Memuat halaman...</p>
    </div>
  )
}
