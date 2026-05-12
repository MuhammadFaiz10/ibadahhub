'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { toast } from 'sonner'
import { Plus, RotateCcw, Pencil, Trash2, Archive, TrendingDown } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatRupiah, formatTanggal } from '@/lib/utils'
import { useDataFetch } from '@/hooks/useDataFetch'

interface Pengeluaran {
  id: number
  keterangan: string
  nominal: string
  tanggal: string
  kategori: string
  bukti: string | null
  religionId: number
  deletedAt: string | null
  religion: { nama: string } | null
  user: { nama: string } | null
}

const kategoriOptions = [
  { value: '', label: 'Semua kategori' },
  { value: 'OPERASIONAL', label: 'Operasional' },
  { value: 'KEGIATAN', label: 'Kegiatan' },
  { value: 'SOSIAL', label: 'Sosial' },
  { value: 'LAINNYA', label: 'Lainnya' },
]

export default function PengeluaranPage() {
  const { data: session } = useSession()
  const role = session?.user.role
  const subRole = session?.user.subRole
  const canManage =
    role === 'SUPERADMIN' || (role === 'PENGURUS' && (subRole === 'KETUA' || subRole === 'BENDAHARA'))

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [showArsip, setShowArsip] = useState(false)
  const [kategori, setKategori] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Pengeluaran | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { data, total, isLoading, mutate } = useDataFetch<Pengeluaran>('/api/pengeluaran', {
    search, page, limit, arsip: showArsip, kategori,
  })

  const handleDelete = useCallback(async (alasan: string) => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await axios.delete(`/api/pengeluaran/${deleteTarget.id}`, { data: { alasan } })
      toast.success('Pengeluaran berhasil dihapus')
      setDeleteTarget(null)
      mutate()
    } catch (err) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal menghapus')
    } finally {
      setIsDeleting(false)
    }
  }, [deleteTarget, mutate])

  const handleRestore = useCallback(async (id: number) => {
    try {
      await axios.patch(`/api/pengeluaran/${id}`)
      toast.success('Pengeluaran dipulihkan')
      mutate()
    } catch {
      toast.error('Gagal memulihkan')
    }
  }, [mutate])

  const columns: ColumnDef<Pengeluaran>[] = [
    {
      key: 'keterangan', header: 'Keterangan',
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.keterangan}</p>
          <p className="text-xs text-gray-500">oleh {r.user?.nama ?? '-'}</p>
        </div>
      ),
    },
    {
      key: 'kategori', header: 'Kategori',
      render: (r) => (
        <span className="px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700">
          {r.kategori}
        </span>
      ),
    },
    {
      key: 'tanggal', header: 'Tanggal',
      render: (r) => formatTanggal(r.tanggal),
    },
    {
      key: 'nominal', header: 'Nominal', className: 'text-right',
      render: (r) => (
        <span className="text-red-600 font-semibold">
          {formatRupiah(r.nominal)}
        </span>
      ),
    },
    {
      key: 'religion', header: 'Agama',
      render: (r) => <span className="text-gray-600">{r.religion?.nama ?? '—'}</span>,
    },
    {
      key: 'actions', header: 'Aksi',
      render: (r) => canManage ? (
        <div className="flex items-center gap-2">
          {r.deletedAt ? (
            <button onClick={() => handleRestore(r.id)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-light text-primary rounded-lg hover:bg-primary hover:text-white">
              <RotateCcw size={12} /> Pulihkan
            </button>
          ) : (
            <>
              <Link href={`/pengeluaran/${r.id}/edit`}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white">
                <Pencil size={12} /> Edit
              </Link>
              <button onClick={() => setDeleteTarget(r)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white">
                <Trash2 size={12} /> Hapus
              </button>
            </>
          )}
        </div>
      ) : <span className="text-xs text-gray-400">—</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Pengeluaran"
        subtitle="Catat pengeluaran komunitas"
        action={
          canManage ? (
            <Link href="/pengeluaran/baru"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark">
              <Plus size={16} /> Tambah Pengeluaran
            </Link>
          ) : undefined
        }
      />

      <SearchFilter
        value={search}
        onChange={(v) => { setSearch(v); setPage(1) }}
        placeholder="Cari keterangan pengeluaran..."
      >
        <select
          value={kategori}
          onChange={(e) => { setKategori(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {kategoriOptions.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        <button
          onClick={() => { setShowArsip(!showArsip); setPage(1) }}
          className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
            showArsip ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Archive size={15} />
          {showArsip ? 'Arsip Aktif' : 'Tampilkan Arsip'}
        </button>
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
        emptyTitle={showArsip ? 'Tidak ada arsip' : 'Belum ada pengeluaran'}
        emptyDescription={canManage ? 'Klik Tambah Pengeluaran untuk mencatat.' : ''}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Hapus Pengeluaran "${deleteTarget?.keterangan}"`}
        isLoading={isDeleting}
      />
    </div>
  )
}
