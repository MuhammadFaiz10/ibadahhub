import { prisma } from './prisma'

export const kategoriList = ['OPERASIONAL', 'KEGIATAN', 'SOSIAL', 'LAINNYA'] as const
export const bulanLabel = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export interface LaporanData {
  tahun: number
  religionName: string | null
  totalDonasi: number
  totalPengeluaran: number
  saldo: number
  kegiatanCount: number
  perBulan: { bulan: number; donasi: number; pengeluaran: number }[]
  perKategori: { kategori: string; total: number; count: number }[]
}

export async function computeLaporanData(
  tahun: number,
  religionId?: number
): Promise<LaporanData> {
  const startOfYear = new Date(`${tahun}-01-01T00:00:00.000Z`)
  const endOfYear = new Date(`${tahun + 1}-01-01T00:00:00.000Z`)

  const baseWhere = {
    deletedAt: null,
    ...(religionId !== undefined ? { religionId } : {}),
    tanggal: { gte: startOfYear, lt: endOfYear },
  }

  const [
    totalDonasiAgg,
    totalPengeluaranAgg,
    pengeluaranPerKategori,
    donasiBulanan,
    pengeluaranBulanan,
    kegiatanCount,
    religion,
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
          .then((r) => ({ kategori: k, total: Number(r._sum.nominal ?? 0), count: r._count }))
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
        tanggal: { gte: startOfYear, lt: endOfYear },
      },
    }),
    religionId !== undefined
      ? prisma.religion.findUnique({ where: { id: religionId }, select: { nama: true } })
      : Promise.resolve(null),
  ])

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

  const totalDonasi = Number(totalDonasiAgg._sum.nominal ?? 0)
  const totalPengeluaran = Number(totalPengeluaranAgg._sum.nominal ?? 0)

  return {
    tahun,
    religionName: religion?.nama ?? null,
    totalDonasi,
    totalPengeluaran,
    saldo: totalDonasi - totalPengeluaran,
    kegiatanCount,
    perBulan,
    perKategori: pengeluaranPerKategori,
  }
}
