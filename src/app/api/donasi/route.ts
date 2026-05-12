import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { donasiCreateSchema } from '@/lib/validations/donasi'

function canManageKeuangan(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  if (session.user.role === 'SUPERADMIN') return true
  if (session.user.role !== 'PENGURUS') return false
  return session.user.subRole === 'KETUA' || session.user.subRole === 'BENDAHARA'
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role
  const isSuperAdmin = role === 'SUPERADMIN'
  const isKeuangan = canManageKeuangan(session)
  const isJemaah = role === 'JEMAAH'

  // Sekretaris tidak punya akses; juga PENGURUS biasa di luar KETUA/BENDAHARA
  if (!isSuperAdmin && !isKeuangan && !isJemaah) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 10)))
  const status = searchParams.get('status') ?? ''

  const where: Record<string, unknown> = {
    deletedAt: null,
  }

  if (!isSuperAdmin) {
    where.religionId = session.user.religionId ?? -1
  }
  if (isJemaah) {
    // JEMAAH hanya lihat donasinya sendiri
    where.userId = Number(session.user.id)
  }
  if (status) {
    where.status = status
  }
  if (search) {
    where.OR = [
      { namaDonatur: { contains: search, mode: 'insensitive' } },
      { catatan: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [data, total, totalNominal] = await Promise.all([
    prisma.donasi.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { tanggal: 'desc' },
      include: {
        religion: { select: { nama: true } },
        jemaah: { select: { id: true, nama: true } },
        konfirmasiBy: { select: { nama: true } },
      },
    }),
    prisma.donasi.count({ where }),
    prisma.donasi.aggregate({
      where: { ...where, status: 'DIKONFIRMASI' },
      _sum: { nominal: true },
    }),
  ])

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalDikonfirmasi: totalNominal._sum.nominal?.toString() ?? '0',
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role
  const isSuperAdmin = role === 'SUPERADMIN'
  const isKeuangan = canManageKeuangan(session)
  const isJemaah = role === 'JEMAAH'

  if (!isSuperAdmin && !isKeuangan && !isJemaah) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = donasiCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Tentukan religionId
  const safeReligionId = isSuperAdmin
    ? parsed.data.religionId
    : (session.user.religionId ?? null)

  if (!safeReligionId) {
    return NextResponse.json({ error: 'Agama tidak ditentukan' }, { status: 400 })
  }

  const religion = await prisma.religion.findUnique({
    where: { id: safeReligionId, deletedAt: null },
  })
  if (!religion) {
    return NextResponse.json({ error: 'Agama tidak ditemukan' }, { status: 404 })
  }

  // JEMAAH: paksa userId = sendiri, namaDonatur = nama session
  const userId = isJemaah ? Number(session.user.id) : null

  const donasi = await prisma.donasi.create({
    data: {
      religionId: safeReligionId,
      userId,
      jemaahId: isJemaah ? null : (parsed.data.jemaahId ?? null),
      rekeningId: parsed.data.rekeningId ?? null,
      namaDonatur: isJemaah ? (session.user.name ?? parsed.data.namaDonatur) : parsed.data.namaDonatur,
      nominal: parsed.data.nominal,
      tanggal: new Date(parsed.data.tanggal),
      metodePembayaran: parsed.data.metodePembayaran,
      status: 'PENDING',
      catatan: parsed.data.catatan || null,
      buktiPembayaran: parsed.data.buktiPembayaran || null,
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'CREATE',
      model: 'Donasi',
      recordId: donasi.id,
      detail: `Tambah donasi dari ${donasi.namaDonatur} (Rp ${parsed.data.nominal.toLocaleString('id-ID')})`,
    },
  })

  return NextResponse.json({ data: donasi }, { status: 201 })
}
