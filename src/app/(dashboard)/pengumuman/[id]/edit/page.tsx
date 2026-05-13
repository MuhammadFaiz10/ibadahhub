'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import axios from 'axios'
import { Loader2, ArrowLeft } from 'lucide-react'
import {
  pengumumanUpdateSchema,
  type PengumumanUpdateInput,
} from '@/lib/validations/pengumuman'
import { PageHeader } from '@/components/shared/PageHeader'
import { RichTextEditor } from '@/components/shared/RichTextEditor'

import { ScopeSelector } from '@/components/shared/ScopeSelector'

const statusOptions = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'KADALUARSA', label: 'Kadaluarsa' },
]

export default function PengumumanEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user.role === 'SUPERADMIN'
  const [readonly, setReadonly] = useState<{ religion?: string; tempatIbadah?: string }>({})

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PengumumanUpdateInput>({ resolver: zodResolver(pengumumanUpdateSchema) })

  useEffect(() => {
    axios
      .get(`/api/pengumuman/${params.id}`)
      .then((res) => {
        const d = res.data.data
        reset({
          judul: d.judul,
          isi: d.isi,
          tanggalPublish: new Date(d.tanggalPublish).toISOString().slice(0, 10),
          expireDate: d.expireDate ? new Date(d.expireDate).toISOString().slice(0, 10) : '',
          status: d.status,
          religionId: d.religionId,
          tempatIbadahId: d.tempatIbadahId,
        })
        setReadonly({ religion: d.religion?.nama, tempatIbadah: d.tempatIbadah?.nama })
      })
      .catch(() => {
        toast.error('Gagal memuat data')
        router.push('/pengumuman')
      })
  }, [params.id, reset, router])

  async function onSubmit(data: PengumumanUpdateInput) {
    try {
      await axios.put(`/api/pengumuman/${params.id}`, data)
      toast.success('Pengumuman berhasil diperbarui')
      router.push('/pengumuman')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error ?? 'Gagal memperbarui')
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Edit Pengumuman"
        subtitle="Perbarui pengumuman"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul</label>
            <input
              type="text"
              {...register('judul')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.judul && <p className="mt-1 text-xs text-red-600">{errors.judul.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Isi Pengumuman</label>
            <RichTextEditor
              value={watch('isi') ?? ''}
              onChange={(html) => setValue('isi', html, { shouldDirty: true, shouldValidate: true })}
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
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Berakhir</label>
              <input
                type="date"
                {...register('expireDate')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
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
                setValue('religionId', religionId)
                setValue('tempatIbadahId', tempatIbadahId)
              }}
              errorReligion={errors.religionId?.message}
              errorTempatIbadah={errors.tempatIbadahId?.message}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agama</label>
                <input type="text" value={readonly.religion ?? ''} disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tempat Ibadah</label>
                <input type="text" value={readonly.tempatIbadah ?? ''} disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500" />
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
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
