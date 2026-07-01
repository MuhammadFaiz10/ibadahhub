'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import axios from 'axios'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  HandCoins,
  CreditCard,
  Download,
  Filter,
  TrendingDown,
  RotateCcw,
  Archive,
  Wallet,
  Building2
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { ScopeFilter } from '@/components/shared/ScopeFilter'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatRupiah, formatTanggal } from '@/lib/utils'
import { useDataFetch } from '@/hooks/useDataFetch'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

// --- Interfaces ---
interface Donasi {
  id: number
  namaDonatur: string
  nominal: string
  tanggal: string
  metodePembayaran: string
  status: 'PENDING' | 'DIKONFIRMASI' | 'DITOLAK'
  catatan: string | null
  buktiPembayaran: string | null
  religionId: number
  tempatIbadahId: number | null
  userId: number | null
  religion: { nama: string } | null
  tempatIbadah: { nama: string; slug: string } | null
  jemaah: { nama: string } | null
  konfirmasiBy: { nama: string } | null
}

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

// --- Constants ---
const statusDonasiOptions = [
  { value: '', label: 'Semua status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'DIKONFIRMASI', label: 'Dikonfirmasi' },
  { value: 'DITOLAK', label: 'Ditolak' },
]

const metodeDonasiOptions = [
  { value: '', label: 'Semua Metode' },
  { value: 'TRANSFER_BANK', label: 'Transfer Bank' },
  { value: 'TUNAI', label: 'Tunai' },
  { value: 'MIDTRANS', label: 'Online (Midtrans)' },
  { value: 'QRIS', label: 'QRIS' },
]

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

function KeuanganPageContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const role = session?.user?.role
  const subRole = session?.user?.subRole
  const isSuperAdmin = role === 'SUPERADMIN'
  const isJemaah = role === 'JEMAAH'

  // --- Tab Permissions ---
  const canManageDonasi = isSuperAdmin || (role === 'PENGURUS' && (subRole === 'KETUA' || subRole === 'BENDAHARA'))
  const canManageKas = isSuperAdmin || (role === 'PENGURUS' && (subRole === 'KETUA' || subRole === 'BENDAHARA'))
  const canManageRekening = isSuperAdmin || (role === 'PENGURUS' && subRole === 'KETUA')

  const allowedTabs = [
    { id: 'donasi', label: 'Donasi', icon: HandCoins, visible: true },
    { id: 'kas', label: 'Arus Kas', icon: Wallet, visible: canManageKas },
    { id: 'rekening', label: 'Rekening', icon: CreditCard, visible: canManageRekening },
  ].filter((t) => t.visible)

  const defaultTab = allowedTabs[0]?.id || 'donasi'
  const tabParam = searchParams.get('tab')
  const activeTab = tabParam && allowedTabs.some((t) => t.id === tabParam) ? tabParam : defaultTab

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tabId)
    router.push(`${pathname}?${params.toString()}`)
  }

  // =========================================================================
  // STATE DEFINITIONS
  // =========================================================================

  // --- Donasi States ---
  const [searchDonasi, setSearchDonasi] = useState('')
  const [pageDonasi, setPageDonasi] = useState(1)
  const [limitDonasi, setLimitDonasi] = useState(10)
  const [statusDonasi, setStatusDonasi] = useState('')
  const [filterReligionIdDonasi, setFilterReligionIdDonasi] = useState<number | undefined>(undefined)
  const [filterTempatIbadahIdDonasi, setFilterTempatIbadahIdDonasi] = useState<number | undefined>(undefined)
  const [startDateDonasi, setStartDateDonasi] = useState('')
  const [endDateDonasi, setEndDateDonasi] = useState('')
  const [metodePembayaranDonasi, setMetodePembayaranDonasi] = useState('')
  const [showFiltersDonasi, setShowFiltersDonasi] = useState(false)
  const [deleteTargetDonasi, setDeleteTargetDonasi] = useState<Donasi | null>(null)
  const [isDeletingDonasi, setIsDeletingDonasi] = useState(false)
  const [confirmTargetDonasi, setConfirmTargetDonasi] = useState<Donasi | null>(null)
  const [rejectTargetDonasi, setRejectTargetDonasi] = useState<Donasi | null>(null)
  const [isProcessingDonasi, setIsProcessingDonasi] = useState(false)
  const [payingDonasiId, setPayingDonasiId] = useState<number | null>(null)
  const [totalDikonfirmasiDonasi, setTotalDikonfirmasiDonasi] = useState('0')

  // --- Kas States ---
  const [kasTab, setKasTab] = useState<'pengeluaran' | 'pemasukan' | 'balance'>('pengeluaran')
  const [filterReligionIdKas, setFilterReligionIdKas] = useState<number | undefined>(undefined)
  const [filterTempatIbadahIdKas, setFilterTempatIbadahIdKas] = useState<number | undefined>(undefined)

  // Pemasukan States
  const [searchPemasukan, setSearchPemasukan] = useState('')
  const [pagePemasukan, setPagePemasukan] = useState(1)
  const [limitPemasukan, setLimitPemasukan] = useState(10)
  const [kategoriPemasukan, setKategoriPemasukan] = useState('')
  const [showArsipPemasukan, setShowArsipPemasukan] = useState(false)
  const [deleteTargetPemasukan, setDeleteTargetPemasukan] = useState<Pemasukan | null>(null)
  const [isDeletingPemasukan, setIsDeletingPemasukan] = useState(false)

  // Pengeluaran States
  const [searchPengeluaran, setSearchPengeluaran] = useState('')
  const [pagePengeluaran, setPagePengeluaran] = useState(1)
  const [limitPengeluaran, setLimitPengeluaran] = useState(10)
  const [kategoriPengeluaran, setKategoriPengeluaran] = useState('')
  const [showArsipPengeluaran, setShowArsipPengeluaran] = useState(false)
  const [deleteTargetPengeluaran, setDeleteTargetPengeluaran] = useState<Pengeluaran | null>(null)
  const [isDeletingPengeluaran, setIsDeletingPengeluaran] = useState(false)

  // Balance States
  const [balanceData, setBalanceData] = useState<BalanceAccount[]>([])
  const [isBalanceLoading, setIsBalanceLoading] = useState(false)

  // --- Rekening States ---
  const [searchRekening, setSearchRekening] = useState('')
  const [pageRekening, setPageRekening] = useState(1)
  const [limitRekening, setLimitRekening] = useState(10)
  const [deleteTargetRekening, setDeleteTargetRekening] = useState<Rekening | null>(null)
  const [isDeletingRekening, setIsDeletingRekening] = useState(false)
  const [filterReligionIdRekening, setFilterReligionIdRekening] = useState<number | undefined>(undefined)
  const [filterTempatIbadahIdRekening, setFilterTempatIbadahIdRekening] = useState<number | undefined>(undefined)

  // =========================================================================
  // DATA FETCHING (useDataFetch Hooks)
  // =========================================================================

  // Donasi
  const { data: donasiData, total: donasiTotal, isLoading: isDonasiLoading, mutate: mutateDonasi } =
    useDataFetch<Donasi>('/api/donasi', {
      search: searchDonasi,
      page: pageDonasi,
      limit: limitDonasi,
      status: statusDonasi,
      religionId: filterReligionIdDonasi,
      tempatIbadahId: filterTempatIbadahIdDonasi,
      startDate: startDateDonasi,
      endDate: endDateDonasi,
      metodePembayaran: metodePembayaranDonasi,
    })

  // Kas Pemasukan
  const { data: pemasukanData, total: pemasukanTotal, isLoading: isPemasukanLoading, mutate: mutatePemasukan } =
    useDataFetch<Pemasukan>('/api/pemasukan', {
      search: searchPemasukan,
      page: pagePemasukan,
      limit: limitPemasukan,
      arsip: showArsipPemasukan,
      kategori: kategoriPemasukan,
      religionId: filterReligionIdKas,
      tempatIbadahId: filterTempatIbadahIdKas,
    })

  // Kas Pengeluaran
  const { data: pengeluaranData, total: pengeluaranTotal, isLoading: isPengeluaranLoading, mutate: mutatePengeluaran } =
    useDataFetch<Pengeluaran>('/api/pengeluaran', {
      search: searchPengeluaran,
      page: pagePengeluaran,
      limit: limitPengeluaran,
      arsip: showArsipPengeluaran,
      kategori: kategoriPengeluaran,
      religionId: filterReligionIdKas,
      tempatIbadahId: filterTempatIbadahIdKas,
    })

  // Rekening
  const { data: rekeningData, total: rekeningTotal, isLoading: isRekeningLoading, mutate: mutateRekening } =
    useDataFetch<Rekening>('/api/rekening', {
      search: searchRekening,
      page: pageRekening,
      limit: limitRekening,
      religionId: filterReligionIdRekening,
      tempatIbadahId: filterTempatIbadahIdRekening,
    })

  // =========================================================================
  // HELPER METHODS / MUTATIONS
  // =========================================================================

  // --- Donasi Handlers ---
  const exportPDFDonasi = () => {
    const doc = new jsPDF()
    doc.text('Laporan Donasi', 14, 15)
    doc.setFontSize(10)
    let subtitle = 'Semua Donasi'
    if (startDateDonasi && endDateDonasi) subtitle = `Periode: ${startDateDonasi} s.d ${endDateDonasi}`
    doc.text(subtitle, 14, 22)

    const tableData = donasiData.map((d, i) => [
      i + 1,
      formatTanggal(d.tanggal),
      d.namaDonatur,
      d.metodePembayaran,
      d.status,
      formatRupiah(d.nominal),
    ])

    ;(doc as any).autoTable({
      startY: 28,
      head: [['No', 'Tanggal', 'Donatur', 'Metode', 'Status', 'Nominal']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [85, 27, 20] }, // #551b14 (primary)
    })

    doc.save(`Laporan_Donasi_${new Date().getTime()}.pdf`)
  }

  const handleBayarDonasi = useCallback(
    (donasiId: number) => {
      router.push(`/donasi/bayar/${donasiId}`)
    },
    [router]
  )

  useEffect(() => {
    if (activeTab !== 'donasi') return
    const params = new URLSearchParams()
    if (searchDonasi) params.set('search', searchDonasi)
    if (statusDonasi) params.set('status', statusDonasi)
    if (filterReligionIdDonasi) params.set('religionId', String(filterReligionIdDonasi))
    if (filterTempatIbadahIdDonasi) params.set('tempatIbadahId', String(filterTempatIbadahIdDonasi))
    if (startDateDonasi) params.set('startDate', startDateDonasi)
    if (endDateDonasi) params.set('endDate', endDateDonasi)
    if (metodePembayaranDonasi) params.set('metodePembayaran', metodePembayaranDonasi)
    params.set('page', '1')
    params.set('limit', '1')
    axios
      .get(`/api/donasi?${params}`)
      .then((r) => {
        setTotalDikonfirmasiDonasi(r.data.totalDikonfirmasi ?? '0')
      })
      .catch(() => undefined)
  }, [
    activeTab,
    searchDonasi,
    statusDonasi,
    donasiTotal,
    filterReligionIdDonasi,
    filterTempatIbadahIdDonasi,
    startDateDonasi,
    endDateDonasi,
    metodePembayaranDonasi,
  ])

  const handleDeleteDonasi = useCallback(
    async (alasan: string) => {
      if (!deleteTargetDonasi) return
      setIsDeletingDonasi(true)
      try {
        await axios.delete(`/api/donasi/${deleteTargetDonasi.id}`, { data: { alasan } })
        toast.success('Donasi berhasil dihapus')
        setDeleteTargetDonasi(null)
        mutateDonasi()
      } catch (err) {
        if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal menghapus')
      } finally {
        setIsDeletingDonasi(false)
      }
    },
    [deleteTargetDonasi, mutateDonasi]
  )

  const handleConfirmDonasi = useCallback(async () => {
    if (!confirmTargetDonasi) return
    setIsProcessingDonasi(true)
    try {
      await axios.patch(`/api/donasi/${confirmTargetDonasi.id}`, { action: 'CONFIRM' })
      toast.success('Donasi dikonfirmasi')
      setConfirmTargetDonasi(null)
      mutateDonasi()
    } catch (err) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal konfirmasi')
    } finally {
      setIsProcessingDonasi(false)
    }
  }, [confirmTargetDonasi, mutateDonasi])

  const handleRejectDonasi = useCallback(
    async (alasan?: string) => {
      if (!rejectTargetDonasi || !alasan?.trim()) return
      setIsProcessingDonasi(true)
      try {
        await axios.patch(`/api/donasi/${rejectTargetDonasi.id}`, { action: 'REJECT', alasan })
        toast.success('Donasi ditolak')
        setRejectTargetDonasi(null)
        mutateDonasi()
      } catch (err) {
        if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal menolak')
      } finally {
        setIsProcessingDonasi(false)
      }
    },
    [rejectTargetDonasi, mutateDonasi]
  )

  // --- Kas Handlers ---
  const fetchBalance = useCallback(async () => {
    if (isSuperAdmin && !filterTempatIbadahIdKas) {
      setBalanceData([])
      return
    }

    setIsBalanceLoading(true)
    try {
      const params = {
        religionId: filterReligionIdKas,
        tempatIbadahId: filterTempatIbadahIdKas,
      }
      const res = await axios.get('/api/kas/summary', { params })
      setBalanceData(res.data.data || [])
    } catch (err) {
      toast.error('Gagal memuat saldo kas')
    } finally {
      setIsBalanceLoading(false)
    }
  }, [filterReligionIdKas, filterTempatIbadahIdKas, isSuperAdmin])

  useEffect(() => {
    if (activeTab === 'kas' && kasTab === 'balance') {
      fetchBalance()
    }
  }, [activeTab, kasTab, fetchBalance])

  const handleDeletePemasukan = useCallback(
    async (alasan: string) => {
      if (!deleteTargetPemasukan) return
      setIsDeletingPemasukan(true)
      try {
        await axios.delete(`/api/pemasukan/${deleteTargetPemasukan.id}`, { data: { alasan } })
        toast.success('Pemasukan berhasil dihapus')
        setDeleteTargetPemasukan(null)
        mutatePemasukan()
      } catch (err) {
        if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal menghapus')
      } finally {
        setIsDeletingPemasukan(false)
      }
    },
    [deleteTargetPemasukan, mutatePemasukan]
  )

  const handleRestorePemasukan = useCallback(
    async (id: number) => {
      try {
        await axios.patch(`/api/pemasukan/${id}`)
        toast.success('Pemasukan dipulihkan')
        mutatePemasukan()
      } catch {
        toast.error('Gagal memulihkan')
      }
    },
    [mutatePemasukan]
  )

  const handleDeletePengeluaran = useCallback(
    async (alasan: string) => {
      if (!deleteTargetPengeluaran) return
      setIsDeletingPengeluaran(true)
      try {
        await axios.delete(`/api/pengeluaran/${deleteTargetPengeluaran.id}`, { data: { alasan } })
        toast.success('Pengeluaran berhasil dihapus')
        setDeleteTargetPengeluaran(null)
        mutatePengeluaran()
      } catch (err) {
        if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal menghapus')
      } finally {
        setIsDeletingPengeluaran(false)
      }
    },
    [deleteTargetPengeluaran, mutatePengeluaran]
  )

  const handleRestorePengeluaran = useCallback(
    async (id: number) => {
      try {
        await axios.patch(`/api/pengeluaran/${id}`)
        toast.success('Pengeluaran dipulihkan')
        mutatePengeluaran()
      } catch {
        toast.error('Gagal memulihkan')
      }
    },
    [mutatePengeluaran]
  )

  // --- Rekening Handlers ---
  const handleDeleteRekening = useCallback(async () => {
    if (!deleteTargetRekening) return
    setIsDeletingRekening(true)
    try {
      await axios.delete(`/api/rekening/${deleteTargetRekening.id}`)
      toast.success('Rekening berhasil dihapus')
      setDeleteTargetRekening(null)
      mutateRekening()
    } catch (err) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal menghapus')
    } finally {
      setIsDeletingRekening(false)
    }
  }, [deleteTargetRekening, mutateRekening])

  // =========================================================================
  // COLUMNS DEFINITIONS
  // =========================================================================

  // Donasi Columns
  const donasiColumns: ColumnDef<Donasi>[] = [
    {
      key: 'nominal',
      header: 'Nominal',
      className: 'text-right',
      render: (r) => <span className="text-emerald-700 font-semibold">{formatRupiah(r.nominal)}</span>,
    },
    {
      key: 'metode',
      header: 'Metode',
      render: (r) => (
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
          {r.metodePembayaran === 'TRANSFER_BANK'
            ? 'Transfer'
            : r.metodePembayaran === 'TUNAI'
            ? 'Tunai'
            : r.metodePembayaran === 'MIDTRANS'
            ? 'Online'
            : 'QRIS'}
        </span>
      ),
    },
    { key: 'tanggal', header: 'Tanggal', render: (r) => formatTanggal(r.tanggal) },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    ...(isJemaah
      ? []
      : [
          {
            key: 'donatur',
            header: 'Donatur',
            render: (r: Donasi) => (
              <div>
                <p className="font-medium text-gray-900">{r.namaDonatur}</p>
                {r.jemaah && <p className="text-xs text-gray-500">jemaah: {r.jemaah.nama}</p>}
              </div>
            ),
          },
          {
            key: 'agama',
            header: 'Agama',
            render: (r: Donasi) => <span className="text-gray-600 text-sm">{r.religion?.nama ?? '—'}</span>,
          },
          {
            key: 'tempatIbadah',
            header: 'Tempat Ibadah',
            render: (r: Donasi) => (
              <div className="text-sm">
                <div className="text-gray-700">{r.tempatIbadah?.nama ?? '—'}</div>
                {r.tempatIbadah?.slug && (
                  <div className="text-[11px] text-gray-400 font-mono">{r.tempatIbadah.slug}</div>
                )}
              </div>
            ),
          },
        ]),
    {
      key: 'actions',
      header: 'Aksi',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {canManageDonasi && r.status === 'PENDING' && (
            <>
              <button
                onClick={() => setConfirmTargetDonasi(r)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white"
                title="Konfirmasi"
              >
                <Check size={11} /> OK
              </button>
              <button
                onClick={() => setRejectTargetDonasi(r)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white"
                title="Tolak"
              >
                <X size={11} /> Tolak
              </button>
            </>
          )}
          {canManageDonasi && (
            <>
              <Link
                href={`/donasi/${r.id}/edit`}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white"
              >
                <Pencil size={11} /> Edit
              </Link>
              <button
                onClick={() => setDeleteTargetDonasi(r)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white"
              >
                <Trash2 size={11} /> Hapus
              </button>
            </>
          )}
          {!canManageDonasi && (
            <>
              {r.metodePembayaran === 'MIDTRANS' && r.status === 'PENDING' && (
                <button
                  onClick={() => handleBayarDonasi(r.id)}
                  disabled={payingDonasiId === r.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-60"
                >
                  <CreditCard size={11} />
                  {payingDonasiId === r.id ? 'Memuat...' : 'Bayar'}
                </button>
              )}
              {r.buktiPembayaran && (
                <a
                  href={r.buktiPembayaran}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline ml-2"
                >
                  Bukti
                </a>
              )}
            </>
          )}
        </div>
      ),
    },
  ]

  // Pemasukan Columns
  const pemasukanColumns: ColumnDef<Pemasukan>[] = [
    {
      key: 'keterangan',
      header: 'Keterangan',
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.keterangan}</p>
          <p className="text-xs text-gray-500">oleh {r.user?.nama ?? '-'}</p>
        </div>
      ),
    },
    {
      key: 'kategori',
      header: 'Kategori',
      render: (r) => (
        <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700">{r.kategori}</span>
      ),
    },
    {
      key: 'rekening',
      header: 'Rekening',
      render: (r) => (
        <span className="text-xs text-gray-600 font-medium">
          {r.rekening ? `${r.rekening.namaBank} - ${r.rekening.nomorRekening}` : 'Kas Tunai'}
        </span>
      ),
    },
    {
      key: 'tanggal',
      header: 'Tanggal',
      render: (r) => formatTanggal(r.tanggal),
    },
    {
      key: 'nominal',
      header: 'Nominal',
      className: 'text-right',
      render: (r) => <span className="text-emerald-600 font-semibold">{formatRupiah(r.nominal)}</span>,
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (r) =>
        canManageKas ? (
          <div className="flex items-center gap-2">
            {r.deletedAt ? (
              <button
                onClick={() => handleRestorePemasukan(r.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-light text-primary rounded-lg hover:bg-primary hover:text-white"
              >
                <RotateCcw size={12} /> Pulihkan
              </button>
            ) : (
              <>
                <Link
                  href={`/kas/pemasukan/${r.id}/edit`}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white"
                >
                  <Pencil size={12} /> Edit
                </Link>
                <button
                  onClick={() => setDeleteTargetPemasukan(r)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white"
                >
                  <Trash2 size={12} /> Hapus
                </button>
              </>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
  ]

  // Pengeluaran Columns
  const pengeluaranColumns: ColumnDef<Pengeluaran>[] = [
    {
      key: 'keterangan',
      header: 'Keterangan',
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.keterangan}</p>
          <p className="text-xs text-gray-500">oleh {r.user?.nama ?? '-'}</p>
        </div>
      ),
    },
    {
      key: 'kategori',
      header: 'Kategori',
      render: (r) => (
        <span className="px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700">{r.kategori}</span>
      ),
    },
    {
      key: 'rekening',
      header: 'Rekening',
      render: (r) => (
        <span className="text-xs text-gray-600 font-medium">
          {r.rekening ? `${r.rekening.namaBank} - ${r.rekening.nomorRekening}` : 'Kas Tunai'}
        </span>
      ),
    },
    {
      key: 'tanggal',
      header: 'Tanggal',
      render: (r) => formatTanggal(r.tanggal),
    },
    {
      key: 'nominal',
      header: 'Nominal',
      className: 'text-right',
      render: (r) => <span className="text-red-600 font-semibold">{formatRupiah(r.nominal)}</span>,
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (r) =>
        canManageKas ? (
          <div className="flex items-center gap-2">
            {r.deletedAt ? (
              <button
                onClick={() => handleRestorePengeluaran(r.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-light text-primary rounded-lg hover:bg-primary hover:text-white"
              >
                <RotateCcw size={12} /> Pulihkan
              </button>
            ) : (
              <>
                <Link
                  href={`/kas/pengeluaran/${r.id}/edit`}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white"
                >
                  <Pencil size={12} /> Edit
                </Link>
                <button
                  onClick={() => setDeleteTargetPengeluaran(r)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white"
                >
                  <Trash2 size={12} /> Hapus
                </button>
              </>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
  ]

  // Balance Columns
  const balanceColumns: ColumnDef<BalanceAccount>[] = [
    {
      key: 'rekening',
      header: 'Nama Rekening / Bank',
      render: (r) => (
        <div>
          <p className="font-semibold text-gray-900">{r.namaBank}</p>
          <p className="text-xs text-gray-500 font-mono">{r.nomorRekening}</p>
        </div>
      ),
    },
    {
      key: 'pemilik',
      header: 'Pemilik / Penanggung Jawab',
      render: (r) => <span className="text-sm text-gray-700">{r.namaPemilik}</span>,
    },
    {
      key: 'totalDonasi',
      header: 'Donasi Masuk (Dikonfirmasi)',
      className: 'text-right text-sm text-gray-600',
      render: (r) => formatRupiah(r.totalDonasi),
    },
    {
      key: 'totalMasuk',
      header: 'Pemasukan Manual',
      className: 'text-right text-sm text-emerald-600',
      render: (r) => formatRupiah(r.totalMasuk),
    },
    {
      key: 'totalKeluar',
      header: 'Total Pengeluaran',
      className: 'text-right text-sm text-red-600',
      render: (r) => formatRupiah(r.totalKeluar),
    },
    {
      key: 'saldo',
      header: 'Sisa Saldo',
      className: 'text-right font-bold',
      render: (r) => (
        <span className={r.saldo >= 0 ? 'text-emerald-700' : 'text-red-700'}>{formatRupiah(r.saldo)}</span>
      ),
    },
  ]

  // Rekening Columns
  const rekeningColumns: ColumnDef<Rekening>[] = [
    {
      key: 'rekening',
      header: 'Rekening',
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.namaBank}</p>
          <p className="text-xs text-gray-500 font-mono">{r.nomorRekening}</p>
        </div>
      ),
    },
    {
      key: 'pemilik',
      header: 'Atas Nama',
      render: (r) => <span className="text-gray-700">{r.namaPemilik}</span>,
    },
    {
      key: 'religion',
      header: 'Agama',
      render: (r) => <span className="text-gray-600">{r.religion?.nama ?? '—'}</span>,
    },
    {
      key: 'tempatIbadah',
      header: 'Tempat Ibadah',
      render: (r) => (
        <div className="text-sm">
          <div className="text-gray-700">{r.tempatIbadah?.nama ?? '—'}</div>
          {r.tempatIbadah?.slug && <div className="text-[11px] text-gray-400 font-mono">{r.tempatIbadah.slug}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (r) =>
        canManageRekening ? (
          <div className="flex items-center gap-2">
            <Link
              href={`/rekening/${r.id}/edit`}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white"
            >
              <Pencil size={12} /> Edit
            </Link>
            <button
              onClick={() => setDeleteTargetRekening(r)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white"
            >
              <Trash2 size={12} /> Hapus
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
  ]

  // =========================================================================
  // VIEW RENDERING
  // =========================================================================

  return (
    <div>
      {/* Header section */}
      <PageHeader
        title={isJemaah ? 'Donasi Saya' : 'Keuangan'}
        subtitle={isJemaah ? 'Riwayat donasi yang Anda berikan' : 'Kelola keuangan, donasi, kas, dan rekening bank'}
        action={
          activeTab === 'donasi' ? (
            <div className="flex items-center gap-2">
              {!isJemaah && canManageDonasi && (
                <button
                  onClick={exportPDFDonasi}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <Download size={16} /> Export PDF
                </button>
              )}
              {/* Only show "Catat Donasi" or "Tambah Donasi" button here for Admins. 
                  For Jemaah, they have a dedicated button in the banner. */}
              {!isJemaah && (
                <Link
                  href="/donasi/baru"
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm"
                >
                  <Plus size={16} /> Catat Donasi
                </Link>
              )}
            </div>
          ) : activeTab === 'kas' ? (
            canManageKas ? (
              <div className="flex gap-2">
                <Link
                  href="/kas/pengeluaran/baru"
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors shadow-sm"
                >
                  <Plus size={16} /> Catat Pengeluaran
                </Link>
                <Link
                  href="/kas/pemasukan/baru"
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Plus size={16} /> Catat Pemasukan
                </Link>
              </div>
            ) : undefined
          ) : activeTab === 'rekening' ? (
            canManageRekening ? (
              <Link
                href="/rekening/baru"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm"
              >
                <Plus size={16} /> Tambah Rekening
              </Link>
            ) : undefined
          ) : undefined
        }
      />

      {/* Tabs Selector Header (Only if user has more than 1 tab allowed) */}
      {allowedTabs.length > 1 && (
        <div className="flex border-b border-gray-200 mb-6 bg-white p-1 rounded-lg border">
          {allowedTabs.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className={`flex-1 py-3 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
                  activeTab === t.id
                    ? 'bg-primary-light text-primary-dark shadow-sm font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            )
          })}
        </div>
      )}

      {/* =====================================================================
          TAB CONTENT: DONASI
          ===================================================================== */}
      {activeTab === 'donasi' && (
        <div>
          {/* Banner / Program Donasi for Jemaah */}
          {isJemaah && (
            <div className="bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl p-5 mb-4 shadow-lg">
              <h2 className="text-xl font-bold mb-2">Ayo Berdonasi untuk Kebaikan!</h2>
              <p className="text-sm opacity-90 font-medium">Dukung program-program ibadah dan sosial di komunitas Anda.</p>
              <Link
                href="/donasi/baru"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md shadow-sm text-primary bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors"
              >
                Mulai Donasi Sekarang
              </Link>
            </div>
          )}

          {/* Stat ringkas */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <HandCoins size={22} className="text-emerald-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500">
                {isJemaah ? 'Total donasi terkonfirmasi Anda' : 'Total donasi terkonfirmasi'}
              </p>
              <p className="text-2xl font-bold text-emerald-700">{formatRupiah(totalDikonfirmasiDonasi)}</p>
            </div>
            {isJemaah && (
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-500">Target Donasi Masjid</p>
                <p className="text-lg font-bold text-primary">Rp 50.000.000</p>
                <div className="w-32 bg-gray-200 rounded-full h-2.5 mt-1">
                  <div className="bg-primary h-2.5 rounded-full" style={{ width: '70%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1 font-semibold">70% Tercapai</p>
              </div>
            )}
          </div>

          {/* Filters for Admin */}
          {!isJemaah && (
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <SearchFilter
                  value={searchDonasi}
                  onChange={(v) => {
                    setSearchDonasi(v)
                    setPageDonasi(1)
                  }}
                  placeholder="Cari nama donatur atau catatan..."
                >
                  <button
                    onClick={() => setShowFiltersDonasi(!showFiltersDonasi)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                      showFiltersDonasi
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Filter size={16} /> Filter Lanjutan
                  </button>
                </SearchFilter>
              </div>

              {showFiltersDonasi && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                    <select
                      value={statusDonasi}
                      onChange={(e) => {
                        setStatusDonasi(e.target.value)
                        setPageDonasi(1)
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    >
                      {statusDonasiOptions.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Metode Pembayaran</label>
                    <select
                      value={metodePembayaranDonasi}
                      onChange={(e) => {
                        setMetodePembayaranDonasi(e.target.value)
                        setPageDonasi(1)
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    >
                      {metodeDonasiOptions.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Dari Tanggal</label>
                    <input
                      type="date"
                      value={startDateDonasi}
                      onChange={(e) => {
                        setStartDateDonasi(e.target.value)
                        setPageDonasi(1)
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={endDateDonasi}
                      onChange={(e) => {
                        setEndDateDonasi(e.target.value)
                        setPageDonasi(1)
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    />
                  </div>

                  {isSuperAdmin && (
                    <div className="sm:col-span-2 lg:col-span-4 mt-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Filter Global (Agama / Tempat Ibadah)
                      </label>
                      <ScopeFilter
                        religionId={filterReligionIdDonasi}
                        tempatIbadahId={filterTempatIbadahIdDonasi}
                        onChange={({ religionId, tempatIbadahId }) => {
                          setFilterReligionIdDonasi(religionId)
                          setFilterTempatIbadahIdDonasi(tempatIbadahId)
                          setPageDonasi(1)
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Jemaah Specific History List (Beautified Cards) */}
          {isJemaah ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {donasiData.length === 0 && !isDonasiLoading ? (
                <div className="md:col-span-2">
                  <EmptyState title="Belum ada donasi" description="Klik Mulai Donasi Sekarang untuk berdonasi." />
                </div>
              ) : (
                donasiData.map((d) => (
                  <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CreditCard size={18} className="text-gray-500" />
                        <p className="font-medium text-gray-800">
                          Donasi{' '}
                          {d.metodePembayaran === 'TRANSFER_BANK'
                            ? 'Transfer'
                            : d.metodePembayaran === 'TUNAI'
                            ? 'Tunai'
                            : d.metodePembayaran === 'MIDTRANS'
                            ? 'Online'
                            : 'QRIS'}
                        </p>
                      </div>
                      <StatusBadge status={d.status} />
                    </div>
                    <p className="text-2xl font-bold text-emerald-700 mb-1">{formatRupiah(d.nominal)}</p>
                    <p className="text-sm text-gray-500">Tanggal: {formatTanggal(d.tanggal)}</p>
                    {d.catatan && <p className="text-sm text-gray-500 mt-1">Catatan: {d.catatan}</p>}
                    <div className="flex justify-end mt-4">
                      {d.metodePembayaran === 'MIDTRANS' && d.status === 'PENDING' && (
                        <button
                          onClick={() => handleBayarDonasi(d.id)}
                          disabled={payingDonasiId === d.id}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-60 transition-colors font-medium"
                        >
                          <CreditCard size={12} />
                          {payingDonasiId === d.id ? 'Memuat...' : 'Bayar'}
                        </button>
                      )}
                      {d.buktiPembayaran && (
                        <a
                          href={d.buktiPembayaran}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline font-medium hover:text-primary-dark"
                        >
                          Lihat Bukti Pembayaran
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Admin/Pengurus Donasi Table */
            <DataTable
              data={donasiData}
              columns={donasiColumns}
              total={donasiTotal}
              page={pageDonasi}
              limit={limitDonasi}
              onPageChange={setPageDonasi}
              onLimitChange={(l) => {
                setLimitDonasi(l)
                setPageDonasi(1)
              }}
              isLoading={isDonasiLoading}
              emptyTitle="Belum ada donasi"
              emptyDescription="Belum ada donasi yang tercatat."
            />
          )}

          {/* Confirmations & Actions Dialogs for Donasi */}
          <ConfirmDialog
            open={!!deleteTargetDonasi}
            onOpenChange={(open) => !open && setDeleteTargetDonasi(null)}
            onConfirm={() => handleDeleteDonasi('')}
            title={`Hapus Donasi dari "${deleteTargetDonasi?.namaDonatur}"`}
            isLoading={isDeletingDonasi}
          />

          <ConfirmActionDialog
            open={!!confirmTargetDonasi}
            onOpenChange={(open) => !open && setConfirmTargetDonasi(null)}
            onConfirm={handleConfirmDonasi}
            title="Konfirmasi Donasi?"
            description={
              confirmTargetDonasi
                ? `Donasi ${formatRupiah(confirmTargetDonasi.nominal)} dari ${
                    confirmTargetDonasi.namaDonatur
                  }.\n\nDonasi yang dikonfirmasi akan dihitung di laporan keuangan.`
                : ''
            }
            variant="success"
            confirmLabel="Konfirmasi"
            isLoading={isProcessingDonasi}
          />

          <ConfirmActionDialog
            open={!!rejectTargetDonasi}
            onOpenChange={(open) => !open && setRejectTargetDonasi(null)}
            onConfirm={handleRejectDonasi}
            title="Tolak Donasi?"
            description={
              rejectTargetDonasi ? `Donasi dari ${rejectTargetDonasi.namaDonatur} akan ditandai DITOLAK.` : ''
            }
            variant="danger"
            confirmLabel="Tolak Donasi"
            requireReason
            reasonLabel="Alasan menolak"
            reasonPlaceholder="Contoh: bukti tidak valid, nominal tidak sesuai..."
            isLoading={isProcessingDonasi}
          />
        </div>
      )}

      {/* =====================================================================
          TAB CONTENT: ARUS KAS (PENGELUARAN & PEMASUKAN)
          ===================================================================== */}
      {activeTab === 'kas' && (
        <div>
          {/* Scope Filter for Super Admin */}
          {isSuperAdmin && (
            <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-0.5 uppercase tracking-wider">Filter Tempat Ibadah</p>
                <p className="text-xs text-gray-400">Filter data arus kas berdasarkan agama dan tempat ibadah</p>
              </div>
              <ScopeFilter
                religionId={filterReligionIdKas}
                tempatIbadahId={filterTempatIbadahIdKas}
                onChange={({ religionId, tempatIbadahId }) => {
                  setFilterReligionIdKas(religionId)
                  setFilterTempatIbadahIdKas(tempatIbadahId)
                  setPagePemasukan(1)
                  setPagePengeluaran(1)
                }}
              />
            </div>
          )}

          {/* Sub-tabs under Kas */}
          <div className="flex border-b border-gray-200 mb-6 bg-white p-1 rounded-lg border">
            <button
              onClick={() => setKasTab('pengeluaran')}
              className={`flex-1 py-3 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
                kasTab === 'pengeluaran'
                  ? 'bg-amber-50 text-amber-800 shadow-sm border border-amber-100 font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <TrendingDown size={16} />
              Pengeluaran Kas
            </button>
            <button
              onClick={() => setKasTab('pemasukan')}
              className={`flex-1 py-3 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
                kasTab === 'pemasukan'
                  ? 'bg-emerald-50 text-emerald-800 shadow-sm border border-emerald-100 font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <HandCoins size={16} />
              Pemasukan Kas
            </button>
            <button
              onClick={() => setKasTab('balance')}
              className={`flex-1 py-3 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
                kasTab === 'balance'
                  ? 'bg-blue-50 text-blue-800 shadow-sm border border-blue-100 font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <CreditCard size={16} />
              Balance Rekening
            </button>
          </div>

          {/* Sub-tab: Pemasukan */}
          {kasTab === 'pemasukan' && (
            <div>
              <SearchFilter
                value={searchPemasukan}
                onChange={(v) => {
                  setSearchPemasukan(v)
                  setPagePemasukan(1)
                }}
                placeholder="Cari keterangan pemasukan..."
              >
                <select
                  value={kategoriPemasukan}
                  onChange={(e) => {
                    setKategoriPemasukan(e.target.value)
                    setPagePemasukan(1)
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                  {kategoriPemasukanOptions.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setShowArsipPemasukan(!showArsipPemasukan)
                    setPagePemasukan(1)
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                    showArsipPemasukan
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Archive size={15} />
                  {showArsipPemasukan ? 'Arsip Aktif' : 'Tampilkan Arsip'}
                </button>
              </SearchFilter>

              <DataTable
                data={pemasukanData}
                columns={pemasukanColumns}
                total={pemasukanTotal}
                page={pagePemasukan}
                limit={limitPemasukan}
                onPageChange={setPagePemasukan}
                onLimitChange={(l) => {
                  setLimitPemasukan(l)
                  setPagePemasukan(1)
                }}
                isLoading={isPemasukanLoading}
                emptyTitle={showArsipPemasukan ? 'Tidak ada arsip' : 'Belum ada pemasukan'}
                emptyDescription={canManageKas ? 'Klik Catat Pemasukan untuk mencatat.' : ''}
              />

              <ConfirmDialog
                open={!!deleteTargetPemasukan}
                onOpenChange={(open) => !open && setDeleteTargetPemasukan(null)}
                onConfirm={() => handleDeletePemasukan('')}
                title={`Hapus Pemasukan "${deleteTargetPemasukan?.keterangan}"`}
                isLoading={isDeletingPemasukan}
              />
            </div>
          )}

          {/* Sub-tab: Pengeluaran */}
          {kasTab === 'pengeluaran' && (
            <div>
              <SearchFilter
                value={searchPengeluaran}
                onChange={(v) => {
                  setSearchPengeluaran(v)
                  setPagePengeluaran(1)
                }}
                placeholder="Cari keterangan pengeluaran..."
              >
                <select
                  value={kategoriPengeluaran}
                  onChange={(e) => {
                    setKategoriPengeluaran(e.target.value)
                    setPagePengeluaran(1)
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                  {kategoriPengeluaranOptions.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setShowArsipPengeluaran(!showArsipPengeluaran)
                    setPagePengeluaran(1)
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                    showArsipPengeluaran
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Archive size={15} />
                  {showArsipPengeluaran ? 'Arsip Aktif' : 'Tampilkan Arsip'}
                </button>
              </SearchFilter>

              <DataTable
                data={pengeluaranData}
                columns={pengeluaranColumns}
                total={pengeluaranTotal}
                page={pagePengeluaran}
                limit={limitPengeluaran}
                onPageChange={setPagePengeluaran}
                onLimitChange={(l) => {
                  setLimitPengeluaran(l)
                  setPagePengeluaran(1)
                }}
                isLoading={isPengeluaranLoading}
                emptyTitle={showArsipPengeluaran ? 'Tidak ada arsip' : 'Belum ada pengeluaran'}
                emptyDescription={canManageKas ? 'Klik Catat Pengeluaran untuk mencatat.' : ''}
              />

              <ConfirmDialog
                open={!!deleteTargetPengeluaran}
                onOpenChange={(open) => !open && setDeleteTargetPengeluaran(null)}
                onConfirm={() => handleDeletePengeluaran('')}
                title={`Hapus Pengeluaran "${deleteTargetPengeluaran?.keterangan}"`}
                isLoading={isDeletingPengeluaran}
              />
            </div>
          )}

          {/* Sub-tab: Balance */}
          {kasTab === 'balance' && (
            <div>
              {isSuperAdmin && !filterTempatIbadahIdKas ? (
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
                  columns={balanceColumns}
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
      )}

      {/* =====================================================================
          TAB CONTENT: REKENING
          ===================================================================== */}
      {activeTab === 'rekening' && (
        <div>
          <SearchFilter
            value={searchRekening}
            onChange={(v) => {
              setSearchRekening(v)
              setPageRekening(1)
            }}
            placeholder="Cari bank, nomor, atau atas nama..."
          >
            {isSuperAdmin && (
              <ScopeFilter
                religionId={filterReligionIdRekening}
                tempatIbadahId={filterTempatIbadahIdRekening}
                onChange={({ religionId, tempatIbadahId }) => {
                  setFilterReligionIdRekening(religionId)
                  setFilterTempatIbadahIdRekening(tempatIbadahId)
                  setPageRekening(1)
                }}
              />
            )}
          </SearchFilter>

          <DataTable
            data={rekeningData}
            columns={rekeningColumns}
            total={rekeningTotal}
            page={pageRekening}
            limit={limitRekening}
            onPageChange={setPageRekening}
            onLimitChange={(l) => {
              setLimitRekening(l)
              setPageRekening(1)
            }}
            isLoading={isRekeningLoading}
            emptyTitle="Belum ada rekening"
            emptyDescription={
              canManageRekening ? 'Klik Tambah Rekening untuk menambahkan.' : 'Belum ada rekening yang terdaftar.'
            }
          />

          <ConfirmActionDialog
            open={!!deleteTargetRekening}
            onOpenChange={(open) => !open && setDeleteTargetRekening(null)}
            onConfirm={handleDeleteRekening}
            title={`Hapus rekening ${deleteTargetRekening?.namaBank}?`}
            description={
              deleteTargetRekening
                ? `${deleteTargetRekening.namaBank} ${deleteTargetRekening.nomorRekening} a/n ${
                    deleteTargetRekening.namaPemilik
                  }.\n\nAksi ini permanen dan tidak bisa dibatalkan.`
                : ''
            }
            variant="danger"
            confirmLabel="Hapus Permanen"
            isLoading={isDeletingRekening}
          />
        </div>
      )}
    </div>
  )
}

export default function KeuanganPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading keuangan...</div>}>
      <KeuanganPageContent />
    </Suspense>
  )
}