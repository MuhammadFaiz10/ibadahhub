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

  // PENGURUS hanya lihat tempat ibadah sendiri; SUPERADMIN bisa filter via query.
  const religionIdQ = searchParams.get('religionId')
  const tempatIbadahIdQ = searchParams.get('tempatIbadahId')
  const religionId = isSuperAdmin
    ? religionIdQ ? Number(religionIdQ) : undefined
    : (session.user.religionId ?? undefined)
  const tempatIbadahId = isSuperAdmin
    ? tempatIbadahIdQ ? Number(tempatIbadahIdQ) : undefined
    : (session.user.tempatIbadahId ?? undefined)

  const where = {
    role: 'JEMAAH' as const,
    deletedAt: showArsip ? ({ not: null } as const) : null,
    ...(religionId !== undefined ? { religionId } : {}),
    ...(tempatIbadahId !== undefined ? { tempatIbadahId } : {}),
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
    prisma.user.findMany({
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
        tempatIbadahId: true,
        createdAt: true,
        deletedAt: true,
        religion: { select: { nama: true } },
        tempatIbadah: { select: { nama: true, slug: true } },
      },
    }),
    prisma.user.count({ where }),
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

  // PENGURUS: paksa scope dari session
  const safeReligionId = isSuperAdmin ? parsed.data.religionId : session.user.religionId!
  const safeTempatIbadahId = isSuperAdmin
    ? parsed.data.tempatIbadahId
    : session.user.tempatIbadahId!
  if (!safeTempatIbadahId) {
    return NextResponse.json({ error: 'Tempat ibadah wajib dipilih' }, { status: 400 })
  }

  const religion = await prisma.religion.findUnique({
    where: { id: safeReligionId, deletedAt: null },
  })
  if (!religion) {
    return NextResponse.json({ error: 'Agama tidak ditemukan' }, { status: 404 })
  }

  const ti = await prisma.tempatIbadah.findUnique({ where: { id: safeTempatIbadahId } })
  if (!ti || ti.deletedAt) {
    return NextResponse.json({ error: 'Tempat ibadah tidak ditemukan' }, { status: 404 })
  }
  if (ti.religionId !== safeReligionId) {
    return NextResponse.json(
      { error: 'Tempat ibadah tidak sesuai dengan agama' },
      { status: 400 }
    )
  }

  const jemaah = await prisma.user.create({
    data: {
      nama: parsed.data.nama,
      email: parsed.data.email || null,
      noHp: parsed.data.noHp || null,
      alamat: parsed.data.alamat || null,
      religionId: safeReligionId,
      tempatIbadahId: safeTempatIbadahId,
      status: true,
      role: 'JEMAAH',
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'CREATE',
      model: 'User',
      recordId: jemaah.id,
      detail: `Menambah jemaah: ${jemaah.nama} - ${religion.nama}`,
    },
  })

  return NextResponse.json({ data: jemaah }, { status: 201 })
}
