import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rekeningCreateSchema } from '@/lib/validations/rekening'

function canManageRekening(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  if (session.user.role === 'SUPERADMIN') return true
  if (session.user.role !== 'PENGURUS') return false
  return session.user.subRole === 'KETUA'
}

// GET /api/rekening
// Akses: SUPERADMIN, PENGURUS (KETUA/BENDAHARA), atau JEMAAH (read-only AKTIF saja)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role
  const subRole = session.user.subRole
  const isSuperAdmin = role === 'SUPERADMIN'
  const isPengurusKeuangan = role === 'PENGURUS' && (subRole === 'KETUA' || subRole === 'BENDAHARA')
  const isJemaah = role === 'JEMAAH'

  if (!isSuperAdmin && !isPengurusKeuangan && !isJemaah) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 10)))

  const religionIdQ = searchParams.get('religionId')
  const tempatIbadahIdQ = searchParams.get('tempatIbadahId')
  const religionId = isSuperAdmin
    ? religionIdQ ? Number(religionIdQ) : undefined
    : (session.user.religionId ?? undefined)
  const tempatIbadahId = isSuperAdmin
    ? tempatIbadahIdQ ? Number(tempatIbadahIdQ) : undefined
    : (session.user.tempatIbadahId ?? undefined)

  const where = {
    ...(religionId !== undefined ? { religionId } : {}),
    ...(tempatIbadahId !== undefined ? { tempatIbadahId } : {}),
    // JEMAAH hanya boleh lihat rekening AKTIF
    ...(isJemaah ? { status: 'AKTIF' as const } : {}),
    ...(search
      ? {
          OR: [
            { namaBank: { contains: search } },
            { nomorRekening: { contains: search } },
            { namaPemilik: { contains: search } },
          ],
        }
      : {}),
  }

  const [data, total] = await Promise.all([
    prisma.rekening.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        namaBank: true,
        nomorRekening: true,
        namaPemilik: true,
        catatan: true,
        status: true,
        religionId: true,
        tempatIbadahId: true,
        createdAt: true,
        updatedAt: true,
        religion: { select: { nama: true } },
        tempatIbadah: { select: { nama: true, slug: true } },
      },
    }),
    prisma.rekening.count({ where }),
  ])

  return NextResponse.json({ data, total, page, limit })
}

// POST /api/rekening
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageRekening(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isSuperAdmin = session.user.role === 'SUPERADMIN'
  const body = await req.json()
  const parsed = rekeningCreateSchema.safeParse(body)
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
  if (!religion) return NextResponse.json({ error: 'Agama tidak ditemukan' }, { status: 404 })

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

  const rekening = await prisma.rekening.create({
    data: {
      namaBank: parsed.data.namaBank,
      nomorRekening: parsed.data.nomorRekening,
      namaPemilik: parsed.data.namaPemilik,
      catatan: parsed.data.catatan || null,
      status: parsed.data.status ?? 'AKTIF',
      religionId: safeReligionId,
      tempatIbadahId: safeTempatIbadahId,
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'CREATE',
      model: 'Rekening',
      recordId: rekening.id,
      detail: `Tambah rekening ${rekening.namaBank} ${rekening.nomorRekening} - ${religion.nama}`,
    },
  })

  return NextResponse.json({ data: rekening }, { status: 201 })
}
