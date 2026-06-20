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

const ALLOWED_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
])

type ImportRow = Record<string, unknown>

interface ImportResult {
  total: number
  imported: number
  skipped: number
  errors: { row: number; nama?: string; reason: string }[]
}

// POST /api/jemaah/import
// FormData: file (xlsx/csv), religionId? (untuk SUPERADMIN; jika tidak ada, ambil per-row)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageJemaah(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isSuperAdmin = session.user.role === 'SUPERADMIN'
  const formData = await req.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: 'Form data tidak valid' }, { status: 400 })
  }

  const file = formData.get('file')
  const fallbackReligionIdRaw = formData.get('religionId')
  const fallbackTempatIbadahIdRaw = formData.get('tempatIbadahId')
  const fallbackReligionId =
    fallbackReligionIdRaw && !isNaN(Number(fallbackReligionIdRaw))
      ? Number(fallbackReligionIdRaw)
      : isSuperAdmin
      ? null
      : (session.user.religionId ?? null)
  const fallbackTempatIbadahId =
    fallbackTempatIbadahIdRaw && !isNaN(Number(fallbackTempatIbadahIdRaw))
      ? Number(fallbackTempatIbadahIdRaw)
      : isSuperAdmin
      ? null
      : (session.user.tempatIbadahId ?? null)

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File maks 5 MB' }, { status: 413 })
  }
  if (file.type && !ALLOWED_TYPES.has(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
    return NextResponse.json(
      { error: 'Format file harus .xlsx, .xls, atau .csv' },
      { status: 400 }
    )
  }

  // Parse
  const buffer = Buffer.from(await file.arrayBuffer())
  let rows: ImportRow[] = []
  try {
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const firstSheetName = wb.SheetNames[0]
    if (!firstSheetName) throw new Error('Sheet kosong')
    const ws = wb.Sheets[firstSheetName]
    if (!ws) throw new Error('Sheet kosong')
    rows = XLSX.utils.sheet_to_json<ImportRow>(ws, { defval: '' })
  } catch (err) {
    return NextResponse.json({ error: 'Gagal membaca file: ' + (err as Error).message }, { status: 400 })
  }

  // Pre-fetch agama untuk lookup nama → id
  const allReligions = await prisma.religion.findMany({
    where: { deletedAt: null },
    select: { id: true, nama: true },
  })
  const religionByNama = new Map<string, number>()
  allReligions.forEach((r) => religionByNama.set(r.nama.toLowerCase(), r.id))

  // Pre-fetch tempat ibadah untuk lookup slug/nama → id
  const allTempatIbadah = await prisma.tempatIbadah.findMany({
    where: { deletedAt: null, status: 'AKTIF' },
    select: { id: true, nama: true, slug: true, religionId: true },
  })
  const tempatIbadahBySlug = new Map<string, { id: number; religionId: number }>()
  const tempatIbadahByNama = new Map<string, { id: number; religionId: number }>()
  allTempatIbadah.forEach((t) => {
    tempatIbadahBySlug.set(t.slug.toLowerCase(), { id: t.id, religionId: t.religionId })
    tempatIbadahByNama.set(t.nama.toLowerCase(), { id: t.id, religionId: t.religionId })
  })

  const result: ImportResult = {
    total: rows.length,
    imported: 0,
    skipped: 0,
    errors: [],
  }

  const userId = Number(session.user.id)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as ImportRow
    const rowNum = i + 2 // +2 karena header di row 1

    const namaRaw = row.nama ?? (row as Record<string, unknown>)['Nama']
    const nama = typeof namaRaw === 'string' ? namaRaw.trim() : String(namaRaw ?? '').trim()
    if (!nama || nama.length < 2) {
      result.skipped++
      result.errors.push({ row: rowNum, reason: 'Nama kosong atau terlalu pendek' })
      continue
    }

    const emailRaw = row.email ?? (row as Record<string, unknown>)['Email']
    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : ''
    const noHp =
      String(row.noHp ?? row.no_hp ?? row['no hp'] ?? (row as Record<string, unknown>)['No HP'] ?? '').trim() || null
    const alamat =
      String(row.alamat ?? (row as Record<string, unknown>)['Alamat'] ?? '').trim() || null

    // Religion: SUPERADMIN bisa per-row via kolom Agama, lainnya pakai fallback (religionId session)
    let resolvedReligionId: number | null = fallbackReligionId
    let resolvedTempatIbadahId: number | null = fallbackTempatIbadahId
    if (isSuperAdmin) {
      const agamaRaw = row.agama ?? row.religion ?? (row as Record<string, unknown>)['Agama']
      const agamaStr = typeof agamaRaw === 'string' ? agamaRaw.trim().toLowerCase() : ''
      if (agamaStr) {
        const found = religionByNama.get(agamaStr)
        if (found) resolvedReligionId = found
      }

      // Kolom tempat ibadah opsional (nama/slug). Jika kosong, fallback ke fallbackTempatIbadahId.
      const tiRaw =
        row.tempatIbadah ??
        row['tempat_ibadah'] ??
        row['tempat ibadah'] ??
        (row as Record<string, unknown>)['Tempat Ibadah']
      const tiStr = typeof tiRaw === 'string' ? tiRaw.trim().toLowerCase() : ''
      if (tiStr) {
        const found = tempatIbadahBySlug.get(tiStr) ?? tempatIbadahByNama.get(tiStr)
        if (found) {
          resolvedTempatIbadahId = found.id
          if (!resolvedReligionId) resolvedReligionId = found.religionId
        }
      }
    }

    if (!resolvedReligionId) {
      result.skipped++
      result.errors.push({ row: rowNum, nama, reason: 'Agama tidak ditemukan' })
      continue
    }
    if (!resolvedTempatIbadahId) {
      result.skipped++
      result.errors.push({ row: rowNum, nama, reason: 'Tempat ibadah tidak ditemukan' })
      continue
    }
    // Konsistensi: tempat ibadah harus cocok dengan agama row
    const tiInfo = allTempatIbadah.find((t) => t.id === resolvedTempatIbadahId)
    if (!tiInfo || tiInfo.religionId !== resolvedReligionId) {
      result.skipped++
      result.errors.push({ row: rowNum, nama, reason: 'Tempat ibadah tidak sesuai agama' })
      continue
    }

    // Cek apakah jemaah dengan nama+religion sudah ada (dedupe sederhana)
    const exists = await prisma.user.findFirst({
      where: {
        nama,
        role: 'JEMAAH',
        religionId: resolvedReligionId,
        deletedAt: null,
      },
    })
    if (exists) {
      result.skipped++
      result.errors.push({ row: rowNum, nama, reason: 'Jemaah dengan nama yang sama sudah ada' })
      continue
    }

    try {
      await prisma.user.create({
        data: {
          nama,
          email: email || null,
          noHp,
          alamat,
          religionId: resolvedReligionId,
          tempatIbadahId: resolvedTempatIbadahId,
          status: true,
          role: 'JEMAAH',
        },
      })
      result.imported++
    } catch (err) {
      result.skipped++
      result.errors.push({
        row: rowNum,
        nama,
        reason: err instanceof Error ? err.message : 'Gagal menyimpan',
      })
    }
  }

  await prisma.activityLog.create({
    data: {
      userId,
      aksi: 'CREATE',
      model: 'User',
      detail: `Import jemaah: ${result.imported} berhasil, ${result.skipped} dilewati, dari ${result.total} baris`,
    },
  })

  return NextResponse.json(result)
}
