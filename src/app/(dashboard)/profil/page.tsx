'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import axios from 'axios'
import {
  Loader2,
  UserCircle,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Mail,
  Shield,
  Globe,
  CalendarDays,
  Hash,
  CheckCircle2,
  Building2,
  MapPin,
  Phone,
} from 'lucide-react'
import {
  profilUpdateSchema,
  passwordChangeSchema,
  type ProfilUpdateInput,
  type PasswordChangeInput,
} from '@/lib/validations/profil'
import { PageHeader } from '@/components/shared/PageHeader'
import { FileUploadField } from '@/components/shared/FileUploadField'
import { formatTanggal, getInisial } from '@/lib/utils'

interface ProfilData {
  id: number
  nama: string
  email: string
  role: string
  subRole: string | null
  fotoProfil: string | null
  createdAt: string
  religion: { id: number; nama: string } | null
  tempatIbadah: {
    id: number
    nama: string
    slug: string
    alamat: string | null
    kota: string | null
    provinsi: string | null
    noTelp: string | null
    email: string | null
    logo: string | null
    status: 'AKTIF' | 'NONAKTIF'
  } | null
}

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-gray-100 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-100 rounded w-1/3 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
          </div>
        </div>
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 mb-5 space-y-4">
          <div className="h-5 bg-gray-100 rounded w-1/4 animate-pulse" />
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

interface PasswordFieldProps {
  label: string
  required?: boolean
  hint?: string
  error?: string
  registration: ReturnType<ReturnType<typeof useForm<PasswordChangeInput>>['register']>
}

