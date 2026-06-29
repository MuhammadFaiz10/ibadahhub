import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pemasukanCreateSchema } from '@/lib/validations/pemasukan'

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
  const rekeningIdQ = searchParams.get('rekeningId')

  const religionIdQ = searchParams.get('religionId')
  const tempatIbadahIdQ = searchParams.get('tempatIbadahId')
  const religionId = isSuperAdmin
    ? religionIdQ ? Number(religionIdQ) : undefined
    : (session.user.religionId ?? undefined)
  const tempatIbadahId = isSuperAdmin
    ? tempatIbadahIdQ ? Number(tempatIbadahIdQ) : undefined
    : (session.user.tempatIbadahId ?? undefined)

  const where = {
    deletedAt: showArsip ? ({ not: null } as const) : null,
    ...(religionId !== undefined ? { religionId } : {}),
    ...(tempatIbadahId !== undefined ? { tempatIbadahId } : {}),
    ...(rekeningIdQ ? { rekeningId: Number(rekeningIdQ) } : {}),
    ...(kategori ? { kategori: kategori as 'DONASI' | 'HIBAH' | 'USAHA' | 'LAINNYA' } : {}),
    ...(search ? { keterangan: { contains: search } } : {}),
  }

  const [data, total, totalNominal] = await Promise.all([
    prisma.pemasukan.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { tanggal: 'desc' },
      include: {
        religion: { select: { nama: true } },
        tempatIbadah: { select: { nama: true, slug: true } },
        user: { select: { nama: true } },
        rekening: { select: { id: true, namaBank: true, nomorRekening: true } },
      },
    }),
    prisma.pemasukan.count({ where }),
    prisma.pemasukan.aggregate({ where, _sum: { nominal: true } }),
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
  const parsed = pemasukanCreateSchema.safeParse(body)
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

  if (parsed.data.rekeningId) {
    const rek = await prisma.rekening.findUnique({ where: { id: parsed.data.rekeningId } })
    if (!rek || rek.tempatIbadahId !== safeTempatIbadahId) {
      return NextResponse.json({ error: 'Rekening tidak ditemukan atau tidak sesuai' }, { status: 404 })
    }
  }

  const pemasukan = await prisma.pemasukan.create({
    data: {
      keterangan: parsed.data.keterangan,
      nominal: parsed.data.nominal,
      tanggal: new Date(parsed.data.tanggal),
      kategori: parsed.data.kategori,
      bukti: parsed.data.bukti || null,
      rekeningId: parsed.data.rekeningId || null,
      religionId: safeReligionId,
      tempatIbadahId: safeTempatIbadahId,
      createdBy: Number(session.user.id),
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'CREATE',
      model: 'Pemasukan',
      recordId: pemasukan.id,
      detail: `Tambah pemasukan ${pemasukan.keterangan} (Rp ${parsed.data.nominal.toLocaleString('id-ID')})`,
    },
  })

  return NextResponse.json({ data: pemasukan }, { status: 201 })
}
