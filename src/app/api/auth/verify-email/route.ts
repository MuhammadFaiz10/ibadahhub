import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// GET /api/auth/verify-email?token=...
// Atau POST untuk integrasi dari client
async function handleVerify(token: string) {
  const verToken = await prisma.verificationToken.findUnique({
    where: { token },
  })
  if (!verToken) {
    return { ok: false, status: 400, error: 'Token tidak valid atau sudah digunakan' }
  }
  if (verToken.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => undefined)
    return { ok: false, status: 400, error: 'Token kedaluwarsa, silakan minta ulang' }
  }

  const user = await prisma.user.findUnique({
    where: { email: verToken.identifier, deletedAt: null },
    select: { id: true, emailVerified: true },
  })
  if (!user) {
    return { ok: false, status: 404, error: 'Akun tidak ditemukan' }
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.deleteMany({ where: { token } }),
  ])

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      aksi: 'UPDATE',
      model: 'User',
      recordId: user.id,
      detail: 'Email diverifikasi',
    },
  }).catch(() => undefined)

  return { ok: true, alreadyVerified: !!user.emailVerified }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const limit = rateLimit({
    key: `verify-email:${ip}`,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  })
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${limit.retryAfterSeconds} detik.` },
      { status: 429 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const token = typeof body.token === 'string' ? body.token : ''
  if (!token) return NextResponse.json({ error: 'Token wajib disertakan' }, { status: 400 })

  const result = await handleVerify(token)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ success: true, alreadyVerified: result.alreadyVerified })
}