function PasswordField({ label, required, hint, error, registration }: PasswordFieldProps) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          {...registration}
          autoComplete="off"
          className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default function ProfilPage() {
  const { update: updateSession } = useSession()
  const [profile, setProfile] = useState<ProfilData | null>(null)
  const [loading, setLoading] = useState(true)

  const profilForm = useForm<ProfilUpdateInput>({ resolver: zodResolver(profilUpdateSchema) })
  const passwordForm = useForm<PasswordChangeInput>({ resolver: zodResolver(passwordChangeSchema) })

  useEffect(() => {
    axios
      .get('/api/profil')
      .then((r) => {
        setProfile(r.data.data)
        profilForm.reset({ nama: r.data.data.nama, fotoProfil: r.data.data.fotoProfil })
      })
      .catch(() => toast.error('Gagal memuat profil'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmitProfil(data: ProfilUpdateInput) {
    try {
      const res = await axios.put('/api/profil', data)
      toast.success('Profil berhasil diperbarui')
      setProfile((p) => (p ? { ...p, nama: res.data.data.nama, fotoProfil: res.data.data.fotoProfil } : p))
      await updateSession?.()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error ?? 'Gagal memperbarui profil')
      }
    }
  }

  async function onSubmitPassword(data: PasswordChangeInput) {
    try {
      await axios.post('/api/profil/password', data)
      toast.success('Password berhasil diganti')
      passwordForm.reset({ passwordLama: '', passwordBaru: '', konfirmasiPassword: '' })
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.error
        toast.error(typeof msg === 'string' ? msg : 'Gagal mengganti password')
      }
    }
  }

  if (loading) return <ProfileSkeleton />
  if (!profile) return null

  const roleLabel =
    profile.role === 'SUPERADMIN'
      ? 'Super Admin'
      : profile.subRole
      ? `Pengurus ${profile.subRole.charAt(0) + profile.subRole.slice(1).toLowerCase()}`
      : profile.role.charAt(0) + profile.role.slice(1).toLowerCase()

  const roleBadgeColor =
    profile.role === 'SUPERADMIN'
      ? 'bg-violet-50 text-violet-700 ring-violet-100'
      : profile.role === 'PENGURUS'
      ? 'bg-blue-50 text-blue-700 ring-blue-100'
      : 'bg-emerald-50 text-emerald-700 ring-emerald-100'

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Profil Saya" subtitle="Kelola informasi dan keamanan akun" />

      {/* Hero card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            {profile.fotoProfil ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.fotoProfil}
                alt={profile.nama}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-light to-primary/30 flex items-center justify-center ring-4 ring-white shadow-sm">
                <span className="text-2xl font-semibold text-primary-dark">
                  {getInisial(profile.nama)}
                </span>
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-emerald-500 rounded-full ring-2 ring-white flex items-center justify-center">
              <CheckCircle2 size={12} className="text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 truncate">{profile.nama}</h2>
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
              <Mail size={13} className="text-gray-400" />
              <span className="truncate">{profile.email}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${roleBadgeColor}`}>
                <Shield size={11} />
                {roleLabel}
              </span>
              {profile.religion && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                  <Globe size={11} />
                  {profile.religion.nama}
                </span>
              )}
              {profile.tempatIbadah && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                  <Building2 size={11} />
                  {profile.tempatIbadah.nama}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tempat Ibadah card */}
      {profile.tempatIbadah ? (
        <section className="bg-white rounded-xl border border-gray-200 mb-5 overflow-hidden">
          <header className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                <Building2 size={18} className="text-teal-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Tempat Ibadah</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Akun Anda terhubung ke tempat ibadah berikut
                </p>
              </div>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ring-1 ${
                  profile.tempatIbadah.status === 'AKTIF'
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                    : 'bg-gray-100 text-gray-600 ring-gray-200'
                }`}
              >
                {profile.tempatIbadah.status}
              </span>
            </div>
          </header>

          <div className="p-6">
            <div className="flex items-start gap-4">
              {profile.tempatIbadah.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.tempatIbadah.logo}
                  alt={profile.tempatIbadah.nama}
                  className="w-14 h-14 rounded-lg object-cover ring-1 ring-gray-200 flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center ring-1 ring-teal-100 flex-shrink-0">
                  <Building2 size={24} className="text-teal-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-semibold text-gray-900 truncate">
                  {profile.tempatIbadah.nama}
                </h4>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  {profile.tempatIbadah.slug}
                </p>
                {profile.religion && (
                  <p className="text-xs text-gray-500 mt-1">
                    Agama: <span className="text-gray-700 font-medium">{profile.religion.nama}</span>
                  </p>
                )}
              </div>
            </div>

            {(profile.tempatIbadah.alamat ||
              profile.tempatIbadah.kota ||
              profile.tempatIbadah.noTelp ||
              profile.tempatIbadah.email) && (
              <dl className="mt-5 pt-5 border-t border-gray-100 space-y-3">
                {(profile.tempatIbadah.alamat || profile.tempatIbadah.kota) && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 text-gray-700">
                      {profile.tempatIbadah.alamat && <div>{profile.tempatIbadah.alamat}</div>}
                      {(profile.tempatIbadah.kota || profile.tempatIbadah.provinsi) && (
                        <div className="text-gray-500 text-xs mt-0.5">
                          {[profile.tempatIbadah.kota, profile.tempatIbadah.provinsi]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {profile.tempatIbadah.noTelp && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={14} className="text-gray-400 flex-shrink-0" />
                    <a
                      href={`tel:${profile.tempatIbadah.noTelp}`}
                      className="text-gray-700 hover:text-primary"
                    >
                      {profile.tempatIbadah.noTelp}
                    </a>
                  </div>
                )}
                {profile.tempatIbadah.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail size={14} className="text-gray-400 flex-shrink-0" />
                    <a
                      href={`mailto:${profile.tempatIbadah.email}`}
                      className="text-gray-700 hover:text-primary truncate"
                    >
                      {profile.tempatIbadah.email}
                    </a>
                  </div>
                )}
              </dl>
            )}
          </div>
        </section>
      ) : profile.role !== 'SUPERADMIN' ? (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex gap-3">
          <Building2 size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Belum terhubung ke tempat ibadah</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Akun Anda belum dikaitkan ke tempat ibadah manapun. Hubungi pengurus atau Super Admin
              untuk diatur.
            </p>
          </div>
        </section>
      ) : (
        <section className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-5 flex gap-3">
          <Shield size={20} className="text-violet-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-violet-800">Akses Super Admin — Lintas Tenant</p>
            <p className="text-xs text-violet-700 mt-0.5">
              Sebagai Super Admin, akun Anda tidak terikat ke satu tempat ibadah tertentu dan dapat
              mengelola semua tempat ibadah dalam sistem.
            </p>
          </div>
        </section>
      )}

      {/* Informasi Akun */}
      <section className="bg-white rounded-xl border border-gray-200 mb-5 overflow-hidden">
        <header className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <UserCircle size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Informasi Akun</h3>
              <p className="text-xs text-gray-500 mt-0.5">Perbarui nama tampilan Anda</p>
            </div>
          </div>
        </header>

        <form onSubmit={profilForm.handleSubmit(onSubmitProfil)} className="p-6 space-y-5">
          <FileUploadField
            label="Foto Profil"
            kind="avatar"
            accept="image/*"
            value={profilForm.watch('fotoProfil')}
            onChange={(url) => profilForm.setValue('fotoProfil', url, { shouldDirty: true })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...profilForm.register('nama')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {profilForm.formState.errors.nama && (
              <p className="mt-1.5 text-xs text-red-600">
                {profilForm.formState.errors.nama.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <div className="relative">
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
              />
              <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              Email digunakan untuk login dan tidak dapat diubah
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={profilForm.formState.isSubmitting || !profilForm.formState.isDirty}
              className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {profilForm.formState.isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Simpan Perubahan
            </button>
          </div>
        </form>
      </section>

      {/* Detail Akun (read-only) */}
      <section className="bg-white rounded-xl border border-gray-200 mb-5 overflow-hidden">
        <header className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
              <Shield size={18} className="text-violet-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Detail Akun</h3>
              <p className="text-xs text-gray-500 mt-0.5">Informasi yang ditetapkan oleh sistem</p>
            </div>
          </div>
        </header>

        <dl className="divide-y divide-gray-100">
          <div className="flex items-center justify-between px-6 py-3.5">
            <dt className="flex items-center gap-2 text-sm text-gray-500">
              <Shield size={14} className="text-gray-400" />
              Role
            </dt>
            <dd className="text-sm font-medium text-gray-900">{roleLabel}</dd>
          </div>
          {profile.religion && (
            <div className="flex items-center justify-between px-6 py-3.5">
              <dt className="flex items-center gap-2 text-sm text-gray-500">
                <Globe size={14} className="text-gray-400" />
                Agama
              </dt>
              <dd className="text-sm font-medium text-gray-900">{profile.religion.nama}</dd>
            </div>
          )}
          {profile.tempatIbadah && (
            <div className="flex items-center justify-between px-6 py-3.5">
              <dt className="flex items-center gap-2 text-sm text-gray-500">
                <Building2 size={14} className="text-gray-400" />
                Tempat Ibadah
              </dt>
              <dd className="text-sm font-medium text-gray-900 text-right">
                {profile.tempatIbadah.nama}
                {profile.tempatIbadah.kota && (
                  <span className="block text-xs text-gray-500 font-normal mt-0.5">
                    {profile.tempatIbadah.kota}
                  </span>
                )}
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between px-6 py-3.5">
            <dt className="flex items-center gap-2 text-sm text-gray-500">
              <CalendarDays size={14} className="text-gray-400" />
              Bergabung
            </dt>
            <dd className="text-sm font-medium text-gray-900">{formatTanggal(profile.createdAt)}</dd>
          </div>
          <div className="flex items-center justify-between px-6 py-3.5">
            <dt className="flex items-center gap-2 text-sm text-gray-500">
              <Hash size={14} className="text-gray-400" />
              ID Akun
            </dt>
            <dd className="text-sm font-mono text-gray-700">#{profile.id}</dd>
          </div>
        </dl>
      </section>

      {/* Keamanan / Ganti Password */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <header className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <KeyRound size={18} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Keamanan</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Ganti password secara berkala untuk menjaga akun
              </p>
            </div>
          </div>
        </header>

        <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="p-6 space-y-5">
          <PasswordField
            label="Password Lama"
            required
            registration={passwordForm.register('passwordLama')}
            error={passwordForm.formState.errors.passwordLama?.message}
          />
          <PasswordField
            label="Password Baru"
            required
            hint="Minimal 8 karakter. Gunakan kombinasi huruf, angka, dan simbol."
            registration={passwordForm.register('passwordBaru')}
            error={passwordForm.formState.errors.passwordBaru?.message}
          />
          <PasswordField
            label="Konfirmasi Password Baru"
            required
            registration={passwordForm.register('konfirmasiPassword')}
            error={passwordForm.formState.errors.konfirmasiPassword?.message}
          />

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={passwordForm.formState.isSubmitting}
              className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {passwordForm.formState.isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Ganti Password
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
