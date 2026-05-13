'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import axios from 'axios'
import { Loader2, ArrowLeft } from 'lucide-react'
import {
  tempatIbadahCreateSchema,
  type TempatIbadahCreateInput,
} from '@/lib/validations/tempat-ibadah'
import { PageHeader } from '@/components/shared/PageHeader'

interface Religion {
  id: number
  nama: string
}

interface Props {
  mode: 'create' | 'edit'
  initialData?: Partial<TempatIbadahCreateInput> & { id?: number }
}

export function TempatIbadahForm({ mode, initialData }: Props) {
  const router = useRouter()
  const [religions, setReligions] = useState<Religion[]>([])

  useEffect(() => {
    axios
      .get('/api/agama/public')
      .then((res) => setReligions(res.data.data ?? []))
      .catch(() => toast.error('Gagal memuat daftar agama'))
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TempatIbadahCreateInput>({
    resolver: zodResolver(tempatIbadahCreateSchema),
    defaultValues: {
      religionId: initialData?.religionId,
      nama: initialData?.nama ?? '',
      slug: initialData?.slug ?? '',
      alamat: initialData?.alamat ?? '',
      kota: initialData?.kota ?? '',
      provinsi: initialData?.provinsi ?? '',
      kodePos: initialData?.kodePos ?? '',
      noTelp: initialData?.noTelp ?? '',
      email: initialData?.email ?? '',
      deskripsi: initialData?.deskripsi ?? '',
      status: initialData?.status ?? 'AKTIF',
    },
  })

  const namaWatch = watch('nama')

  // Auto-generate slug on create when user belum sentuh slug
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')
  useEffect(() => {
    if (!slugTouched && namaWatch) {
      const auto = namaWatch
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setValue('slug', auto)
    }
  }, [namaWatch, slugTouched, setValue])

  async function onSubmit(data: TempatIbadahCreateInput) {
    try {
      if (mode === 'create') {
        await axios.post('/api/tempat-ibadah', data)
        toast.success('Tempat ibadah berhasil dibuat')
      } else {
        await axios.put(`/api/tempat-ibadah/${initialData?.id}`, data)
        toast.success('Tempat ibadah berhasil diperbarui')
      }
      router.push('/tempat-ibadah')
      router.refresh()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error ?? 'Gagal menyimpan')
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title={mode === 'create' ? 'Tambah Tempat Ibadah' : 'Edit Tempat Ibadah'}
        subtitle={
          mode === 'create'
            ? 'Tambahkan masjid, gereja, pura, vihara, atau tempat ibadah lain.'
            : 'Perbarui informasi tempat ibadah.'
        }
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agama <span className="text-red-500">*</span>
              </label>
              <select
                {...register('religionId', { valueAsNumber: true })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">— Pilih agama —</option>
                {religions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nama}
                  </option>
                ))}
              </select>
              {errors.religionId && (
                <p className="mt-1 text-xs text-red-600">{errors.religionId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                {...register('status')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="AKTIF">Aktif</option>
                <option value="NONAKTIF">Nonaktif</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Masjid Al-Hikmah"
                {...register('nama')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.nama && <p className="mt-1 text-xs text-red-600">{errors.nama.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug <span className="text-red-500">*</span>
                <span className="text-xs text-gray-400 font-normal ml-1">
                  (huruf kecil, angka, tanda hubung)
                </span>
              </label>
              <input
                type="text"
                placeholder="masjid-al-hikmah"
                {...register('slug')}
                onChange={(e) => {
                  setSlugTouched(true)
                  setValue('slug', e.target.value)
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alamat <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea
              rows={2}
              {...register('alamat')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kota</label>
              <input
                type="text"
                {...register('kota')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provinsi</label>
              <input
                type="text"
                {...register('provinsi')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kode Pos</label>
              <input
                type="text"
                {...register('kodePos')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">No. Telp</label>
              <input
                type="text"
                {...register('noTelp')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                {...register('email')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deskripsi <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea
              rows={3}
              {...register('deskripsi')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
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
              {isSubmitting ? 'Menyimpan...' : mode === 'create' ? 'Simpan' : 'Perbarui'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
