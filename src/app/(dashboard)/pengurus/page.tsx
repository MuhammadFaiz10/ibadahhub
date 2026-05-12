'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { toast } from 'sonner'
import { Plus, RotateCcw, Pencil, Trash2, Archive, KeyRound, FileSpreadsheet } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PasswordModal } from '@/components/shared/PasswordModal'
import { formatTanggal } from '@/lib/utils'
import { useDataFetch } from '@/hooks/useDataFetch'

interface Pengurus {
  id: number
  nama: string
  email: string
  subRole: string | null
  status: boolean
  religionId: number | null
  createdAt: string
  deletedAt: string | null
  religion: { nama: string } | null
}

export default function PengurusPage() {
  const { data: session } = useSession()
  const isSuperAdmin = session?.user.role === 'SUPERADMIN'
  const isKetua = session?.user.role === 'PENGURUS' && session?.user.subRole === 'KETUA'

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [showArsip, setShowArsip] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Pengurus | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [resetPasswordResult, setResetPasswordResult] = useState<{ password: string; nama: string } | null>(null)
  const [resetTarget, setResetTarget] = useState<Pengurus | null>(null)
  const [isResetting, setIsResetting] = useState(false)

  const { data, total, isLoading, mutate } = useDataFetch<Pengurus>('/api/pengurus', {
    search, page, limit, arsip: showArsip,
  })

  const handleDelete = useCallback(async (alasan: string) => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await axios.delete(`/api/pengurus/${deleteTarget.id}`, { data: { alasan } })
      toast.success('Pengurus berhasil dihapus')
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
      await axios.patch(`/api/pengurus/${id}`)
      toast.success('Pengurus berhasil dipulihkan')
      mutate()
    } catch {
      toast.error('Gagal memulihkan pengurus')
    }
  }, [mutate])

  const handleResetPassword = useCallback(async () => {
    if (!resetTarget) return
    setIsResetting(true)
    try {
      const res = await axios.post(`/api/pengurus/${resetTarget.id}/reset-password`)
      setResetPasswordResult({
        password: res.data.generatedPassword,
        nama: res.data.nama ?? resetTarget.nama,
      })
      toast.success('Password berhasil direset')
      setResetTarget(null)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error ?? 'Gagal reset password')
      }
    } finally {
      setIsResetting(false)
    }
  }, [resetTarget])

  const columns: ColumnDef<Pengurus>[] = [
    {
      key: 'nama', header: 'Nama',
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.nama}</p>
          <p className="text-xs text-gray-400">{r.email}</p>
        </div>
      ),
    },
    {
      key: 'subRole', header: 'Sub Role',
      render: (r) => r.subRole ? <StatusBadge status={r.subRole} /> : <span className="text-gray-400">—</span>,
    },
    {
      key: 'religion', header: 'Agama',
      render: (r) => <span className="text-gray-600">{r.religion?.nama ?? '—'}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (r) => <StatusBadge status={r.deletedAt ? 'NONAKTIF' : r.status ? 'AKTIF' : 'NONAKTIF'} />,
    },
    { key: 'createdAt', header: 'Dibuat', render: (r) => formatTanggal(r.createdAt) },
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
                href={`/pengurus/${r.id}/edit`}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
              >
                <Pencil size={12} /> Edit
              </Link>
              <button
                onClick={() => setResetTarget(r)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-600 hover:text-white transition-colors"
                title="Reset password"
              >
                <KeyRound size={12} /> Reset
              </button>
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

  if (!isSuperAdmin && !isKetua) {
    return <div className="text-red-600">Akses ditolak.</div>
  }

  return (
    <div>
      <PageHeader
        title="Manajemen Pengurus"
        subtitle="Kelola akun pengurus per agama"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/api/pengurus/export?format=xlsx"
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
              title="Export ke Excel"
            >
              <FileSpreadsheet size={15} /> Export
            </a>
            <Link
              href="/pengurus/baru"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              <Plus size={16} /> Tambah Pengurus
            </Link>
          </div>
        }
      />

      <SearchFilter
        value={search}
        onChange={(v) => { setSearch(v); setPage(1) }}
        placeholder="Cari nama atau email pengurus..."
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
        emptyTitle={showArsip ? 'Tidak ada arsip' : 'Belum ada pengurus'}
        emptyDescription="Klik Tambah Pengurus untuk menambahkan."
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Hapus Pengurus "${deleteTarget?.nama}"`}
        isLoading={isDeleting}
      />

      <PasswordModal
        open={!!resetPasswordResult}
        onClose={() => setResetPasswordResult(null)}
        password={resetPasswordResult?.password ?? null}
        userName={resetPasswordResult?.nama}
        title="Password Baru Pengurus"
        description="Password telah berhasil direset. Salin password baru ini dan bagikan ke pengurus. Password lama sudah tidak berlaku lagi."
      />

      <ConfirmActionDialog
        open={!!resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
        onConfirm={handleResetPassword}
        title={`Reset password ${resetTarget?.nama}?`}
        description="Password lama akan tidak berlaku lagi. Pengurus harus menggunakan password baru untuk login. Password baru akan dikirim via email (jika tersedia)."
        variant="warning"
        confirmLabel="Reset Password"
        isLoading={isResetting}
      />
    </div>
  )
}
