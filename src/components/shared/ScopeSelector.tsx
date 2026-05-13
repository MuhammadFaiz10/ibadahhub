'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'

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
  religionId: number | undefined
  tempatIbadahId: number | undefined
  onChange: (val: { religionId?: number; tempatIbadahId?: number }) => void
  errorReligion?: string
  errorTempatIbadah?: string
  /** Tampilkan label "Agama" & "Tempat Ibadah" di atas dropdown */
  showLabels?: boolean
  /** Jika true, kolom tempat ibadah dilewati (mis. untuk form yang scope-nya sudah tetap). */
  hideTempatIbadah?: boolean
  /** Jika true, semua dropdown disable. */
  disabled?: boolean
  /** Tampilkan layout 2 kolom jika true (default). */
  twoColumn?: boolean
}

/**
 * ScopeSelector — dropdown Agama + Tempat Ibadah untuk SUPERADMIN.
 *
 * Dipakai di form: jemaah, pengurus, kegiatan, pengumuman, donasi,
 * pengeluaran, rekening. Saat religionId berubah, daftar tempat ibadah
 * di-reload otomatis & tempatIbadahId di-reset.
 */
export function ScopeSelector({
  religionId,
  tempatIbadahId,
  onChange,
  errorReligion,
  errorTempatIbadah,
  showLabels = true,
  hideTempatIbadah = false,
  disabled = false,
  twoColumn = true,
}: Props) {
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
    if (hideTempatIbadah) return
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
  }, [religionId, hideTempatIbadah])

  const wrap = twoColumn
    ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
    : 'space-y-4'

  return (
    <div className={wrap}>
      <div>
        {showLabels && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Agama <span className="text-red-500">*</span>
          </label>
        )}
        <select
          value={religionId ?? ''}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value ? Number(e.target.value) : undefined
            // reset tempatIbadahId saat agama berubah
            onChange({ religionId: v, tempatIbadahId: undefined })
          }}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50"
        >
          <option value="">— Pilih agama —</option>
          {religions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nama}
            </option>
          ))}
        </select>
        {errorReligion && <p className="mt-1 text-xs text-red-600">{errorReligion}</p>}
      </div>

      {!hideTempatIbadah && (
        <div>
          {showLabels && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tempat Ibadah <span className="text-red-500">*</span>
            </label>
          )}
          <select
            value={tempatIbadahId ?? ''}
            disabled={disabled || !religionId || tempatLoading}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : undefined
              onChange({ religionId, tempatIbadahId: v })
            }}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">
              {!religionId
                ? '— Pilih agama dulu —'
                : tempatLoading
                ? 'Memuat...'
                : tempatList.length === 0
                ? 'Tidak ada tempat ibadah'
                : '— Pilih tempat ibadah —'}
            </option>
            {tempatList.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nama}
                {t.kota ? ` — ${t.kota}` : ''}
              </option>
            ))}
          </select>
          {errorTempatIbadah && (
            <p className="mt-1 text-xs text-red-600">{errorTempatIbadah}</p>
          )}
        </div>
      )}
    </div>
  )
}
