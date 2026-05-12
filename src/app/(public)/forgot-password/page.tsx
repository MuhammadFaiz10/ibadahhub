'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import axios from 'axios'
import { Loader2, ArrowLeft, Mail, CheckCircle2, Wrench } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Format email tidak valid'),
})
type Input = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Input>({ resolver: zodResolver(schema) })

  async function onSubmit(data: Input) {
    try {
      const res = await axios.post('/api/auth/forgot-password', data)
      setSubmitted(true)
      if (res.data?.devResetUrl) {
        setDevResetUrl(res.data.devResetUrl)
      }
    } catch {
      toast.error('Gagal memproses permintaan')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft size={14} /> Kembali ke Login
        </Link>

        {submitted ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={24} className="text-emerald-600" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-gray-900 mb-2">Email Terkirim</h1>
            <p className="text-sm text-gray-600 mb-6">
              Jika email yang Anda masukkan terdaftar, kami sudah mengirimkan link reset password.
              Cek inbox dan folder spam Anda. Link berlaku selama 1 jam.
            </p>

            {devResetUrl && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-5 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench size={14} className="text-amber-700" />
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    Mode Development
                  </p>
                </div>
                <p className="text-xs text-amber-800 mb-2">
                  Email belum dikonfigurasi. Klik link di bawah untuk reset langsung:
                </p>
                <a
                  href={devResetUrl}
                  className="inline-block px-3 py-2 bg-amber-600 text-white rounded-md text-xs font-medium hover:bg-amber-700"
                >
                  Reset Password Sekarang →
                </a>
              </div>
            )}

            <Link
              href="/login"
              className="inline-block px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
            >
              Kembali ke Login
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-3">
                <Mail size={20} className="text-primary" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-gray-900">Lupa Password?</h1>
              <p className="text-sm text-gray-600 mt-2">
                Masukkan email Anda. Kami akan kirim link untuk reset password.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="email@contoh.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                Kirim Link Reset
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
