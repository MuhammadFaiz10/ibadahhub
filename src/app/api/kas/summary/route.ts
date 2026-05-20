import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function canManageKeuangan(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  if (session.user.role === 'SUPERADMIN') return true
  if (session.user.role !== 'PENGURUS') return false
  return session.user.subRole === 'KETUA' || session.user.subRole === 'BENDAHARA'
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageKeuangan(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isSuperAdmin = session.user.role === 'SUPERADMIN'
  const { searchParams } = req.nextUrl
  const religionIdQ = searchParams.get('religionId')
  const tempatIbadahIdQ = searchParams.get('tempatIbadahId')

  const religionId = isSuperAdmin
    ? religionIdQ ? Number(religionIdQ) : undefined
    : (session.user.religionId ?? undefined)
  const tempatIbadahId = isSuperAdmin
    ? tempatIbadahIdQ ? Number(tempatIbadahIdQ) : undefined
    : (session.user.tempatIbadahId ?? undefined)

  if (!isSuperAdmin && !tempatIbadahId) {
    return NextResponse.json({ error: 'Tempat ibadah tidak valid untuk user ini' }, { status: 400 })
  }

  // If Super Admin and no tempatIbadahId is filtered, return error or empty list because balance is scoped to places of worship.
  if (isSuperAdmin && !tempatIbadahId) {
    return NextResponse.json({ data: [], message: 'Silakan pilih tempat ibadah untuk melihat saldo kas' })
  }

  // Get all accounts (rekening) of this tempat ibadah
  const rekeningList = await prisma.rekening.findMany({
    where: {
      tempatIbadahId: tempatIbadahId,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  // Get total incomes, expenditures and donations for each rekening
  const donations = await prisma.donasi.groupBy({
    by: ['rekeningId'],
    where: {
      tempatIbadahId: tempatIbadahId,
      status: 'DIKONFIRMASI',
      deletedAt: null,
    },
    _sum: {
      nominal: true,
    },
  })

  const pemasukan = await prisma.pemasukan.groupBy({
    by: ['rekeningId'],
    where: {
      tempatIbadahId: tempatIbadahId,
      deletedAt: null,
    },
    _sum: {
      nominal: true,
    },
  })

  const pengeluaran = await prisma.pengeluaran.groupBy({
    by: ['rekeningId'],
    where: {
      tempatIbadahId: tempatIbadahId,
      deletedAt: null,
    },
    _sum: {
      nominal: true,
    },
  })

  // Helper map to quickly look up sums
  const getSum = (arr: any[], id: number | null) => {
    const item = arr.find((x) => x.rekeningId === id)
    return item?._sum?.nominal ? Number(item._sum.nominal) : 0
  }

  // Map rekening records to balances
  const balances = rekeningList.map((rek) => {
    const totalDonasi = getSum(donations, rek.id)
    const totalMasuk = getSum(pemasukan, rek.id)
    const totalKeluar = getSum(pengeluaran, rek.id)
    const saldo = totalDonasi + totalMasuk - totalKeluar

    return {
      id: rek.id,
      namaBank: rek.namaBank,
      nomorRekening: rek.nomorRekening,
      namaPemilik: rek.namaPemilik,
      status: rek.status,
      totalDonasi,
      totalMasuk,
      totalKeluar,
      saldo,
    }
  })

  // Add the "Kas Tunai" virtual account (rekeningId = null)
  const totalDonasiTunai = getSum(donations, null)
  const totalMasukTunai = getSum(pemasukan, null)
  const totalKeluarTunai = getSum(pengeluaran, null)
  const saldoTunai = totalDonasiTunai + totalMasukTunai - totalKeluarTunai

  balances.push({
    id: 0, // Virtual ID for Kas Tunai
    namaBank: 'Kas Tunai / Fisik',
    nomorRekening: '-',
    namaPemilik: 'Bendahara',
    status: 'AKTIF',
    totalDonasi: totalDonasiTunai,
    totalMasuk: totalMasukTunai,
    totalKeluar: totalKeluarTunai,
    saldo: saldoTunai,
  })

  return NextResponse.json({ data: balances })
}
