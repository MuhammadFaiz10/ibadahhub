import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { tempatIbadahCreateSchema } from '@/lib/validations/tempat-ibadah'

// GET /api/tempat-ibadah?search=&religionId=&page=1&limit=10&arsip=false
// SUPERADMIN: lihat semua tempat ibadah, opsional filter agama.
// Pengurus/Jemaah: hanya boleh lihat tempat ibadah di agama-nya (read-only).
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 10)))
  const showArsip = searchParams.get('arsip') === 'true'
  const religionIdQ = searchParams.get('religionId')

  const isSuperAdmin = session.user.role === 'SUPERADMIN'

  let religionFilter: number | undefined
  if (isSuperAdmin) {
    if (religionIdQ && !Number.isNaN(Number(religionIdQ))) {
      religionFilter = Number(religionIdQ)
    }
  } else {
    religionFilter = session.user.religionId ?? -1
  }

  const where = {
    deletedAt: showArsip ? ({ not: null } as const) : null,
    ...(religionFilter !== undefined ? { religionId: religionFilter } : {}),
    ...(search
      ? {
          OR: [
            { nama: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
            { kota: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [data, total] = await Promise.all([
    prisma.tempatIbadah.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ religionId: 'asc' }, { nama: 'asc' }],
      include: {
        religion: { select: { id: true, nama: true } },
        _count: { select: { users: true, jemaah: true, kegiatan: true } },
      },
    }),
    prisma.tempatIbadah.count({ where }),
  ])

  return NextResponse.json({ data, total, page, limit })
}

// POST /api/tempat-ibadah  (SUPERADMIN only)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = tempatIbadahCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const religion = await prisma.religion.findUnique({
    where: { id: parsed.data.religionId, deletedAt: null },
  })
  if (!religion) {
    return NextResponse.json({ error: 'Agama tidak ditemukan' }, { status: 404 })
  }

  const slugTaken = await prisma.tempatIbadah.findUnique({ where: { slug: parsed.data.slug } })
  if (slugTaken) {
    return NextResponse.json({ error: 'Slug sudah dipakai, pilih yang lain' }, { status: 409 })
  }

  const ti = await prisma.tempatIbadah.create({
    data: {
      religionId: parsed.data.religionId,
      nama: parsed.data.nama,
      slug: parsed.data.slug,
      alamat: parsed.data.alamat || null,
      kota: parsed.data.kota || null,
      provinsi: parsed.data.provinsi || null,
      kodePos: parsed.data.kodePos || null,
      noTelp: parsed.data.noTelp || null,
      email: parsed.data.email || null,
      logo: parsed.data.logo || null,
      deskripsi: parsed.data.deskripsi || null,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      status: parsed.data.status ?? 'AKTIF',
      createdBy: Number(session.user.id),
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'CREATE',
      model: 'TempatIbadah',
      recordId: ti.id,
      detail: `Tambah tempat ibadah: ${ti.nama} (${religion.nama})`,
    },
  })

  return NextResponse.json({ data: ti }, { status: 201 })
}
