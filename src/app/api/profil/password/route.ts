import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { passwordChangeSchema } from '@/lib/validations/profil'
import bcrypt from 'bcryptjs'

// POST /api/profil/password — ganti password sendiri
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = passwordChangeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const userId = Number(session.user.id)
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: { id: true, password: true },
  })
  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  if (!user.password) {
    return NextResponse.json({ error: 'Password belum diatur' }, { status: 400 })
  }

  const validOld = await bcrypt.compare(parsed.data.passwordLama, user.password)
  if (!validOld) {
    return NextResponse.json({ error: 'Password lama tidak sesuai' }, { status: 400 })
  }

  const sameAsOld = await bcrypt.compare(parsed.data.passwordBaru, user.password)
  if (sameAsOld) {
    return NextResponse.json(
      { error: 'Password baru tidak boleh sama dengan password lama' },
      { status: 400 }
    )
  }

  const hashed = await bcrypt.hash(parsed.data.passwordBaru, 12)
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  })

  await prisma.activityLog.create({
    data: {
      userId,
      aksi: 'UPDATE',
      model: 'User',
      recordId: userId,
      detail: 'Ganti password sendiri',
    },
  })

  return NextResponse.json({ success: true })
}
