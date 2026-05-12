'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { toast } from 'sonner'
import { Plus, RotateCcw, Pencil, Trash2, Archive } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatTanggal } from '@/lib/utils'
import { useDataFetch } from '@/hooks/useDataFetch'

interface Agama {
  id: number
  nama: string
  deskripsi: string | null
  createdAt: string
  deletedAt: string | null
}

export default function AgamaPage() {
  const { data: session } = useSession()
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [showArsip, setShowArsip] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Agama | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { data, total, isLoading, mutate } = useDataFetch<Agama>('/api/agama', {
    search, page, limit, arsip: showArsip,
  })

  const handleDelete = useCallback(async (alasan: string) => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await axios.delete(`/api/agama/${deleteTarget.id}`, { data: { alasan } })
      toast.success('Agama berhasil dihapus')
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
      await axios.patch(`/api/agama/${id}`)
      toast.success('Agama berhasil dipulihkan')
      mutate()
    } catch {
      toast.error('Gagal memulihkan agama')
    }
  }, [mutate])

  const columns: ColumnDef<Agama>[] = [
    { key: 'nama', header: 'Nama Agama', render: (r) => <span className="font-medium text-gray-900">{r.nama}</span> },
    { key: 'deskripsi', header: 'Deskripsi', render: (r) => <span className="text-gray-500">{r.deskripsi ?? '—'}</span> },
    { key: 'createdAt', header: 'Dibuat', render: (r) => formatTanggal(r.createdAt) },
    {
      key: 'status', header: 'Status',
      render: (r) => <StatusBadge status={r.deletedAt ? 'NONAKTIF' : 'AKTIF'} />,
    },
    {
      key: 'actions', header: 'Aksi',
      render: (r) => (
        <div className="flex items-center gap-2">
          {r.deletedAt ? (
            <button
              onClick={() => handleRestore(r.id)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-light text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
            >
              <RotateCcw size={12} /> Pulihkan
            </button>
          ) : (
            <>
              <Link
                href={`/agama/${r.id}/edit`}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
              >
                <Pencil size={12} /> Edit
              </Link>
              <button
                onClick={() => setDeleteTarget(r)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
              >
                <Trash2 size={12} /> Hapus
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  if (session?.user.role !== 'SUPERADMIN') {
    return <div className="text-red-600">Akses ditolak. Halaman ini hanya untuk Superadmin.</div>
  }

  return (
    <div>
      <PageHeader
        title="Manajemen Agama"
        subtitle="Kelola daftar agama yang terdaftar dalam sistem"
        action={
          <Link
            href="/agama/baru"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <Plus size={16} /> Tambah Agama
          </Link>
        }
      />

      <SearchFilter
        value={search}
        onChange={(v) => { setSearch(v); setPage(1) }}
        placeholder="Cari nama agama..."
      >
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
        emptyTitle={showArsip ? 'Tidak ada data arsip' : 'Tidak ada agama'}
        emptyDescription={showArsip ? 'Belum ada agama yang dihapus.' : 'Klik "Tambah Agama" untuk menambahkan agama baru.'}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Hapus Agama "${deleteTarget?.nama}"`}
        isLoading={isDeleting}
      />
    </div>
  )
}
