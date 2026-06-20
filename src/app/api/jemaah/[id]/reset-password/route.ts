import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { createNotifikasi } from '@/lib/utils'
import { sendEmail, adminPasswordResetEmail } from '@/lib/email'

function canManageJemaah(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  if (session.user.role === 'SUPERADMIN') return true
  if (session.user.role !== 'PENGURUS') return false
  return session.user.subRole === 'KETUA' || session.user.subRole === 'SEKRETARIS'
}

// POST /api/jemaah/:id/reset-password
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageJemaah(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const jemaah = await prisma.user.findUnique({
    where: { id, role: 'JEMAAH', deletedAt: null },
    select: {
      id: true,
      nama: true,
      email: true,
      religionId: true,
    },
  })
  if (!jemaah) return NextResponse.json({ error: 'Jemaah tidak ditemukan' }, { status: 404 })

  if (session.user.role === 'PENGURUS' && jemaah.religionId !== session.user.religionId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!jemaah.email) {
    return NextResponse.json(
      { error: 'Jemaah ini belum memiliki email untuk login, tidak bisa reset password' },
      { status: 400 }
    )
  }

  const generatedPassword = crypto.randomBytes(8).toString('hex')
  const hashedPassword = await bcrypt.hash(generatedPassword, 12)

  await prisma.user.update({
    where: { id: jemaah.id },
    data: { password: hashedPassword },
  })

  await createNotifikasi(
    jemaah.id,
    'Password Anda Direset',
    'Password akun Anda baru saja direset oleh administrator. Silakan minta password baru ke pengurus.',
    '/profil'
  )

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'UPDATE',
      model: 'User',
      recordId: jemaah.id,
      detail: `Reset password jemaah: ${jemaah.nama}`,
    },
  })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'
  await sendEmail({
    to: jemaah.email,
    subject: 'Password Anda Direset — IbadahHub',
    html: adminPasswordResetEmail({
      nama: jemaah.nama,
      password: generatedPassword,
      loginUrl: `${baseUrl}/login`,
    }),
  })

  return NextResponse.json({ generatedPassword, nama: jemaah.nama })
}

