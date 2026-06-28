'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'
import { toast } from 'sonner'
import { Plus, RotateCcw, Pencil, Trash2, Archive, KeyRound, FileSpreadsheet, Mail, Phone, Upload, Users, UserCheck } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PasswordModal } from '@/components/shared/PasswordModal'
import { ImportDialog } from '@/components/shared/ImportDialog'
import { formatTanggal } from '@/lib/utils'
import { useDataFetch } from '@/hooks/useDataFetch'

// Types
interface Pengurus {
  id: number
  nama: string
  email: string
  subRole: string | null
  status: boolean
  religionId: number | null
  tempatIbadahId: number | null
  createdAt: string
  deletedAt: string | null
  religion: { nama: string } | null
  tempatIbadah: { nama: string; slug: string } | null
}

interface Jemaah {
  id: number
  nama: string
  email: string | null
  noHp: string | null
  alamat: string | null
  status: boolean
  religionId: number | null
  tempatIbadahId: number | null
  userId: number | null
  createdAt: string
  deletedAt: string | null
  religion: { nama: string } | null
  tempatIbadah: { nama: string; slug: string } | null
}

function PengurusTabContent({ isSuperAdmin }: { isSuperAdmin: boolean }) {
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
      key: 'tempatIbadah', header: 'Tempat Ibadah',
      render: (r) => (
        <div className="text-sm">
          <div className="text-gray-700">{r.tempatIbadah?.nama ?? '—'}</div>
          {r.tempatIbadah?.slug && (
            <div className="text-[11px] text-gray-400 font-mono">{r.tempatIbadah.slug}</div>
          )}
        </div>
      ),
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <h3 className="text-base font-semibold text-gray-800">Daftar Pengurus</h3>
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <a
            href="/api/pengurus/export?format=xlsx"
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
            title="Export ke Excel"
          >
            <FileSpreadsheet size={15} /> Export
          </a>
          <Link
            href="/pengurus/baru"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors animate-pulse-subtle"
          >
            <Plus size={16} /> Tambah Pengurus
          </Link>
        </div>
      </div>

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

function JemaahTabContent({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [showArsip, setShowArsip] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Jemaah | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [resetPasswordResult, setResetPasswordResult] = useState<{ password: string; nama: string } | null>(null)
  const [resetTarget, setResetTarget] = useState<Jemaah | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const { data, total, isLoading, mutate } = useDataFetch<Jemaah>('/api/jemaah', {
    search, page, limit, arsip: showArsip,
  })

  const handleDelete = useCallback(async (alasan: string) => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await axios.delete(`/api/jemaah/${deleteTarget.id}`, { data: { alasan } })
      toast.success('Jemaah berhasil dihapus')
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
      await axios.patch(`/api/jemaah/${id}`)
      toast.success('Jemaah berhasil dipulihkan')
      mutate()
    } catch {
      toast.error('Gagal memulihkan jemaah')
    }
  }, [mutate])

  const handleResetPassword = useCallback(async () => {
    if (!resetTarget) return
    setIsResetting(true)
    try {
      const res = await axios.post(`/api/jemaah/${resetTarget.id}/reset-password`)
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

  function openResetDialog(r: Jemaah) {
    if (!r.userId) {
      toast.error('Jemaah ini belum punya akun login')
      return
    }
    setResetTarget(r)
  }

  const columns: ColumnDef<Jemaah>[] = [
    {
      key: 'nama', header: 'Nama',
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.nama}</p>
          {r.userId && (
            <p className="text-xs text-emerald-600">Punya akun login</p>
          )}
        </div>
      ),
    },
    {
      key: 'kontak', header: 'Kontak',
      render: (r) => (
        <div className="space-y-0.5">
          {r.email && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Mail size={11} className="text-gray-400" />
              {r.email}
            </div>
          )}
          {r.noHp && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Phone size={11} className="text-gray-400" />
              {r.noHp}
            </div>
          )}
          {!r.email && !r.noHp && <span className="text-gray-400 text-xs">—</span>}
        </div>
      ),
    },
    {
      key: 'religion', header: 'Agama',
      render: (r) => <span className="text-gray-600">{r.religion?.nama ?? '—'}</span>,
    },
    {
      key: 'tempatIbadah', header: 'Tempat Ibadah',
      render: (r) => (
        <div className="text-sm">
          <div className="text-gray-700">{r.tempatIbadah?.nama ?? '—'}</div>
          {r.tempatIbadah?.slug && (
            <div className="text-[11px] text-gray-400 font-mono">{r.tempatIbadah.slug}</div>
          )}
        </div>
      ),
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
                href={`/jemaah/${r.id}/edit`}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
              >
                <Pencil size={12} /> Edit
              </Link>
              {r.userId && (
                <button
                  onClick={() => openResetDialog(r)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-600 hover:text-white transition-colors"
                  title="Reset password akun"
                >
                  <KeyRound size={12} /> Reset
                </button>
              )}
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <h3 className="text-base font-semibold text-gray-800">Daftar Jemaah</h3>
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <a
            href="/api/jemaah/export?format=xlsx"
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
            title="Export ke Excel"
          >
            <FileSpreadsheet size={15} /> Export
          </a>
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
            title="Import dari Excel"
          >
            <Upload size={15} /> Import
          </button>
          <Link
            href="/jemaah/baru"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <Plus size={16} /> Tambah Jemaah
          </Link>
        </div>
      </div>

      <SearchFilter
        value={search}
        onChange={(v) => { setSearch(v); setPage(1) }}
        placeholder="Cari nama, email, atau no HP jemaah..."
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
        emptyTitle={showArsip ? 'Tidak ada arsip' : 'Belum ada jemaah'}
        emptyDescription="Klik Tambah Jemaah untuk menambahkan."
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Hapus Jemaah "${deleteTarget?.nama}"`}
        isLoading={isDeleting}
      />

      <PasswordModal
        open={!!resetPasswordResult}
        onClose={() => setResetPasswordResult(null)}
        password={resetPasswordResult?.password ?? null}
        userName={resetPasswordResult?.nama}
        title="Password Baru Jemaah"
        description="Password telah direset. Salin dan bagikan ke jemaah. Password lama sudah tidak berlaku."
      />

      <ConfirmActionDialog
        open={!!resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
        onConfirm={handleResetPassword}
        title={`Reset password ${resetTarget?.nama}?`}
        description="Password lama akan tidak berlaku. Password baru akan dikirim via email (jika tersedia)."
        variant="warning"
        confirmLabel="Reset Password"
        isLoading={isResetting}
      />

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={mutate}
        endpoint="/api/jemaah/import"
        title="Import Jemaah dari Excel/CSV"
        description="Upload file Excel (.xlsx/.xls) atau CSV. Baris pertama wajib berisi header kolom. Jemaah dengan nama yang sama di agama yang sama akan dilewati otomatis."
        columns={
          isSuperAdmin
            ? ['Nama', 'Email (opsional)', 'No HP (opsional)', 'Alamat (opsional)', 'Agama (wajib untuk SUPERADMIN)']
            : ['Nama', 'Email (opsional)', 'No HP (opsional)', 'Alamat (opsional)']
        }
      />
    </div>
  )
}

function PenggunaPageContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()

  const isSuperAdmin = session?.user.role === 'SUPERADMIN'
  const isKetua = session?.user.role === 'PENGURUS' && session?.user.subRole === 'KETUA'
  const isSekretaris = session?.user.role === 'PENGURUS' && session?.user.subRole === 'SEKRETARIS'

  const canAccessPengurus = isSuperAdmin || isKetua
  const canAccessJemaah = isSuperAdmin || isKetua || isSekretaris

  // Determine initial tab
  const paramTab = searchParams.get('tab')
  const defaultTab = canAccessPengurus ? 'pengurus' : 'jemaah'
  const [activeTab, setActiveTab] = useState<'pengurus' | 'jemaah'>(
    paramTab === 'pengurus' || paramTab === 'jemaah' ? paramTab : defaultTab
  )

  useEffect(() => {
    if (paramTab === 'pengurus' || paramTab === 'jemaah') {
      // Validate access
      if (paramTab === 'pengurus' && !canAccessPengurus) {
        setActiveTab('jemaah')
      } else if (paramTab === 'jemaah' && !canAccessJemaah) {
        setActiveTab('pengurus')
      } else {
        setActiveTab(paramTab)
      }
    }
  }, [paramTab, canAccessPengurus, canAccessJemaah])

  if (!canAccessPengurus && !canAccessJemaah) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 text-sm">
        Akses ditolak. Anda tidak memiliki izin untuk mengelola pengguna.
      </div>
    )
  }

  const handleTabChange = (tab: 'pengurus' | 'jemaah') => {
    setActiveTab(tab)
    // Update URL search param
    router.replace(`/pengguna?tab=${tab}`)
  }

  // If only one tab is accessible, render that tab directly without tab header
  const showTabsHeader = canAccessPengurus && canAccessJemaah

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Pengguna"
        subtitle="Kelola data pengurus dan jemaah tempat ibadah"
      />

      {showTabsHeader && (
        <div className="border-b border-gray-200">
          <div className="flex gap-6 -mb-px">
            <button
              onClick={() => handleTabChange('pengurus')}
              className={`flex items-center gap-2 pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pengurus'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserCheck size={16} />
              Pengurus
            </button>
            <button
              onClick={() => handleTabChange('jemaah')}
              className={`flex items-center gap-2 pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'jemaah'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users size={16} />
              Jemaah
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        {activeTab === 'pengurus' && canAccessPengurus && (
          <PengurusTabContent isSuperAdmin={isSuperAdmin} />
        )}
        {activeTab === 'jemaah' && canAccessJemaah && (
          <JemaahTabContent isSuperAdmin={isSuperAdmin} />
        )}
      </div>
    </div>
  )
}

export default function PenggunaPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-gray-500">Memuat halaman...</div>}>
      <PenggunaPageContent />
    </Suspense>
  )
}
