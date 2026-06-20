import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import { Globe, UserCheck, Users, Calendar, Clock, Receipt, HandCoins, ArrowRight, Wallet, Megaphone } from 'lucide-react'
import Link from 'next/link'
import { PerbandinganAgamaChart, type PerbandinganAgamaDatum } from '@/components/dashboard/PerbandinganAgamaChart'
import { TrendKeuanganChart, type TrendKeuanganDatum } from '@/components/dashboard/TrendKeuanganChart'
import { TrendPertumbuhanChart, type TrendPertumbuhanDatum } from '@/components/dashboard/TrendPertumbuhanChart'
import { TrendDonasiChart, type TrendDonasiDatum } from '@/components/dashboard/TrendDonasiChart'
import { formatRupiah, formatTanggal } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard' }

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: string
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 truncate">{title}</p>
        <p className="text-xl sm:text-2xl font-bold text-gray-900">{typeof value === 'number' ? value.toLocaleString('id-ID') : value}</p>
      </div>
    </div>
  )
}

function getMonthsList(months: number = 6) {
  const map = new Map<string, any>()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const monthStr = d.toLocaleString('id-ID', { month: 'short', year: 'numeric' })
    map.set(monthStr, {})
  }
  return map
}

async function getPerAgamaStats() {
  const religions = await prisma.religion.findMany({ where: { deletedAt: null }, orderBy: { nama: 'asc' }, select: { id: true, nama: true } })
  return Promise.all(
    religions.map(async (r) => {
      const [pengurus, jemaah, kegiatanAktif, kegiatanTotal] = await Promise.all([
        prisma.user.count({ where: { role: 'PENGURUS', religionId: r.id, deletedAt: null } }),
        prisma.user.count({ where: { role: 'JEMAAH', religionId: r.id, deletedAt: null } }),
        prisma.kegiatan.count({ where: { religionId: r.id, deletedAt: null, status: { in: ['UPCOMING', 'ONGOING'] } } }),
        prisma.kegiatan.count({ where: { religionId: r.id, deletedAt: null } }),
      ])
      return { id: r.id, nama: r.nama, pengurus, jemaah, kegiatanAktif, kegiatanTotal }
    })
  )
}

async function getTrendKeuangan(tempatIbadahId?: number): Promise<TrendKeuanganDatum[]> {
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); sixMonthsAgo.setDate(1); sixMonthsAgo.setHours(0, 0, 0, 0)
  const whereCondition = { tanggal: { gte: sixMonthsAgo }, deletedAt: null, ...(tempatIbadahId ? { tempatIbadahId } : {}) }

  const [pemasukanList, pengeluaranList] = await Promise.all([
    prisma.pemasukan.findMany({ where: whereCondition, select: { tanggal: true, nominal: true } }),
    prisma.pengeluaran.findMany({ where: whereCondition, select: { tanggal: true, nominal: true } })
  ])

  const map = getMonthsList()
  for (const [k] of map) map.set(k, { p: 0, e: 0 })

  pemasukanList.forEach(item => {
    const monthStr = item.tanggal.toLocaleString('id-ID', { month: 'short', year: 'numeric' })
    if (map.has(monthStr)) map.get(monthStr)!.p += Number(item.nominal)
  })
  pengeluaranList.forEach(item => {
    const monthStr = item.tanggal.toLocaleString('id-ID', { month: 'short', year: 'numeric' })
    if (map.has(monthStr)) map.get(monthStr)!.e += Number(item.nominal)
  })

  return Array.from(map.entries()).map(([bulan, vals]) => ({ bulan, pemasukan: vals.p, pengeluaran: vals.e }))
}

