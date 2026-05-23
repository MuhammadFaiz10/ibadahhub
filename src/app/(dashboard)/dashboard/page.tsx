import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import { Globe, UserCheck, Users, Calendar } from 'lucide-react'
import {
  PerbandinganAgamaChart,
  type PerbandinganAgamaDatum,
} from '@/components/dashboard/PerbandinganAgamaChart'

export const metadata: Metadata = { title: 'Dashboard' }

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  color: string
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5 flex items-center gap-3 sm:gap-4">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-gray-500 truncate">{title}</p>
        <p className="text-xl sm:text-2xl font-bold text-gray-900">{value.toLocaleString('id-ID')}</p>
      </div>
    </div>
  )
}

interface PerAgamaStat {
  id: number
  nama: string
  pengurus: number
  jemaah: number
  kegiatanAktif: number
  kegiatanTotal: number
}

async function getPerAgamaStats(): Promise<PerAgamaStat[]> {
  const religions = await prisma.religion.findMany({
    where: { deletedAt: null },
    orderBy: { nama: 'asc' },
    select: { id: true, nama: true },
  })

  return Promise.all(
    religions.map(async (r) => {
      const [pengurus, jemaah, kegiatanAktif, kegiatanTotal] = await Promise.all([
        prisma.user.count({
          where: { role: 'PENGURUS', religionId: r.id, deletedAt: null },
        }),
        prisma.jemaah.count({
          where: { religionId: r.id, deletedAt: null },
        }),
        prisma.kegiatan.count({
          where: {
            religionId: r.id,
            deletedAt: null,
            status: { in: ['UPCOMING', 'ONGOING'] },
          },
        }),
        prisma.kegiatan.count({
          where: { religionId: r.id, deletedAt: null },
        }),
      ])
      return { id: r.id, nama: r.nama, pengurus, jemaah, kegiatanAktif, kegiatanTotal }
    })
  )
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) return null

  const isSuperAdmin = session.user.role === 'SUPERADMIN'
  const religionId = !isSuperAdmin ? (session.user.religionId ?? undefined) : undefined

  const [totalAgama, totalPengurus, totalJemaah, totalKegiatan, perAgamaStats] = await Promise.all([
    prisma.religion.count({ where: { deletedAt: null } }),
    prisma.user.count({
      where: { role: 'PENGURUS', deletedAt: null, ...(religionId ? { religionId } : {}) },
    }),
    prisma.jemaah.count({
      where: { deletedAt: null, ...(religionId ? { religionId } : {}) },
    }),
    prisma.kegiatan.count({
      where: {
        deletedAt: null,
        status: { in: ['UPCOMING', 'ONGOING'] },
        ...(religionId ? { religionId } : {}),
      },
    }),
    isSuperAdmin ? getPerAgamaStats() : Promise.resolve<PerAgamaStat[]>([]),
  ])

  const chartData: PerbandinganAgamaDatum[] = perAgamaStats.map((r) => ({
    nama: r.nama,
    pengurus: r.pengurus,
    jemaah: r.jemaah,
    kegiatanAktif: r.kegiatanAktif,
  }))

  return (
    <div>
      {/* Welcome */}
      <div className="mb-5 sm:mb-8">
        <h1 className="text-lg sm:text-2xl font-semibold text-gray-900">
          Selamat datang, {session.user.name}!
        </h1>
        <p className="text-gray-500 mt-0.5 sm:mt-1 text-xs sm:text-sm">
          {isSuperAdmin
            ? 'Anda login sebagai Super Admin'
            : `Pengurus ${session.user.subRole} — ${session.user.religionName ?? ''}`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {isSuperAdmin && (
          <StatCard
            title="Total Agama"
            value={totalAgama}
            icon={<Globe size={22} className="text-primary" />}
            color="bg-primary-light"
          />
        )}
        <StatCard
          title="Total Pengurus"
          value={totalPengurus}
          icon={<UserCheck size={22} className="text-blue-600" />}
          color="bg-blue-50"
        />
        <StatCard
          title="Total Jemaah"
          value={totalJemaah}
          icon={<Users size={22} className="text-purple-600" />}
          color="bg-purple-50"
        />
        <StatCard
          title="Kegiatan Aktif"
          value={totalKegiatan}
          icon={<Calendar size={22} className="text-amber-600" />}
          color="bg-amber-50"
        />
      </div>

      {/* Perbandingan agama — hanya untuk Superadmin */}
      {isSuperAdmin && (
        <div className="mt-8 grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Chart */}
          <div className="xl:col-span-3 bg-white rounded-xl border border-gray-200 p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900">Perbandingan Agama</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Jumlah pengurus, jemaah, dan kegiatan aktif per komunitas agama
              </p>
            </div>
            <PerbandinganAgamaChart data={chartData} />
          </div>

          {/* Table */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-base font-semibold text-gray-900">Detail per Agama</h2>
              <p className="text-xs text-gray-500 mt-0.5">Ringkasan numerik</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-y border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Agama
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Pengurus
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Jemaah
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Kegiatan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {perAgamaStats.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400">
                        Belum ada data agama
                      </td>
                    </tr>
                  ) : (
                    perAgamaStats.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{r.nama}</td>
                        <td className="px-3 py-2.5 text-right text-gray-700">
                          {r.pengurus.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-700">
                          {r.jemaah.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-700">
                          <span className="text-amber-600 font-medium">
                            {r.kegiatanAktif.toLocaleString('id-ID')}
                          </span>
                          <span className="text-gray-400">
                            {' '}/ {r.kegiatanTotal.toLocaleString('id-ID')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {perAgamaStats.length > 0 && (
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase">
                        Total
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm font-semibold text-gray-900">
                        {perAgamaStats
                          .reduce((sum, r) => sum + r.pengurus, 0)
                          .toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm font-semibold text-gray-900">
                        {perAgamaStats
                          .reduce((sum, r) => sum + r.jemaah, 0)
                          .toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm font-semibold text-gray-900">
                        <span className="text-amber-600">
                          {perAgamaStats
                            .reduce((sum, r) => sum + r.kegiatanAktif, 0)
                            .toLocaleString('id-ID')}
                        </span>
                        <span className="text-gray-400">
                          {' '}/{' '}
                          {perAgamaStats
                            .reduce((sum, r) => sum + r.kegiatanTotal, 0)
                            .toLocaleString('id-ID')}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <p className="px-5 py-2.5 text-[11px] text-gray-400 border-t border-gray-100">
              Kegiatan: aktif (UPCOMING/ONGOING) / total semua status
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
