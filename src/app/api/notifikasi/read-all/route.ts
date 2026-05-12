import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/notifikasi/read-all — tandai semua notifikasi user sebagai dibaca
export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.notifikasi.updateMany({
    where: { userId: Number(session.user.id), dibaca: false },
    data: { dibaca: true },
  })

  return NextResponse.json({ success: true })
}
