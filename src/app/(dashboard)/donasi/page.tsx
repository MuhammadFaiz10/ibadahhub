'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Check, X, HandCoins } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatRupiah, formatTanggal } from '@/lib/utils'
import { useDataFetch } from '@/hooks/useDataFetch'

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
  userId: number | null
  religion: { nama: string } | null
  jemaah: { nama: string } | null
  konfirmasiBy: { nama: string } | null
}

const statusOptions = [
  { value: '', label: 'Semua status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'DIKONFIRMASI', label: 'Dikonfirmasi' },
  { value: 'DITOLAK', label: 'Ditolak' },
]

export default function DonasiPage() {
  const { data: session } = useSession()
  const role = session?.user.role
  const subRole = session?.user.subRole
  const isJemaah = role === 'JEMAAH'
  const canManage =
    role === 'SUPERADMIN' || (role === 'PENGURUS' && (subRole === 'KETUA' || subRole === 'BENDAHARA'))

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [status, setStatus] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Donasi | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [totalDikonfirmasi, setTotalDikonfirmasi] = useState('0')
  const [confirmTarget, setConfirmTarget] = useState<Donasi | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Donasi | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const { data, total, isLoading, mutate } = useDataFetch<Donasi>('/api/donasi', {
    search, page, limit, status,
  })

  // Fetch sekali untuk ambil totalDikonfirmasi (yang tidak di-return useDataFetch)
  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    params.set('page', '1')
    params.set('limit', '1')
    axios.get(`/api/donasi?${params}`).then((r) => {
      setTotalDikonfirmasi(r.data.totalDikonfirmasi ?? '0')
    }).catch(() => undefined)
  }, [search, status, total])

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
      key: 'donatur', header: 'Donatur',
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.namaDonatur}</p>
          {r.jemaah && <p className="text-xs text-gray-500">jemaah: {r.jemaah.nama}</p>}
        </div>
      ),
    },
    {
      key: 'nominal', header: 'Nominal', className: 'text-right',
      render: (r) => (
        <span className="text-emerald-700 font-semibold">{formatRupiah(r.nominal)}</span>
      ),
    },
    {
      key: 'metode', header: 'Metode',
      render: (r) => (
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
          {r.metodePembayaran === 'TRANSFER_BANK' ? 'Transfer' :
           r.metodePembayaran === 'TUNAI' ? 'Tunai' : 'QRIS'}
        </span>
      ),
    },
    { key: 'tanggal', header: 'Tanggal', render: (r) => formatTanggal(r.tanggal) },
    {
      key: 'status', header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'agama', header: 'Agama',
      render: (r) => <span className="text-gray-600 text-sm">{r.religion?.nama ?? '—'}</span>,
    },
    {
      key: 'actions', header: 'Aksi',
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
          {!canManage && r.buktiPembayaran && (
            <a href={r.buktiPembayaran} target="_blank" rel="noopener" className="text-xs text-primary hover:underline">
              Bukti
            </a>
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
          <Link
            href="/donasi/baru"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
          >
            <Plus size={16} /> {isJemaah ? 'Tambah Donasi' : 'Catat Donasi'}
          </Link>
        }
      />

      {/* Stat ringkas */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
          <HandCoins size={22} className="text-emerald-700" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{isJemaah ? 'Total donasi terkonfirmasi Anda' : 'Total donasi terkonfirmasi'}</p>
          <p className="text-2xl font-bold text-emerald-700">{formatRupiah(totalDikonfirmasi)}</p>
        </div>
      </div>

      <SearchFilter
        value={search}
        onChange={(v) => { setSearch(v); setPage(1) }}
        placeholder="Cari nama donatur atau catatan..."
      >
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </SearchFilter>

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
