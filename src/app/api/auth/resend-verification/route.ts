import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendEmail, verifyEmailEmail, emailIsConfigured, isDevMode } from '@/lib/email'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const schema = z.object({
  email: z.string().email('Format email tidak valid'),
})

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const limit = rateLimit({
    key: `resend-verify:${ip}`,
    limit: 3,
    windowMs: 15 * 60 * 1000,
  })
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak permintaan. Coba lagi dalam ${limit.retryAfterSeconds} detik.` },
      { status: 429 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const email = parsed.data.email.toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email, deletedAt: null },
    select: { nama: true, emailVerified: true },
  })

  if (!user) {
    // Selalu return success untuk hindari user enumeration
    return NextResponse.json({ success: true })
  }

  if (user.emailVerified) {
    return NextResponse.json({
      success: true,
      alreadyVerified: true,
    })
  }

  // Hapus token lama untuk email ini
  await prisma.verificationToken.deleteMany({ where: { identifier: email } })

  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`

  await sendEmail({
    to: email,
    subject: 'Verifikasi Email — IbadahHub',
    html: verifyEmailEmail({ nama: user.nama, verifyUrl }),
  })

  return NextResponse.json({
    success: true,
    ...(isDevMode && !emailIsConfigured ? { devVerifyUrl: verifyUrl } : {}),
  })
}
