import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { tempatIbadahUpdateSchema } from '@/lib/validations/tempat-ibadah'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tiId = Number(id)
  if (!Number.isFinite(tiId)) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const ti = await prisma.tempatIbadah.findUnique({
    where: { id: tiId },
    include: {
      religion: { select: { id: true, nama: true } },
      _count: { select: { users: true, kegiatan: true, donasi: true } },
    },
  })
  if (!ti) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  // Non-SUPERADMIN hanya boleh akses tempat ibadah di agama-nya
  if (session.user.role !== 'SUPERADMIN' && ti.religionId !== session.user.religionId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ data: ti })
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const tiId = Number(id)
  if (!Number.isFinite(tiId)) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const existing = await prisma.tempatIbadah.findUnique({ where: { id: tiId } })
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = tempatIbadahUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Validasi unik slug bila diubah
  if (parsed.data.slug && parsed.data.slug !== existing.slug) {
    const slugTaken = await prisma.tempatIbadah.findUnique({ where: { slug: parsed.data.slug } })
    if (slugTaken) {
      return NextResponse.json({ error: 'Slug sudah dipakai' }, { status: 409 })
    }
  }

  // Validasi agama bila diubah
  if (parsed.data.religionId && parsed.data.religionId !== existing.religionId) {
    const religion = await prisma.religion.findUnique({
      where: { id: parsed.data.religionId, deletedAt: null },
    })
    if (!religion) {
      return NextResponse.json({ error: 'Agama tidak ditemukan' }, { status: 404 })
    }
    // Cegah ganti agama jika sudah ada data terkait — agar konsistensi religionId terjaga
    const counts = await prisma.tempatIbadah.findUnique({
      where: { id: tiId },
      include: {
        _count: { select: { users: true, kegiatan: true, donasi: true } },
      },
    })
    const c = counts?._count
    const hasChildren =
      (c?.users ?? 0) + (c?.kegiatan ?? 0) + (c?.donasi ?? 0) > 0
    if (hasChildren) {
      return NextResponse.json(
        { error: 'Tidak dapat mengubah agama karena sudah ada data terkait' },
        { status: 400 }
      )
    }
  }

  const updated = await prisma.tempatIbadah.update({
    where: { id: tiId },
    data: {
      ...(parsed.data.religionId !== undefined ? { religionId: parsed.data.religionId } : {}),
      ...(parsed.data.nama !== undefined ? { nama: parsed.data.nama } : {}),
      ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}),
      ...(parsed.data.alamat !== undefined ? { alamat: parsed.data.alamat || null } : {}),
      ...(parsed.data.kota !== undefined ? { kota: parsed.data.kota || null } : {}),
      ...(parsed.data.provinsi !== undefined ? { provinsi: parsed.data.provinsi || null } : {}),
      ...(parsed.data.kodePos !== undefined ? { kodePos: parsed.data.kodePos || null } : {}),
      ...(parsed.data.noTelp !== undefined ? { noTelp: parsed.data.noTelp || null } : {}),
      ...(parsed.data.email !== undefined ? { email: parsed.data.email || null } : {}),
      ...(parsed.data.logo !== undefined ? { logo: parsed.data.logo || null } : {}),
      ...(parsed.data.deskripsi !== undefined ? { deskripsi: parsed.data.deskripsi || null } : {}),
      ...(parsed.data.latitude !== undefined ? { latitude: parsed.data.latitude } : {}),
      ...(parsed.data.longitude !== undefined ? { longitude: parsed.data.longitude } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'UPDATE',
      model: 'TempatIbadah',
      recordId: updated.id,
      detail: `Update tempat ibadah: ${updated.nama}`,
    },
  })

  return NextResponse.json({ data: updated })
}

// DELETE = soft delete (set deletedAt). Hanya jika tidak ada child aktif.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const tiId = Number(id)
  if (!Number.isFinite(tiId)) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const ti = await prisma.tempatIbadah.findUnique({
    where: { id: tiId },
    include: {
      _count: {
        select: {
          users: { where: { deletedAt: null } },
          kegiatan: { where: { deletedAt: null } },
          donasi: { where: { deletedAt: null } },
        },
      },
    },
  })
  if (!ti || ti.deletedAt) {
    return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  }

  const c = ti._count
  if (c.users + c.kegiatan + c.donasi > 0) {
    return NextResponse.json(
      {
        error:
          'Tidak dapat dihapus: masih ada pengguna/jemaah/kegiatan/donasi aktif. Arsipkan atau pindahkan dulu.',
      },
      { status: 400 }
    )
  }

  await prisma.tempatIbadah.update({
    where: { id: tiId },
    data: { deletedAt: new Date(), status: 'NONAKTIF' },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'DELETE',
      model: 'TempatIbadah',
      recordId: tiId,
      detail: `Arsipkan tempat ibadah: ${ti.nama}`,
    },
  })

  return NextResponse.json({ ok: true })
}
