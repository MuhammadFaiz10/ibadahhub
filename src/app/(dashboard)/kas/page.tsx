'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { toast } from 'sonner'
import { Plus, RotateCcw, Pencil, Trash2, Archive, HandCoins, TrendingDown, CreditCard } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { ScopeFilter } from '@/components/shared/ScopeFilter'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatRupiah, formatTanggal } from '@/lib/utils'
import { useDataFetch } from '@/hooks/useDataFetch'

interface Pemasukan {
  id: number
  keterangan: string
  nominal: string
  tanggal: string
  kategori: string
  bukti: string | null
  religionId: number
  tempatIbadahId: number | null
  deletedAt: string | null
  religion: { nama: string } | null
  tempatIbadah: { nama: string; slug: string } | null
  user: { nama: string } | null
  rekening: { namaBank: string; nomorRekening: string } | null
}

interface Pengeluaran {
  id: number
  keterangan: string
  nominal: string
  tanggal: string
  kategori: string
  bukti: string | null
  religionId: number
  tempatIbadahId: number | null
  deletedAt: string | null
  religion: { nama: string } | null
  tempatIbadah: { nama: string; slug: string } | null
  user: { nama: string } | null
  rekening: { namaBank: string; nomorRekening: string } | null
}

interface BalanceAccount {
  id: number
  namaBank: string
  nomorRekening: string
  namaPemilik: string
  status: string
  totalDonasi: number
  totalMasuk: number
  totalKeluar: number
  saldo: number
}

const kategoriPemasukanOptions = [
  { value: '', label: 'Semua kategori' },
  { value: 'DONASI', label: 'Donasi' },
  { value: 'HIBAH', label: 'Hibah' },
  { value: 'USAHA', label: 'Usaha Komunitas' },
  { value: 'LAINNYA', label: 'Lainnya' },
]

const kategoriPengeluaranOptions = [
  { value: '', label: 'Semua kategori' },
  { value: 'OPERASIONAL', label: 'Operasional' },
  { value: 'KEGIATAN', label: 'Kegiatan' },
  { value: 'SOSIAL', label: 'Sosial' },
  { value: 'LAINNYA', label: 'Lainnya' },
]

