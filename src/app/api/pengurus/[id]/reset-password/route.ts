import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { createNotifikasi } from '@/lib/utils'
import { sendEmail, adminPasswordResetEmail } from '@/lib/email'

function canManagePengurus(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  return (
    session.user.role === 'SUPERADMIN' ||
    (session.user.role === 'PENGURUS' && session.user.subRole === 'KETUA')
  )
}

// POST /api/pengurus/:id/reset-password
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManagePengurus(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const pengurus = await prisma.user.findUnique({
    where: { id, role: 'PENGURUS', deletedAt: null },
    select: { id: true, nama: true, email: true, religionId: true },
  })
  if (!pengurus) return NextResponse.json({ error: 'Pengurus tidak ditemukan' }, { status: 404 })

  if (session.user.role === 'PENGURUS' && pengurus.religionId !== session.user.religionId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const generatedPassword = crypto.randomBytes(8).toString('hex')
  const hashedPassword = await bcrypt.hash(generatedPassword, 12)

  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  })

  await createNotifikasi(
    pengurus.id,
    'Password Anda Direset',
    'Password akun Anda baru saja direset oleh administrator. Silakan minta password baru ke admin Anda dan ganti setelah login.',
    '/profil'
  )

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'UPDATE',
      model: 'User',
      recordId: id,
      detail: `Reset password pengurus: ${pengurus.nama}`,
    },
  })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'
  await sendEmail({
    to: pengurus.email!,
    subject: 'Password Anda Direset — IbadahHub',
    html: adminPasswordResetEmail({
      nama: pengurus.nama,
      password: generatedPassword,
      loginUrl: `${baseUrl}/login`,
    }),
  })

  return NextResponse.json({ generatedPassword, nama: pengurus.nama })
}
