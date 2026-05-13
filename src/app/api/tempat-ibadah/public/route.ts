import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/tempat-ibadah/public?religionId=
// Endpoint publik untuk dropdown register (filter berdasarkan agama).
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const religionIdQ = searchParams.get('religionId')

  if (!religionIdQ || Number.isNaN(Number(religionIdQ))) {
    return NextResponse.json({ error: 'religionId wajib' }, { status: 400 })
  }

  const data = await prisma.tempatIbadah.findMany({
    where: {
      religionId: Number(religionIdQ),
      deletedAt: null,
      status: 'AKTIF',
    },
    select: { id: true, nama: true, slug: true, kota: true },
    orderBy: { nama: 'asc' },
  })

  return NextResponse.json({ data })
}
