import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/activity-log?search=&page=1&limit=20&model=&aksi=
// Hanya SUPERADMIN
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)))
  const model = searchParams.get('model') ?? ''
  const aksi = searchParams.get('aksi') ?? ''
  const search = searchParams.get('search') ?? ''

  const where: Record<string, unknown> = {}
  if (model) where.model = model
  if (aksi) where.aksi = aksi
  if (search) {
    where.OR = [
      { detail: { contains: search } },
      { user: { nama: { contains: search } } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, nama: true, role: true, subRole: true } },
      },
    }),
    prisma.activityLog.count({ where }),
  ])

  return NextResponse.json({ data, total, page, limit })
}
