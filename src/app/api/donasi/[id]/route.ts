import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  donasiUpdateSchema,
  donasiActionSchema,
} from '@/lib/validations/donasi'
import { sendDonasiSuccessEmail } from '@/lib/email'

function canManageKeuangan(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  if (session.user.role === 'SUPERADMIN') return true
  if (session.user.role !== 'PENGURUS') return false
  return session.user.subRole === 'KETUA' || session.user.subRole === 'BENDAHARA'
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  const donasi = await prisma.donasi.findUnique({
    where: { id, deletedAt: null },
    include: {
      religion: { select: { id: true, nama: true } },
      jemaah: { select: { id: true, nama: true } },
      konfirmasiBy: { select: { nama: true } },
    },
  })
  if (!donasi) return NextResponse.json({ error: 'Donasi tidak ditemukan' }, { status: 404 })

  const isSuperAdmin = session.user.role === 'SUPERADMIN'
  const isOwner = donasi.userId === Number(session.user.id)
  const isInSameReligion = donasi.religionId === session.user.religionId

  if (!isSuperAdmin && !isOwner && !(canManageKeuangan(session) && isInSameReligion)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ data: donasi })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageKeuangan(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  const donasi = await prisma.donasi.findUnique({ where: { id, deletedAt: null } })
  if (!donasi) return NextResponse.json({ error: 'Donasi tidak ditemukan' }, { status: 404 })

  if (session.user.role === 'PENGURUS' && donasi.religionId !== session.user.religionId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = donasiUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const updateData: Record<string, unknown> = { ...parsed.data }
  if (typeof updateData.tanggal === 'string') {
    updateData.tanggal = new Date(updateData.tanggal as string)
  }
  if (updateData.catatan === '') updateData.catatan = null
  if (updateData.buktiPembayaran === '') updateData.buktiPembayaran = null

  const updated = await prisma.donasi.update({ where: { id }, data: updateData })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'UPDATE',
      model: 'Donasi',
      recordId: id,
      detail: `Update donasi: ${updated.namaDonatur}`,
    },
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageKeuangan(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  const donasi = await prisma.donasi.findUnique({ where: { id, deletedAt: null } })
  if (!donasi) return NextResponse.json({ error: 'Donasi tidak ditemukan' }, { status: 404 })

  if (session.user.role === 'PENGURUS' && donasi.religionId !== session.user.religionId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { alasan } = await req.json()
  if (!alasan?.trim()) {
    return NextResponse.json({ error: 'Alasan penghapusan wajib diisi' }, { status: 400 })
  }

  await prisma.donasi.update({
    where: { id },
    data: { deletedAt: new Date(), deletedReason: alasan },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'DELETE',
      model: 'Donasi',
      recordId: id,
      detail: alasan,
    },
  })

  return NextResponse.json({ success: true })
}

// PATCH /api/donasi/:id — { action: 'CONFIRM' | 'REJECT' | 'RESTORE', alasan? }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageKeuangan(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id) || id <= 0) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const parsed = donasiActionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const donasi = await prisma.donasi.findUnique({ where: { id } })
  if (!donasi) return NextResponse.json({ error: 'Donasi tidak ditemukan' }, { status: 404 })

  if (session.user.role === 'PENGURUS' && donasi.religionId !== session.user.religionId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const userId = Number(session.user.id)
  const action = parsed.data.action

  if (action === 'RESTORE') {
    if (!donasi.deletedAt) {
      return NextResponse.json({ error: 'Donasi tidak dalam kondisi dihapus' }, { status: 400 })
    }
    await prisma.donasi.update({
      where: { id },
      data: { deletedAt: null, deletedReason: null },
    })
    await prisma.activityLog.create({
      data: {
        userId,
        aksi: 'RESTORE',
        model: 'Donasi',
        recordId: id,
        detail: `Pulihkan donasi ${donasi.namaDonatur}`,
      },
    })
    return NextResponse.json({ success: true })
  }

  if (donasi.deletedAt) {
    return NextResponse.json({ error: 'Donasi sudah dihapus' }, { status: 400 })
  }

  if (action === 'CONFIRM') {
    if (donasi.status === 'DIKONFIRMASI') {
      return NextResponse.json({ error: 'Donasi sudah dikonfirmasi' }, { status: 400 })
    }
    const confirmedAt = new Date()
    const updatedDonasi = await prisma.donasi.update({
      where: { id },
      data: {
        status: 'DIKONFIRMASI',
        dikonfirmasiOleh: userId,
        dikonfirmasiAt: confirmedAt,
        paymentChannel: 'manual_paid',
      },
    })
    await prisma.activityLog.create({
      data: {
        userId,
        aksi: 'UPDATE',
        model: 'Donasi',
        recordId: id,
        detail: `Konfirmasi donasi ${donasi.namaDonatur}`,
      },
    })
    await sendDonasiSuccessEmail(
      { ...updatedDonasi, dikonfirmasiAt: confirmedAt },
      'manual_paid'
    )
    return NextResponse.json({ success: true })
  }

  if (action === 'REJECT') {
    await prisma.donasi.update({
      where: { id },
      data: {
        status: 'DITOLAK',
        dikonfirmasiOleh: userId,
        dikonfirmasiAt: new Date(),
        catatan: parsed.data.alasan ? `[Ditolak] ${parsed.data.alasan}` : donasi.catatan,
      },
    })
    await prisma.activityLog.create({
      data: {
        userId,
        aksi: 'UPDATE',
        model: 'Donasi',
        recordId: id,
        detail: `Tolak donasi ${donasi.namaDonatur}${parsed.data.alasan ? ` - ${parsed.data.alasan}` : ''}`,
      },
    })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 })
}
