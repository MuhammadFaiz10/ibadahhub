import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { jadwalIbadahCreateSchema } from '@/lib/validations/jadwal-ibadah'

function canManageJadwal(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  if (session.user.role === 'SUPERADMIN') return true
  if (session.user.role !== 'PENGURUS') return false
  return session.user.subRole === 'KETUA' || session.user.subRole === 'SEKRETARIS'
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role
  const isSuperAdmin = role === 'SUPERADMIN'
  const canManage = canManageJadwal(session)
  const isJemaah = role === 'JEMAAH'

  if (!isSuperAdmin && !canManage && !isJemaah) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')
  // We can return all schedules for the specified date range.

  const religionId = isSuperAdmin
    ? undefined
    : (session.user.religionId ?? undefined)
  const tempatIbadahId = isSuperAdmin
    ? undefined
    : (session.user.tempatIbadahId ?? undefined)

  const dateFilter =
    startParam && endParam
      ? { tanggal: { gte: new Date(startParam), lte: new Date(endParam) } }
      : {}

  const where = {
    deletedAt: null,
    ...(religionId !== undefined ? { religionId } : {}),
    ...(tempatIbadahId !== undefined ? { tempatIbadahId } : {}),
    ...dateFilter,
    ...(search
      ? {
          OR: [
            { namaIbadah: { contains: search } },
            { pemimpin: { contains: search } },
          ],
        }
      : {}),
  }

  const data = await prisma.jadwalIbadah.findMany({
    where,
    orderBy: [{ tanggal: 'asc' }, { waktuMulai: 'asc' }],
    include: {
      religion: { select: { nama: true } },
      tempatIbadah: { select: { nama: true, slug: true } },
    },
  })

  return NextResponse.json({ data, total: data.length })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageJadwal(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isSuperAdmin = session.user.role === 'SUPERADMIN'
  const body = await req.json()
  const parsed = jadwalIbadahCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const safeReligionId = isSuperAdmin ? parsed.data.religionId : session.user.religionId!
  const safeTempatIbadahId = isSuperAdmin ? parsed.data.tempatIbadahId : session.user.tempatIbadahId!
  
  if (!safeTempatIbadahId) {
    return NextResponse.json({ error: 'Tempat ibadah wajib dipilih' }, { status: 400 })
  }

  const jadwal = await prisma.jadwalIbadah.create({
    data: {
      namaIbadah: parsed.data.namaIbadah,
      tanggal: new Date(parsed.data.tanggal),
      waktuMulai: parsed.data.waktuMulai,
      waktuSelesai: parsed.data.waktuSelesai || null,
      pemimpin: parsed.data.pemimpin || null,
      pendamping: parsed.data.pendamping || null,
      lokasi: parsed.data.lokasi || null,
      catatan: parsed.data.catatan || null,
      religionId: safeReligionId,
      tempatIbadahId: safeTempatIbadahId,
      createdBy: Number(session.user.id),
    },
  })

  return NextResponse.json({ data: jadwal }, { status: 201 })
}
