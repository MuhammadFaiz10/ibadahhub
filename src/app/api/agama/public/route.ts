import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/agama/public — untuk form registrasi (tidak butuh auth)
export async function GET() {
  const agamaList = await prisma.religion.findMany({
    where: { deletedAt: null },
    select: { id: true, nama: true },
    orderBy: { nama: 'asc' },
  })
  return NextResponse.json({ data: agamaList })
}