async function getTrendPertumbuhan(isSuperAdmin: boolean, tempatIbadahId?: number): Promise<TrendPertumbuhanDatum[]> {
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); sixMonthsAgo.setDate(1); sixMonthsAgo.setHours(0, 0, 0, 0)
  const [jemaahList, pengurusList, kegiatanList, pengumumanList] = await Promise.all([
    prisma.user.findMany({ where: { role: 'JEMAAH', createdAt: { gte: sixMonthsAgo }, deletedAt: null, ...(tempatIbadahId ? { tempatIbadahId } : {}) }, select: { createdAt: true } }),
    isSuperAdmin ? prisma.user.findMany({ where: { role: 'PENGURUS', createdAt: { gte: sixMonthsAgo }, deletedAt: null }, select: { createdAt: true } }) : [],
    prisma.kegiatan.findMany({ where: { createdAt: { gte: sixMonthsAgo }, deletedAt: null, ...(tempatIbadahId ? { tempatIbadahId } : {}) }, select: { createdAt: true } }),
    prisma.pengumuman.findMany({ where: { createdAt: { gte: sixMonthsAgo }, deletedAt: null, ...(tempatIbadahId ? { tempatIbadahId } : {}) }, select: { createdAt: true } })
  ])

  const map = getMonthsList()
  for (const [k] of map) map.set(k, { j: 0, p: 0, k: 0, a: 0 })

  jemaahList.forEach(i => { const m = i.createdAt.toLocaleString('id-ID', { month: 'short', year: 'numeric' }); if (map.has(m)) map.get(m)!.j++ })
  pengurusList.forEach(i => { const m = i.createdAt.toLocaleString('id-ID', { month: 'short', year: 'numeric' }); if (map.has(m)) map.get(m)!.p++ })
  kegiatanList.forEach(i => { const m = i.createdAt.toLocaleString('id-ID', { month: 'short', year: 'numeric' }); if (map.has(m)) map.get(m)!.k++ })
  pengumumanList.forEach(i => { const m = i.createdAt.toLocaleString('id-ID', { month: 'short', year: 'numeric' }); if (map.has(m)) map.get(m)!.a++ })

  return Array.from(map.entries()).map(([bulan, v]) => ({
    bulan, jemaah: v.j, pengurus: isSuperAdmin ? v.p : undefined, kegiatan: v.k, pengumuman: v.a
  }))
}

