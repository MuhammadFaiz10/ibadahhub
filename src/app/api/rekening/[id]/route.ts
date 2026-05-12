import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rekeningUpdateSchema } from '@/lib/validations/rekening'

function canManageRekening(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  if (session.user.role === 'SUPERADMIN') return true
  if (session.user.role !== 'PENGURUS') return false
  return session.user.subRole === 'KETUA'
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  const rekening = await prisma.rekening.findUnique({
    where: { id },
    include: { religion: { select: { id: true, nama: true } } },
  })
  if (!rekening) return NextResponse.json({ error: 'Rekening tidak ditemukan' }, { status: 404 })

  if (
    session.user.role !== 'SUPERADMIN' &&
    rekening.religionId !== session.user.religionId
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ data: rekening })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageRekening(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  const rekening = await prisma.rekening.findUnique({ where: { id } })
  if (!rekening) return NextResponse.json({ error: 'Rekening tidak ditemukan' }, { status: 404 })

  if (session.user.role === 'PENGURUS' && rekening.religionId !== session.user.religionId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = rekeningUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const updateData: Record<string, unknown> = { ...parsed.data }
  if (updateData.catatan === '') updateData.catatan = null

  const updated = await prisma.rekening.update({ where: { id }, data: updateData })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'UPDATE',
      model: 'Rekening',
      recordId: id,
      detail: `Update rekening ${updated.namaBank}`,
    },
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageRekening(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  const rekening = await prisma.rekening.findUnique({ where: { id } })
  if (!rekening) return NextResponse.json({ error: 'Rekening tidak ditemukan' }, { status: 404 })

  if (session.user.role === 'PENGURUS' && rekening.religionId !== session.user.religionId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Rekening tidak punya soft delete — hard delete (hati-hati: cek apakah ada relasi donasi yang merefer)
  await prisma.rekening.delete({ where: { id } })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'DELETE',
      model: 'Rekening',
      recordId: id,
      detail: `Hapus rekening ${rekening.namaBank} ${rekening.nomorRekening}`,
    },
  })

  return NextResponse.json({ success: true })
}
