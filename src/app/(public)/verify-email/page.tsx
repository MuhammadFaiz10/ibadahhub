'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import axios from 'axios'
import { Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react'

type Status = 'pending' | 'success' | 'error' | 'already'

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-primary-light to-white" />}>
      <VerifyEmailInner />
    </Suspense>
  )
}

function VerifyEmailInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [status, setStatus] = useState<Status>('pending')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('Token tidak ditemukan')
      return
    }

    axios
      .post('/api/auth/verify-email', { token })
      .then((r) => {
        if (r.data.alreadyVerified) {
          setStatus('already')
        } else {
          setStatus('success')
        }
      })
      .catch((err) => {
        setStatus('error')
        if (axios.isAxiosError(err)) {
          const msg = err.response?.data?.error
          setErrorMsg(typeof msg === 'string' ? msg : 'Verifikasi gagal')
        } else {
          setErrorMsg('Verifikasi gagal')
        }
      })
  }, [token])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center">
        {status === 'pending' && (
          <>
            <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-4">
              <Loader2 size={24} className="text-primary animate-spin" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-gray-900">Memverifikasi...</h1>
            <p className="text-sm text-gray-500 mt-2">Mohon tunggu sebentar.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={24} className="text-emerald-600" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-gray-900">Email Terverifikasi!</h1>
            <p className="text-sm text-gray-600 mt-2 mb-6">
              Terima kasih, akun Anda sudah diverifikasi. Sekarang Anda bisa login.
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
            >
              Login Sekarang
            </Link>
          </>
        )}

        {status === 'already' && (
          <>
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-blue-600" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-gray-900">Sudah Terverifikasi</h1>
            <p className="text-sm text-gray-600 mt-2 mb-6">
              Email Anda sudah pernah diverifikasi sebelumnya. Silakan login untuk mengakses akun.
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
            >
              Login
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <XCircle size={24} className="text-red-600" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-gray-900">Verifikasi Gagal</h1>
            <p className="text-sm text-gray-600 mt-2 mb-6">{errorMsg}</p>
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                className="inline-block px-6 py-3 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
              >
                Ke Halaman Login
              </Link>
              <Link
                href="/register"
                className="inline-block px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Daftar Ulang
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
