'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import axios from 'axios'
import { Loader2, ArrowLeft } from 'lucide-react'
import { rekeningUpdateSchema, type RekeningUpdateInput } from '@/lib/validations/rekening'
import { PageHeader } from '@/components/shared/PageHeader'

interface AgamaOption { id: number; nama: string }

export default function RekeningEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user.role === 'SUPERADMIN'
  const [agamaList, setAgamaList] = useState<AgamaOption[]>([])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RekeningUpdateInput>({ resolver: zodResolver(rekeningUpdateSchema) })

  useEffect(() => {
    Promise.all([
      axios.get(`/api/rekening/${params.id}`),
      axios.get('/api/agama/public'),
    ]).then(([rekRes, agamaRes]) => {
      const d = rekRes.data.data
      setAgamaList(agamaRes.data.data)
      reset({
        namaBank: d.namaBank,
        nomorRekening: d.nomorRekening,
        namaPemilik: d.namaPemilik,
        catatan: d.catatan ?? '',
        status: d.status,
        religionId: d.religionId,
      })
    }).catch(() => {
      toast.error('Gagal memuat data')
      router.push('/rekening')
    })
  }, [params.id, reset, router])

  async function onSubmit(data: RekeningUpdateInput) {
    try {
      await axios.put(`/api/rekening/${params.id}`, data)
      toast.success('Rekening berhasil diperbarui')
      router.push('/rekening')
    } catch (err) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal memperbarui')
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader title="Edit Rekening" subtitle="Perbarui data rekening"
        action={
          <button onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <ArrowLeft size={15} /> Kembali
          </button>
        }
      />
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Bank</label>
            <input type="text" {...register('namaBank')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            {errors.namaBank && <p className="mt-1 text-xs text-red-600">{errors.namaBank.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Rekening</label>
            <input type="text" {...register('nomorRekening')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Atas Nama</label>
            <input type="text" {...register('namaPemilik')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea rows={2} {...register('catatan')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select {...register('status')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="AKTIF">Aktif</option>
              <option value="NONAKTIF">Nonaktif</option>
            </select>
          </div>
          {isSuperAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agama</label>
              <select {...register('religionId', { valueAsNumber: true })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">-- Pilih Agama --</option>
                {agamaList.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.back()}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-60 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
