import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH /api/notifikasi/:id — toggle dibaca/belum
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  const userId = Number(session.user.id)
  const notif = await prisma.notifikasi.findUnique({ where: { id } })
  if (!notif || notif.userId !== userId) {
    return NextResponse.json({ error: 'Notifikasi tidak ditemukan' }, { status: 404 })
  }

  const updated = await prisma.notifikasi.update({
    where: { id },
    data: { dibaca: true },
  })

  return NextResponse.json({ data: updated })
}

// DELETE /api/notifikasi/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  const userId = Number(session.user.id)
  const notif = await prisma.notifikasi.findUnique({ where: { id } })
  if (!notif || notif.userId !== userId) {
    return NextResponse.json({ error: 'Notifikasi tidak ditemukan' }, { status: 404 })
  }

  await prisma.notifikasi.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
