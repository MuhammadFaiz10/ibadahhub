import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { jemaahCreateSchema } from '@/lib/validations/jemaah'

// GET /api/jemaah?search=&page=1&limit=10&arsip=false
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isSuperAdmin = session.user.role === 'SUPERADMIN'
  const isPengurusKontenJemaah =
    session.user.role === 'PENGURUS' &&
    (session.user.subRole === 'KETUA' || session.user.subRole === 'SEKRETARIS')

  if (!isSuperAdmin && !isPengurusKontenJemaah) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 10)))
  const showArsip = searchParams.get('arsip') === 'true'

  // PENGURUS hanya lihat agama sendiri
  const religionId = isSuperAdmin ? undefined : (session.user.religionId ?? undefined)

  const where = {
    deletedAt: showArsip ? ({ not: null } as const) : null,
    ...(religionId !== undefined ? { religionId } : {}),
    ...(search
      ? {
          OR: [
            { nama: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { noHp: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [data, total] = await Promise.all([
    prisma.jemaah.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nama: true,
        email: true,
        noHp: true,
        alamat: true,
        status: true,
        religionId: true,
        userId: true,
        createdAt: true,
        deletedAt: true,
        religion: { select: { nama: true } },
      },
    }),
    prisma.jemaah.count({ where }),
  ])

  return NextResponse.json({ data, total, page, limit })
}

// POST /api/jemaah
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isSuperAdmin = session.user.role === 'SUPERADMIN'
  const isPengurusKontenJemaah =
    session.user.role === 'PENGURUS' &&
    (session.user.subRole === 'KETUA' || session.user.subRole === 'SEKRETARIS')

  if (!isSuperAdmin && !isPengurusKontenJemaah) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = jemaahCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // PENGURUS: paksa religionId sendiri
  const safeReligionId = isSuperAdmin ? parsed.data.religionId : session.user.religionId!

  const religion = await prisma.religion.findUnique({
    where: { id: safeReligionId, deletedAt: null },
  })
  if (!religion) {
    return NextResponse.json({ error: 'Agama tidak ditemukan' }, { status: 404 })
  }

  const jemaah = await prisma.jemaah.create({
    data: {
      nama: parsed.data.nama,
      email: parsed.data.email || null,
      noHp: parsed.data.noHp || null,
      alamat: parsed.data.alamat || null,
      religionId: safeReligionId,
      status: true,
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'CREATE',
      model: 'Jemaah',
      recordId: jemaah.id,
      detail: `Menambah jemaah: ${jemaah.nama} - ${religion.nama}`,
    },
  })

  return NextResponse.json({ data: jemaah }, { status: 201 })
}
