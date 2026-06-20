import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { jemaahUpdateSchema } from '@/lib/validations/jemaah'

function canManageJemaah(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  if (session.user.role === 'SUPERADMIN') return true
  if (session.user.role !== 'PENGURUS') return false
  return session.user.subRole === 'KETUA' || session.user.subRole === 'SEKRETARIS'
}

// GET /api/jemaah/:id
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageJemaah(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const jemaah = await prisma.user.findFirst({
    where: { id, role: 'JEMAAH', deletedAt: null },
    select: {
      id: true,
      nama: true,
      email: true,
      noHp: true,
      alamat: true,
      status: true,
      religionId: true,
      tempatIbadahId: true,
      createdAt: true,
      religion: { select: { id: true, nama: true } },
      tempatIbadah: { select: { id: true, nama: true, slug: true } },
    },
  })
  if (!jemaah) return NextResponse.json({ error: 'Jemaah tidak ditemukan' }, { status: 404 })

  if (session.user.role === 'PENGURUS' && jemaah.tempatIbadahId !== session.user.tempatIbadahId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ data: jemaah })
}

// PUT /api/jemaah/:id
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageJemaah(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const jemaah = await prisma.user.findFirst({ where: { id, role: 'JEMAAH', deletedAt: null } })
  if (!jemaah) return NextResponse.json({ error: 'Jemaah tidak ditemukan' }, { status: 404 })

  if (session.user.role === 'PENGURUS' && jemaah.tempatIbadahId !== session.user.tempatIbadahId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = jemaahUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // PENGURUS tidak boleh pindahkan jemaah ke agama / tempat ibadah lain
  const isSuperAdmin = session.user.role === 'SUPERADMIN'
  if (!isSuperAdmin) {
    if (
      parsed.data.religionId !== undefined &&
      parsed.data.religionId !== jemaah.religionId
    ) {
      return NextResponse.json(
        { error: 'Tidak dapat memindahkan jemaah ke agama lain' },
        { status: 403 }
      )
    }
    if (
      parsed.data.tempatIbadahId !== undefined &&
      parsed.data.tempatIbadahId !== jemaah.tempatIbadahId
    ) {
      return NextResponse.json(
        { error: 'Tidak dapat memindahkan jemaah ke tempat ibadah lain' },
        { status: 403 }
      )
    }
  } else if (
    parsed.data.tempatIbadahId !== undefined &&
    parsed.data.tempatIbadahId !== jemaah.tempatIbadahId
  ) {
    // SUPERADMIN ingin pindahkan ke tempat ibadah lain: validasi konsistensi
    const ti = await prisma.tempatIbadah.findUnique({
      where: { id: parsed.data.tempatIbadahId },
    })
    if (!ti || ti.deletedAt) {
      return NextResponse.json({ error: 'Tempat ibadah tidak ditemukan' }, { status: 404 })
    }
    const targetReligionId = parsed.data.religionId ?? jemaah.religionId
    if (ti.religionId !== targetReligionId) {
      return NextResponse.json(
        { error: 'Tempat ibadah tidak sesuai dengan agama' },
        { status: 400 }
      )
    }
  }

  const updateData: Record<string, unknown> = { ...parsed.data }
  if (updateData.email === '') updateData.email = null
  if (updateData.noHp === '') updateData.noHp = null
  if (updateData.alamat === '') updateData.alamat = null

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'UPDATE',
      model: 'User',
      recordId: id,
      detail: `Memperbarui jemaah: ${updated.nama}`,
    },
  })

  return NextResponse.json({ data: updated })
}

// DELETE /api/jemaah/:id — soft delete
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageJemaah(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const jemaah = await prisma.user.findFirst({ where: { id, role: 'JEMAAH', deletedAt: null } })
  if (!jemaah) return NextResponse.json({ error: 'Jemaah tidak ditemukan' }, { status: 404 })

  if (session.user.role === 'PENGURUS' && jemaah.tempatIbadahId !== session.user.tempatIbadahId) {
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

// PATCH /api/jemaah/:id — restore
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageJemaah(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const jemaah = await prisma.user.findFirst({ where: { id, role: 'JEMAAH' } })
  if (!jemaah) return NextResponse.json({ error: 'Jemaah tidak ditemukan' }, { status: 404 })
  if (!jemaah.deletedAt) {
    return NextResponse.json({ error: 'Jemaah tidak dalam kondisi dihapus' }, { status: 400 })
  }

  if (session.user.role === 'PENGURUS' && jemaah.tempatIbadahId !== session.user.tempatIbadahId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
      detail: `Memulihkan jemaah: ${jemaah.nama}`,
    },
  })

  return NextResponse.json({ success: true })
}