async function getTrendDonasi(tempatIbadahId?: number): Promise<TrendDonasiDatum[]> {
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); sixMonthsAgo.setDate(1); sixMonthsAgo.setHours(0, 0, 0, 0)
  const donasiList = await prisma.donasi.findMany({
    where: { status: 'DIKONFIRMASI', tanggal: { gte: sixMonthsAgo }, ...(tempatIbadahId ? { tempatIbadahId } : {}) },
    select: { tanggal: true, nominal: true }
  })

  const map = getMonthsList()
  for (const [k] of map) map.set(k, { d: 0 })

  donasiList.forEach(i => {
    const m = i.tanggal.toLocaleString('id-ID', { month: 'short', year: 'numeric' })
    if (map.has(m)) map.get(m)!.d += Number(i.nominal)
  })

  return Array.from(map.entries()).map(([bulan, v]) => ({ bulan, donasi: v.d }))
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) return null

  const role = session.user.role
  const isSuperAdmin = role === 'SUPERADMIN'
  const isPengurus = role === 'PENGURUS'
  const isJemaah = role === 'JEMAAH'
  const religionId = !isSuperAdmin ? session.user.religionId ?? undefined : undefined
  const tempatIbadahId = !isSuperAdmin ? session.user.tempatIbadahId ?? undefined : undefined
  const userId = Number(session.user.id)

  // Global & Shared
  let totalAgama = 0, totalTempatIbadah = 0
  let perAgamaStats: any[] = [], trendKeuangan: TrendKeuanganDatum[] = [], trendPertumbuhan: TrendPertumbuhanDatum[] = [], trendDonasi: TrendDonasiDatum[] = []
  let upcomingJadwalList: any[] = [], upcomingKegiatanList: any[] = [], pengumumanList: any[] = [], riwayatDonasi: any[] = []

  let totalPengurus = 0, totalJemaah = 0, totalKegiatan = 0, totalJadwal = 0
  let saldoKas = 0, totalDonasiAll = 0, tagihanPendingAll = 0

  if (isSuperAdmin || isPengurus) {
    if (isSuperAdmin) {
      totalAgama = await prisma.religion.count({ where: { deletedAt: null } })
      totalTempatIbadah = await prisma.tempatIbadah.count({ where: { deletedAt: null } })
      perAgamaStats = await getPerAgamaStats()
    }

    totalPengurus = await prisma.user.count({ where: { role: 'PENGURUS', deletedAt: null, ...(religionId ? { religionId } : {}) } })
    totalJemaah = await prisma.user.count({ where: { role: 'JEMAAH', deletedAt: null, ...(religionId ? { religionId } : {}) } })
    totalKegiatan = await prisma.kegiatan.count({ where: { deletedAt: null, status: { in: ['UPCOMING', 'ONGOING'] }, ...(religionId ? { religionId } : {}) } })
    totalJadwal = await prisma.jadwalIbadah.count({ where: { deletedAt: null, tanggal: { gte: new Date() }, ...(tempatIbadahId ? { tempatIbadahId } : {}) } })
    
    const [pemasukanAgg, pengeluaranAgg, donasiAgg, tagihanCount] = await Promise.all([
      prisma.pemasukan.aggregate({ where: { deletedAt: null, ...(tempatIbadahId ? { tempatIbadahId } : {}) }, _sum: { nominal: true } }),
      prisma.pengeluaran.aggregate({ where: { deletedAt: null, ...(tempatIbadahId ? { tempatIbadahId } : {}) }, _sum: { nominal: true } }),
      prisma.donasi.aggregate({ where: { status: 'DIKONFIRMASI', ...(tempatIbadahId ? { tempatIbadahId } : {}) }, _sum: { nominal: true } }),
      prisma.tagihanKas.count({ where: { status: 'BELUM_DIBAYAR', ...(tempatIbadahId ? { tempatIbadahId } : {}) } })
    ])
    
    saldoKas = Number(pemasukanAgg._sum.nominal ?? 0) - Number(pengeluaranAgg._sum.nominal ?? 0)
    totalDonasiAll = Number(donasiAgg._sum.nominal ?? 0)
    tagihanPendingAll = tagihanCount

    trendKeuangan = await getTrendKeuangan(tempatIbadahId)
    trendPertumbuhan = await getTrendPertumbuhan(isSuperAdmin, tempatIbadahId)
    trendDonasi = await getTrendDonasi(tempatIbadahId)

    if (isPengurus) {
      upcomingJadwalList = await prisma.jadwalIbadah.findMany({ where: { tempatIbadahId, tanggal: { gte: new Date() }, deletedAt: null }, orderBy: [{ tanggal: 'asc' }, { waktuMulai: 'asc' }], take: 4 })
      upcomingKegiatanList = await prisma.kegiatan.findMany({ where: { tempatIbadahId, status: 'UPCOMING', deletedAt: null }, orderBy: { tanggal: 'asc' }, take: 4 })
    }
  }

  let totalDonasiSaya = 0, tagihanBelumDibayar = 0, kegiatanDiikuti = 0
  let saldoKasTempatIbadah = 0, donasiTempatIbadah = 0
  if (isJemaah) {
    tagihanBelumDibayar = await prisma.tagihanKas.count({ where: { userId, status: 'BELUM_DIBAYAR' } })
    const [donasiAgg, pendaftaranCount, jPem, jPeng, jDonasiAll] = await Promise.all([
      prisma.donasi.aggregate({ where: { userId, status: 'DIKONFIRMASI' }, _sum: { nominal: true } }),
      prisma.kegiatanPendaftaran.count({ where: { userId, status: { in: ['TERDAFTAR', 'HADIR'] } } }),
      prisma.pemasukan.aggregate({ where: { deletedAt: null, tempatIbadahId }, _sum: { nominal: true } }),
      prisma.pengeluaran.aggregate({ where: { deletedAt: null, tempatIbadahId }, _sum: { nominal: true } }),
      prisma.donasi.aggregate({ where: { status: 'DIKONFIRMASI', tempatIbadahId }, _sum: { nominal: true } }),
    ])
    totalDonasiSaya = Number(donasiAgg._sum.nominal ?? 0)
    kegiatanDiikuti = pendaftaranCount
    saldoKasTempatIbadah = Number(jPem._sum.nominal ?? 0) - Number(jPeng._sum.nominal ?? 0)
    donasiTempatIbadah = Number(jDonasiAll._sum.nominal ?? 0)
    
    upcomingJadwalList = await prisma.jadwalIbadah.findMany({ where: { tempatIbadahId, tanggal: { gte: new Date() }, deletedAt: null }, orderBy: [{ tanggal: 'asc' }, { waktuMulai: 'asc' }], take: 3 })
    upcomingKegiatanList = await prisma.kegiatan.findMany({ where: { tempatIbadahId, status: 'UPCOMING', deletedAt: null }, orderBy: { tanggal: 'asc' }, take: 3 })
    pengumumanList = await prisma.pengumuman.findMany({ where: { tempatIbadahId, status: 'AKTIF', deletedAt: null }, orderBy: { tanggalPublish: 'desc' }, take: 3 })
    riwayatDonasi = await prisma.donasi.findMany({ where: { userId }, orderBy: { tanggal: 'desc' }, take: 4 })
  }

  const chartData: PerbandinganAgamaDatum[] = perAgamaStats.map((r) => ({ nama: r.nama, pengurus: r.pengurus, jemaah: r.jemaah, kegiatanAktif: r.kegiatanAktif }))

  return (
    <div>
      <div className="mb-6 sm:mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Selamat datang, {session.user.name}!</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {isSuperAdmin ? 'Anda login sebagai Superadmin' : isPengurus ? `Pengurus ${session.user.subRole} — ${session.user.tempatIbadahNama ?? session.user.religionName ?? ''}` : `Jemaah — ${session.user.tempatIbadahNama ?? session.user.religionName ?? ''}`}
          </p>
        </div>
        {isJemaah && (
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-500 uppercase font-semibold">Profil Pengguna</p>
            <p className="text-sm font-medium text-gray-900">{session.user.email}</p>
          </div>
        )}
      </div>

      {isJemaah && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Donasi Pribadi" value={formatRupiah(totalDonasiSaya)} icon={<HandCoins size={22} className="text-primary" />} color="bg-primary/20" />
            <StatCard title="Tagihan Kas Pending" value={tagihanBelumDibayar} icon={<Receipt size={22} className="text-status-dangerText" />} color="bg-status-danger/50" />
            <StatCard title="Kas Tempat Ibadah" value={formatRupiah(saldoKasTempatIbadah)} icon={<Wallet size={22} className="text-status-successText" />} color="bg-status-success/50" />
            <StatCard title="Total Donasi (Publik)" value={formatRupiah(donasiTempatIbadah)} icon={<HandCoins size={22} className="text-status-ongoingText" />} color="bg-status-ongoing/50" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold text-gray-900">Pengumuman Terbaru</h2>
                <Link href="/pengumuman" className="text-xs text-primary hover:underline flex items-center gap-1">Lihat <ArrowRight size={12}/></Link>
              </div>
              <div className="space-y-3">
                {pengumumanList.length === 0 ? (
                  <p className="text-sm text-gray-400">Belum ada pengumuman</p>
                ) : pengumumanList.map(p => (
                  <div key={p.id} className="border-l-4 border-primary pl-3 py-1">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{p.judul}</p>
                    <p className="text-xs text-gray-500">{formatTanggal(p.tanggalPublish)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold text-gray-900">Jadwal & Kegiatan Terbaru</h2>
                <Link href="/kegiatan" className="text-xs text-primary hover:underline flex items-center gap-1">Kalender <ArrowRight size={12}/></Link>
              </div>
              <div className="space-y-3">
                {upcomingJadwalList.map(j => (
                  <div key={j.id} className="flex justify-between p-2 hover:bg-gray-50 rounded-lg">
                    <div><p className="text-sm font-medium text-gray-900">{j.namaIbadah}</p><p className="text-xs text-gray-500">{formatTanggal(j.tanggal)}</p></div>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md h-fit">Ibadah</span>
                  </div>
                ))}
                {upcomingKegiatanList.map(k => (
                  <div key={k.id} className="flex justify-between p-2 hover:bg-gray-50 rounded-lg">
                    <div><p className="text-sm font-medium text-gray-900">{k.namaKegiatan}</p><p className="text-xs text-gray-500">{formatTanggal(k.tanggal)}</p></div>
                    <span className="text-xs bg-status-ongoing/50 text-status-ongoingText px-2 py-1 rounded-md h-fit">Kegiatan</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 col-span-1 lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold text-gray-900">Riwayat Donasi Pribadi</h2>
                <Link href="/donasi" className="text-xs text-primary hover:underline flex items-center gap-1">Detail <ArrowRight size={12}/></Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-y border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-500">Tanggal</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-500">Keterangan</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-500">Nominal</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {riwayatDonasi.map(d => (
                      <tr key={d.id}>
                        <td className="px-4 py-3">{formatTanggal(d.tanggal)}</td>
                        <td className="px-4 py-3">{d.keterangan || '-'}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatRupiah(Number(d.nominal))}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-[10px] uppercase font-semibold ${d.status === 'DIKONFIRMASI' ? 'bg-status-success/50 text-status-successText' : d.status === 'DITOLAK' ? 'bg-status-danger/50 text-status-dangerText' : 'bg-status-pending/50 text-status-pendingText'}`}>{d.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {(isPengurus || isSuperAdmin) && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Saldo Kas Real-time" value={formatRupiah(saldoKas)} icon={<Wallet size={22} className="text-status-successText" />} color="bg-status-success/50" />
            <StatCard title="Total Donasi" value={formatRupiah(totalDonasiAll)} icon={<HandCoins size={22} className="text-primary" />} color="bg-primary/20" />
            <StatCard title="Jemaah Terdaftar" value={totalJemaah} icon={<Users size={22} className="text-status-ongoingText" />} color="bg-status-ongoing/50" />
            <StatCard title="Kegiatan Aktif" value={totalKegiatan} icon={<Calendar size={22} className="text-status-pendingText" />} color="bg-status-pending/50" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Tren Kas per Bulan</h2>
              <TrendKeuanganChart data={trendKeuangan} />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Tren Donasi per Bulan</h2>
              <TrendDonasiChart data={trendDonasi} />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 xl:col-span-2">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Pertumbuhan per Bulan</h2>
              <TrendPertumbuhanChart data={trendPertumbuhan} />
            </div>
          </div>

          {isSuperAdmin && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Perbandingan Semua Agama</h2>
              <PerbandinganAgamaChart data={chartData} />
            </div>
          )}

          {isPengurus && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-semibold text-gray-900">Kegiatan Mendatang</h2>
                  <Link href="/kegiatan" className="text-xs text-primary hover:underline">Lihat Semua</Link>
                </div>
                <div className="space-y-3">
                  {upcomingKegiatanList.length === 0 ? <p className="text-sm text-gray-400">Tidak ada kegiatan</p> : upcomingKegiatanList.map(k => (
                    <div key={k.id} className="p-3 border border-gray-100 rounded-lg"><p className="text-sm font-medium">{k.namaKegiatan}</p><p className="text-xs text-gray-500">{formatTanggal(k.tanggal)}</p></div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-semibold text-gray-900">Jadwal Ibadah Terdekat</h2>
                  <Link href="/jadwal-ibadah" className="text-xs text-primary hover:underline">Lihat Semua</Link>
                </div>
                <div className="space-y-3">
                  {upcomingJadwalList.length === 0 ? <p className="text-sm text-gray-400">Tidak ada jadwal</p> : upcomingJadwalList.map(j => (
                    <div key={j.id} className="p-3 border border-gray-100 rounded-lg"><p className="text-sm font-medium">{j.namaIbadah}</p><p className="text-xs text-gray-500">{formatTanggal(j.tanggal)} • {j.waktuMulai}</p></div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
