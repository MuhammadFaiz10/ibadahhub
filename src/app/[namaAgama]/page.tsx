import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { Calendar, MapPin, Clock, Megaphone, ArrowLeft, LogIn, UserPlus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { formatTanggal } from '@/lib/utils'

interface PageProps {
  params: { namaAgama: string }
}

async function findReligion(nama: string) {
  const decoded = decodeURIComponent(nama)
  return prisma.religion.findFirst({
    where: {
      deletedAt: null,
      nama: decoded,
    },
    select: { id: true, nama: true, deskripsi: true },
  })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const religion = await findReligion(params.namaAgama)
  if (!religion) return { title: 'Komunitas tidak ditemukan' }
  return {
    title: `Komunitas ${religion.nama}`,
    description: religion.deskripsi ?? `Halaman publik komunitas ${religion.nama}`,
  }
}

export default async function AgamaPublicPage({ params }: PageProps) {
  const religion = await findReligion(params.namaAgama)
  if (!religion) notFound()

  const now = new Date()

  const [kegiatan, pengumuman] = await Promise.all([
    prisma.kegiatan.findMany({
      where: {
        religionId: religion.id,
        deletedAt: null,
        status: { in: ['UPCOMING', 'ONGOING'] },
        tanggal: { gte: now },
      },
      orderBy: { tanggal: 'asc' },
      take: 8,
      select: {
        id: true,
        namaKegiatan: true,
        tanggal: true,
        waktuMulai: true,
        waktuSelesai: true,
        lokasi: true,
        deskripsi: true,
        kapasitas: true,
        status: true,
      },
    }),
    prisma.pengumuman.findMany({
      where: {
        religionId: religion.id,
        deletedAt: null,
        status: 'AKTIF',
        OR: [{ expireDate: null }, { expireDate: { gte: now } }],
      },
      orderBy: { tanggalPublish: 'desc' },
      take: 5,
      select: {
        id: true,
        judul: true,
        isi: true,
        tanggalPublish: true,
      },
    }),
  ])

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-light/40 to-gray-50">
      {/* Hero */}
      <section className="border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={14} /> Beranda
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <LogIn size={14} /> <span className="hidden sm:inline">Login</span>
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark"
            >
              <UserPlus size={14} /> Daftar
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Title */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-sm mb-4">
            <span className="font-serif text-3xl text-primary-dark font-bold">
              {religion.nama[0]}
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900">
            Komunitas {religion.nama}
          </h1>
          {religion.deskripsi && (
            <p className="text-gray-600 mt-3 max-w-2xl mx-auto">{religion.deskripsi}</p>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kegiatan mendatang */}
          <section className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              <div>
                <h2 className="font-semibold text-gray-900">Kegiatan Mendatang</h2>
                <p className="text-xs text-gray-500">{kegiatan.length} kegiatan akan datang</p>
              </div>
            </div>
            {kegiatan.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Belum ada kegiatan terjadwal
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {kegiatan.map((k) => (
                  <li key={k.id} className="p-4 sm:p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-primary-light flex flex-col items-center justify-center">
                        <span className="text-[10px] uppercase font-semibold text-primary-dark">
                          {new Date(k.tanggal).toLocaleDateString('id-ID', { month: 'short' })}
                        </span>
                        <span className="text-lg font-bold text-primary-dark leading-none">
                          {new Date(k.tanggal).getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900">{k.namaKegiatan}</h3>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock size={11} className="text-gray-400" />
                            {k.waktuMulai}{k.waktuSelesai ? `–${k.waktuSelesai}` : ''}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                            {k.lokasi}
                          </span>
                          {k.kapasitas != null && (
                            <span className="text-gray-500">Kapasitas: {k.kapasitas}</span>
                          )}
                        </div>
                        {k.deskripsi && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{k.deskripsi}</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Pengumuman */}
          <aside className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Megaphone size={18} className="text-amber-600" />
              <h2 className="font-semibold text-gray-900">Pengumuman</h2>
            </div>
            {pengumuman.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">Belum ada pengumuman</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {pengumuman.map((p) => (
                  <li key={p.id} className="p-4 sm:p-5">
                    <h3 className="font-semibold text-sm text-gray-900">{p.judul}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{formatTanggal(p.tanggalPublish)}</p>
                    <div
                      className="text-sm text-gray-600 mt-2 prose prose-sm max-w-none line-clamp-4 prose-a:text-primary"
                      dangerouslySetInnerHTML={{ __html: p.isi }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>

        {/* CTA */}
        <section className="mt-10 bg-white rounded-xl border border-gray-200 p-6 sm:p-8 text-center">
          <h2 className="font-serif text-xl font-semibold text-gray-900">
            Bergabung dengan Komunitas {religion.nama}
          </h2>
          <p className="text-sm text-gray-600 mt-2 mb-5">
            Daftar sebagai jemaah untuk mendapat informasi kegiatan, ikut donasi, dan mengakses fitur lengkap.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
            >
              <UserPlus size={16} /> Daftar Sekarang
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-primary text-primary rounded-lg font-medium hover:bg-primary-light transition-colors"
            >
              <LogIn size={16} /> Sudah Punya Akun
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
