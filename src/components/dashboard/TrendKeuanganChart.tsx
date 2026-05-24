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
import { formatRupiah } from '@/lib/utils'

export interface TrendKeuanganDatum {
  bulan: string
  pemasukan: number
  pengeluaran: number
}

interface Props {
  data: TrendKeuanganDatum[]
}

export function TrendKeuanganChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">
        Belum ada data keuangan untuk ditampilkan
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="bulan" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis 
          tick={{ fontSize: 12, fill: '#64748b' }} 
          axisLine={false} 
          tickLine={false}
          tickFormatter={(value) => `Rp ${(value / 1000000).toFixed(0)}M`}
        />
        <Tooltip
          formatter={(value: number) => formatRupiah(value)}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
        <Bar dataKey="pemasukan" name="Pemasukan" fill="#b59da4" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#6d3d14" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
