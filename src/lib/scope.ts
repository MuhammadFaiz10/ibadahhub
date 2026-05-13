/**
 * Helper untuk multi-tenant scope (Agama + TempatIbadah).
 *
 * Aturan:
 * - SUPERADMIN: bebas memilih religionId & tempatIbadahId (dari body / query param).
 * - PENGURUS & JEMAAH: religionId & tempatIbadahId **dipaksa** dari session.
 *
 * Setiap operasi tulis WAJIB memvalidasi bahwa `tempatIbadah.religionId === religionId`
 * supaya tidak ada data nyasar antar agama.
 */

import type { Session } from 'next-auth'
import { prisma } from './prisma'

export type Scope = {
  religionId: number
  tempatIbadahId: number
}

export type ScopeError = {
  error: string
  status: number
}

/** Apakah session adalah SUPERADMIN (akses lintas tenant). */
export function isSuperAdminSession(session: Session | null): boolean {
  return session?.user?.role === 'SUPERADMIN'
}

/**
 * Untuk SUPERADMIN: kembalikan scope dari payload (body/query); validasi konsistensi.
 * Untuk non-SUPERADMIN: kembalikan scope dari session (mengabaikan payload).
 * Mengembalikan ScopeError jika tidak valid (mis. tempatIbadah tidak match religion).
 */
export async function resolveWriteScope(
  session: Session,
  payload: { religionId?: number | null; tempatIbadahId?: number | null }
): Promise<Scope | ScopeError> {
  const isSuper = isSuperAdminSession(session)

  let religionId: number | null | undefined
  let tempatIbadahId: number | null | undefined

  if (isSuper) {
    religionId = payload.religionId ?? null
    tempatIbadahId = payload.tempatIbadahId ?? null
    if (!religionId) return { error: 'Agama wajib dipilih', status: 400 }
    if (!tempatIbadahId) return { error: 'Tempat ibadah wajib dipilih', status: 400 }
  } else {
    religionId = session.user.religionId
    tempatIbadahId = session.user.tempatIbadahId
    if (!religionId || !tempatIbadahId) {
      return {
        error: 'Akun Anda belum dikaitkan ke tempat ibadah. Hubungi pengurus.',
        status: 403,
      }
    }
  }

  // Validasi: tempatIbadah harus exist, AKTIF, dan religionId-nya cocok
  const ti = await prisma.tempatIbadah.findUnique({
    where: { id: tempatIbadahId },
    select: { id: true, religionId: true, status: true, deletedAt: true },
  })
  if (!ti || ti.deletedAt) {
    return { error: 'Tempat ibadah tidak ditemukan', status: 404 }
  }
  if (ti.religionId !== religionId) {
    return { error: 'Tempat ibadah tidak sesuai dengan agama yang dipilih', status: 400 }
  }
  if (ti.status !== 'AKTIF') {
    return { error: 'Tempat ibadah sedang nonaktif', status: 400 }
  }

  return { religionId, tempatIbadahId }
}

/**
 * Untuk operasi BACA (list/filter):
 * - SUPERADMIN: bisa filter optional via query param.
 * - non-SUPERADMIN: dipaksa scope session.
 */
export function resolveReadScope(
  session: Session,
  query: { religionId?: string | null; tempatIbadahId?: string | null }
): { religionId?: number; tempatIbadahId?: number } {
  if (isSuperAdminSession(session)) {
    const r = query.religionId ? Number(query.religionId) : NaN
    const t = query.tempatIbadahId ? Number(query.tempatIbadahId) : NaN
    return {
      religionId: Number.isFinite(r) && r > 0 ? r : undefined,
      tempatIbadahId: Number.isFinite(t) && t > 0 ? t : undefined,
    }
  }
  return {
    religionId: session.user.religionId ?? undefined,
    tempatIbadahId: session.user.tempatIbadahId ?? undefined,
  }
}

export function isScopeError(
  x: { error?: string; status?: number } | unknown
): x is ScopeError {
  return typeof x === 'object' && x !== null && 'error' in x && typeof (x as ScopeError).error === 'string'
}

/**
 * Untuk PUT/update: validasi perubahan tempatIbadahId.
 * - Non-SUPERADMIN: tidak boleh ubah religionId/tempatIbadahId. Kembalikan null jika tidak ada perubahan.
 * - SUPERADMIN: jika tempatIbadahId diubah, harus exist & cocok dengan religionId target.
 *
 * Mengembalikan ScopeError jika invalid, atau objek kosong/parsial jika valid.
 */
export async function validateScopeUpdate(
  session: Session,
  current: { religionId: number; tempatIbadahId: number },
  patch: { religionId?: number | null; tempatIbadahId?: number | null }
): Promise<ScopeError | { religionId?: number; tempatIbadahId?: number }> {
  const isSuper = isSuperAdminSession(session)

  if (!isSuper) {
    if (patch.religionId !== undefined && patch.religionId !== current.religionId) {
      return { error: 'Tidak dapat mengubah agama', status: 403 }
    }
    if (patch.tempatIbadahId !== undefined && patch.tempatIbadahId !== current.tempatIbadahId) {
      return { error: 'Tidak dapat memindahkan ke tempat ibadah lain', status: 403 }
    }
    return {}
  }

  const out: { religionId?: number; tempatIbadahId?: number } = {}
  const targetReligionId = patch.religionId ?? current.religionId
  const targetTempatIbadahId = patch.tempatIbadahId ?? current.tempatIbadahId

  if (
    (patch.religionId !== undefined && patch.religionId !== current.religionId) ||
    (patch.tempatIbadahId !== undefined && patch.tempatIbadahId !== current.tempatIbadahId)
  ) {
    const ti = await prisma.tempatIbadah.findUnique({
      where: { id: targetTempatIbadahId },
    })
    if (!ti || ti.deletedAt) {
      return { error: 'Tempat ibadah tidak ditemukan', status: 404 }
    }
    if (ti.religionId !== targetReligionId) {
      return { error: 'Tempat ibadah tidak sesuai dengan agama', status: 400 }
    }
    if (patch.religionId !== undefined) out.religionId = targetReligionId
    if (patch.tempatIbadahId !== undefined) out.tempatIbadahId = targetTempatIbadahId
  }

  return out
}
