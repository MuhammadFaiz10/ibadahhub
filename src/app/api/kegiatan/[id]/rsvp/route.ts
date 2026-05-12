import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/kegiatan/:id/rsvp — info pendaftaran user sendiri + ringkasan
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const kegiatan = await prisma.kegiatan.findUnique({
    where: { id, deletedAt: null },
    select: { id: true, religionId: true, kapasitas: true, status: true },
  })
  if (!kegiatan) return NextResponse.json({ error: 'Kegiatan tidak ditemukan' }, { status: 404 })

  const userId = Number(session.user.id)
  const [myPendaftaran, terdaftarCount] = await Promise.all([
    prisma.kegiatanPendaftaran.findUnique({
      where: { kegiatanId_userId: { kegiatanId: id, userId } },
    }),
    prisma.kegiatanPendaftaran.count({
      where: { kegiatanId: id, status: { in: ['TERDAFTAR', 'HADIR'] } },
    }),
  ])

  return NextResponse.json({
    me: myPendaftaran,
    terdaftarCount,
    kapasitas: kegiatan.kapasitas,
    full: kegiatan.kapasitas != null && terdaftarCount >= kegiatan.kapasitas,
    bisaDaftar: kegiatan.status === 'UPCOMING' || kegiatan.status === 'ONGOING',
  })
}

// POST /api/kegiatan/:id/rsvp — daftar / re-aktifkan pendaftaran
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const kegiatan = await prisma.kegiatan.findUnique({
    where: { id, deletedAt: null },
    select: { id: true, religionId: true, kapasitas: true, status: true, namaKegiatan: true },
  })
  if (!kegiatan) return NextResponse.json({ error: 'Kegiatan tidak ditemukan' }, { status: 404 })

  // Hanya kegiatan UPCOMING/ONGOING yang bisa didaftari
  if (kegiatan.status === 'SELESAI' || kegiatan.status === 'DIBATALKAN') {
    return NextResponse.json(
      { error: 'Kegiatan ini tidak menerima pendaftaran lagi' },
      { status: 400 }
    )
  }

  // Hanya user di religion yang sama (kecuali SUPERADMIN — tapi superadmin biasanya tidak RSVP)
  if (
    session.user.role !== 'SUPERADMIN' &&
    kegiatan.religionId !== session.user.religionId
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const userId = Number(session.user.id)
  const body = await req.json().catch(() => ({}))
  const catatan = typeof body.catatan === 'string' ? body.catatan.slice(0, 300) : undefined

  // Cek kapasitas
  if (kegiatan.kapasitas != null) {
    const aktifCount = await prisma.kegiatanPendaftaran.count({
      where: {
        kegiatanId: id,
        status: { in: ['TERDAFTAR', 'HADIR'] },
        NOT: { userId },
      },
    })
    if (aktifCount >= kegiatan.kapasitas) {
      return NextResponse.json(
        { error: 'Kuota kegiatan sudah penuh' },
        { status: 400 }
      )
    }
  }

  const pendaftaran = await prisma.kegiatanPendaftaran.upsert({
    where: { kegiatanId_userId: { kegiatanId: id, userId } },
    create: {
      kegiatanId: id,
      userId,
      status: 'TERDAFTAR',
      catatan: catatan ?? null,
    },
    update: {
      status: 'TERDAFTAR',
      catatan: catatan ?? null,
    },
  })

  await prisma.activityLog.create({
    data: {
      userId,
      aksi: 'CREATE',
      model: 'KegiatanPendaftaran',
      recordId: pendaftaran.id,
      detail: `Daftar kegiatan: ${kegiatan.namaKegiatan}`,
    },
  })

  return NextResponse.json({ data: pendaftaran })
}

// DELETE /api/kegiatan/:id/rsvp — batalkan pendaftaran
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const userId = Number(session.user.id)
  const existing = await prisma.kegiatanPendaftaran.findUnique({
    where: { kegiatanId_userId: { kegiatanId: id, userId } },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Anda belum terdaftar di kegiatan ini' }, { status: 404 })
  }

  await prisma.kegiatanPendaftaran.update({
    where: { kegiatanId_userId: { kegiatanId: id, userId } },
    data: { status: 'BATAL' },
  })

  await prisma.activityLog.create({
    data: {
      userId,
      aksi: 'UPDATE',
      model: 'KegiatanPendaftaran',
      recordId: existing.id,
      detail: 'Batalkan pendaftaran kegiatan',
    },
  })

  return NextResponse.json({ success: true })
}
