import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

function canManageJemaah(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  if (session.user.role === 'SUPERADMIN') return true
  if (session.user.role !== 'PENGURUS') return false
  return session.user.subRole === 'KETUA' || session.user.subRole === 'SEKRETARIS'
}

// GET /api/jemaah/export?format=xlsx
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageJemaah(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isSuperAdmin = session.user.role === 'SUPERADMIN'
  const religionId = isSuperAdmin ? undefined : (session.user.religionId ?? -1)

  const data = await prisma.user.findMany({
    where: {
      role: 'JEMAAH',
      deletedAt: null,
      ...(religionId !== undefined ? { religionId } : {}),
    },
    orderBy: { nama: 'asc' },
    select: {
      nama: true,
      email: true,
      noHp: true,
      alamat: true,
      password: true,
      status: true,
      createdAt: true,
      religion: { select: { nama: true } },
    },
  })

  const rows = data.map((j) => ({
    Nama: j.nama,
    Email: j.email ?? '',
    'No HP': j.noHp ?? '',
    Alamat: j.alamat ?? '',
    Agama: j.religion?.nama ?? '',
    'Punya Akun': j.password ? 'Ya' : 'Tidak',
    Status: j.status ? 'Aktif' : 'Nonaktif',
    'Dibuat': j.createdAt.toISOString().slice(0, 10),
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Jemaah')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  const body = new Uint8Array(buffer)

  const tanggalStamp = new Date().toISOString().slice(0, 10)

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="jemaah-${tanggalStamp}.xlsx"`,
    },
  })
}
