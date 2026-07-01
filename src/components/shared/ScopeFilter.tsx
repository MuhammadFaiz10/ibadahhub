'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Globe, Building2 } from 'lucide-react'

interface Religion {
  id: number
  nama: string
}

interface TempatIbadah {
  id: number
  nama: string
  kota: string | null
}

interface Props {
  religionId?: number | undefined
  tempatIbadahId?: number | undefined
  onChange: (val: { religionId?: number; tempatIbadahId?: number }) => void
  /** Tampilkan compact (cocok untuk toolbar) */
  compact?: boolean
}

/**
 * ScopeFilter — dropdown filter Agama + Tempat Ibadah untuk SUPERADMIN
 * di list pages (donasi, pengeluaran, rekening, laporan, dll).
 *
 * Beda dari ScopeSelector:
 * - punya opsi "Semua" (undefined)
 * - dipakai untuk filter, bukan form input
 * - saat religionId di-clear, tempatIbadahId ikut clear
 */
export function ScopeFilter({ religionId, tempatIbadahId, onChange, compact = true }: Props) {
  const [religions, setReligions] = useState<Religion[]>([])
  const [tempatList, setTempatList] = useState<TempatIbadah[]>([])
  const [tempatLoading, setTempatLoading] = useState(false)

  useEffect(() => {
    axios
      .get('/api/agama/public')
      .then((r) => setReligions(r.data.data ?? []))
      .catch(() => setReligions([]))
  }, [])

  useEffect(() => {
    if (!religionId) {
      setTempatList([])
      return
    }
    setTempatLoading(true)
    axios
      .get('/api/tempat-ibadah/public', { params: { religionId } })
      .then((r) => setTempatList(r.data.data ?? []))
      .catch(() => setTempatList([]))
      .finally(() => setTempatLoading(false))
  }, [religionId])

  const selectClass = compact
    ? 'px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white'
    : 'w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white'

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
      <div className="relative flex-1 sm:flex-none">
        <Globe
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <select
          value={religionId ?? ''}
          onChange={(e) => {
            const v = e.target.value ? Number(e.target.value) : undefined
            // reset tempat ibadah saat agama berubah / di-clear
            onChange({ religionId: v, tempatIbadahId: undefined })
          }}
          className={`${selectClass} pl-9 w-full sm:w-48`}
          title="Filter agama"
        >
          <option value="">Semua agama</option>
          {religions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nama}
            </option>
          ))}
        </select>
      </div>

      <div className="relative flex-1 sm:flex-none">
        <Building2
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <select
          value={tempatIbadahId ?? ''}
          disabled={!religionId || tempatLoading}
          onChange={(e) => {
            const v = e.target.value ? Number(e.target.value) : undefined
            onChange({ religionId, tempatIbadahId: v })
          }}
          className={`${selectClass} pl-9 w-full sm:w-56 disabled:bg-gray-50 disabled:text-gray-400`}
          title="Filter tempat ibadah"
        >
          <option value="">
            {!religionId
              ? 'Semua tempat ibadah'
              : tempatLoading
              ? 'Memuat...'
              : tempatList.length === 0
              ? 'Tidak ada'
              : 'Semua tempat ibadah'}
          </option>
          {tempatList.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nama}
              {t.kota ? ` — ${t.kota}` : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

