import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendEmail, forgotPasswordEmail, emailIsConfigured, isDevMode } from '@/lib/email'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const schema = z.object({
  email: z.string().email('Format email tidak valid'),
})

// POST /api/auth/forgot-password
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const limit = rateLimit({
    key: `forgot-password:${ip}`,
    limit: 5,
    windowMs: 60 * 60 * 1000, // 1 jam
  })
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak permintaan. Coba lagi dalam ${limit.retryAfterSeconds} detik.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
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
    select: { id: true, nama: true, email: true, status: true },
  })

  // Selalu tampilkan respon sukses untuk mencegah enumeration attack
  // Kalau user tidak ada / nonaktif, hanya log saja
  if (!user || !user.status) {
    console.warn('[forgot-password] requested for non-existent or inactive user:', email)
    return NextResponse.json({ success: true })
  }

  // Hapus token lama untuk email ini supaya hanya ada 1 link aktif
  await prisma.verificationToken.deleteMany({ where: { identifier: email } })

  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 jam

  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  // Kirim email — kalau gagal, tetap return sukses ke user (token sudah ke DB, dan log akan kasih tahu kita)
  await sendEmail({
    to: user.email,
    subject: 'Reset Password — IbadahHub',
    html: forgotPasswordEmail({ nama: user.nama, resetUrl }),
  })

  return NextResponse.json({
    success: true,
    // Dev fallback: tampilkan link langsung kalau email belum dikonfigurasi
    ...(isDevMode && !emailIsConfigured ? { devResetUrl: resetUrl } : {}),
  })
}
