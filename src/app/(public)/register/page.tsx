'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import axios from 'axios'
import { Loader2, Mail, CheckCircle2, Wrench } from 'lucide-react'

const registerSchema = z
  .object({
    nama: z.string().min(2, 'Nama minimal 2 karakter'),
    email: z.string().email('Format email tidak valid'),
    password: z.string().min(8, 'Password minimal 8 karakter'),
    confirmPassword: z.string(),
    religionId: z.string().min(1, 'Agama wajib dipilih'),
    noHp: z.string().optional(),
    alamat: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  })

type RegisterInput = z.infer<typeof registerSchema>

interface AgamaOption {
  id: number
  nama: string
}

export default function RegisterPage() {
  const [agamaList, setAgamaList] = useState<AgamaOption[]>([])
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })

  useEffect(() => {
    axios.get('/api/agama/public').then((r) => setAgamaList(r.data.data))
  }, [])

  async function onSubmit(data: RegisterInput) {
    try {
      const res = await axios.post('/api/register', {
        ...data,
        religionId: Number(data.religionId),
      })
      setRegisteredEmail(data.email)
      if (res.data?.devVerifyUrl) {
        setDevVerifyUrl(res.data.devVerifyUrl)
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        toast.error(String(err.response.data.error))
      } else {
        toast.error('Terjadi kesalahan. Silakan coba lagi.')
      }
    }
  }

  async function handleResend() {
    if (!registeredEmail) return
    setResending(true)
    try {
      const res = await axios.post('/api/auth/resend-verification', { email: registeredEmail })
      toast.success('Email verifikasi dikirim ulang')
      if (res.data?.devVerifyUrl) {
        setDevVerifyUrl(res.data.devVerifyUrl)
      }
    } catch {
      toast.error('Gagal mengirim ulang email')
    } finally {
      setResending(false)
    }
  }

  if (registeredEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-light to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-gray-900 mb-2">Akun Berhasil Dibuat</h1>
          <p className="text-sm text-gray-600 mb-1">
            Kami telah mengirim email verifikasi ke
          </p>
          <p className="font-mono text-sm font-medium text-gray-900 mb-4 break-all">
            {registeredEmail}
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 flex gap-3 items-start text-left">
            <Mail size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Cek inbox email Anda</p>
              <p className="text-xs">
                Klik link verifikasi di email untuk mengaktifkan akun. Cek folder spam jika tidak
                ada di inbox utama. Link berlaku 24 jam.
              </p>
            </div>
          </div>

          {devVerifyUrl && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-5 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Wrench size={14} className="text-amber-700" />
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  Mode Development
                </p>
              </div>
              <p className="text-xs text-amber-800 mb-2">
                Email belum dikonfigurasi. Klik link di bawah untuk verifikasi langsung:
              </p>
              <a
                href={devVerifyUrl}
                className="inline-block px-3 py-2 bg-amber-600 text-white rounded-md text-xs font-medium hover:bg-amber-700"
              >
                Verifikasi Sekarang →
              </a>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Link
              href="/login"
              className="inline-block px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
            >
              Ke Halaman Login
            </Link>
            <button
              onClick={handleResend}
              disabled={resending}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {resending && <Loader2 size={14} className="animate-spin" />}
              Kirim Ulang Email Verifikasi
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-primary-dark">IbadahHub</h1>
          <p className="text-gray-500 mt-2 text-sm">Daftar sebagai Jemaah</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              placeholder="Nama lengkap Anda"
              {...register('nama')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {errors.nama && <p className="mt-1 text-xs text-red-600">{errors.nama.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              placeholder="nama@email.com"
              {...register('email')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agama</label>
            <select
              {...register('religionId')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">-- Pilih Agama --</option>
              {agamaList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nama}
                </option>
              ))}
            </select>
            {errors.religionId && (
              <p className="mt-1 text-xs text-red-600">{errors.religionId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP</label>
            <input
              type="tel"
              placeholder="08xxxxxxxxxx"
              {...register('noHp')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              placeholder="Minimal 8 karakter"
              {...register('password')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password</label>
            <input
              type="password"
              placeholder="Ulangi password"
              {...register('confirmPassword')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? 'Mendaftar...' : 'Daftar Sekarang'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Login di sini
          </Link>
        </p>
      </div>
    </div>
  )
}
