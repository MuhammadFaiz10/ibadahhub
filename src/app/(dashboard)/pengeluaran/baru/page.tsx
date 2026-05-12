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
  pengeluaranCreateSchema,
  type PengeluaranCreateInput,
} from '@/lib/validations/pengeluaran'
import { PageHeader } from '@/components/shared/PageHeader'
import { FileUploadField } from '@/components/shared/FileUploadField'

interface AgamaOption { id: number; nama: string }

const kategoriOptions = [
  { value: 'OPERASIONAL', label: 'Operasional' },
  { value: 'KEGIATAN', label: 'Kegiatan' },
  { value: 'SOSIAL', label: 'Sosial' },
  { value: 'LAINNYA', label: 'Lainnya' },
]

export default function PengeluaranBaruPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user.role === 'SUPERADMIN'
  const [agamaList, setAgamaList] = useState<AgamaOption[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PengeluaranCreateInput>({
    resolver: zodResolver(pengeluaranCreateSchema),
    defaultValues: { kategori: 'OPERASIONAL' },
  })

  useEffect(() => {
    if (!isSuperAdmin && session?.user.religionId) {
      setValue('religionId', session.user.religionId)
    }
    axios.get('/api/agama/public').then((r) => setAgamaList(r.data.data))
  }, [isSuperAdmin, session, setValue])

  async function onSubmit(data: PengeluaranCreateInput) {
    try {
      await axios.post('/api/pengeluaran', data)
      toast.success('Pengeluaran berhasil dicatat')
      router.push('/pengeluaran')
    } catch (err) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal menyimpan')
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader title="Tambah Pengeluaran" subtitle="Catat pengeluaran baru"
        action={
          <button onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <ArrowLeft size={15} /> Kembali
          </button>
        } />

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan <span className="text-red-500">*</span></label>
            <input type="text" {...register('keterangan')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            {errors.keterangan && <p className="mt-1 text-xs text-red-600">{errors.keterangan.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp) <span className="text-red-500">*</span></label>
              <input type="number" min={0} step={1000} {...register('nominal')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              {errors.nominal && <p className="mt-1 text-xs text-red-600">{errors.nominal.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal <span className="text-red-500">*</span></label>
              <input type="date" {...register('tanggal')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              {errors.tanggal && <p className="mt-1 text-xs text-red-600">{errors.tanggal.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori <span className="text-red-500">*</span></label>
            <select {...register('kategori')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              {kategoriOptions.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>

          <FileUploadField
            label="Bukti Transaksi (opsional)"
            kind="bukti"
            accept="image/*,application/pdf"
            value={watch('bukti')}
            onChange={(url) => setValue('bukti', url ?? '', { shouldDirty: true })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agama <span className="text-red-500">*</span></label>
            {isSuperAdmin ? (
              <select {...register('religionId', { valueAsNumber: true })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">-- Pilih Agama --</option>
                {agamaList.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}
              </select>
            ) : (
              <input type="text" value={session?.user.religionName ?? ''} disabled
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500" />
            )}
            {errors.religionId && <p className="mt-1 text-xs text-red-600">{errors.religionId.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.back()}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-60 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Simpan Pengeluaran
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
