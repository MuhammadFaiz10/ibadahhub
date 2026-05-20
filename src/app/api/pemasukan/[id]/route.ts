import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pemasukanUpdateSchema } from '@/lib/validations/pemasukan'
import { validateScopeUpdate, isScopeError } from '@/lib/scope'

function canManageKeuangan(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  if (session.user.role === 'SUPERADMIN') return true
  if (session.user.role !== 'PENGURUS') return false
  return session.user.subRole === 'KETUA' || session.user.subRole === 'BENDAHARA'
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageKeuangan(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  const pemasukan = await prisma.pemasukan.findUnique({
    where: { id, deletedAt: null },
    include: {
      religion: { select: { id: true, nama: true } },
      tempatIbadah: { select: { id: true, nama: true, slug: true } },
      rekening: { select: { id: true, namaBank: true, nomorRekening: true } }
    },
  })
  if (!pemasukan) return NextResponse.json({ error: 'Pemasukan tidak ditemukan' }, { status: 404 })

  if (
    session.user.role === 'PENGURUS' &&
    pemasukan.tempatIbadahId !== session.user.tempatIbadahId
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ data: pemasukan })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageKeuangan(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  const pemasukan = await prisma.pemasukan.findUnique({ where: { id, deletedAt: null } })
  if (!pemasukan) return NextResponse.json({ error: 'Pemasukan tidak ditemukan' }, { status: 404 })

  if (session.user.role === 'PENGURUS' && pemasukan.tempatIbadahId !== session.user.tempatIbadahId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = pemasukanUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const scopeRes = await validateScopeUpdate(
    session,
    { religionId: pemasukan.religionId, tempatIbadahId: pemasukan.tempatIbadahId },
    { religionId: parsed.data.religionId, tempatIbadahId: parsed.data.tempatIbadahId }
  )
  if (isScopeError(scopeRes)) {
    return NextResponse.json({ error: scopeRes.error }, { status: scopeRes.status })
  }

  const updateData: Record<string, unknown> = { ...parsed.data, ...scopeRes }
  if (typeof updateData.tanggal === 'string') {
    updateData.tanggal = new Date(updateData.tanggal as string)
  }
  if (updateData.bukti === '') updateData.bukti = null
  if (updateData.rekeningId === 0 || updateData.rekeningId === null) {
    updateData.rekeningId = null
  }

  const updated = await prisma.pemasukan.update({ where: { id }, data: updateData })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'UPDATE',
      model: 'Pemasukan',
      recordId: id,
      detail: `Update pemasukan: ${updated.keterangan}`,
    },
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageKeuangan(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  const pemasukan = await prisma.pemasukan.findUnique({ where: { id, deletedAt: null } })
  if (!pemasukan) return NextResponse.json({ error: 'Pemasukan tidak ditemukan' }, { status: 404 })

  if (session.user.role === 'PENGURUS' && pemasukan.tempatIbadahId !== session.user.tempatIbadahId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { alasan } = await req.json()
  if (!alasan?.trim()) {
    return NextResponse.json({ error: 'Alasan penghapusan wajib diisi' }, { status: 400 })
  }

  await prisma.pemasukan.update({
    where: { id },
    data: { deletedAt: new Date(), deletedReason: alasan },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'DELETE',
      model: 'Pemasukan',
      recordId: id,
      detail: alasan,
    },
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageKeuangan(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  const pemasukan = await prisma.pemasukan.findUnique({ where: { id } })
  if (!pemasukan) return NextResponse.json({ error: 'Pemasukan tidak ditemukan' }, { status: 404 })
  if (!pemasukan.deletedAt) {
    return NextResponse.json({ error: 'Pemasukan tidak dalam kondisi dihapus' }, { status: 400 })
  }

  if (session.user.role === 'PENGURUS' && pemasukan.tempatIbadahId !== session.user.tempatIbadahId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.pemasukan.update({
    where: { id },
    data: { deletedAt: null, deletedReason: null },
  })

  return NextResponse.json({ success: true })
}