export default function KasPage() {
  const { data: session } = useSession()
  const role = session?.user.role
  const subRole = session?.user.subRole
  const isSuperAdmin = role === 'SUPERADMIN'
  const canManage =
    role === 'SUPERADMIN' || (role === 'PENGURUS' && (subRole === 'KETUA' || subRole === 'BENDAHARA'))

  const [activeTab, setActiveTab] = useState<'pengeluaran' | 'pemasukan' | 'balance'>('pengeluaran')

  // Shared scope filters
  const [filterReligionId, setFilterReligionId] = useState<number | undefined>(undefined)
  const [filterTempatIbadahId, setFilterTempatIbadahId] = useState<number | undefined>(undefined)

  // Pemasukan state
  const [searchMasuk, setSearchMasuk] = useState('')
  const [pageMasuk, setPageMasuk] = useState(1)
  const [limitMasuk, setLimitMasuk] = useState(10)
  const [kategoriMasuk, setKategoriMasuk] = useState('')
  const [showArsipMasuk, setShowArsipMasuk] = useState(false)
  const [deleteTargetMasuk, setDeleteTargetMasuk] = useState<Pemasukan | null>(null)
  const [isDeletingMasuk, setIsDeletingMasuk] = useState(false)

  // Pengeluaran state
  const [searchKeluar, setSearchKeluar] = useState('')
  const [pageKeluar, setPageKeluar] = useState(1)
  const [limitKeluar, setLimitKeluar] = useState(10)
  const [kategoriKeluar, setKategoriKeluar] = useState('')
  const [showArsipKeluar, setShowArsipKeluar] = useState(false)
  const [deleteTargetKeluar, setDeleteTargetKeluar] = useState<Pengeluaran | null>(null)
  const [isDeletingKeluar, setIsDeletingKeluar] = useState(false)

  // Balance state
  const [balanceData, setBalanceData] = useState<BalanceAccount[]>([])
  const [isBalanceLoading, setIsBalanceLoading] = useState(false)

  // Fetch Pemasukan
  const { data: dataMasuk, total: totalMasuk, isLoading: isLoadingMasuk, mutate: mutateMasuk } =
    useDataFetch<Pemasukan>('/api/pemasukan', {
      search: searchMasuk,
      page: pageMasuk,
      limit: limitMasuk,
      arsip: showArsipMasuk,
      kategori: kategoriMasuk,
      religionId: filterReligionId,
      tempatIbadahId: filterTempatIbadahId,
    })

  // Fetch Pengeluaran
  const { data: dataKeluar, total: totalKeluar, isLoading: isLoadingKeluar, mutate: mutateKeluar } =
    useDataFetch<Pengeluaran>('/api/pengeluaran', {
      search: searchKeluar,
      page: pageKeluar,
      limit: limitKeluar,
      arsip: showArsipKeluar,
      kategori: kategoriKeluar,
      religionId: filterReligionId,
      tempatIbadahId: filterTempatIbadahId,
    })

  // Fetch Balance data manually when tab is active or scope changes
  const fetchBalance = useCallback(async () => {
    // For superadmin, only load balance if tempatIbadahId is set
    if (isSuperAdmin && !filterTempatIbadahId) {
      setBalanceData([])
      return
    }

    setIsBalanceLoading(true)
    try {
      const params = {
        religionId: filterReligionId,
        tempatIbadahId: filterTempatIbadahId,
      }
      const res = await axios.get('/api/kas/summary', { params })
      setBalanceData(res.data.data || [])
    } catch (err) {
      toast.error('Gagal memuat saldo kas')
    } finally {
      setIsBalanceLoading(false)
    }
  }, [filterReligionId, filterTempatIbadahId, isSuperAdmin])

  useEffect(() => {
    if (activeTab === 'balance') {
      fetchBalance()
    }
  }, [activeTab, fetchBalance])

  // Delete Handlers
  const handleDeleteMasuk = useCallback(async (alasan: string) => {
    if (!deleteTargetMasuk) return
    setIsDeletingMasuk(true)
    try {
      await axios.delete(`/api/pemasukan/${deleteTargetMasuk.id}`, { data: { alasan } })
      toast.success('Pemasukan berhasil dihapus')
      setDeleteTargetMasuk(null)
      mutateMasuk()
    } catch (err) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal menghapus')
    } finally {
      setIsDeletingMasuk(false)
    }
  }, [deleteTargetMasuk, mutateMasuk])

  const handleRestoreMasuk = useCallback(async (id: number) => {
    try {
      await axios.patch(`/api/pemasukan/${id}`)
      toast.success('Pemasukan dipulihkan')
      mutateMasuk()
    } catch {
      toast.error('Gagal memulihkan')
    }
  }, [mutateMasuk])

  const handleDeleteKeluar = useCallback(async (alasan: string) => {
    if (!deleteTargetKeluar) return
    setIsDeletingKeluar(true)
    try {
      await axios.delete(`/api/pengeluaran/${deleteTargetKeluar.id}`, { data: { alasan } })
      toast.success('Pengeluaran berhasil dihapus')
      setDeleteTargetKeluar(null)
      mutateKeluar()
    } catch (err) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal menghapus')
    } finally {
      setIsDeletingKeluar(false)
    }
  }, [deleteTargetKeluar, mutateKeluar])

  const handleRestoreKeluar = useCallback(async (id: number) => {
    try {
      await axios.patch(`/api/pengeluaran/${id}`)
      toast.success('Pengeluaran dipulihkan')
      mutateKeluar()
    } catch {
      toast.error('Gagal memulihkan')
    }
  }, [mutateKeluar])

  // Columns Definitions
  const columnsMasuk: ColumnDef<Pemasukan>[] = [
    {
      key: 'keterangan', header: 'Keterangan',
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.keterangan}</p>
          <p className="text-xs text-gray-500">oleh {r.user?.nama ?? '-'}</p>
        </div>
      ),
    },
    {
      key: 'kategori', header: 'Kategori',
      render: (r) => (
        <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700">
          {r.kategori}
        </span>
      ),
    },
    {
      key: 'rekening', header: 'Rekening',
      render: (r) => (
        <span className="text-xs text-gray-600 font-medium">
          {r.rekening ? `${r.rekening.namaBank} - ${r.rekening.nomorRekening}` : 'Kas Tunai'}
        </span>
      ),
    },
    {
      key: 'tanggal', header: 'Tanggal',
      render: (r) => formatTanggal(r.tanggal),
    },
    {
      key: 'nominal', header: 'Nominal', className: 'text-right',
      render: (r) => (
        <span className="text-emerald-600 font-semibold">
          {formatRupiah(r.nominal)}
        </span>
      ),
    },
    {
      key: 'actions', header: 'Aksi',
      render: (r) => canManage ? (
        <div className="flex items-center gap-2">
          {r.deletedAt ? (
            <button onClick={() => handleRestoreMasuk(r.id)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-light text-primary rounded-lg hover:bg-primary hover:text-white">
              <RotateCcw size={12} /> Pulihkan
            </button>
          ) : (
            <>
              <Link href={`/kas/pemasukan/${r.id}/edit`}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white">
                <Pencil size={12} /> Edit
              </Link>
              <button onClick={() => setDeleteTargetMasuk(r)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white">
                <Trash2 size={12} /> Hapus
              </button>
            </>
          )}
        </div>
      ) : <span className="text-xs text-gray-400">—</span>,
    },
  ]

  const columnsKeluar: ColumnDef<Pengeluaran>[] = [
    {
      key: 'keterangan', header: 'Keterangan',
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.keterangan}</p>
          <p className="text-xs text-gray-500">oleh {r.user?.nama ?? '-'}</p>
        </div>
      ),
    },
    {
      key: 'kategori', header: 'Kategori',
      render: (r) => (
        <span className="px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700">
          {r.kategori}
        </span>
      ),
    },
    {
      key: 'rekening', header: 'Rekening',
      render: (r) => (
        <span className="text-xs text-gray-600 font-medium">
          {r.rekening ? `${r.rekening.namaBank} - ${r.rekening.nomorRekening}` : 'Kas Tunai'}
        </span>
      ),
    },
    {
      key: 'tanggal', header: 'Tanggal',
      render: (r) => formatTanggal(r.tanggal),
    },
    {
      key: 'nominal', header: 'Nominal', className: 'text-right',
      render: (r) => (
        <span className="text-red-600 font-semibold">
          {formatRupiah(r.nominal)}
        </span>
      ),
    },
    {
      key: 'actions', header: 'Aksi',
      render: (r) => canManage ? (
        <div className="flex items-center gap-2">
          {r.deletedAt ? (
            <button onClick={() => handleRestoreKeluar(r.id)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-light text-primary rounded-lg hover:bg-primary hover:text-white">
              <RotateCcw size={12} /> Pulihkan
            </button>
          ) : (
            <>
              <Link href={`/kas/pengeluaran/${r.id}/edit`}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white">
                <Pencil size={12} /> Edit
              </Link>
              <button onClick={() => setDeleteTargetKeluar(r)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white">
                <Trash2 size={12} /> Hapus
              </button>
            </>
          )}
        </div>
      ) : <span className="text-xs text-gray-400">—</span>,
    },
  ]

  const columnsBalance: ColumnDef<BalanceAccount>[] = [
    {
      key: 'rekening', header: 'Nama Rekening / Bank',
      render: (r) => (
        <div>
          <p className="font-semibold text-gray-900">{r.namaBank}</p>
          <p className="text-xs text-gray-500 font-mono">{r.nomorRekening}</p>
        </div>
      ),
    },
    {
      key: 'pemilik', header: 'Pemilik / Penanggung Jawab',
      render: (r) => <span className="text-sm text-gray-700">{r.namaPemilik}</span>,
    },
    {
      key: 'totalDonasi', header: 'Donasi Masuk (Dikonfirmasi)', className: 'text-right text-sm text-gray-600',
      render: (r) => formatRupiah(r.totalDonasi),
    },
    {
      key: 'totalMasuk', header: 'Pemasukan Manual', className: 'text-right text-sm text-emerald-600',
      render: (r) => formatRupiah(r.totalMasuk),
    },
    {
      key: 'totalKeluar', header: 'Total Pengeluaran', className: 'text-right text-sm text-red-600',
      render: (r) => formatRupiah(r.totalKeluar),
    },
    {
      key: 'saldo', header: 'Sisa Saldo', className: 'text-right font-bold',
      render: (r) => (
        <span className={r.saldo >= 0 ? 'text-emerald-700' : 'text-red-700'}>
          {formatRupiah(r.saldo)}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Kas"
        subtitle="Kelola pengeluaran, pemasukan, dan saldo kas tempat ibadah"
        action={
          canManage ? (
            <div className="flex gap-2">
              <Link href="/kas/pengeluaran/baru"
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors shadow-sm">
                <Plus size={16} /> Catat Pengeluaran
              </Link>
              <Link href="/kas/pemasukan/baru"
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm">
                <Plus size={16} /> Catat Pemasukan
              </Link>
            </div>
          ) : undefined
        }
      />

      {/* Scope Filter for Super Admin */}
      {isSuperAdmin && (
        <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Filter Tempat Ibadah</p>
          <ScopeFilter
            religionId={filterReligionId}
            tempatIbadahId={filterTempatIbadahId}
            onChange={({ religionId, tempatIbadahId }) => {
              setFilterReligionId(religionId)
              setFilterTempatIbadahId(tempatIbadahId)
              setPageMasuk(1)
              setPageKeluar(1)
            }}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 bg-white p-1 rounded-lg border">
        <button
          onClick={() => setActiveTab('pengeluaran')}
          className={`flex-1 py-3 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'pengeluaran'
              ? 'bg-amber-50 text-amber-800 shadow-sm border border-amber-100 font-semibold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <TrendingDown size={16} />
          Pengeluaran Kas
        </button>
        <button
          onClick={() => setActiveTab('pemasukan')}
          className={`flex-1 py-3 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'pemasukan'
              ? 'bg-emerald-50 text-emerald-800 shadow-sm border border-emerald-100 font-semibold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <HandCoins size={16} />
          Pemasukan Kas
        </button>
        <button
          onClick={() => setActiveTab('balance')}
          className={`flex-1 py-3 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'balance'
              ? 'bg-blue-50 text-blue-800 shadow-sm border border-blue-100 font-semibold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <CreditCard size={16} />
          Balance Rekening
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'pemasukan' && (
        <div>
          <SearchFilter
            value={searchMasuk}
            onChange={(v) => { setSearchMasuk(v); setPageMasuk(1) }}
            placeholder="Cari keterangan pemasukan..."
          >
            <select
              value={kategoriMasuk}
              onChange={(e) => { setKategoriMasuk(e.target.value); setPageMasuk(1) }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {kategoriPemasukanOptions.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
            <button
              onClick={() => { setShowArsipMasuk(!showArsipMasuk); setPageMasuk(1) }}
              className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                showArsipMasuk ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Archive size={15} />
              {showArsipMasuk ? 'Arsip Aktif' : 'Tampilkan Arsip'}
            </button>
          </SearchFilter>

          <DataTable
            data={dataMasuk}
            columns={columnsMasuk}
            total={totalMasuk}
            page={pageMasuk}
            limit={limitMasuk}
            onPageChange={setPageMasuk}
            onLimitChange={(l) => { setLimitMasuk(l); setPageMasuk(1) }}
            isLoading={isLoadingMasuk}
            emptyTitle={showArsipMasuk ? 'Tidak ada arsip' : 'Belum ada pemasukan'}
            emptyDescription={canManage ? 'Klik Catat Pemasukan untuk mencatat.' : ''}
          />

          <ConfirmDialog
            open={!!deleteTargetMasuk}
            onOpenChange={(open) => !open && setDeleteTargetMasuk(null)}
            onConfirm={handleDeleteMasuk}
            title={`Hapus Pemasukan "${deleteTargetMasuk?.keterangan}"`}
            isLoading={isDeletingMasuk}
          />
        </div>
      )}

      {activeTab === 'pengeluaran' && (
        <div>
          <SearchFilter
            value={searchKeluar}
            onChange={(v) => { setSearchKeluar(v); setPageKeluar(1) }}
            placeholder="Cari keterangan pengeluaran..."
          >
            <select
              value={kategoriKeluar}
              onChange={(e) => { setKategoriKeluar(e.target.value); setPageKeluar(1) }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {kategoriPengeluaranOptions.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
            <button
              onClick={() => { setShowArsipKeluar(!showArsipKeluar); setPageKeluar(1) }}
              className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                showArsipKeluar ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Archive size={15} />
              {showArsipKeluar ? 'Arsip Aktif' : 'Tampilkan Arsip'}
            </button>
          </SearchFilter>

          <DataTable
            data={dataKeluar}
            columns={columnsKeluar}
            total={totalKeluar}
            page={pageKeluar}
            limit={limitKeluar}
            onPageChange={setPageKeluar}
            onLimitChange={(l) => { setLimitKeluar(l); setPageKeluar(1) }}
            isLoading={isLoadingKeluar}
            emptyTitle={showArsipKeluar ? 'Tidak ada arsip' : 'Belum ada pengeluaran'}
            emptyDescription={canManage ? 'Klik Catat Pengeluaran untuk mencatat.' : ''}
          />

          <ConfirmDialog
            open={!!deleteTargetKeluar}
            onOpenChange={(open) => !open && setDeleteTargetKeluar(null)}
            onConfirm={handleDeleteKeluar}
            title={`Hapus Pengeluaran "${deleteTargetKeluar?.keterangan}"`}
            isLoading={isDeletingKeluar}
          />
        </div>
      )}

      {activeTab === 'balance' && (
        <div>
          {isSuperAdmin && !filterTempatIbadahId ? (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-8 rounded-xl text-center">
              <CreditCard size={36} className="mx-auto text-blue-500 mb-3" />
              <h3 className="font-semibold text-lg mb-1">Pilih Tempat Ibadah</h3>
              <p className="text-sm text-blue-600 max-w-md mx-auto">
                Untuk melihat balance rekening, silakan pilih tempat ibadah terlebih dahulu melalui filter di atas.
              </p>
            </div>
          ) : (
            <DataTable
              data={balanceData}
              columns={columnsBalance}
              total={balanceData.length}
              page={1}
              limit={50}
              onPageChange={() => {}}
              onLimitChange={() => {}}
              isLoading={isBalanceLoading}
              emptyTitle="Belum ada rekening"
              emptyDescription="Silakan tambahkan rekening bank baru di menu Rekening untuk mulai mencatat balance rekening."
            />
          )}
        </div>
      )}
    </div>
  )
}
