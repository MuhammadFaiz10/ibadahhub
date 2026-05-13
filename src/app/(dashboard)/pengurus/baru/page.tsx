'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import axios from 'axios'
import { Loader2, ArrowLeft, Info } from 'lucide-react'
import { pengurusCreateSchema, type PengurusCreateInput } from '@/lib/validations/pengurus'
import { PageHeader } from '@/components/shared/PageHeader'
import { PasswordModal } from '@/components/shared/PasswordModal'
import { ScopeSelector } from '@/components/shared/ScopeSelector'

const subRoleOptions = [
  { value: 'KETUA',      label: 'Ketua' },
  { value: 'BENDAHARA',  label: 'Bendahara' },
  { value: 'SEKRETARIS', label: 'Sekretaris' },
]

export default function PengurusBaruPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user.role === 'SUPERADMIN'
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [createdName, setCreatedName] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PengurusCreateInput>({ resolver: zodResolver(pengurusCreateSchema) })

  const religionIdW = watch('religionId')
  const tempatIbadahIdW = watch('tempatIbadahId')

  useEffect(() => {
    if (!isSuperAdmin && session?.user.religionId) {
      setValue('religionId', session.user.religionId)
    }
    if (!isSuperAdmin && session?.user.tempatIbadahId) {
      setValue('tempatIbadahId', session.user.tempatIbadahId)
    }
  }, [isSuperAdmin, session, setValue])

  async function onSubmit(data: PengurusCreateInput) {
    try {
      const res = await axios.post('/api/pengurus', data)
      setCreatedName(data.nama)
      setGeneratedPassword(res.data.generatedPassword)
      toast.success('Pengurus berhasil ditambahkan')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error ?? 'Gagal menyimpan pengurus')
      }
    }
  }

  function handleClosePasswordModal() {
    setGeneratedPassword(null)
    router.push('/pengurus')
  }

  const allowedSubRoles = isSuperAdmin
    ? subRoleOptions
    : subRoleOptions.filter((s) => s.value !== 'KETUA')

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader
        title="Tambah Pengurus"
        subtitle="Buat akun pengurus baru"
        action={
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={15} /> Kembali
          </button>
        }
      />

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex gap-3 items-start">
        <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          Password akan di-generate otomatis dan ditampilkan setelah pengurus berhasil dibuat.
          Bagikan password tersebut kepada pengurus yang bersangkutan.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Nama lengkap pengurus"
              {...register('nama')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.nama && <p className="mt-1 text-xs text-red-600">{errors.nama.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="email@contoh.com"
              {...register('email')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sub Role <span className="text-red-500">*</span>
            </label>
            <select
              {...register('subRole')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Pilih Sub Role --</option>
              {allowedSubRoles.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {errors.subRole && <p className="mt-1 text-xs text-red-600">{errors.subRole.message}</p>}
          </div>

          {isSuperAdmin ? (
            <ScopeSelector
              religionId={religionIdW}
              tempatIbadahId={tempatIbadahIdW}
              onChange={({ religionId, tempatIbadahId }) => {
                setValue('religionId', religionId as number)
                setValue('tempatIbadahId', tempatIbadahId)
              }}
              errorReligion={errors.religionId?.message}
              errorTempatIbadah={errors.tempatIbadahId?.message}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agama</label>
                <input
                  type="text"
                  value={session?.user.religionName ?? ''}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tempat Ibadah</label>
                <input
                  type="text"
                  value={session?.user.tempatIbadahNama ?? ''}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {isSubmitting ? 'Menyimpan...' : 'Buat Akun Pengurus'}
            </button>
          </div>
        </form>
      </div>

      <PasswordModal
        open={!!generatedPassword}
        onClose={handleClosePasswordModal}
        password={generatedPassword}
        userName={createdName}
        title="Password Sementara Pengurus"
      />
    </div>
  )
}
