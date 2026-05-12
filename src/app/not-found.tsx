import Link from 'next/link'
import { Home, ArrowLeft, Compass } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-light to-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center bg-white rounded-2xl shadow-lg border border-gray-100 p-8 sm:p-10">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary-light flex items-center justify-center mb-5">
          <Compass size={28} className="text-primary" />
        </div>

        <p className="font-mono text-xs uppercase tracking-widest text-primary mb-2">404</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          Halaman tidak ditemukan
        </h1>
        <p className="text-gray-600 text-sm sm:text-base mb-8 leading-relaxed">
          Maaf, halaman yang Anda cari tidak ada atau sudah dipindahkan. Mungkin URL salah ketik
          atau tautan yang Anda ikuti sudah tidak berlaku.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <Home size={15} /> Beranda
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={15} /> Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
