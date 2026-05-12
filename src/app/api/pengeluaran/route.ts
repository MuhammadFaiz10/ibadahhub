import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pengeluaranCreateSchema } from '@/lib/validations/pengeluaran'

function canManageKeuangan(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  if (session.user.role === 'SUPERADMIN') return true
  if (session.user.role !== 'PENGURUS') return false
  return session.user.subRole === 'KETUA' || session.user.subRole === 'BENDAHARA'
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageKeuangan(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isSuperAdmin = session.user.role === 'SUPERADMIN'
  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 10)))
  const showArsip = searchParams.get('arsip') === 'true'
  const kategori = searchParams.get('kategori') ?? ''

  const religionId = isSuperAdmin ? undefined : (session.user.religionId ?? undefined)

  const where = {
    deletedAt: showArsip ? ({ not: null } as const) : null,
    ...(religionId !== undefined ? { religionId } : {}),
    ...(kategori ? { kategori: kategori as 'OPERASIONAL' | 'KEGIATAN' | 'SOSIAL' | 'LAINNYA' } : {}),
    ...(search ? { keterangan: { contains: search, mode: 'insensitive' as const } } : {}),
  }

  const [data, total, totalNominal] = await Promise.all([
    prisma.pengeluaran.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { tanggal: 'desc' },
      include: {
        religion: { select: { nama: true } },
        user: { select: { nama: true } },
      },
    }),
    prisma.pengeluaran.count({ where }),
    prisma.pengeluaran.aggregate({ where, _sum: { nominal: true } }),
  ])

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalNominal: totalNominal._sum.nominal?.toString() ?? '0',
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageKeuangan(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isSuperAdmin = session.user.role === 'SUPERADMIN'
  const body = await req.json()
  const parsed = pengeluaranCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const safeReligionId = isSuperAdmin ? parsed.data.religionId : session.user.religionId!
  const religion = await prisma.religion.findUnique({
    where: { id: safeReligionId, deletedAt: null },
  })
  if (!religion) return NextResponse.json({ error: 'Agama tidak ditemukan' }, { status: 404 })

  const pengeluaran = await prisma.pengeluaran.create({
    data: {
      keterangan: parsed.data.keterangan,
      nominal: parsed.data.nominal,
      tanggal: new Date(parsed.data.tanggal),
      kategori: parsed.data.kategori,
      bukti: parsed.data.bukti || null,
      religionId: safeReligionId,
      createdBy: Number(session.user.id),
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'CREATE',
      model: 'Pengeluaran',
      recordId: pengeluaran.id,
      detail: `Tambah pengeluaran ${pengeluaran.keterangan} (Rp ${parsed.data.nominal.toLocaleString('id-ID')})`,
    },
  })

  return NextResponse.json({ data: pengeluaran }, { status: 201 })
}
