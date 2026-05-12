'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertOctagon, RotateCcw, Home } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center bg-white rounded-2xl shadow-lg border border-gray-100 p-8 sm:p-10">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-5">
          <AlertOctagon size={28} className="text-red-600" />
        </div>

        <p className="font-mono text-xs uppercase tracking-widest text-red-600 mb-2">Error</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          Terjadi kesalahan
        </h1>
        <p className="text-gray-600 text-sm sm:text-base mb-2 leading-relaxed">
          Maaf, ada yang tidak beres saat memproses permintaan Anda. Coba muat ulang halaman, atau
          kembali ke beranda.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 font-mono mb-6">Kode: {error.digest}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <RotateCcw size={15} /> Coba Lagi
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Home size={15} /> Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
