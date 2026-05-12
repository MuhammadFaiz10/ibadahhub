import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { kegiatanCreateSchema } from '@/lib/validations/kegiatan'

function canManageKegiatan(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  if (session.user.role === 'SUPERADMIN') return true
  if (session.user.role !== 'PENGURUS') return false
  return session.user.subRole === 'KETUA' || session.user.subRole === 'SEKRETARIS'
}

// GET /api/kegiatan?search=&page=1&limit=10&arsip=false
// Akses:
// - SUPERADMIN: semua agama
// - PENGURUS (KETUA/SEKRETARIS): manage di agamanya
// - PENGURUS BENDAHARA: tidak punya akses (di-filter di sidebar; di sini ditolak)
// - JEMAAH: read-only di agamanya
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role
  const isSuperAdmin = role === 'SUPERADMIN'
  const canManage = canManageKegiatan(session)
  const isJemaah = role === 'JEMAAH'

  if (!isSuperAdmin && !canManage && !isJemaah) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? 10)))
  const showArsip = searchParams.get('arsip') === 'true'
  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')

  const religionId = isSuperAdmin ? undefined : (session.user.religionId ?? undefined)

  // JEMAAH tidak boleh lihat arsip
  const arsipEffective = isJemaah ? false : showArsip

  // Filter rentang tanggal (untuk tampilan kalender)
  const dateFilter =
    startParam && endParam
      ? { tanggal: { gte: new Date(startParam), lte: new Date(endParam) } }
      : {}

  const where = {
    deletedAt: arsipEffective ? ({ not: null } as const) : null,
    ...(religionId !== undefined ? { religionId } : {}),
    ...dateFilter,
    ...(search
      ? {
          OR: [
            { namaKegiatan: { contains: search, mode: 'insensitive' as const } },
            { lokasi: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [data, total] = await Promise.all([
    prisma.kegiatan.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { tanggal: startParam && endParam ? 'asc' : 'desc' },
      select: {
        id: true,
        namaKegiatan: true,
        tanggal: true,
        waktuMulai: true,
        waktuSelesai: true,
        lokasi: true,
        deskripsi: true,
        kapasitas: true,
        status: true,
        religionId: true,
        createdAt: true,
        deletedAt: true,
        religion: { select: { nama: true } },
      },
    }),
    prisma.kegiatan.count({ where }),
  ])

  return NextResponse.json({ data, total, page, limit })
}

// POST /api/kegiatan
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageKegiatan(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isSuperAdmin = session.user.role === 'SUPERADMIN'
  const body = await req.json()
  const parsed = kegiatanCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const safeReligionId = isSuperAdmin ? parsed.data.religionId : session.user.religionId!

  const religion = await prisma.religion.findUnique({
    where: { id: safeReligionId, deletedAt: null },
  })
  if (!religion) {
    return NextResponse.json({ error: 'Agama tidak ditemukan' }, { status: 404 })
  }

  const kegiatan = await prisma.kegiatan.create({
    data: {
      namaKegiatan: parsed.data.namaKegiatan,
      tanggal: new Date(parsed.data.tanggal),
      waktuMulai: parsed.data.waktuMulai,
      waktuSelesai: parsed.data.waktuSelesai || null,
      lokasi: parsed.data.lokasi,
      deskripsi: parsed.data.deskripsi || null,
      kapasitas: parsed.data.kapasitas ?? null,
      status: parsed.data.status ?? 'UPCOMING',
      religionId: safeReligionId,
      createdBy: Number(session.user.id),
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'CREATE',
      model: 'Kegiatan',
      recordId: kegiatan.id,
      detail: `Tambah kegiatan: ${kegiatan.namaKegiatan} - ${religion.nama}`,
    },
  })

  return NextResponse.json({ data: kegiatan }, { status: 201 })
}
