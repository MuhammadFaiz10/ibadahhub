'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, MapPin, Clock, Users } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatTanggal } from '@/lib/utils'
import { useDataFetch } from '@/hooks/useDataFetch'

interface JadwalIbadah {
  id: number
  namaIbadah: string
  tanggal: string
  waktuMulai: string
  waktuSelesai: string | null
  lokasi: string | null
  pemimpin: string | null
  pendamping: string | null
  religionId: number | null
}

export default function JadwalIbadahPage() {
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
  const [deleteTarget, setDeleteTarget] = useState<JadwalIbadah | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { data, total, isLoading, mutate } = useDataFetch<JadwalIbadah>('/api/jadwal-ibadah', {
    search, page, limit
  })

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await axios.delete(`/api/jadwal-ibadah/${deleteTarget.id}`)
      toast.success('Jadwal ibadah berhasil dihapus')
      setDeleteTarget(null)
      mutate()
    } catch (err) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal menghapus')
    } finally {
      setIsDeleting(false)
    }
  }, [deleteTarget, mutate])

  const columns: ColumnDef<JadwalIbadah>[] = [
    {
      key: 'namaIbadah', header: 'Jadwal Ibadah',
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.namaIbadah}</p>
          {r.lokasi && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
              <MapPin size={11} className="text-gray-400" />
              {r.lokasi}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'jadwal', header: 'Waktu',
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
      key: 'pemimpin', header: 'Pemimpin / Petugas',
      render: (r) => (
        <div className="space-y-0.5">
          {r.pemimpin ? (
            <div className="flex items-center gap-1 text-sm text-gray-700">
              <Users size={12} className="text-gray-400" /> {r.pemimpin}
            </div>
          ) : <span className="text-gray-400 text-xs">—</span>}
          {r.pendamping && (
            <div className="text-xs text-gray-500">{r.pendamping}</div>
          )}
        </div>
      ),
    },
    {
      key: 'actions', header: canManage ? 'Aksi' : 'Detail',
      render: (r) => (
        <div className="flex items-center gap-2">
          {canManage ? (
            <>
              <Link
                href={`/jadwal-ibadah/${r.id}/edit`}
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
        <PageHeader title="Jadwal Ibadah" />
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 text-sm mt-4">
          Akses ditolak. Halaman ini hanya untuk Jemaah, Ketua, Sekretaris, atau Superadmin.
        </div>
      </div>
    )
  }

  // Tampilan Jemaah yang lebih ringkas
  if (isJemaah) {
    return (
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Jadwal Ibadah"
          subtitle="Informasi jadwal dan petugas ibadah harian/mingguan"
        />
        
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-gray-100">
            <Clock size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Belum ada jadwal ibadah.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{r.namaIbadah}</h3>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock size={14} className="text-primary" />
                        {formatTanggal(r.tanggal)} • {r.waktuMulai}{r.waktuSelesai ? ` - ${r.waktuSelesai}` : ''} WIB
                      </div>
                      {r.lokasi && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin size={14} className="text-emerald-600" />
                          {r.lokasi}
                        </div>
                      )}
                    </div>
                  </div>
                  {(r.pemimpin || r.pendamping) && (
                    <div className="sm:text-right bg-gray-50 p-3 rounded-lg border border-gray-100 min-w-[200px]">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Petugas Ibadah</p>
                      {r.pemimpin && <p className="text-sm font-medium text-gray-900">{r.pemimpin}</p>}
                      {r.pendamping && <p className="text-xs text-gray-600 mt-0.5">{r.pendamping}</p>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Jadwal Ibadah"
        subtitle="Kelola jadwal dan petugas ibadah rutin"
        action={
          canManage ? (
            <Link
              href="/jadwal-ibadah/baru"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              <Plus size={16} /> Tambah Jadwal
            </Link>
          ) : undefined
        }
      />

      <SearchFilter
        value={search}
        onChange={(v) => { setSearch(v); setPage(1) }}
        placeholder="Cari nama ibadah atau petugas..."
      />

      <DataTable
        data={data}
        columns={columns}
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1) }}
        isLoading={isLoading}
        emptyTitle="Belum ada jadwal"
        emptyDescription="Klik Tambah Jadwal untuk membuat jadwal baru."
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Hapus Jadwal "${deleteTarget?.namaIbadah}"`}
        isLoading={isDeleting}
      />
    </div>
  )
}
