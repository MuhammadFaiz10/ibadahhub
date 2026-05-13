import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pengurusUpdateSchema } from '@/lib/validations/pengurus'
import { validateScopeUpdate, isScopeError } from '@/lib/scope'

function canManagePengurus(session: { user: { role: string; subRole?: string | null; religionId?: number | null } }) {
  return (
    session.user.role === 'SUPERADMIN' ||
    (session.user.role === 'PENGURUS' && session.user.subRole === 'KETUA')
  )
}

// GET /api/pengurus/:id
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManagePengurus(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const pengurus = await prisma.user.findUnique({
    where: { id, role: 'PENGURUS', deletedAt: null },
    select: {
      id: true,
      nama: true,
      email: true,
      subRole: true,
      status: true,
      religionId: true,
      tempatIbadahId: true,
      fotoProfil: true,
      createdAt: true,
      religion: { select: { id: true, nama: true } },
      tempatIbadah: { select: { id: true, nama: true, slug: true } },
    },
  })
  if (!pengurus) return NextResponse.json({ error: 'Pengurus tidak ditemukan' }, { status: 404 })

  // PENGURUS KETUA: hanya lihat agama sendiri
  if (
    session.user.role === 'PENGURUS' &&
    pengurus.tempatIbadahId !== session.user.tempatIbadahId
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ data: pengurus })
}

// PUT /api/pengurus/:id
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManagePengurus(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const pengurus = await prisma.user.findUnique({
    where: { id, role: 'PENGURUS', deletedAt: null },
  })
  if (!pengurus) return NextResponse.json({ error: 'Pengurus tidak ditemukan' }, { status: 404 })

  if (session.user.role === 'PENGURUS' && pengurus.tempatIbadahId !== session.user.tempatIbadahId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = pengurusUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Email tidak bisa diubah (perlu alur terpisah)
  const { email: _email, ...updateData } = parsed.data

  // PENGURUS KETUA tidak bisa buat/ubah ke KETUA (scope dicek oleh validateScopeUpdate)
  if (session.user.role === 'PENGURUS' && updateData.subRole === 'KETUA') {
    return NextResponse.json({ error: 'Tidak dapat mengubah sub-role ke Ketua' }, { status: 403 })
  }

  // Validasi perubahan scope (agama/tempat ibadah)
  if (pengurus.religionId == null || pengurus.tempatIbadahId == null) {
    return NextResponse.json({ error: 'Data pengurus tidak konsisten' }, { status: 500 })
  }
  const scopeRes = await validateScopeUpdate(
    session,
    { religionId: pengurus.religionId, tempatIbadahId: pengurus.tempatIbadahId },
    { religionId: updateData.religionId, tempatIbadahId: updateData.tempatIbadahId }
  )
  if (isScopeError(scopeRes)) {
    return NextResponse.json({ error: scopeRes.error }, { status: scopeRes.status })
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { ...updateData, ...scopeRes },
    select: {
      id: true,
      nama: true,
      email: true,
      subRole: true,
      status: true,
      religionId: true,
      tempatIbadahId: true,
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'UPDATE',
      model: 'User',
      recordId: id,
      detail: `Memperbarui pengurus: ${updated.nama}`,
    },
  })

  return NextResponse.json({ data: updated })
}

// DELETE /api/pengurus/:id — soft delete
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManagePengurus(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const pengurus = await prisma.user.findUnique({
    where: { id, role: 'PENGURUS', deletedAt: null },
  })
  if (!pengurus) return NextResponse.json({ error: 'Pengurus tidak ditemukan' }, { status: 404 })

  if (session.user.role === 'PENGURUS' && pengurus.tempatIbadahId !== session.user.tempatIbadahId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { alasan } = await req.json()
  if (!alasan?.trim()) {
    return NextResponse.json({ error: 'Alasan penghapusan wajib diisi' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), status: false },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'DELETE',
      model: 'User',
      recordId: id,
      detail: alasan,
    },
  })

  return NextResponse.json({ success: true })
}

// PATCH /api/pengurus/:id — restore
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManagePengurus(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const pengurus = await prisma.user.findUnique({ where: { id, role: 'PENGURUS' } })
  if (!pengurus) return NextResponse.json({ error: 'Pengurus tidak ditemukan' }, { status: 404 })
  if (!pengurus.deletedAt) {
    return NextResponse.json({ error: 'Pengurus tidak dalam kondisi dihapus' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: null, status: true },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'RESTORE',
      model: 'User',
      recordId: id,
      detail: `Memulihkan pengurus: ${pengurus.nama}`,
    },
  })

  return NextResponse.json({ success: true })
}
