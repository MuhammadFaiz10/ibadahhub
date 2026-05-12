import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Session } from 'next-auth'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number | string): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(amount))
}

export function formatTanggal(
  date: Date | string,
  style: 'short' | 'medium' | 'long' = 'medium'
): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: style }).format(new Date(date))
}

export function getInisial(nama: string): string {
  return nama
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export async function createNotifikasi(
  userId: number,
  judul: string,
  isi: string,
  urlTujuan?: string
) {
  const { prisma } = await import('./prisma')
  return prisma.notifikasi.create({
    data: { userId, judul, isi, urlTujuan },
  })
}

export function canManageKeuangan(session: Session): boolean {
  const { role, subRole } = session.user
  return (
    role === 'SUPERADMIN' ||
    (role === 'PENGURUS' && (subRole === 'KETUA' || subRole === 'BENDAHARA'))
  )
}

export function canManageKonten(session: Session): boolean {
  const { role, subRole } = session.user
  return (
    role === 'SUPERADMIN' ||
    (role === 'PENGURUS' && (subRole === 'KETUA' || subRole === 'SEKRETARIS'))
  )
}

// Bendahara TIDAK boleh kelola jemaah (sub-role BENDAHARA hanya keuangan)
export function canManageJemaah(session: Session): boolean {
  const { role, subRole } = session.user
  return (
    role === 'SUPERADMIN' ||
    (role === 'PENGURUS' && (subRole === 'KETUA' || subRole === 'SEKRETARIS'))
  )
}

export function isSameReligion(session: Session, religionId: number): boolean {
  if (session.user.role === 'SUPERADMIN') return true
  return session.user.religionId === religionId
}

export function generatePassword(): string {
  return require('crypto').randomBytes(8).toString('hex')
}
