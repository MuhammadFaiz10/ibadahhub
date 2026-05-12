import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const schema = z
  .object({
    token: z.string().min(10, 'Token tidak valid'),
    passwordBaru: z.string().min(8, 'Password minimal 8 karakter'),
    konfirmasi: z.string().min(1),
  })
  .refine((d) => d.passwordBaru === d.konfirmasi, {
    message: 'Konfirmasi password tidak cocok',
    path: ['konfirmasi'],
  })

// POST /api/auth/reset-password
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const limit = rateLimit({
    key: `reset-password:${ip}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  })
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${limit.retryAfterSeconds} detik.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    )
  }

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const verToken = await prisma.verificationToken.findUnique({
    where: { token: parsed.data.token },
  })
  if (!verToken) {
    return NextResponse.json({ error: 'Token tidak valid atau sudah digunakan' }, { status: 400 })
  }
  if (verToken.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token: parsed.data.token } })
    return NextResponse.json({ error: 'Token sudah kedaluwarsa, silakan minta link baru' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email: verToken.identifier, deletedAt: null },
    select: { id: true, status: true },
  })
  if (!user || !user.status) {
    return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 })
  }

  const hashed = await bcrypt.hash(parsed.data.passwordBaru, 12)

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { password: hashed } }),
    prisma.verificationToken.delete({ where: { token: parsed.data.token } }),
  ])

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      aksi: 'UPDATE',
      model: 'User',
      recordId: user.id,
      detail: 'Reset password via email link',
    },
  })

  return NextResponse.json({ success: true })
}
