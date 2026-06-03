'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Check, X, HandCoins, CreditCard, Download, Filter } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { ScopeFilter } from '@/components/shared/ScopeFilter'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatRupiah, formatTanggal } from '@/lib/utils'
import { useDataFetch } from '@/hooks/useDataFetch'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

interface Donasi {
  id: number
  namaDonatur: string
  nominal: string
  tanggal: string
  metodePembayaran: string
  status: 'PENDING' | 'DIKONFIRMASI' | 'DITOLAK'
  catatan: string | null
  buktiPembayaran: string | null
  religionId: number
  tempatIbadahId: number | null
  userId: number | null
  religion: { nama: string } | null
  tempatIbadah: { nama: string; slug: string } | null
  jemaah: { nama: string } | null
  konfirmasiBy: { nama: string } | null
}

const statusOptions = [
  { value: '', label: 'Semua status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'DIKONFIRMASI', label: 'Dikonfirmasi' },
  { value: 'DITOLAK', label: 'Ditolak' },
]

const metodeOptions = [
  { value: '', label: 'Semua Metode' },
  { value: 'TRANSFER_BANK', label: 'Transfer Bank' },
  { value: 'TUNAI', label: 'Tunai' },
  { value: 'MIDTRANS', label: 'Online (Midtrans)' },
  { value: 'QRIS', label: 'QRIS' },
]

export default function DonasiPage() {
  const { data: session } = useSession()
  const role = session?.user.role
  const subRole = session?.user.subRole
  const isJemaah = role === 'JEMAAH'
  const canManage =
    role === 'SUPERADMIN' || (role === 'PENGURUS' && (subRole === 'KETUA' || subRole === 'BENDAHARA'))

  const isSuperAdmin = role === 'SUPERADMIN'
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [status, setStatus] = useState('')
  const [filterReligionId, setFilterReligionId] = useState<number | undefined>(undefined)
  const [filterTempatIbadahId, setFilterTempatIbadahId] = useState<number | undefined>(undefined)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [metodePembayaran, setMetodePembayaran] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  const [deleteTarget, setDeleteTarget] = useState<Donasi | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [totalDikonfirmasi, setTotalDikonfirmasi] = useState('0')
  const [confirmTarget, setConfirmTarget] = useState<Donasi | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Donasi | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [payingId, setPayingId] = useState<number | null>(null)

  const { data, total, isLoading, mutate } = useDataFetch<Donasi>('/api/donasi', {
    search, page, limit, status,
    religionId: filterReligionId,
    tempatIbadahId: filterTempatIbadahId,
    startDate, endDate, metodePembayaran
  })

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.text('Laporan Donasi', 14, 15)
    doc.setFontSize(10)
    let subtitle = 'Semua Donasi'
    if (startDate && endDate) subtitle = `Periode: ${startDate} s.d ${endDate}`
    doc.text(subtitle, 14, 22)
    
    const tableData = data.map((d, i) => [
      i + 1,
      formatTanggal(d.tanggal),
      d.namaDonatur,
      d.metodePembayaran,
      d.status,
      formatRupiah(d.nominal)
    ])

    ;(doc as any).autoTable({
      startY: 28,
      head: [['No', 'Tanggal', 'Donatur', 'Metode', 'Status', 'Nominal']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [85, 27, 20] } // #551b14 (primary)
    })
    
    doc.save(`Laporan_Donasi_${new Date().getTime()}.pdf`)
  }

  function loadSnapScript(url: string, clientKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById('midtrans-snap')
      if (existing) { resolve(); return }
      const script = document.createElement('script')
      script.id = 'midtrans-snap'
      script.src = url
      script.setAttribute('data-client-key', clientKey)
      script.onload = () => resolve()
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  const handleBayar = useCallback(async (donasiId: number) => {
    setPayingId(donasiId)
    try {
      const res = await axios.post('/api/donasi/midtrans', { donasiId })
      const { token, snapScriptUrl, clientKey } = res.data.data
      await loadSnapScript(snapScriptUrl, clientKey)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).snap.pay(token, {
        onSuccess: () => { toast.success('Pembayaran berhasil!'); mutate() },
        onPending: () => { toast.info('Menunggu pembayaran dikonfirmasi.'); mutate() },
        onError: () => toast.error('Pembayaran gagal. Silakan coba lagi.'),
        onClose: () => toast.warning('Pembayaran dibatalkan.'),
      })
    } catch (err) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal memulai pembayaran')
    } finally {
      setPayingId(null)
    }
  }, [mutate])

  // Fetch sekali untuk ambil totalDikonfirmasi (yang tidak di-return useDataFetch)
  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    if (filterReligionId) params.set('religionId', String(filterReligionId))
    if (filterTempatIbadahId) params.set('tempatIbadahId', String(filterTempatIbadahId))
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (metodePembayaran) params.set('metodePembayaran', metodePembayaran)
    params.set('page', '1')
    params.set('limit', '1')
    axios.get(`/api/donasi?${params}`).then((r) => {
      setTotalDikonfirmasi(r.data.totalDikonfirmasi ?? '0')
    }).catch(() => undefined)
  }, [search, status, total, filterReligionId, filterTempatIbadahId, startDate, endDate, metodePembayaran])

  const handleDelete = useCallback(async (alasan: string) => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await axios.delete(`/api/donasi/${deleteTarget.id}`, { data: { alasan } })
      toast.success('Donasi berhasil dihapus')
      setDeleteTarget(null)
      mutate()
    } catch (err) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal menghapus')
    } finally {
      setIsDeleting(false)
    }
  }, [deleteTarget, mutate])

  const handleConfirm = useCallback(async () => {
    if (!confirmTarget) return
    setIsProcessing(true)
    try {
      await axios.patch(`/api/donasi/${confirmTarget.id}`, { action: 'CONFIRM' })
      toast.success('Donasi dikonfirmasi')
      setConfirmTarget(null)
      mutate()
    } catch (err) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal konfirmasi')
    } finally {
      setIsProcessing(false)
    }
  }, [confirmTarget, mutate])

  const handleReject = useCallback(async (alasan?: string) => {
    if (!rejectTarget || !alasan?.trim()) return
    setIsProcessing(true)
    try {
      await axios.patch(`/api/donasi/${rejectTarget.id}`, { action: 'REJECT', alasan })
      toast.success('Donasi ditolak')
      setRejectTarget(null)
      mutate()
    } catch (err) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal menolak')
    } finally {
      setIsProcessing(false)
    }
  }, [rejectTarget, mutate])

  const columns: ColumnDef<Donasi>[] = [
    {
      key: 'nominal',
      header: 'Nominal',
      className: 'text-right',
      render: (r) => (
        <span className="text-emerald-700 font-semibold">{formatRupiah(r.nominal)}</span>
      ),
    },
    {
      key: 'metode',
      header: 'Metode',
      render: (r) => (
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
          {r.metodePembayaran === 'TRANSFER_BANK' ? 'Transfer' :
           r.metodePembayaran === 'TUNAI' ? 'Tunai' :
           r.metodePembayaran === 'MIDTRANS' ? 'Online' : 'QRIS'}
        </span>
      ),
    },
    { key: 'tanggal', header: 'Tanggal', render: (r) => formatTanggal(r.tanggal) },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    ...(isJemaah ? [] : [
      {
        key: 'donatur',
        header: 'Donatur',
        render: (r: Donasi) => (
          <div>
            <p className="font-medium text-gray-900">{r.namaDonatur}</p>
            {r.jemaah && <p className="text-xs text-gray-500">jemaah: {r.jemaah.nama}</p>}
          </div>
        ),
      },
      {
        key: 'agama',
        header: 'Agama',
        render: (r: Donasi) => <span className="text-gray-600 text-sm">{r.religion?.nama ?? '—'}</span>,
      },
      {
        key: 'tempatIbadah',
        header: 'Tempat Ibadah',
        render: (r: Donasi) => (
          <div className="text-sm">
            <div className="text-gray-700">{r.tempatIbadah?.nama ?? '—'}</div>
            {r.tempatIbadah?.slug && (
              <div className="text-[11px] text-gray-400 font-mono">{r.tempatIbadah.slug}</div>
            )}
          </div>
        ),
      },
    ]),
    {
      key: 'actions',
      header: 'Aksi',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {canManage && r.status === 'PENDING' && (
            <>
              <button
                onClick={() => setConfirmTarget(r)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white"
                title="Konfirmasi"
              >
                <Check size={11} /> OK
              </button>
              <button
                onClick={() => setRejectTarget(r)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white"
                title="Tolak"
              >
                <X size={11} /> Tolak
              </button>
            </>
          )}
          {canManage && (
            <>
              <Link
                href={`/donasi/${r.id}/edit`}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white"
              >
                <Pencil size={11} /> Edit
              </Link>
              <button
                onClick={() => setDeleteTarget(r)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white"
              >
                <Trash2 size={11} /> Hapus
              </button>
            </>
          )}
          {!canManage && (
            <>
              {r.metodePembayaran === 'MIDTRANS' && r.status === 'PENDING' && (
                <button
                  onClick={() => handleBayar(r.id)}
                  disabled={payingId === r.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-60"
                >
                  <CreditCard size={11} />
                  {payingId === r.id ? 'Memuat...' : 'Bayar'}
                </button>
              )}
              {r.buktiPembayaran && (
                <a href={r.buktiPembayaran} target="_blank" rel="noopener" className="text-xs text-primary hover:underline">
                  Bukti
                </a>
              )}
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={isJemaah ? 'Donasi Saya' : 'Donasi'}
        subtitle={isJemaah ? 'Riwayat donasi yang Anda berikan' : 'Kelola dan konfirmasi donasi masuk'}
        action={
          <div className="flex items-center gap-2">
            {(isSuperAdmin || canManage) && (
              <button
                onClick={exportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                <Download size={16} /> Export PDF
              </button>
            )}
            <Link
              href="/donasi/baru"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
            >
              <Plus size={16} /> {isJemaah ? 'Tambah Donasi' : 'Catat Donasi'}
            </Link>
          </div>
        }
      />

      {/* Banner atau Program Donasi (Placeholder) */}
      {isJemaah && (
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl p-5 mb-4 shadow-lg">
          <h2 className="text-xl font-bold mb-2">Ayo Berdonasi untuk Kebaikan!</h2>
          <p className="text-sm opacity-90">Dukung program-program ibadah dan sosial di komunitas Anda.</p>
          <Link
            href="/donasi/baru"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-dark bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
          >
            Mulai Donasi Sekarang
          </Link>
        </div>
      )}

      {/* Stat ringkas */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
          <HandCoins size={22} className="text-emerald-700" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{isJemaah ? 'Total donasi terkonfirmasi Anda' : 'Total donasi terkonfirmasi'}</p>
          <p className="text-2xl font-bold text-emerald-700">{formatRupiah(totalDikonfirmasi)}</p>
        </div>
        {isJemaah && (
          <div className="ml-auto text-right">
            <p className="text-xs text-gray-500">Target Donasi Masjid</p>
            <p className="text-lg font-bold text-primary">Rp 50.000.000</p>
            <div className="w-32 bg-gray-200 rounded-full h-2.5 mt-1">
              <div className="bg-primary h-2.5 rounded-full" style={{ width: '70%' }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">70% Tercapai</p>
          </div>
        )}
      </div>

      <div className="space-y-3 mb-6">
        {!isJemaah && (
          <div className="flex items-center justify-between">
            <SearchFilter
              value={search}
              onChange={(v) => { setSearch(v); setPage(1) }}
              placeholder="Cari nama donatur atau catatan..."
            >
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${showFilters ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                <Filter size={16} /> Filter Lanjutan
              </button>
            </SearchFilter>
          </div>
        )}

        {showFilters && !isJemaah && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1) }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Metode Pembayaran</label>
              <select
                value={metodePembayaran}
                onChange={(e) => { setMetodePembayaran(e.target.value); setPage(1) }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                {metodeOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Dari Tanggal</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sampai Tanggal</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              />
            </div>

            {isSuperAdmin && (
              <div className="sm:col-span-2 lg:col-span-4 mt-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Filter Global (Agama / Tempat Ibadah)</label>
                <ScopeFilter
                  religionId={filterReligionId}
                  tempatIbadahId={filterTempatIbadahId}
                  onChange={({ religionId, tempatIbadahId }) => {
                    setFilterReligionId(religionId)
                    setFilterTempatIbadahId(tempatIbadahId)
                    setPage(1)
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {isJemaah ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.length === 0 && !isLoading ? (
            <div className="md:col-span-2">
              <EmptyState
                title="Belum ada donasi"
                description="Klik Tambah Donasi untuk mulai berdonasi."
              />
            </div>
          ) : (
            data.map((d) => (
              <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {d.metodePembayaran === 'TRANSFER_BANK' && <CreditCard size={18} className="text-gray-500" />}
                    {d.metodePembayaran === 'TUNAI' && <HandCoins size={18} className="text-gray-500" />}
                    {d.metodePembayaran === 'QRIS' && <CreditCard size={18} className="text-gray-500" />}
                    {d.metodePembayaran === 'MIDTRANS' && <CreditCard size={18} className="text-gray-500" />}
                    <p className="font-medium text-gray-800">Donasi {d.metodePembayaran === 'TRANSFER_BANK' ? 'Transfer' : d.metodePembayaran === 'TUNAI' ? 'Tunai' : d.metodePembayaran === 'MIDTRANS' ? 'Online' : 'QRIS'}</p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
                <p className="text-2xl font-bold text-emerald-700 mb-1">{formatRupiah(d.nominal)}</p>
                <p className="text-sm text-gray-500">Tanggal: {formatTanggal(d.tanggal)}</p>
                {d.catatan && <p className="text-sm text-gray-500 mt-1">Catatan: {d.catatan}</p>}
                <div className="flex justify-end mt-4">
                  {!canManage && (
                    <>
                      {d.metodePembayaran === 'MIDTRANS' && d.status === 'PENDING' && (
                        <button
                          onClick={() => handleBayar(d.id)}
                          disabled={payingId === d.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-60"
                        >
                          <CreditCard size={11} />
                          {payingId === d.id ? 'Memuat...' : 'Bayar'}
                        </button>
                      )}
                      {d.buktiPembayaran && (
                        <a href={d.buktiPembayaran} target="_blank" rel="noopener" className="text-xs text-primary hover:underline ml-2">
                          Bukti Pembayaran
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <DataTable
          data={data}
          columns={columns}
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(l) => { setLimit(l); setPage(1) }}
          isLoading={isLoading}
          emptyTitle="Belum ada donasi"
          emptyDescription={isJemaah ? 'Klik Tambah Donasi untuk mulai berdonasi.' : 'Belum ada donasi yang tercatat.'}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Hapus Donasi dari "${deleteTarget?.namaDonatur}"`}
        isLoading={isDeleting}
      />

      <ConfirmActionDialog
        open={!!confirmTarget}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        onConfirm={handleConfirm}
        title="Konfirmasi Donasi?"
        description={
          confirmTarget
            ? `Donasi ${formatRupiah(confirmTarget.nominal)} dari ${confirmTarget.namaDonatur}.\n\nDonasi yang dikonfirmasi akan dihitung di laporan keuangan.`
            : ''
        }
        variant="success"
        confirmLabel="Konfirmasi"
        isLoading={isProcessing}
      />

      <ConfirmActionDialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        onConfirm={handleReject}
        title="Tolak Donasi?"
        description={
          rejectTarget
            ? `Donasi dari ${rejectTarget.namaDonatur} akan ditandai DITOLAK.`
            : ''
        }
        variant="danger"
        confirmLabel="Tolak Donasi"
        requireReason
        reasonLabel="Alasan menolak"
        reasonPlaceholder="Contoh: bukti tidak valid, nominal tidak sesuai..."
        isLoading={isProcessing}
      />
    </div>
  )
}
