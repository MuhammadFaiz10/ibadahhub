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
  pengeluaranUpdateSchema,
  type PengeluaranUpdateInput,
} from '@/lib/validations/pengeluaran'
import { PageHeader } from '@/components/shared/PageHeader'
import { FileUploadField } from '@/components/shared/FileUploadField'

import { ScopeSelector } from '@/components/shared/ScopeSelector'

const kategoriOptions = [
  { value: 'OPERASIONAL', label: 'Operasional' },
  { value: 'KEGIATAN', label: 'Kegiatan' },
  { value: 'SOSIAL', label: 'Sosial' },
  { value: 'LAINNYA', label: 'Lainnya' },
]

export default function PengeluaranEditPage() {
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
  } = useForm<PengeluaranUpdateInput>({ resolver: zodResolver(pengeluaranUpdateSchema) })

  useEffect(() => {
    axios
      .get(`/api/pengeluaran/${params.id}`)
      .then((res) => {
        const d = res.data.data
        reset({
          keterangan: d.keterangan,
          nominal: Number(d.nominal),
          tanggal: new Date(d.tanggal).toISOString().slice(0, 10),
          kategori: d.kategori,
          bukti: d.bukti ?? '',
          religionId: d.religionId,
          tempatIbadahId: d.tempatIbadahId,
        })
        setReadonly({ religion: d.religion?.nama, tempatIbadah: d.tempatIbadah?.nama })
      })
      .catch(() => {
        toast.error('Gagal memuat data')
        router.push('/pengeluaran')
      })
  }, [params.id, reset, router])

  async function onSubmit(data: PengeluaranUpdateInput) {
    try {
      await axios.put(`/api/pengeluaran/${params.id}`, data)
      toast.success('Pengeluaran berhasil diperbarui')
      router.push('/pengeluaran')
    } catch (err) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal memperbarui')
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader title="Edit Pengeluaran" subtitle="Perbarui data pengeluaran"
        action={
          <button onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <ArrowLeft size={15} /> Kembali
          </button>
        } />

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
            <input type="text" {...register('keterangan')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            {errors.keterangan && <p className="mt-1 text-xs text-red-600">{errors.keterangan.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
              <input type="number" min={0} step={1000} {...register('nominal')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
              <input type="date" {...register('tanggal')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select {...register('kategori')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              {kategoriOptions.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>

          <FileUploadField
            label="Bukti Transaksi"
            kind="bukti"
            accept="image/*,application/pdf"
            value={watch('bukti')}
            onChange={(url) => setValue('bukti', url ?? '', { shouldDirty: true })}
          />

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
