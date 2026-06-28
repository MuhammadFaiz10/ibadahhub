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
  tempatIbadah?: { nama: string; slug: string } | null
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
  const [viewTarget, setViewTarget] = useState<Pengumuman | null>(null)

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
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.map((p) => {
              const relName = p.religion?.nama.toLowerCase() || ''
              let badgeBg = 'bg-gray-100 text-gray-800'
              let borderAccent = 'border-t-gray-300'

              if (relName.includes('islam')) {
                badgeBg = 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10'
                borderAccent = 'border-t-4 border-t-emerald-500'
              } else if (relName.includes('kristen') || relName.includes('katolik')) {
                badgeBg = 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10'
                borderAccent = 'border-t-4 border-t-blue-500'
              } else if (relName.includes('hindu')) {
                badgeBg = 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/10'
                borderAccent = 'border-t-4 border-t-orange-500'
              } else if (relName.includes('buddha')) {
                badgeBg = 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10'
                borderAccent = 'border-t-4 border-t-amber-500'
              } else if (relName.includes('konghucu')) {
                badgeBg = 'bg-red-50 text-red-700 ring-1 ring-red-600/10'
                borderAccent = 'border-t-4 border-t-red-500'
              }

              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden ${borderAccent}`}
                >
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${badgeBg}`}>
                        {p.religion?.nama ?? 'Semua Agama'}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Calendar size={12} />
                        <span>{formatTanggal(p.tanggalPublish)}</span>
                      </div>
                    </div>

                    <h3 className="font-bold text-gray-900 text-base mb-2 line-clamp-1">
                      {p.judul}
                    </h3>

                    <div
                      className="text-xs text-gray-600 prose prose-sm max-w-none line-clamp-3 mb-4 flex-1 prose-p:my-1 prose-a:text-primary"
                      dangerouslySetInnerHTML={{ __html: p.isi }}
                    />

                    {p.tempatIbadah && (
                      <div className="text-[11px] text-gray-400 italic mt-auto">
                        Diterbitkan oleh: {p.tempatIbadah.nama}
                      </div>
                    )}
                  </div>

                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setViewTarget(p)}
                      className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors flex items-center gap-1"
                    >
                      Baca Selengkapnya &rarr;
                    </button>

                    {canManage && (
                      <div className="flex items-center gap-1.5">
                        {p.deletedAt ? (
                          <button
                            onClick={() => handleRestore(p.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-primary-light text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
                          >
                            <RotateCcw size={11} /> Pulihkan
                          </button>
                        ) : (
                          <>
                            <Link
                              href={`/pengumuman/${p.id}/edit`}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
                            >
                              <Pencil size={11} /> Edit
                            </Link>
                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                            >
                              <Trash2 size={11} /> Hapus
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

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

      {/* Detail View Dialog */}
      {viewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setViewTarget(null)}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-light text-primary">
                    {viewTarget.religion?.nama ?? 'Semua Agama'}
                  </span>
                  {viewTarget.tempatIbadah && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 ring-1 ring-teal-600/10">
                      {viewTarget.tempatIbadah.nama}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900 leading-snug">
                  {viewTarget.judul}
                </h2>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Calendar size={12} />
                  Dipublikasikan pada {formatTanggal(viewTarget.tanggalPublish)}
                  {viewTarget.expireDate && ` · Berakhir pada ${formatTanggal(viewTarget.expireDate)}`}
                </p>
              </div>
              <button
                onClick={() => setViewTarget(null)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 prose prose-sm max-w-none prose-headings:font-bold prose-a:text-primary">
              <div dangerouslySetInnerHTML={{ __html: viewTarget.isi }} />
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setViewTarget(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
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
