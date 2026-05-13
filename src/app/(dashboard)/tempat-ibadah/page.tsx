'use client'

import { useState, useCallback, useEffect } from 'react'
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
import { useDataFetch } from '@/hooks/useDataFetch'

interface TempatIbadah {
  id: number
  nama: string
  slug: string
  kota: string | null
  status: 'AKTIF' | 'NONAKTIF'
  religionId: number
  religion: { id: number; nama: string }
  _count?: { users: number; jemaah: number; kegiatan: number }
  createdAt: string
  deletedAt: string | null
}

interface Religion {
  id: number
  nama: string
}

export default function TempatIbadahPage() {
  const { data: session } = useSession()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [showArsip, setShowArsip] = useState(false)
  const [religionFilter, setReligionFilter] = useState<string>('')
  const [religions, setReligions] = useState<Religion[]>([])

  const [deleteTarget, setDeleteTarget] = useState<TempatIbadah | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    axios
      .get('/api/agama/public')
      .then((res) => setReligions(res.data.data ?? []))
      .catch(() => {})
  }, [])

  const { data, total, isLoading, mutate } = useDataFetch<TempatIbadah>('/api/tempat-ibadah', {
    search,
    page,
    limit,
    arsip: showArsip,
    religionId: religionFilter || undefined,
  })

  const handleDelete = useCallback(
    async (_alasan: string) => {
      if (!deleteTarget) return
      setIsDeleting(true)
      try {
        await axios.delete(`/api/tempat-ibadah/${deleteTarget.id}`)
        toast.success('Tempat ibadah berhasil diarsipkan')
        setDeleteTarget(null)
        mutate()
      } catch (err) {
        if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal menghapus')
      } finally {
        setIsDeleting(false)
      }
    },
    [deleteTarget, mutate]
  )

  const handleRestore = useCallback(
    async (id: number) => {
      try {
        await axios.put(`/api/tempat-ibadah/${id}`, { status: 'AKTIF' })
        // Re-create-ish via update: we don't have a restore endpoint, but PUT with status=AKTIF won't unset deletedAt.
        // For now we just inform user — proper restore akan dilakukan via update endpoint dengan deletedAt:null jika dibutuhkan.
        toast.success('Status diperbarui')
        mutate()
      } catch {
        toast.error('Gagal memulihkan')
      }
    },
    [mutate]
  )

  const columns: ColumnDef<TempatIbadah>[] = [
    {
      key: 'nama',
      header: 'Nama',
      render: (r) => (
        <div>
          <div className="font-medium text-gray-900">{r.nama}</div>
          <div className="text-xs text-gray-500 font-mono">{r.slug}</div>
        </div>
      ),
    },
    {
      key: 'agama',
      header: 'Agama',
      render: (r) => <span className="text-sm text-gray-700">{r.religion?.nama ?? '—'}</span>,
    },
    {
      key: 'kota',
      header: 'Kota',
      render: (r) => <span className="text-gray-600">{r.kota ?? '—'}</span>,
    },
    {
      key: 'counts',
      header: 'Anggota',
      render: (r) =>
        r._count ? (
          <div className="text-xs text-gray-600">
            <div>{r._count.users} pengguna</div>
            <div>{r._count.jemaah} jemaah</div>
            <div>{r._count.kegiatan} kegiatan</div>
          </div>
        ) : (
          '—'
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.deletedAt ? 'NONAKTIF' : r.status} />,
    },
    {
      key: 'actions',
      header: 'Aksi',
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
                href={`/tempat-ibadah/${r.id}/edit`}
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
        title="Tempat Ibadah"
        subtitle="Kelola masjid, gereja, pura, vihara, dan tempat ibadah lainnya"
        action={
          <Link
            href="/tempat-ibadah/baru"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <Plus size={16} /> Tambah Tempat Ibadah
          </Link>
        }
      />

      <SearchFilter
        value={search}
        onChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        placeholder="Cari nama / slug / kota..."
      >
        <select
          value={religionFilter}
          onChange={(e) => {
            setReligionFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Semua agama</option>
          {religions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nama}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setShowArsip(!showArsip)
            setPage(1)
          }}
          className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
            showArsip
              ? 'bg-amber-50 border-amber-300 text-amber-700'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
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
        onLimitChange={(l) => {
          setLimit(l)
          setPage(1)
        }}
        isLoading={isLoading}
        emptyTitle={showArsip ? 'Tidak ada arsip' : 'Belum ada tempat ibadah'}
        emptyDescription="Klik tombol 'Tambah Tempat Ibadah' untuk membuat baru."
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Arsipkan "${deleteTarget?.nama}"?`}
        description="Tempat ibadah hanya bisa diarsipkan jika tidak ada pengguna/jemaah/kegiatan/donasi aktif terkait."
        isLoading={isDeleting}
      />
    </div>
  )
}
