'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { ScopeFilter } from '@/components/shared/ScopeFilter'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog'
import { useDataFetch } from '@/hooks/useDataFetch'

interface Rekening {
  id: number
  namaBank: string
  nomorRekening: string
  namaPemilik: string
  catatan: string | null
  status: 'AKTIF' | 'NONAKTIF'
  religionId: number
  tempatIbadahId: number | null
  religion: { nama: string } | null
  tempatIbadah: { nama: string; slug: string } | null
}

export default function RekeningPage() {
  const { data: session } = useSession()
  const role = session?.user.role
  const subRole = session?.user.subRole
  const isSuperAdmin = role === 'SUPERADMIN'
  const canManage = isSuperAdmin || (role === 'PENGURUS' && subRole === 'KETUA')

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deleteTarget, setDeleteTarget] = useState<Rekening | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [filterReligionId, setFilterReligionId] = useState<number | undefined>(undefined)
  const [filterTempatIbadahId, setFilterTempatIbadahId] = useState<number | undefined>(undefined)

  const { data, total, isLoading, mutate } = useDataFetch<Rekening>('/api/rekening', {
    search, page, limit,
    religionId: filterReligionId,
    tempatIbadahId: filterTempatIbadahId,
  })

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await axios.delete(`/api/rekening/${deleteTarget.id}`)
      toast.success('Rekening berhasil dihapus')
      setDeleteTarget(null)
      mutate()
    } catch (err) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal menghapus')
    } finally {
      setIsDeleting(false)
    }
  }, [deleteTarget, mutate])

  const columns: ColumnDef<Rekening>[] = [
    {
      key: 'rekening', header: 'Rekening',
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.namaBank}</p>
          <p className="text-xs text-gray-500 font-mono">{r.nomorRekening}</p>
        </div>
      ),
    },
    {
      key: 'pemilik', header: 'Atas Nama',
      render: (r) => <span className="text-gray-700">{r.namaPemilik}</span>,
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
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions', header: 'Aksi',
      render: (r) => canManage ? (
        <div className="flex items-center gap-2">
          <Link
            href={`/rekening/${r.id}/edit`}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white"
          >
            <Pencil size={12} /> Edit
          </Link>
          <button
            onClick={() => setDeleteTarget(r)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white"
          >
            <Trash2 size={12} /> Hapus
          </button>
        </div>
      ) : <span className="text-xs text-gray-400">—</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Rekening"
        subtitle="Kelola rekening donasi"
        action={
          canManage ? (
            <Link
              href="/rekening/baru"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
            >
              <Plus size={16} /> Tambah Rekening
            </Link>
          ) : undefined
        }
      />

      <SearchFilter
        value={search}
        onChange={(v) => { setSearch(v); setPage(1) }}
        placeholder="Cari bank, nomor, atau atas nama..."
      >
        {isSuperAdmin && (
          <ScopeFilter
            religionId={filterReligionId}
            tempatIbadahId={filterTempatIbadahId}
            onChange={({ religionId, tempatIbadahId }) => {
              setFilterReligionId(religionId)
              setFilterTempatIbadahId(tempatIbadahId)
              setPage(1)
            }}
          />
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
        emptyTitle="Belum ada rekening"
        emptyDescription={canManage ? 'Klik Tambah Rekening untuk menambahkan.' : 'Belum ada rekening yang terdaftar.'}
      />

      <ConfirmActionDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Hapus rekening ${deleteTarget?.namaBank}?`}
        description={
          deleteTarget
            ? `${deleteTarget.namaBank} ${deleteTarget.nomorRekening} a/n ${deleteTarget.namaPemilik}.\n\nAksi ini permanen dan tidak bisa dibatalkan.`
            : ''
        }
        variant="danger"
        confirmLabel="Hapus Permanen"
        isLoading={isDeleting}
      />
    </div>
  )
}
