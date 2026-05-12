'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import axios from 'axios'
import { Loader2, ArrowLeft } from 'lucide-react'
import { agamaCreateSchema, type AgamaCreateInput } from '@/lib/validations/agama'
import { PageHeader } from '@/components/shared/PageHeader'

export default function AgamaBaruPage() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AgamaCreateInput>({ resolver: zodResolver(agamaCreateSchema) })

  async function onSubmit(data: AgamaCreateInput) {
    try {
      await axios.post('/api/agama', data)
      toast.success('Agama berhasil ditambahkan')
      router.push('/agama')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error ?? 'Gagal menyimpan agama')
      }
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader
        title="Tambah Agama"
        subtitle="Tambahkan agama baru ke dalam sistem"
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
              placeholder="Contoh: Islam, Kristen, Hindu, Buddha..."
              {...register('nama')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
              placeholder="Deskripsi singkat komunitas agama ini..."
              {...register('deskripsi')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
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
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {isSubmitting ? 'Menyimpan...' : 'Simpan Agama'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
