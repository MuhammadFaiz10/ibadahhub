'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { toast } from 'sonner'
import { Plus, RotateCcw, Pencil, Trash2, Archive, MapPin, Clock, Users, UserCheck } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { KegiatanCalendar } from '@/components/kegiatan/KegiatanCalendar'
import { formatTanggal } from '@/lib/utils'
import { useDataFetch } from '@/hooks/useDataFetch'

interface Kegiatan {
  id: number
  namaKegiatan: string
  tanggal: string
  waktuMulai: string
  waktuSelesai: string | null
  lokasi: string
  pemimpin: string | null
  deskripsi: string | null
  kapasitas: number | null
  status: string
  religionId: number | null
  createdAt: string
  deletedAt: string | null
  religion: { nama: string } | null
}

export default function KegiatanPage() {
  const { data: session } = useSession()
  const role = session?.user.role
  const subRole = session?.user.subRole
  const isSuperAdmin = role === 'SUPERADMIN'
  const canManage =
    isSuperAdmin || (role === 'PENGURUS' && (subRole === 'KETUA' || subRole === 'SEKRETARIS'))
  const isJemaah = role === 'JEMAAH'

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [showArsip, setShowArsip] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Kegiatan | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { data, total, isLoading, mutate } = useDataFetch<Kegiatan>('/api/kegiatan', {
    search, page, limit, arsip: showArsip,
  })

  const handleDelete = useCallback(async (alasan: string) => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await axios.delete(`/api/kegiatan/${deleteTarget.id}`, { data: { alasan } })
      toast.success('Kegiatan berhasil dihapus')
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
      await axios.patch(`/api/kegiatan/${id}`)
      toast.success('Kegiatan berhasil dipulihkan')
      mutate()
    } catch {
      toast.error('Gagal memulihkan kegiatan')
    }
  }, [mutate])

  const columns: ColumnDef<Kegiatan>[] = [
    {
      key: 'namaKegiatan', header: 'Kegiatan',
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.namaKegiatan}</p>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
            <span className="flex items-center gap-1.5">
              <MapPin size={11} className="text-gray-400" />
              {r.lokasi}
            </span>
            {r.pemimpin && (
              <span className="flex items-center gap-1.5">
                <Users size={11} className="text-gray-400" />
                {r.pemimpin}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'jadwal', header: 'Jadwal',
      render: (r) => (
        <div className="space-y-0.5">
          <div className="text-sm text-gray-700">{formatTanggal(r.tanggal)}</div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock size={11} className="text-gray-400" />
            {r.waktuMulai}{r.waktuSelesai ? ` – ${r.waktuSelesai}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'kapasitas', header: 'Kapasitas',
      render: (r) =>
        r.kapasitas ? (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Users size={12} className="text-gray-400" /> {r.kapasitas}
          </div>
        ) : <span className="text-gray-400 text-xs">—</span>,
    },
    {
      key: 'religion', header: 'Agama',
      render: (r) => <span className="text-gray-600">{r.religion?.nama ?? '—'}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (r) => <StatusBadge status={r.deletedAt ? 'NONAKTIF' : r.status} />,
    },
    {
      key: 'actions', header: canManage ? 'Aksi' : 'Detail',
      render: (r) => (
        <div className="flex items-center gap-2">
          {canManage && r.deletedAt ? (
            <button
              onClick={() => handleRestore(r.id)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-light text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
            >
              <RotateCcw size={12} /> Pulihkan
            </button>
          ) : canManage ? (
            <>
              <Link
                href={`/kegiatan/${r.id}/peserta`}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors"
                title="Lihat peserta"
              >
                <UserCheck size={12} /> Peserta
              </Link>
              <Link
                href={`/kegiatan/${r.id}/edit`}
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
          ) : (
            <span className="text-xs text-gray-400">Lihat saja</span>
          )}
        </div>
      ),
    },
  ]
  const allowed = isSuperAdmin || isJemaah || canManage
  if (session && !allowed) {
    return (
      <div>
        <PageHeader title="Kegiatan" />
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 text-sm mt-4">
          Akses ditolak. Halaman ini hanya untuk Jemaah, Ketua, Sekretaris, atau Superadmin.
        </div>
      </div>
    )
  }

  // JEMAAH lihat dalam tampilan kalender
  if (isJemaah) {
    return (
      <div>
        <PageHeader
          title="Kegiatan"
          subtitle="Jadwal kegiatan keagamaan komunitas"
        />
        <KegiatanCalendar />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Kegiatan"
        subtitle="Kelola jadwal kegiatan ibadah"
        action={
          canManage ? (
            <Link
              href="/kegiatan/baru"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              <Plus size={16} /> Tambah Kegiatan
            </Link>
          ) : undefined
        }
      />

      <SearchFilter
        value={search}
        onChange={(v) => { setSearch(v); setPage(1) }}
        placeholder="Cari nama atau lokasi kegiatan..."
      >
        {canManage && (
          <button
            onClick={() => { setShowArsip(!showArsip); setPage(1) }}
            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
              showArsip ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Archive size={15} />
            {showArsip ? 'Arsip Aktif' : 'Tampilkan Arsip'}
          </button>
        )}
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
        emptyTitle={showArsip ? 'Tidak ada arsip' : 'Belum ada kegiatan'}
        emptyDescription={canManage ? 'Klik Tambah Kegiatan untuk menambahkan.' : 'Belum ada kegiatan yang dijadwalkan.'}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Hapus Kegiatan "${deleteTarget?.namaKegiatan}"`}
        isLoading={isDeleting}
      />
    </div>
  )
}
