'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { toast } from 'sonner'
import { Plus, RotateCcw, Pencil, Trash2, Archive, Calendar } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatTanggal } from '@/lib/utils'
import { useDataFetch } from '@/hooks/useDataFetch'

interface Pengumuman {
  id: number
  judul: string
  isi: string
  tanggalPublish: string
  expireDate: string | null
  status: string
  religionId: number | null
  createdAt: string
  deletedAt: string | null
  religion: { nama: string } | null
}

export default function PengumumanPage() {
  const { data: session } = useSession()
  const role = session?.user.role
  const subRole = session?.user.subRole
  const isSuperAdmin = role === 'SUPERADMIN'
  const canManage =
    isSuperAdmin || (role === 'PENGURUS' && (subRole === 'KETUA' || subRole === 'SEKRETARIS'))
  const isJemaah = role === 'JEMAAH'

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showArsip, setShowArsip] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Pengumuman | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { data, total, isLoading, mutate } = useDataFetch<Pengumuman>('/api/pengumuman', {
    search, page, limit: 10, arsip: showArsip,
  })

  const handleDelete = useCallback(async (alasan: string) => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await axios.delete(`/api/pengumuman/${deleteTarget.id}`, { data: { alasan } })
      toast.success('Pengumuman berhasil dihapus')
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
      await axios.patch(`/api/pengumuman/${id}`)
      toast.success('Pengumuman berhasil dipulihkan')
      mutate()
    } catch {
      toast.error('Gagal memulihkan')
    }
  }, [mutate])
  const allowed = isSuperAdmin || isJemaah || canManage
  if (session && !allowed) {
    return (
      <div>
        <PageHeader title="Pengumuman" />
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 text-sm mt-4">
          Akses ditolak. Halaman ini hanya untuk Jemaah, Ketua, Sekretaris, atau Superadmin.
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Pengumuman"
        subtitle={isJemaah ? 'Pengumuman terbaru untuk jemaah' : 'Kelola pengumuman komunitas'}
        action={
          canManage ? (
            <Link
              href="/pengumuman/baru"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
            >
              <Plus size={16} /> Tambah Pengumuman
            </Link>
          ) : undefined
        }
      />

      <SearchFilter
        value={search}
        onChange={(v) => { setSearch(v); setPage(1) }}
        placeholder="Cari judul atau isi pengumuman..."
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

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="h-5 bg-gray-100 rounded w-1/3 mb-3 animate-pulse" />
              <div className="h-4 bg-gray-100 rounded w-full mb-2 animate-pulse" />
              <div className="h-4 bg-gray-100 rounded w-2/3 animate-pulse" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200">
          <EmptyState
            title={showArsip ? 'Tidak ada arsip' : 'Belum ada pengumuman'}
            description={canManage ? 'Klik Tambah Pengumuman untuk membuat.' : 'Belum ada pengumuman.'}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-gray-900">{p.judul}</h3>
                    <StatusBadge status={p.deletedAt ? 'NONAKTIF' : p.status} />
                    {p.religion && (
                      <span className="text-xs text-gray-500">— {p.religion.nama}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar size={11} className="text-gray-400" />
                    <span>Dipublish {formatTanggal(p.tanggalPublish)}</span>
                    {p.expireDate && <span>· Berakhir {formatTanggal(p.expireDate)}</span>}
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {p.deletedAt ? (
                      <button
                        onClick={() => handleRestore(p.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-primary-light text-primary rounded-lg hover:bg-primary hover:text-white"
                      >
                        <RotateCcw size={11} /> Pulihkan
                      </button>
                    ) : (
                      <>
                        <Link
                          href={`/pengumuman/${p.id}/edit`}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white"
                        >
                          <Pencil size={11} /> Edit
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white"
                        >
                          <Trash2 size={11} /> Hapus
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div
                className="text-sm text-gray-600 prose prose-sm max-w-none line-clamp-3 prose-a:text-primary"
                dangerouslySetInnerHTML={{ __html: p.isi }}
              />
            </div>
          ))}

          {total > 10 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="px-3 py-1.5 text-xs text-gray-500">
                Halaman {page} dari {Math.ceil(total / 10)}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(total / 10)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Hapus Pengumuman "${deleteTarget?.judul}"`}
        isLoading={isDeleting}
      />
    </div>
  )
}
