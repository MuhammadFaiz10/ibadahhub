import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { kegiatanUpdateSchema } from '@/lib/validations/kegiatan'
import { validateScopeUpdate, isScopeError } from '@/lib/scope'

function canManageKegiatan(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  if (session.user.role === 'SUPERADMIN') return true
  if (session.user.role !== 'PENGURUS') return false
  return session.user.subRole === 'KETUA' || session.user.subRole === 'SEKRETARIS'
}

// GET /api/kegiatan/:id
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const kegiatan = await prisma.kegiatan.findUnique({
    where: { id, deletedAt: null },
    include: { religion: { select: { id: true, nama: true } }, tempatIbadah: { select: { id: true, nama: true, slug: true } } },
  })
  if (!kegiatan) return NextResponse.json({ error: 'Kegiatan tidak ditemukan' }, { status: 404 })

  // PENGURUS / JEMAAH harus se-agama
  if (
    session.user.role !== 'SUPERADMIN' &&
    kegiatan.tempatIbadahId !== session.user.tempatIbadahId
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ data: kegiatan })
}

// PUT /api/kegiatan/:id
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageKegiatan(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const kegiatan = await prisma.kegiatan.findUnique({ where: { id, deletedAt: null } })
  if (!kegiatan) return NextResponse.json({ error: 'Kegiatan tidak ditemukan' }, { status: 404 })

  if (session.user.role === 'PENGURUS' && kegiatan.tempatIbadahId !== session.user.tempatIbadahId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = kegiatanUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const scopeRes = await validateScopeUpdate(
    session,
    { religionId: kegiatan.religionId, tempatIbadahId: kegiatan.tempatIbadahId },
    { religionId: parsed.data.religionId, tempatIbadahId: parsed.data.tempatIbadahId }
  )
  if (isScopeError(scopeRes)) {
    return NextResponse.json({ error: scopeRes.error }, { status: scopeRes.status })
  }

  const updateData: Record<string, unknown> = { ...parsed.data, ...scopeRes }
  if (typeof updateData.tanggal === 'string') {
    updateData.tanggal = new Date(updateData.tanggal as string)
  }
  if (updateData.waktuSelesai === '') updateData.waktuSelesai = null
  if (updateData.pemimpin === '') updateData.pemimpin = null
  if (updateData.deskripsi === '') updateData.deskripsi = null

  const updated = await prisma.kegiatan.update({
    where: { id },
    data: updateData,
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'UPDATE',
      model: 'Kegiatan',
      recordId: id,
      detail: `Update kegiatan: ${updated.namaKegiatan}`,
    },
  })

  return NextResponse.json({ data: updated })
}

// DELETE /api/kegiatan/:id — soft delete
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageKegiatan(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const kegiatan = await prisma.kegiatan.findUnique({ where: { id, deletedAt: null } })
  if (!kegiatan) return NextResponse.json({ error: 'Kegiatan tidak ditemukan' }, { status: 404 })

  if (session.user.role === 'PENGURUS' && kegiatan.tempatIbadahId !== session.user.tempatIbadahId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { alasan } = await req.json()
  if (!alasan?.trim()) {
    return NextResponse.json({ error: 'Alasan penghapusan wajib diisi' }, { status: 400 })
  }

  await prisma.kegiatan.update({
    where: { id },
    data: { deletedAt: new Date(), deletedReason: alasan },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'DELETE',
      model: 'Kegiatan',
      recordId: id,
      detail: alasan,
    },
  })

  return NextResponse.json({ success: true })
}

// PATCH /api/kegiatan/:id — restore
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageKegiatan(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const kegiatan = await prisma.kegiatan.findUnique({ where: { id } })
  if (!kegiatan) return NextResponse.json({ error: 'Kegiatan tidak ditemukan' }, { status: 404 })
  if (!kegiatan.deletedAt) {
    return NextResponse.json({ error: 'Kegiatan tidak dalam kondisi dihapus' }, { status: 400 })
  }

  if (session.user.role === 'PENGURUS' && kegiatan.tempatIbadahId !== session.user.tempatIbadahId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.kegiatan.update({
    where: { id },
    data: { deletedAt: null, deletedReason: null },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'RESTORE',
      model: 'Kegiatan',
      recordId: id,
      detail: `Memulihkan kegiatan: ${kegiatan.namaKegiatan}`,
    },
  })

  return NextResponse.json({ success: true })
}
