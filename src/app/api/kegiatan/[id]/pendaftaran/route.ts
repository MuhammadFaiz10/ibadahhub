import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function canManageKegiatan(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  if (session.user.role === 'SUPERADMIN') return true
  if (session.user.role !== 'PENGURUS') return false
  return session.user.subRole === 'KETUA' || session.user.subRole === 'SEKRETARIS'
}

// GET /api/kegiatan/:id/pendaftaran — list semua pendaftaran (pengurus konten)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageKegiatan(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const kegiatan = await prisma.kegiatan.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      namaKegiatan: true,
      tanggal: true,
      waktuMulai: true,
      lokasi: true,
      kapasitas: true,
      religionId: true,
      status: true,
    },
  })
  if (!kegiatan) return NextResponse.json({ error: 'Kegiatan tidak ditemukan' }, { status: 404 })

  if (
    session.user.role === 'PENGURUS' &&
    kegiatan.religionId !== session.user.religionId
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const pendaftaran = await prisma.kegiatanPendaftaran.findMany({
    where: { kegiatanId: id },
    orderBy: { createdAt: 'asc' },
    include: {
      user: {
        select: {
          id: true,
          nama: true,
          email: true,
          role: true,
          noHp: true,
        },
      },
    },
  })

  return NextResponse.json({ data: pendaftaran, kegiatan })
}
