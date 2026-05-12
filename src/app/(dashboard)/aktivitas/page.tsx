'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Activity, FileText, Filter } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { useDataFetch } from '@/hooks/useDataFetch'
import { formatTanggal } from '@/lib/utils'

interface Log {
  id: number
  aksi: string
  model: string
  recordId: number | null
  detail: string | null
  createdAt: string
  user: { id: number; nama: string; role: string; subRole: string | null } | null
}

const aksiOptions = [
  { value: '', label: 'Semua aksi' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'RESTORE', label: 'Restore' },
]

const modelOptions = [
  { value: '', label: 'Semua model' },
  { value: 'User', label: 'User' },
  { value: 'Religion', label: 'Religion' },
  { value: 'Jemaah', label: 'Jemaah' },
  { value: 'Kegiatan', label: 'Kegiatan' },
  { value: 'Pengumuman', label: 'Pengumuman' },
  { value: 'Donasi', label: 'Donasi' },
  { value: 'Pengeluaran', label: 'Pengeluaran' },
  { value: 'Rekening', label: 'Rekening' },
]

const aksiBadge: Record<string, string> = {
  CREATE: 'bg-emerald-50 text-emerald-700',
  UPDATE: 'bg-blue-50 text-blue-700',
  DELETE: 'bg-red-50 text-red-700',
  RESTORE: 'bg-violet-50 text-violet-700',
}

export default function AktivitasPage() {
  const { data: session } = useSession()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [aksi, setAksi] = useState('')
  const [model, setModel] = useState('')

  const { data, total, isLoading } = useDataFetch<Log>('/api/activity-log', {
    search, page, limit, aksi, model,
  })

  if (session && session.user.role !== 'SUPERADMIN') {
    return (
      <div>
        <PageHeader title="Activity Log" />
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 text-sm">
          Akses ditolak. Halaman ini hanya untuk Super Admin.
        </div>
      </div>
    )
  }

  const columns: ColumnDef<Log>[] = [
    {
      key: 'createdAt', header: 'Waktu',
      render: (r) => (
        <div>
          <p className="text-sm text-gray-700">{formatTanggal(r.createdAt, 'long')}</p>
          <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleTimeString('id-ID')}</p>
        </div>
      ),
    },
    {
      key: 'user', header: 'Aktor',
      render: (r) => r.user ? (
        <div>
          <p className="font-medium text-gray-900">{r.user.nama}</p>
          <p className="text-xs text-gray-500">
            {r.user.role}{r.user.subRole ? ` · ${r.user.subRole}` : ''}
          </p>
        </div>
      ) : <span className="text-gray-400 text-xs">—</span>,
    },
    {
      key: 'aksi', header: 'Aksi',
      render: (r) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${aksiBadge[r.aksi] ?? 'bg-gray-100 text-gray-700'}`}>
          {r.aksi}
        </span>
      ),
    },
    {
      key: 'model', header: 'Model',
      render: (r) => (
        <div className="flex items-center gap-1.5 text-sm text-gray-700">
          <FileText size={12} className="text-gray-400" />
          {r.model}{r.recordId ? <span className="text-gray-400"> #{r.recordId}</span> : null}
        </div>
      ),
    },
    {
      key: 'detail', header: 'Detail',
      render: (r) => <span className="text-sm text-gray-600 break-words">{r.detail ?? '—'}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Activity Log"
        subtitle="Audit trail aksi sistem"
        action={
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 bg-gray-100 rounded-lg">
            <Activity size={14} /> {total} record
          </div>
        }
      />

      <SearchFilter
        value={search}
        onChange={(v) => { setSearch(v); setPage(1) }}
        placeholder="Cari nama aktor atau detail..."
      >
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select
            value={aksi}
            onChange={(e) => { setAksi(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {aksiOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={model}
            onChange={(e) => { setModel(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {modelOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
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
        emptyTitle="Belum ada aktivitas"
        emptyDescription="Catatan aktivitas akan muncul di sini."
      />
    </div>
  )
}
