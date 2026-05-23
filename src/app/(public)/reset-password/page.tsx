'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import axios from 'axios'
import { Loader2, KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

const schema = z
  .object({
    passwordBaru: z.string().min(8, 'Password minimal 8 karakter'),
    konfirmasi: z.string().min(1, 'Konfirmasi wajib diisi'),
  })
  .refine((d) => d.passwordBaru === d.konfirmasi, {
    message: 'Konfirmasi password tidak cocok',
    path: ['konfirmasi'],
  })

type Input = z.infer<typeof schema>

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-primary-light to-white" />}>
      <ResetPasswordInner />
    </Suspense>
  )
}

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [showPassword, setShowPassword] = useState(false)
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Input>({ resolver: zodResolver(schema) })

  async function onSubmit(data: Input) {
    if (!token) {
      toast.error('Token tidak valid')
      return
    }
    try {
      await axios.post('/api/auth/reset-password', { token, ...data })
      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.error
        toast.error(typeof msg === 'string' ? msg : 'Gagal reset password')
      }
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-light to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="font-serif text-2xl font-bold text-gray-900 mb-3">Token Tidak Valid</h1>
          <p className="text-sm text-gray-600 mb-5">
            Link reset password tidak valid atau sudah kedaluwarsa.
          </p>
          <Link
            href="/forgot-password"
            className="inline-block px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
          >
            Minta Link Baru
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        {done ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={24} className="text-emerald-600" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-gray-900 mb-2">Password Diperbarui</h1>
            <p className="text-sm text-gray-600 mb-5">
              Mengarahkan ke halaman login...
            </p>
            <Link
              href="/login"
              className="inline-block px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
            >
              Login Sekarang
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-3">
                <KeyRound size={20} className="text-primary" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-gray-900">Reset Password</h1>
              <p className="text-sm text-gray-600 mt-2">Buat password baru untuk akun Anda</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('passwordBaru')}
                    className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.passwordBaru && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.passwordBaru.message}</p>
                )}
                <p className="mt-1.5 text-xs text-gray-400">Minimal 8 karakter</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Konfirmasi Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('konfirmasi')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.konfirmasi && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.konfirmasi.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                Simpan Password Baru
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
