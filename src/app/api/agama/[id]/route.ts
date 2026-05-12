import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { agamaUpdateSchema } from '@/lib/validations/agama'

// GET /api/agama/:id
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const agama = await prisma.religion.findUnique({ where: { id } })
  if (!agama) return NextResponse.json({ error: 'Agama tidak ditemukan' }, { status: 404 })

  return NextResponse.json({ data: agama })
}

// PUT /api/agama/:id
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const agama = await prisma.religion.findUnique({ where: { id, deletedAt: null } })
  if (!agama) return NextResponse.json({ error: 'Agama tidak ditemukan' }, { status: 404 })

  const body = await req.json()
  const parsed = agamaUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Cek duplikat nama (jika nama berubah)
  if (parsed.data.nama && parsed.data.nama !== agama.nama) {
    const existing = await prisma.religion.findFirst({
      where: { nama: parsed.data.nama, deletedAt: null, id: { not: id } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Nama agama sudah terdaftar' }, { status: 409 })
    }
  }

  const updated = await prisma.religion.update({
    where: { id },
    data: parsed.data,
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'UPDATE',
      model: 'Religion',
      recordId: id,
      detail: `Memperbarui agama: ${updated.nama}`,
    },
  })

  return NextResponse.json({ data: updated })
}

// DELETE /api/agama/:id — soft delete
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const agama = await prisma.religion.findUnique({ where: { id, deletedAt: null } })
  if (!agama) return NextResponse.json({ error: 'Agama tidak ditemukan' }, { status: 404 })

  const { alasan } = await req.json()
  if (!alasan?.trim()) {
    return NextResponse.json({ error: 'Alasan penghapusan wajib diisi' }, { status: 400 })
  }

  // Cek dependensi aktif
  const [userCount, kegiatanCount] = await Promise.all([
    prisma.user.count({ where: { religionId: id, deletedAt: null } }),
    prisma.kegiatan.count({ where: { religionId: id, deletedAt: null } }),
  ])

  if (userCount > 0 || kegiatanCount > 0) {
    return NextResponse.json(
      {
        error: `Tidak dapat menghapus agama ini. Masih terdapat ${userCount} pengguna dan ${kegiatanCount} kegiatan aktif.`,
      },
      { status: 409 }
    )
  }

  await prisma.religion.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'DELETE',
      model: 'Religion',
      recordId: id,
      detail: alasan,
    },
  })

  return NextResponse.json({ success: true })
}

// PATCH /api/agama/:id — restore
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const agama = await prisma.religion.findUnique({ where: { id } })
  if (!agama) return NextResponse.json({ error: 'Agama tidak ditemukan' }, { status: 404 })
  if (!agama.deletedAt) {
    return NextResponse.json({ error: 'Agama tidak dalam kondisi dihapus' }, { status: 400 })
  }

  await prisma.religion.update({
    where: { id },
    data: { deletedAt: null },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'RESTORE',
      model: 'Religion',
      recordId: id,
      detail: `Memulihkan agama: ${agama.nama}`,
    },
  })

  return NextResponse.json({ success: true })
}
