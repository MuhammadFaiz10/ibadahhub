import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pengumumanUpdateSchema } from '@/lib/validations/pengumuman'

function canManagePengumuman(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  if (session.user.role === 'SUPERADMIN') return true
  if (session.user.role !== 'PENGURUS') return false
  return session.user.subRole === 'KETUA' || session.user.subRole === 'SEKRETARIS'
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const pengumuman = await prisma.pengumuman.findUnique({
    where: { id, deletedAt: null },
    include: { religion: { select: { id: true, nama: true } } },
  })
  if (!pengumuman) return NextResponse.json({ error: 'Pengumuman tidak ditemukan' }, { status: 404 })

  if (
    session.user.role !== 'SUPERADMIN' &&
    pengumuman.religionId !== session.user.religionId
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // JEMAAH hanya boleh lihat AKTIF
  if (session.user.role === 'JEMAAH' && pengumuman.status !== 'AKTIF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ data: pengumuman })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManagePengumuman(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const pengumuman = await prisma.pengumuman.findUnique({ where: { id, deletedAt: null } })
  if (!pengumuman) return NextResponse.json({ error: 'Pengumuman tidak ditemukan' }, { status: 404 })

  if (session.user.role === 'PENGURUS' && pengumuman.religionId !== session.user.religionId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = pengumumanUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  if (
    session.user.role === 'PENGURUS' &&
    parsed.data.religionId !== undefined &&
    parsed.data.religionId !== pengumuman.religionId
  ) {
    return NextResponse.json(
      { error: 'Tidak dapat memindahkan pengumuman ke agama lain' },
      { status: 403 }
    )
  }

  const updateData: Record<string, unknown> = { ...parsed.data }
  if (typeof updateData.tanggalPublish === 'string') {
    updateData.tanggalPublish = new Date(updateData.tanggalPublish as string)
  }
  if (updateData.expireDate === '' || updateData.expireDate === undefined) {
    delete updateData.expireDate
  } else if (typeof updateData.expireDate === 'string') {
    updateData.expireDate = new Date(updateData.expireDate as string)
  }

  const updated = await prisma.pengumuman.update({
    where: { id },
    data: updateData,
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'UPDATE',
      model: 'Pengumuman',
      recordId: id,
      detail: `Update pengumuman: ${updated.judul}`,
    },
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManagePengumuman(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const pengumuman = await prisma.pengumuman.findUnique({ where: { id, deletedAt: null } })
  if (!pengumuman) return NextResponse.json({ error: 'Pengumuman tidak ditemukan' }, { status: 404 })

  if (session.user.role === 'PENGURUS' && pengumuman.religionId !== session.user.religionId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { alasan } = await req.json()
  if (!alasan?.trim()) {
    return NextResponse.json({ error: 'Alasan penghapusan wajib diisi' }, { status: 400 })
  }

  await prisma.pengumuman.update({
    where: { id },
    data: { deletedAt: new Date(), deletedReason: alasan },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'DELETE',
      model: 'Pengumuman',
      recordId: id,
      detail: alasan,
    },
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManagePengumuman(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const pengumuman = await prisma.pengumuman.findUnique({ where: { id } })
  if (!pengumuman) return NextResponse.json({ error: 'Pengumuman tidak ditemukan' }, { status: 404 })
  if (!pengumuman.deletedAt) {
    return NextResponse.json({ error: 'Pengumuman tidak dalam kondisi dihapus' }, { status: 400 })
  }

  if (session.user.role === 'PENGURUS' && pengumuman.religionId !== session.user.religionId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.pengumuman.update({
    where: { id },
    data: { deletedAt: null, deletedReason: null },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'RESTORE',
      model: 'Pengumuman',
      recordId: id,
      detail: `Memulihkan pengumuman: ${pengumuman.judul}`,
    },
  })

  return NextResponse.json({ success: true })
}
