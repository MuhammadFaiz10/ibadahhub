import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { jadwalIbadahUpdateSchema } from '@/lib/validations/jadwal-ibadah'

function canManageJadwal(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  if (session.user.role === 'SUPERADMIN') return true
  if (session.user.role !== 'PENGURUS') return false
  return session.user.subRole === 'KETUA' || session.user.subRole === 'SEKRETARIS'
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  const jadwal = await prisma.jadwalIbadah.findUnique({
    where: { id, deletedAt: null },
    include: { religion: true, tempatIbadah: true }
  })

  if (!jadwal) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  if (session.user.role !== 'SUPERADMIN' && jadwal.tempatIbadahId !== session.user.tempatIbadahId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ data: jadwal })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageJadwal(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = Number(params.id)
  const jadwal = await prisma.jadwalIbadah.findUnique({ where: { id, deletedAt: null } })
  if (!jadwal) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  if (session.user.role !== 'SUPERADMIN' && jadwal.tempatIbadahId !== session.user.tempatIbadahId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = jadwalIbadahUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updateData: any = { ...parsed.data }
  if (updateData.tanggal) updateData.tanggal = new Date(updateData.tanggal)
  if (updateData.waktuSelesai === '') updateData.waktuSelesai = null
  if (updateData.pemimpin === '') updateData.pemimpin = null
  if (updateData.pendamping === '') updateData.pendamping = null
  if (updateData.lokasi === '') updateData.lokasi = null
  if (updateData.catatan === '') updateData.catatan = null

  const updated = await prisma.jadwalIbadah.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageJadwal(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = Number(params.id)
  const jadwal = await prisma.jadwalIbadah.findUnique({ where: { id, deletedAt: null } })
  if (!jadwal) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  if (session.user.role !== 'SUPERADMIN' && jadwal.tempatIbadahId !== session.user.tempatIbadahId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.jadwalIbadah.update({
    where: { id },
    data: { deletedAt: new Date() }
  })

  return NextResponse.json({ success: true })
}
