'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import axios from 'axios'
import { Loader2, ArrowLeft } from 'lucide-react'
import {
  pengumumanCreateSchema,
  type PengumumanCreateInput,
} from '@/lib/validations/pengumuman'
import { PageHeader } from '@/components/shared/PageHeader'
import { RichTextEditor } from '@/components/shared/RichTextEditor'

import { ScopeSelector } from '@/components/shared/ScopeSelector'

const statusOptions = [
  { value: 'DRAFT', label: 'Draft (belum dipublish ke jemaah)' },
  { value: 'AKTIF', label: 'Aktif (terlihat oleh jemaah)' },
  { value: 'KADALUARSA', label: 'Kadaluarsa' },
]

export default function PengumumanBaruPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user.role === 'SUPERADMIN'

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PengumumanCreateInput>({
    resolver: zodResolver(pengumumanCreateSchema),
    defaultValues: { status: 'DRAFT', isi: '' },
  })

  useEffect(() => {
    if (!isSuperAdmin && session?.user.religionId) {
      setValue('religionId', session.user.religionId)
    }
    if (!isSuperAdmin && session?.user.tempatIbadahId) {
      setValue('tempatIbadahId', session.user.tempatIbadahId)
    }
  }, [isSuperAdmin, session, setValue])

  async function onSubmit(data: PengumumanCreateInput) {
    try {
      await axios.post('/api/pengumuman', data)
      toast.success('Pengumuman berhasil ditambahkan')
      router.push('/pengumuman')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error ?? 'Gagal menyimpan')
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Tambah Pengumuman"
        subtitle="Buat pengumuman untuk jemaah"
        action={
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft size={15} /> Kembali
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Judul <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('judul')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.judul && <p className="mt-1 text-xs text-red-600">{errors.judul.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Isi Pengumuman <span className="text-red-500">*</span>
            </label>
            <RichTextEditor
              value={watch('isi') ?? ''}
              onChange={(html) => setValue('isi', html, { shouldDirty: true, shouldValidate: true })}
              placeholder="Tulis isi pengumuman di sini..."
            />
            {errors.isi && <p className="mt-1 text-xs text-red-600">{errors.isi.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Publish</label>
              <input
                type="date"
                {...register('tanggalPublish')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-gray-400">Kosongkan untuk pakai hari ini</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Berakhir</label>
              <input
                type="date"
                {...register('expireDate')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-gray-400">Opsional</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              {...register('status')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {isSuperAdmin ? (
            <ScopeSelector
              religionId={watch('religionId')}
              tempatIbadahId={watch('tempatIbadahId')}
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
              {isSubmitting ? 'Menyimpan...' : 'Simpan Pengumuman'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
