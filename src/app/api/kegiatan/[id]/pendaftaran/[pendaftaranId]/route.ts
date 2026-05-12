import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function canManageKegiatan(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  if (session.user.role === 'SUPERADMIN') return true
  if (session.user.role !== 'PENGURUS') return false
  return session.user.subRole === 'KETUA' || session.user.subRole === 'SEKRETARIS'
}

const updateSchema = z.object({
  status: z.enum(['TERDAFTAR', 'HADIR', 'TIDAK_HADIR', 'BATAL']),
})

// PATCH /api/kegiatan/:id/pendaftaran/:pendaftaranId — ubah status (HADIR/TIDAK_HADIR/BATAL)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; pendaftaranId: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageKegiatan(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const kegiatanId = Number(params.id)
  const pendaftaranId = Number(params.pendaftaranId)
  if (isNaN(kegiatanId) || isNaN(pendaftaranId)) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const pendaftaran = await prisma.kegiatanPendaftaran.findUnique({
    where: { id: pendaftaranId },
    include: { kegiatan: { select: { religionId: true, namaKegiatan: true } } },
  })
  if (!pendaftaran || pendaftaran.kegiatanId !== kegiatanId) {
    return NextResponse.json({ error: 'Pendaftaran tidak ditemukan' }, { status: 404 })
  }

  if (
    session.user.role === 'PENGURUS' &&
    pendaftaran.kegiatan.religionId !== session.user.religionId
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updated = await prisma.kegiatanPendaftaran.update({
    where: { id: pendaftaranId },
    data: { status: parsed.data.status },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'UPDATE',
      model: 'KegiatanPendaftaran',
      recordId: pendaftaranId,
      detail: `Set ${parsed.data.status} di ${pendaftaran.kegiatan.namaKegiatan}`,
    },
  })

  return NextResponse.json({ data: updated })
}
