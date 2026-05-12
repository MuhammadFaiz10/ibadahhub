'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import axios from 'axios'
import { Loader2, ArrowLeft } from 'lucide-react'
import { jemaahCreateSchema, type JemaahCreateInput } from '@/lib/validations/jemaah'
import { PageHeader } from '@/components/shared/PageHeader'

interface AgamaOption { id: number; nama: string }

export default function JemaahBaruPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user.role === 'SUPERADMIN'
  const [agamaList, setAgamaList] = useState<AgamaOption[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<JemaahCreateInput>({ resolver: zodResolver(jemaahCreateSchema) })

  useEffect(() => {
    if (!isSuperAdmin && session?.user.religionId) {
      setValue('religionId', session.user.religionId)
    }
    axios.get('/api/agama/public').then((r) => setAgamaList(r.data.data))
  }, [isSuperAdmin, session, setValue])

  async function onSubmit(data: JemaahCreateInput) {
    try {
      await axios.post('/api/jemaah', data)
      toast.success('Jemaah berhasil ditambahkan')
      router.push('/jemaah')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error ?? 'Gagal menyimpan jemaah')
      }
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader
        title="Tambah Jemaah"
        subtitle="Catat data jemaah baru"
        action={
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={15} /> Kembali
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Nama lengkap jemaah"
              {...register('nama')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.nama && <p className="mt-1 text-xs text-red-600">{errors.nama.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              placeholder="email@contoh.com (opsional)"
              {...register('email')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">No. HP</label>
            <input
              type="tel"
              placeholder="08xxxxxxxxxx (opsional)"
              {...register('noHp')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.noHp && <p className="mt-1 text-xs text-red-600">{errors.noHp.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
            <textarea
              placeholder="Alamat tempat tinggal (opsional)"
              rows={3}
              {...register('alamat')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            {errors.alamat && <p className="mt-1 text-xs text-red-600">{errors.alamat.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agama <span className="text-red-500">*</span>
            </label>
            {isSuperAdmin ? (
              <select
                {...register('religionId', { valueAsNumber: true })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Pilih Agama --</option>
                {agamaList.map((a) => (
                  <option key={a.id} value={a.id}>{a.nama}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={session?.user.religionName ?? ''}
                disabled
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500"
              />
            )}
            {errors.religionId && <p className="mt-1 text-xs text-red-600">{errors.religionId.message}</p>}
          </div>

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
              {isSubmitting ? 'Menyimpan...' : 'Simpan Jemaah'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
