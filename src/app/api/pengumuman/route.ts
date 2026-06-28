import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pengumumanCreateSchema } from '@/lib/validations/pengumuman'
import { notifyTempatIbadah } from '@/lib/notification-helper'

function canManagePengumuman(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  if (session.user.role === 'SUPERADMIN') return true
  if (session.user.role !== 'PENGURUS') return false
  return session.user.subRole === 'KETUA' || session.user.subRole === 'SEKRETARIS'
}

// GET /api/pengumuman?search=&page=1&limit=10&arsip=false
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role
  const isSuperAdmin = role === 'SUPERADMIN'
  const canManage = canManagePengumuman(session)
  const isJemaah = role === 'JEMAAH'

  if (!isSuperAdmin && !canManage && !isJemaah) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 10)))
  const showArsip = searchParams.get('arsip') === 'true'

  const religionIdQ = searchParams.get('religionId')
  const tempatIbadahIdQ = searchParams.get('tempatIbadahId')
  const religionId = isSuperAdmin
    ? religionIdQ ? Number(religionIdQ) : undefined
    : (session.user.religionId ?? undefined)
  const tempatIbadahId = isSuperAdmin
    ? tempatIbadahIdQ ? Number(tempatIbadahIdQ) : undefined
    : (session.user.tempatIbadahId ?? undefined)
  const arsipEffective = isJemaah ? false : showArsip

  const where = {
    deletedAt: arsipEffective ? ({ not: null } as const) : null,
    ...(religionId !== undefined ? { religionId } : {}),
    ...(tempatIbadahId !== undefined ? { tempatIbadahId } : {}),
    // JEMAAH: hanya AKTIF
    ...(isJemaah ? { status: 'AKTIF' as const } : {}),
    ...(search
      ? {
          OR: [
            { judul: { contains: search, mode: 'insensitive' as const } },
            { isi: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [data, total] = await Promise.all([
    prisma.pengumuman.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { tanggalPublish: 'desc' },
      select: {
        id: true,
        judul: true,
        isi: true,
        tanggalPublish: true,
        expireDate: true,
        status: true,
        religionId: true,
        tempatIbadahId: true,
        createdAt: true,
        deletedAt: true,
        religion: { select: { nama: true } },
        tempatIbadah: { select: { nama: true, slug: true } },
      },
    }),
    prisma.pengumuman.count({ where }),
  ])

  return NextResponse.json({ data, total, page, limit })
}

// POST /api/pengumuman
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManagePengumuman(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isSuperAdmin = session.user.role === 'SUPERADMIN'
  const body = await req.json()
  const parsed = pengumumanCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

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

  const pengumuman = await prisma.pengumuman.create({
    data: {
      judul: parsed.data.judul,
      isi: parsed.data.isi,
      tanggalPublish: parsed.data.tanggalPublish ? new Date(parsed.data.tanggalPublish) : new Date(),
      expireDate: parsed.data.expireDate ? new Date(parsed.data.expireDate) : null,
      status: parsed.data.status ?? 'DRAFT',
      religionId: safeReligionId,
      tempatIbadahId: safeTempatIbadahId,
      createdBy: Number(session.user.id),
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'CREATE',
      model: 'Pengumuman',
      recordId: pengumuman.id,
      detail: `Tambah pengumuman: ${pengumuman.judul} - ${religion.nama}`,
    },
  })

  if (pengumuman.status === 'AKTIF') {
    await notifyTempatIbadah(
      pengumuman.tempatIbadahId,
      `Pengumuman Baru: ${pengumuman.judul}`,
      `Ada pengumuman baru: "${pengumuman.judul}". Silakan cek detailnya.`,
      '/pengumuman'
    )
  }

  return NextResponse.json({ data: pengumuman }, { status: 201 })
}
