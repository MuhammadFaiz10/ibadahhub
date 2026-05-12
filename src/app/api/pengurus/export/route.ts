import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

function canManagePengurus(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  if (session.user.role === 'SUPERADMIN') return true
  if (session.user.role !== 'PENGURUS') return false
  return session.user.subRole === 'KETUA'
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManagePengurus(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isSuperAdmin = session.user.role === 'SUPERADMIN'
  const religionId = isSuperAdmin ? undefined : (session.user.religionId ?? -1)

  const data = await prisma.user.findMany({
    where: {
      role: 'PENGURUS',
      deletedAt: null,
      ...(religionId !== undefined ? { religionId } : {}),
    },
    orderBy: { nama: 'asc' },
    include: { religion: { select: { nama: true } } },
  })

  const rows = data.map((u) => ({
    Nama: u.nama,
    Email: u.email,
    'Sub Role': u.subRole ?? '',
    Agama: u.religion?.nama ?? '',
    Status: u.status ? 'Aktif' : 'Nonaktif',
    'Email Verified': u.emailVerified ? 'Ya' : 'Tidak',
    'Dibuat': u.createdAt.toISOString().slice(0, 10),
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Pengurus')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  const body = new Uint8Array(buffer)

  const tanggalStamp = new Date().toISOString().slice(0, 10)

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="pengurus-${tanggalStamp}.xlsx"`,
    },
  })
}
