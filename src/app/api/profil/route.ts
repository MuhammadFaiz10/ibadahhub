import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { profilUpdateSchema } from '@/lib/validations/profil'

// GET /api/profil — data user sendiri
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id), deletedAt: null },
    select: {
      id: true,
      nama: true,
      email: true,
      role: true,
      subRole: true,
      religionId: true,
      tempatIbadahId: true,
      fotoProfil: true,
      createdAt: true,
      religion: { select: { id: true, nama: true } },
      tempatIbadah: {
        select: {
          id: true,
          nama: true,
          slug: true,
          alamat: true,
          kota: true,
          provinsi: true,
          noTelp: true,
          email: true,
          logo: true,
          status: true,
        },
      },
    },
  })
  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  return NextResponse.json({ data: user })
}

// PUT /api/profil — update profil sendiri (nama saja, email & role tetap)
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = profilUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: Number(session.user.id) },
    data: {
      nama: parsed.data.nama,
      ...(parsed.data.fotoProfil !== undefined ? { fotoProfil: parsed.data.fotoProfil } : {}),
    },
    select: { id: true, nama: true, email: true, fotoProfil: true },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'UPDATE',
      model: 'User',
      recordId: updated.id,
      detail: `Update profil sendiri: ${updated.nama}`,
    },
  })

  return NextResponse.json({ data: updated })
}
