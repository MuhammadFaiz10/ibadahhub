import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { sendEmail, verifyEmailEmail, emailIsConfigured, isDevMode } from '@/lib/email'

const registerSchema = z.object({
  nama: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  religionId: z.number().int().positive('Agama wajib dipilih'),
  noHp: z.string().optional(),
  alamat: z.string().optional(),
})

export async function POST(req: NextRequest) {
  // Rate limit: 5 register / 1 jam per IP
  const ip = getClientIp(req)
  const limit = rateLimit({
    key: `register:${ip}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  })
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak pendaftaran dari IP ini. Coba lagi dalam ${limit.retryAfterSeconds} detik.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    )
  }

  const body = await req.json()
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const email = parsed.data.email.toLowerCase()

  const emailExists = await prisma.user.findUnique({ where: { email } })
  if (emailExists) {
    return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 })
  }

  const religion = await prisma.religion.findUnique({
    where: { id: parsed.data.religionId, deletedAt: null },
  })
  if (!religion) {
    return NextResponse.json({ error: 'Agama tidak ditemukan' }, { status: 404 })
  }

  const hashed = await bcrypt.hash(parsed.data.password, 12)

  const user = await prisma.user.create({
    data: {
      nama: parsed.data.nama,
      email,
      password: hashed,
      role: 'JEMAAH',
      religionId: parsed.data.religionId,
      status: true,
      // emailVerified: null  → biar harus verifikasi via email
    },
  })

  await prisma.jemaah.create({
    data: {
      userId: user.id,
      religionId: parsed.data.religionId,
      nama: parsed.data.nama,
      email,
      noHp: parsed.data.noHp,
      alamat: parsed.data.alamat,
    },
  })

  // Buat token verifikasi (24 jam)
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  })

  // Kirim email verifikasi
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`

  await sendEmail({
    to: email,
    subject: 'Verifikasi Email — IbadahHub',
    html: verifyEmailEmail({ nama: parsed.data.nama, verifyUrl }),
  })

  return NextResponse.json(
    {
      message: 'Akun berhasil dibuat. Silakan cek email Anda untuk verifikasi.',
      requireVerification: true,
      // Dev fallback: kalau email belum dikonfigurasi & sedang dev, kirim URL verifikasi langsung
      ...(isDevMode && !emailIsConfigured ? { devVerifyUrl: verifyUrl } : {}),
    },
    { status: 201 }
  )
}
