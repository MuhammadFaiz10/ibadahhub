'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FileSpreadsheet, FileText } from 'lucide-react'
import { ScopeFilter } from '@/components/shared/ScopeFilter'

interface Props {
  tahun: number
  isSuperAdmin: boolean
  religionId?: number
  tempatIbadahId?: number
}

export function LaporanFilterBar({
  tahun,
  isSuperAdmin,
  religionId,
  tempatIbadahId,
}: Props) {
  const router = useRouter()
  const search = useSearchParams()

  function pushQuery(updates: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(search?.toString() ?? '')
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === '' || v === null) params.delete(k)
      else params.set(k, String(v))
    }
    router.push(`/laporan?${params.toString()}`)
  }

  const exportQuery = (() => {
    const p = new URLSearchParams()
    p.set('tahun', String(tahun))
    if (religionId) p.set('religionId', String(religionId))
    if (tempatIbadahId) p.set('tempatIbadahId', String(tempatIbadahId))
    return p.toString()
  })()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600 hidden sm:inline">Tahun:</label>
        <select
          value={tahun}
          onChange={(e) => pushQuery({ tahun: Number(e.target.value) })}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
        >
          {Array.from({ length: 5 }).map((_, i) => {
            const y = new Date().getFullYear() - i
            return (
              <option key={y} value={y}>
                {y}
              </option>
            )
          })}
        </select>
      </div>

      {isSuperAdmin && (
        <ScopeFilter
          religionId={religionId}
          tempatIbadahId={tempatIbadahId}
          onChange={({ religionId: r, tempatIbadahId: t }) =>
            pushQuery({ religionId: r, tempatIbadahId: t })
          }
        />
      )}

      <a
        href={`/api/laporan/export?format=xlsx&${exportQuery}`}
        className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
        title="Download Excel"
      >
        <FileSpreadsheet size={15} /> Excel
      </a>
      <a
        href={`/api/laporan/export?format=pdf&${exportQuery}`}
        className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
        title="Download PDF"
      >
        <FileText size={15} /> PDF
      </a>
    </div>
  )
}
