'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import axios from 'axios'
import { Loader2, ArrowLeft } from 'lucide-react'
import { agamaCreateSchema, type AgamaCreateInput } from '@/lib/validations/agama'
import { PageHeader } from '@/components/shared/PageHeader'

export default function AgamaEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isLoading },
  } = useForm<AgamaCreateInput>({ resolver: zodResolver(agamaCreateSchema) })

  useEffect(() => {
    axios.get(`/api/agama/${params.id}`).then((res) => {
      const { nama, deskripsi } = res.data.data
      reset({ nama, deskripsi: deskripsi ?? '' })
    }).catch(() => {
      toast.error('Gagal memuat data agama')
      router.push('/agama')
    })
  }, [params.id, reset, router])

  async function onSubmit(data: AgamaCreateInput) {
    try {
      await axios.put(`/api/agama/${params.id}`, data)
      toast.success('Agama berhasil diperbarui')
      router.push('/agama')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error ?? 'Gagal memperbarui agama')
      }
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader
        title="Edit Agama"
        subtitle="Perbarui informasi agama"
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
              Nama Agama <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('nama')}
              disabled={isLoading}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50"
            />
            {errors.nama && (
              <p className="mt-1 text-xs text-red-600">{errors.nama.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deskripsi <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea
              rows={3}
              {...register('deskripsi')}
              disabled={isLoading}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none disabled:bg-gray-50"
            />
            {errors.deskripsi && (
              <p className="mt-1 text-xs text-red-600">{errors.deskripsi.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
