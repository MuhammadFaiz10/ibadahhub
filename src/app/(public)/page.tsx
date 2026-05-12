import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Beranda' }

export default async function HomePage() {
  const session = await auth()
  if (session) redirect('/dashboard')

  const agamaList = await prisma.religion.findMany({
    where: { deletedAt: null },
    select: { id: true, nama: true },
    orderBy: { nama: 'asc' },
  })

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-light to-white">
      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="font-serif text-5xl font-bold text-primary-dark mb-4">IbadahHub</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Platform digital pengelolaan kegiatan ibadah lintas agama. Kelola jemaah, kegiatan,
            pengumuman, dan keuangan dalam satu tempat.
          </p>
          <div className="flex gap-4 justify-center mt-8">
            <Link
              href="/login"
              className="px-8 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-8 py-3 border-2 border-primary text-primary rounded-lg font-medium hover:bg-primary-light transition-colors"
            >
              Daftar sebagai Jemaah
            </Link>
          </div>
        </div>

        {/* Daftar Agama */}
        {agamaList.length > 0 && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-gray-800 text-center mb-8">
              Komunitas Agama
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {agamaList.map((agama) => (
                <Link
                  key={agama.id}
                  href={`/${encodeURIComponent(agama.nama)}`}
                  className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/30 transition-all"
                >
                  <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary font-bold text-xl">
                      {agama.nama[0]}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-800">{agama.nama}</p>
                  <p className="text-xs text-gray-400 mt-1">Lihat halaman →</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
