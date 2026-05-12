import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/notifikasi/unread
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const count = await prisma.notifikasi.count({
    where: { userId: Number(session.user.id), dibaca: false },
  })

  return NextResponse.json({ count })
}
