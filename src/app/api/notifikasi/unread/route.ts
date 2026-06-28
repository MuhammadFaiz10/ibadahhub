import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkUpcomingWorshipSchedules } from '@/lib/notification-helper'

// GET /api/notifikasi/unread
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = Number(session.user.id)
  await checkUpcomingWorshipSchedules(userId)

  const count = await prisma.notifikasi.count({
    where: { userId, dibaca: false },
  })

  return NextResponse.json({ count })
}
