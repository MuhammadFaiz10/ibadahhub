'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import axios from 'axios'
import { Loader2, ArrowLeft } from 'lucide-react'
import { jadwalIbadahCreateSchema, type JadwalIbadahCreateInput } from '@/lib/validations/jadwal-ibadah'
import { ScopeSelector } from '@/components/shared/ScopeSelector'
import { PageHeader } from '@/components/shared/PageHeader'

export default function JadwalIbadahBaruPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user.role === 'SUPERADMIN'

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<JadwalIbadahCreateInput>({
    resolver: zodResolver(jadwalIbadahCreateSchema),
  })

  useEffect(() => {
    if (!isSuperAdmin && session?.user.religionId) {
      setValue('religionId', session.user.religionId)
    }
    if (!isSuperAdmin && session?.user.tempatIbadahId) {
      setValue('tempatIbadahId', session.user.tempatIbadahId)
    }
  }, [isSuperAdmin, session, setValue])

  async function onSubmit(data: JadwalIbadahCreateInput) {
    try {
      await axios.post('/api/jadwal-ibadah', data)
      toast.success('Jadwal ibadah berhasil ditambahkan')
      router.push('/jadwal-ibadah')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error ?? 'Gagal menyimpan jadwal')
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Tambah Jadwal Ibadah"
        subtitle="Buat jadwal ibadah rutin"
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
              Nama Ibadah <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Shalat Subuh, Kebaktian Umum, dll"
              {...register('namaIbadah')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.namaIbadah && <p className="mt-1 text-xs text-red-600">{errors.namaIbadah.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('tanggal')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.tanggal && <p className="mt-1 text-xs text-red-600">{errors.tanggal.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Waktu Mulai <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                {...register('waktuMulai')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.waktuMulai && <p className="mt-1 text-xs text-red-600">{errors.waktuMulai.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Waktu Selesai</label>
              <input
                type="time"
                {...register('waktuSelesai')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pemimpin Ibadah
              </label>
              <input
                type="text"
                placeholder="Contoh: Ustadz Fulan / Pdt. Budi"
                {...register('pemimpin')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pendamping / Petugas Lain
              </label>
              <input
                type="text"
                placeholder="Contoh: Muadzin Bilal / WL Sarah"
                {...register('pendamping')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
            <input
              type="text"
              placeholder="Contoh: Ruang Utama, Masjid Raya"
              {...register('lokasi')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea
              rows={2}
              {...register('catatan')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
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
              {isSubmitting ? 'Menyimpan...' : 'Simpan Jadwal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
