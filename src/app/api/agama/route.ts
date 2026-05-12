import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { agamaCreateSchema } from '@/lib/validations/agama'

// GET /api/agama?search=&page=1&limit=10&arsip=false
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 10)))
  const showArsip = searchParams.get('arsip') === 'true'

  const where = {
    deletedAt: showArsip ? ({ not: null } as const) : null,
    ...(search
      ? { nama: { contains: search, mode: 'insensitive' as const } }
      : {}),
  }

  const [data, total] = await Promise.all([
    prisma.religion.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.religion.count({ where }),
  ])

  return NextResponse.json({ data, total, page, limit })
}

// POST /api/agama
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = agamaCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Cek duplikat nama
  const existing = await prisma.religion.findFirst({
    where: { nama: parsed.data.nama, deletedAt: null },
  })
  if (existing) {
    return NextResponse.json({ error: 'Nama agama sudah terdaftar' }, { status: 409 })
  }

  const agama = await prisma.religion.create({ data: parsed.data })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'CREATE',
      model: 'Religion',
      recordId: agama.id,
      detail: `Membuat agama: ${agama.nama}`,
    },
  })

  return NextResponse.json({ data: agama }, { status: 201 })
}
