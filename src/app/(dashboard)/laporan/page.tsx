import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { HandCoins, TrendingDown, Wallet, Calendar, Building2, Globe } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatRupiah } from '@/lib/utils'
import { LaporanFilterBar } from './_filter-bar'

export const metadata: Metadata = { title: 'Laporan Keuangan' }

interface SearchParams {
  tahun?: string
  religionId?: string
  tempatIbadahId?: string
}

const kategoriList = ['OPERASIONAL', 'KEGIATAN', 'SOSIAL', 'LAINNYA'] as const
const bulanLabel = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

export default async function LaporanPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth()
  if (!session) redirect('/login')

  const role = session.user.role
  const subRole = session.user.subRole
  const allowed =
    role === 'SUPERADMIN' ||
    (role === 'PENGURUS' && (subRole === 'KETUA' || subRole === 'BENDAHARA'))

  if (!allowed) {
    return (
      <div>
        <PageHeader title="Laporan Keuangan" />
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 text-sm">
          Akses ditolak. Halaman ini hanya untuk Ketua, Bendahara, atau Super Admin.
        </div>
      </div>
    )
  }

  const tahun = Number(searchParams.tahun) || new Date().getFullYear()
  const startOfYear = new Date(`${tahun}-01-01T00:00:00.000Z`)
  const endOfYear = new Date(`${tahun + 1}-01-01T00:00:00.000Z`)

  const isSuperAdmin = role === 'SUPERADMIN'

  // Scope resolution:
  //   - SUPERADMIN: optional filter dari URL (religionId & tempatIbadahId)
  //   - PENGURUS/JEMAAH: paksa scope session
  const religionId = isSuperAdmin
    ? searchParams.religionId
      ? Number(searchParams.religionId)
      : undefined
    : (session.user.religionId ?? -1)
  const tempatIbadahId = isSuperAdmin
    ? searchParams.tempatIbadahId
      ? Number(searchParams.tempatIbadahId)
      : undefined
    : (session.user.tempatIbadahId ?? -1)

  // Resolve label untuk badge scope (SUPERADMIN saja)
  let scopeBadge: { religionName?: string; tempatIbadahName?: string } | null = null
  if (isSuperAdmin && (religionId || tempatIbadahId)) {
    const [r, t] = await Promise.all([
      religionId
        ? prisma.religion.findUnique({ where: { id: religionId }, select: { nama: true } })
        : null,
      tempatIbadahId
        ? prisma.tempatIbadah.findUnique({
            where: { id: tempatIbadahId },
            select: { nama: true },
          })
        : null,
    ])
    scopeBadge = { religionName: r?.nama, tempatIbadahName: t?.nama }
  }

  const baseWhere = {
    deletedAt: null,
    ...(religionId !== undefined ? { religionId } : {}),
    ...(tempatIbadahId !== undefined ? { tempatIbadahId } : {}),
    tanggal: { gte: startOfYear, lt: endOfYear },
  }

  const [
    totalDonasi,
    totalPengeluaran,
    pengeluaranPerKategori,
    donasiBulanan,
    pengeluaranBulanan,
    kegiatanCount,
  ] = await Promise.all([
    prisma.donasi.aggregate({
      where: { ...baseWhere, status: 'DIKONFIRMASI' },
      _sum: { nominal: true },
    }),
    prisma.pengeluaran.aggregate({
      where: baseWhere,
      _sum: { nominal: true },
    }),
    Promise.all(
      kategoriList.map((k) =>
        prisma.pengeluaran
          .aggregate({
            where: { ...baseWhere, kategori: k },
            _sum: { nominal: true },
            _count: true,
          })
          .then((r) => ({ kategori: k, total: r._sum.nominal?.toString() ?? '0', count: r._count }))
      )
    ),
    prisma.donasi.findMany({
      where: { ...baseWhere, status: 'DIKONFIRMASI' },
      select: { tanggal: true, nominal: true },
    }),
    prisma.pengeluaran.findMany({
      where: baseWhere,
      select: { tanggal: true, nominal: true },
    }),
    prisma.kegiatan.count({
      where: {
        deletedAt: null,
        ...(religionId !== undefined ? { religionId } : {}),
        ...(tempatIbadahId !== undefined ? { tempatIbadahId } : {}),
        tanggal: { gte: startOfYear, lt: endOfYear },
      },
    }),
  ])

  // Aggregate ke per bulan
  const perBulan: { bulan: number; donasi: number; pengeluaran: number }[] = Array.from(
    { length: 12 },
    (_, i) => ({ bulan: i, donasi: 0, pengeluaran: 0 })
  )
  donasiBulanan.forEach((d) => {
    const m = new Date(d.tanggal).getMonth()
    const slot = perBulan[m]
    if (slot) slot.donasi += Number(d.nominal)
  })
  pengeluaranBulanan.forEach((p) => {
    const m = new Date(p.tanggal).getMonth()
    const slot = perBulan[m]
    if (slot) slot.pengeluaran += Number(p.nominal)
  })

  const totalDonasiNum = Number(totalDonasi._sum.nominal ?? 0)
  const totalPengeluaranNum = Number(totalPengeluaran._sum.nominal ?? 0)
  const saldo = totalDonasiNum - totalPengeluaranNum

  return (
    <div>
      <PageHeader
        title="Laporan Keuangan"
        subtitle={`Ringkasan keuangan tahun ${tahun}`}
        action={
          <LaporanFilterBar
            tahun={tahun}
            isSuperAdmin={isSuperAdmin}
            religionId={religionId}
            tempatIbadahId={tempatIbadahId}
          />
        }
      />

      {/* Active scope badges (SUPERADMIN) */}
      {scopeBadge && (scopeBadge.religionName || scopeBadge.tempatIbadahName) && (
        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
          <span className="text-gray-500">Menampilkan laporan untuk:</span>
          {scopeBadge.religionName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-100">
              <Globe size={11} />
              {scopeBadge.religionName}
            </span>
          )}
          {scopeBadge.tempatIbadahName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100">
              <Building2 size={11} />
              {scopeBadge.tempatIbadahName}
            </span>
          )}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
            <HandCoins size={22} className="text-emerald-700" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Donasi Terkonfirmasi</p>
            <p className="text-lg font-bold text-emerald-700">{formatRupiah(totalDonasiNum)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <TrendingDown size={22} className="text-red-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Pengeluaran</p>
            <p className="text-lg font-bold text-red-600">{formatRupiah(totalPengeluaranNum)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${saldo >= 0 ? 'bg-blue-50' : 'bg-amber-50'}`}>
            <Wallet size={22} className={saldo >= 0 ? 'text-blue-600' : 'text-amber-600'} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Saldo</p>
            <p className={`text-lg font-bold ${saldo >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
              {formatRupiah(saldo)}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
            <Calendar size={22} className="text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Kegiatan</p>
            <p className="text-lg font-bold text-gray-900">{kegiatanCount.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      {/* Per bulan */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Rekap Bulanan {tahun}</h2>
          <p className="text-xs text-gray-500 mt-0.5">Donasi terkonfirmasi vs pengeluaran per bulan</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Bulan</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Donasi</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Pengeluaran</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Selisih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {perBulan.map((p) => {
                const selisih = p.donasi - p.pengeluaran
                return (
                  <tr key={p.bulan} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-700">
                      {bulanLabel[p.bulan]} {tahun}
                    </td>
                    <td className="px-4 py-2.5 text-right text-emerald-700">{formatRupiah(p.donasi)}</td>
                    <td className="px-4 py-2.5 text-right text-red-600">{formatRupiah(p.pengeluaran)}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${selisih >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                      {formatRupiah(selisih)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase">Total</td>
                <td className="px-4 py-2.5 text-right text-sm font-semibold text-emerald-700">
                  {formatRupiah(totalDonasiNum)}
                </td>
                <td className="px-4 py-2.5 text-right text-sm font-semibold text-red-600">
                  {formatRupiah(totalPengeluaranNum)}
                </td>
                <td className={`px-4 py-2.5 text-right text-sm font-semibold ${saldo >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                  {formatRupiah(saldo)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Per kategori pengeluaran */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Pengeluaran per Kategori</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Kategori</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Jumlah Transaksi</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Total Nominal</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">% dari Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pengeluaranPerKategori.map((p) => {
                const totalNum = Number(p.total)
                const pct = totalPengeluaranNum > 0 ? (totalNum / totalPengeluaranNum) * 100 : 0
                return (
                  <tr key={p.kategori} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700">
                        {p.kategori}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{p.count}</td>
                    <td className="px-4 py-2.5 text-right text-red-600 font-medium">
                      {formatRupiah(totalNum)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{pct.toFixed(1)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
