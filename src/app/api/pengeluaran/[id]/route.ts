import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pengeluaranUpdateSchema } from '@/lib/validations/pengeluaran'

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

  const pengeluaran = await prisma.pengeluaran.findUnique({
    where: { id, deletedAt: null },
    include: { religion: { select: { id: true, nama: true } } },
  })
  if (!pengeluaran) return NextResponse.json({ error: 'Pengeluaran tidak ditemukan' }, { status: 404 })

  if (
    session.user.role === 'PENGURUS' &&
    pengeluaran.religionId !== session.user.religionId
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ data: pengeluaran })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageKeuangan(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  const pengeluaran = await prisma.pengeluaran.findUnique({ where: { id, deletedAt: null } })
  if (!pengeluaran) return NextResponse.json({ error: 'Pengeluaran tidak ditemukan' }, { status: 404 })

  if (session.user.role === 'PENGURUS' && pengeluaran.religionId !== session.user.religionId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = pengeluaranUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const updateData: Record<string, unknown> = { ...parsed.data }
  if (typeof updateData.tanggal === 'string') {
    updateData.tanggal = new Date(updateData.tanggal as string)
  }
  if (updateData.bukti === '') updateData.bukti = null

  const updated = await prisma.pengeluaran.update({ where: { id }, data: updateData })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'UPDATE',
      model: 'Pengeluaran',
      recordId: id,
      detail: `Update pengeluaran: ${updated.keterangan}`,
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

  const pengeluaran = await prisma.pengeluaran.findUnique({ where: { id, deletedAt: null } })
  if (!pengeluaran) return NextResponse.json({ error: 'Pengeluaran tidak ditemukan' }, { status: 404 })

  if (session.user.role === 'PENGURUS' && pengeluaran.religionId !== session.user.religionId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { alasan } = await req.json()
  if (!alasan?.trim()) {
    return NextResponse.json({ error: 'Alasan penghapusan wajib diisi' }, { status: 400 })
  }

  await prisma.pengeluaran.update({
    where: { id },
    data: { deletedAt: new Date(), deletedReason: alasan },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'DELETE',
      model: 'Pengeluaran',
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

  const pengeluaran = await prisma.pengeluaran.findUnique({ where: { id } })
  if (!pengeluaran) return NextResponse.json({ error: 'Pengeluaran tidak ditemukan' }, { status: 404 })
  if (!pengeluaran.deletedAt) {
    return NextResponse.json({ error: 'Pengeluaran tidak dalam kondisi dihapus' }, { status: 400 })
  }

  if (session.user.role === 'PENGURUS' && pengeluaran.religionId !== session.user.religionId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.pengeluaran.update({
    where: { id },
    data: { deletedAt: null, deletedReason: null },
  })

  return NextResponse.json({ success: true })
}
