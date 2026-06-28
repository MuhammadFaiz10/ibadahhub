'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { toast } from 'sonner'
import { Bell, Check, Trash2, CheckCheck, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { useDataFetch } from '@/hooks/useDataFetch'
import { formatTanggal } from '@/lib/utils'

interface Notifikasi {
  id: number
  judul: string
  isi: string
  urlTujuan: string | null
  dibaca: boolean
  createdAt: string
}

export default function NotifikasiPage() {
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, total, isLoading, mutate } = useDataFetch<Notifikasi>('/api/notifikasi', {
    page, limit,
  })

  const handleMarkAsRead = useCallback(async (id: number) => {
    try {
      await axios.patch(`/api/notifikasi/${id}`)
      mutate()
    } catch {
      toast.error('Gagal memperbarui notifikasi')
    }
  }, [mutate])

  const handleDelete = useCallback(async (id: number) => {
    try {
      await axios.delete(`/api/notifikasi/${id}`)
      toast.success('Notifikasi dihapus')
      mutate()
    } catch {
      toast.error('Gagal menghapus')
    }
  }, [mutate])

  const handleReadAll = useCallback(async () => {
    try {
      await axios.post('/api/notifikasi/read-all')
      toast.success('Semua notifikasi ditandai dibaca')
      mutate()
    } catch {
      toast.error('Gagal menandai dibaca')
    }
  }, [mutate])

  const totalPages = Math.ceil(total / limit)
  const unreadCount = data.filter((n) => !n.dibaca).length

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Notifikasi"
        subtitle={total > 0 ? `${total} total · ${unreadCount} belum dibaca` : 'Pemberitahuan untuk Anda'}
        action={
          unreadCount > 0 ? (
            <button
              onClick={handleReadAll}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <CheckCheck size={15} /> Tandai Semua Dibaca
            </button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full mb-1" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200">
          <EmptyState title="Tidak ada notifikasi" description="Notifikasi baru akan muncul di sini." />
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((n) => (
            <li key={n.id}>
              <div
                className={`bg-white rounded-xl border p-4 transition-colors ${
                  n.dibaca ? 'border-gray-200' : 'border-primary/30 bg-primary-light/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    n.dibaca ? 'bg-gray-100' : 'bg-primary-light'
                  }`}>
                    <Bell size={16} className={n.dibaca ? 'text-gray-400' : 'text-primary'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-medium truncate ${n.dibaca ? 'text-gray-700' : 'text-gray-900'}`}>
                        {n.judul}
                      </h3>
                      {!n.dibaca && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 break-words">{n.isi}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-gray-400">{formatTanggal(n.createdAt, 'long')}</span>
                      {n.urlTujuan && (
                        <Link
                          href={n.urlTujuan}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Lihat detail <ExternalLink size={11} />
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {!n.dibaca && (
                      <button
                        onClick={() => handleMarkAsRead(n.id)}
                        title="Tandai dibaca"
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(n.id)}
                      title="Hapus"
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}

          {totalPages > 1 && (
            <li className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="px-3 py-1.5 text-xs text-gray-500">
                Halaman {page} dari {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                Next →
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
