'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'

export interface TrendPertumbuhanDatum {
  bulan: string
  jemaah: number
  pengurus?: number
  kegiatan: number
  pengumuman: number
}

interface Props {
  data: TrendPertumbuhanDatum[]
}

export function TrendPertumbuhanChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">
        Belum ada data pertumbuhan
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="bulan" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis 
          tick={{ fontSize: 12, fill: '#64748b' }} 
          axisLine={false} 
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
        <Line type="monotone" dataKey="jemaah" name="Jemaah Baru" stroke="#85756e" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        {data.some(d => d.pengurus !== undefined) && (
          <Line type="monotone" dataKey="pengurus" name="Pengurus Baru" stroke="#b59da4" strokeWidth={2} dot={{ r: 4 }} />
        )}
        <Line type="monotone" dataKey="kegiatan" name="Kegiatan" stroke="#6d3d14" strokeWidth={2} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="pengumuman" name="Pengumuman" stroke="#cdc5b4" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
