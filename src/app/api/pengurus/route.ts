import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pengurusCreateSchema } from '@/lib/validations/pengurus'
import { createNotifikasi } from '@/lib/utils'
import { sendEmail, welcomePengurusEmail } from '@/lib/email'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// GET /api/pengurus?search=&page=1&limit=10&arsip=false
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isSuperAdmin = session.user.role === 'SUPERADMIN'
  const isKetua = session.user.role === 'PENGURUS' && session.user.subRole === 'KETUA'

  if (!isSuperAdmin && !isKetua) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 10)))
  const showArsip = searchParams.get('arsip') === 'true'

  // PENGURUS KETUA hanya lihat tempat ibadah sendiri; SUPERADMIN bisa filter via query.
  const religionIdQ = searchParams.get('religionId')
  const tempatIbadahIdQ = searchParams.get('tempatIbadahId')
  const religionId = isSuperAdmin
    ? religionIdQ ? Number(religionIdQ) : undefined
    : (session.user.religionId ?? undefined)
  const tempatIbadahId = isSuperAdmin
    ? tempatIbadahIdQ ? Number(tempatIbadahIdQ) : undefined
    : (session.user.tempatIbadahId ?? undefined)

  const where = {
    role: 'PENGURUS' as const,
    deletedAt: showArsip ? ({ not: null } as const) : null,
    ...(religionId !== undefined ? { religionId } : {}),
    ...(tempatIbadahId !== undefined ? { tempatIbadahId } : {}),
    ...(search
      ? {
          OR: [
            { nama: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nama: true,
        email: true,
        subRole: true,
        status: true,
        religionId: true,
        tempatIbadahId: true,
        createdAt: true,
        deletedAt: true,
        religion: { select: { nama: true } },
        tempatIbadah: { select: { nama: true, slug: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ data, total, page, limit })
}

// POST /api/pengurus
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isSuperAdmin = session.user.role === 'SUPERADMIN'
  const isKetua = session.user.role === 'PENGURUS' && session.user.subRole === 'KETUA'

  if (!isSuperAdmin && !isKetua) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = pengurusCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // PENGURUS KETUA: paksa scope sendiri, tidak boleh buat KETUA baru
  const safeReligionId = isSuperAdmin ? parsed.data.religionId : session.user.religionId!
  const safeTempatIbadahId = isSuperAdmin
    ? parsed.data.tempatIbadahId
    : session.user.tempatIbadahId!
  if (!safeTempatIbadahId) {
    return NextResponse.json({ error: 'Tempat ibadah wajib dipilih' }, { status: 400 })
  }
  if (!isSuperAdmin && parsed.data.subRole === 'KETUA') {
    return NextResponse.json(
      { error: 'Pengurus Ketua tidak dapat membuat Ketua baru' },
      { status: 403 }
    )
  }

  // Verifikasi religion exists
  const religion = await prisma.religion.findUnique({
    where: { id: safeReligionId, deletedAt: null },
  })
  if (!religion) {
    return NextResponse.json({ error: 'Agama tidak ditemukan' }, { status: 404 })
  }

  // Verifikasi tempat ibadah
  const ti = await prisma.tempatIbadah.findUnique({ where: { id: safeTempatIbadahId } })
  if (!ti || ti.deletedAt) {
    return NextResponse.json({ error: 'Tempat ibadah tidak ditemukan' }, { status: 404 })
  }
  if (ti.religionId !== safeReligionId) {
    return NextResponse.json(
      { error: 'Tempat ibadah tidak sesuai dengan agama' },
      { status: 400 }
    )
  }

  // Cek email unik
  const emailExists = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (emailExists) {
    return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 })
  }

  // Auto-generate password
  const generatedPassword = crypto.randomBytes(8).toString('hex')
  const hashedPassword = await bcrypt.hash(generatedPassword, 12)

  const pengurus = await prisma.user.create({
    data: {
      nama: parsed.data.nama,
      email: parsed.data.email,
      password: hashedPassword,
      role: 'PENGURUS',
      subRole: parsed.data.subRole,
      religionId: safeReligionId,
      tempatIbadahId: safeTempatIbadahId,
      status: true,
    },
  })

  // Notifikasi in-app ke pengurus baru
  await createNotifikasi(
    pengurus.id,
    'Selamat Datang di IbadahHub',
    `Akun Anda sebagai Pengurus ${parsed.data.subRole} telah dibuat. Silakan ganti password Anda setelah login.`,
    '/profil'
  )

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'CREATE',
      model: 'User',
      recordId: pengurus.id,
      detail: `Membuat pengurus: ${pengurus.nama} (${pengurus.subRole}) - ${religion.nama}`,
    },
  })

  // Kirim welcome email (best-effort — kalau gagal tetap return sukses ke admin)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'
  await sendEmail({
    to: pengurus.email,
    subject: 'Akun Pengurus IbadahHub — Detail Login',
    html: welcomePengurusEmail({
      nama: pengurus.nama,
      email: pengurus.email,
      password: generatedPassword,
      subRole: pengurus.subRole ?? '',
      loginUrl: `${baseUrl}/login`,
    }),
  })

  return NextResponse.json(
    { data: { ...pengurus, password: undefined }, generatedPassword },
    { status: 201 }
  )
}
