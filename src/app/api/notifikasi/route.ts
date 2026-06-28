import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkUpcomingWorshipSchedules } from '@/lib/notification-helper'

// GET /api/notifikasi
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = Number(session.user.id)
  await checkUpcomingWorshipSchedules(userId)

  const { searchParams } = req.nextUrl
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(50, Number(searchParams.get('limit') ?? 20))

  const [data, total] = await Promise.all([
    prisma.notifikasi.findMany({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notifikasi.count({ where: { userId } }),
  ])

  return NextResponse.json({ data, total, page, limit })
}
