'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'

export interface PerbandinganAgamaDatum {
  nama: string
  pengurus: number
  jemaah: number
  kegiatanAktif: number
}

interface Props {
  data: PerbandinganAgamaDatum[]
}

export function PerbandinganAgamaChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">
        Belum ada data agama untuk ditampilkan
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="nama" tick={{ fontSize: 12, fill: '#64748b' }} />
        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="pengurus" name="Pengurus" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="jemaah" name="Jemaah" fill="#a855f7" radius={[4, 4, 0, 0]} />
        <Bar
          dataKey="kegiatanAktif"
          name="Kegiatan Aktif"
          fill="#f59e0b"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
