'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Receipt, CheckCircle2, AlertCircle, Clock, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatRupiah, formatTanggal } from '@/lib/utils'
import { useDataFetch } from '@/hooks/useDataFetch'
import { toast } from 'sonner'
import axios from 'axios'
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog'

export default function KasSayaPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<'tagihan' | 'riwayat'>('tagihan')
  const [payTarget, setPayTarget] = useState<any>(null)
  const [isPaying, setIsPaying] = useState(false)

  const { data: tagihanList, isLoading: loadingTagihan, mutate: mutateTagihan } = useDataFetch<any>('/api/jemaah/kas', {
    type: 'tagihan'
  })

  const { data: riwayatList, isLoading: loadingRiwayat, mutate: mutateRiwayat } = useDataFetch<any>('/api/jemaah/kas', {
    type: 'riwayat'
  })

  const totalTagihan = tagihanList.reduce((acc, curr) => acc + Number(curr.tagihan?.nominal || 0), 0)
  
  // Count payments this month
  const thisMonth = new Date().getMonth()
  const paymentsThisMonth = riwayatList.filter(r => new Date(r.tanggalBayar).getMonth() === thisMonth).length

  const handlePay = async () => {
    if (!payTarget) return
    setIsPaying(true)
    try {
      await axios.post(`/api/jemaah/kas/${payTarget.id}/bayar`, {
        metodePembayaran: 'TRANSFER_BANK',
        buktiPembayaran: 'mock-bukti.jpg' // Pada implementasi nyata, ganti dengan upload bukti
      })
      toast.success('Pembayaran berhasil dicatat. Menunggu konfirmasi pengurus.')
      setPayTarget(null)
      mutateTagihan()
      mutateRiwayat()
      setActiveTab('riwayat')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal melakukan pembayaran')
    } finally {
      setIsPaying(false)
    }
  }

  if (session?.user?.role !== 'JEMAAH') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h2>
        <p className="text-gray-500">Halaman ini khusus untuk Jemaah.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kas Saya"
        subtitle="Pantau dan bayar tagihan kas atau iuran Anda dengan mudah"
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Receipt size={80} />
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0 z-10">
            <Receipt size={24} />
          </div>
          <div className="flex-1 z-10">
            <p className="text-sm text-gray-500 font-medium">Total Tagihan Aktif</p>
            {loadingTagihan ? (
              <div className="h-8 w-24 bg-gray-100 animate-pulse rounded mt-0.5"></div>
            ) : (
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatRupiah(totalTagihan)}</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-600">
            <CheckCircle2 size={80} />
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0 z-10">
            <CheckCircle2 size={24} />
          </div>
          <div className="flex-1 z-10">
            <p className="text-sm text-gray-500 font-medium">Pembayaran Bulan Ini</p>
            {loadingRiwayat ? (
              <div className="h-8 w-12 bg-gray-100 animate-pulse rounded mt-0.5"></div>
            ) : (
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{paymentsThisMonth}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('tagihan')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tagihan' 
                ? 'border-primary text-primary bg-primary-light/10' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Tagihan Aktif ({tagihanList.length})
          </button>
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'riwayat' 
                ? 'border-primary text-primary bg-primary-light/10' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Riwayat Pembayaran
          </button>
        </div>

        <div className="p-0">
          {activeTab === 'tagihan' ? (
            <div className="divide-y divide-gray-100 min-h-[200px]">
              {loadingTagihan ? (
                <div className="p-8 text-center text-gray-400">Memuat data tagihan...</div>
              ) : tagihanList.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} />
                  </div>
                  <p className="font-medium text-gray-900 text-lg">Hore! Tidak ada tagihan.</p>
                  <p className="text-sm mt-1 max-w-sm mx-auto">Semua kewajiban kas Anda saat ini sudah lunas atau belum ada tagihan baru.</p>
                </div>
              ) : (
                tagihanList.map(item => (
                  <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 flex-shrink-0">
                        <AlertCircle size={16} />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{item.tagihan?.nama}</h4>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                          <Clock size={14} className="text-gray-400" />
                          Jatuh Tempo: {item.tagihan?.jatuhTempo ? formatTanggal(item.tagihan.jatuhTempo) : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/3">
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatRupiah(Number(item.tagihan?.nominal))}</p>
                        <span className="inline-block mt-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-medium rounded-full ring-1 ring-amber-200/50 ring-inset">
                          Belum Dibayar
                        </span>
                      </div>
                      <button 
                        onClick={() => setPayTarget(item)}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap shadow-sm"
                      >
                        Bayar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 min-h-[200px]">
              {loadingRiwayat ? (
                <div className="p-8 text-center text-gray-400">Memuat riwayat pembayaran...</div>
              ) : riwayatList.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock size={32} />
                  </div>
                  <p className="font-medium text-gray-900 text-lg">Belum ada riwayat.</p>
                  <p className="text-sm mt-1">Anda belum melakukan pembayaran kas apa pun.</p>
                </div>
              ) : (
                riwayatList.map(item => (
                  <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        item.status === 'LUNAS' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'
                      }`}>
                        {item.status === 'LUNAS' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{item.tagihan?.nama}</h4>
                        <div className="text-sm text-gray-500 mt-1 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock size={13} className="text-gray-400" />
                            {item.tanggalBayar ? formatTanggal(item.tanggalBayar) : '-'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Wallet size={13} className="text-gray-400" />
                            {item.metodePembayaran?.replace('_', ' ') ?? '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <p className="font-bold text-gray-900">{formatRupiah(Number(item.tagihan?.nominal))}</p>
                      {item.status === 'LUNAS' ? (
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-medium rounded-full ring-1 ring-emerald-200/50 ring-inset flex items-center gap-1">
                          <CheckCircle2 size={12} /> Berhasil
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-medium rounded-full ring-1 ring-blue-200/50 ring-inset flex items-center gap-1">
                          <Clock size={12} /> Menunggu Konfirmasi
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmActionDialog
        open={!!payTarget}
        onOpenChange={(open) => !open && setPayTarget(null)}
        onConfirm={handlePay}
        title="Konfirmasi Pembayaran"
        description={`Anda akan melakukan pembayaran untuk ${payTarget?.tagihan?.nama} sebesar ${formatRupiah(Number(payTarget?.tagihan?.nominal || 0))}. Lanjutkan?`}
        confirmLabel="Ya, Bayar Sekarang"
        isLoading={isPaying}
      />
    </div>
  )
}
