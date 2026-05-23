'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import axios from 'axios'
import { Loader2, ArrowLeft } from 'lucide-react'
import { jadwalIbadahUpdateSchema, type JadwalIbadahUpdateInput } from '@/lib/validations/jadwal-ibadah'
import { PageHeader } from '@/components/shared/PageHeader'
import { ScopeSelector } from '@/components/shared/ScopeSelector'

export default function JadwalIbadahEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user.role === 'SUPERADMIN'
  const [readonly, setReadonly] = useState<{ religion?: string; tempatIbadah?: string }>({})

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<JadwalIbadahUpdateInput>({ resolver: zodResolver(jadwalIbadahUpdateSchema) })

  useEffect(() => {
    axios
      .get(`/api/jadwal-ibadah/${params.id}`)
      .then((res) => {
        const d = res.data.data
        reset({
          namaIbadah: d.namaIbadah,
          tanggal: new Date(d.tanggal).toISOString().slice(0, 10),
          waktuMulai: d.waktuMulai,
          waktuSelesai: d.waktuSelesai ?? '',
          lokasi: d.lokasi ?? '',
          pemimpin: d.pemimpin ?? '',
          pendamping: d.pendamping ?? '',
          catatan: d.catatan ?? '',
          religionId: d.religionId,
          tempatIbadahId: d.tempatIbadahId,
        })
        setReadonly({ religion: d.religion?.nama, tempatIbadah: d.tempatIbadah?.nama })
      })
      .catch(() => {
        toast.error('Gagal memuat data jadwal')
        router.push('/jadwal-ibadah')
      })
  }, [params.id, reset, router])

  async function onSubmit(data: JadwalIbadahUpdateInput) {
    try {
      await axios.put(`/api/jadwal-ibadah/${params.id}`, data)
      toast.success('Jadwal ibadah berhasil diperbarui')
      router.push('/jadwal-ibadah')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error ?? 'Gagal memperbarui jadwal')
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Edit Jadwal Ibadah"
        subtitle="Perbarui jadwal ibadah rutin"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Ibadah</label>
            <input
              type="text"
              {...register('namaIbadah')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.namaIbadah && <p className="mt-1 text-xs text-red-600">{errors.namaIbadah.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
              <input
                type="date"
                {...register('tanggal')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Waktu Mulai</label>
              <input
                type="time"
                {...register('waktuMulai')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Pemimpin Ibadah</label>
              <input
                type="text"
                {...register('pemimpin')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pendamping / Petugas Lain</label>
              <input
                type="text"
                {...register('pendamping')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
            <input
              type="text"
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
