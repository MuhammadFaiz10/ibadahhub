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
  pemasukanCreateSchema,
  type PemasukanCreateInput,
} from '@/lib/validations/pemasukan'
import { PageHeader } from '@/components/shared/PageHeader'
import { FileUploadField } from '@/components/shared/FileUploadField'
import { ScopeSelector } from '@/components/shared/ScopeSelector'

interface Rekening {
  id: number
  namaBank: string
  nomorRekening: string
  namaPemilik: string
}

const kategoriOptions = [
  { value: 'DONASI', label: 'Donasi' },
  { value: 'HIBAH', label: 'Hibah' },
  { value: 'USAHA', label: 'Usaha Komunitas' },
  { value: 'LAINNYA', label: 'Lainnya' },
]

export default function PemasukanBaruPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user.role === 'SUPERADMIN'
  const [rekeningList, setRekeningList] = useState<Rekening[]>([])
  const [isLoadingRekening, setIsLoadingRekening] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PemasukanCreateInput>({
    resolver: zodResolver(pemasukanCreateSchema),
    defaultValues: { kategori: 'DONASI' },
  })

  const religionId = watch('religionId')
  const tempatIbadahId = watch('tempatIbadahId')

  useEffect(() => {
    if (!isSuperAdmin && session?.user.religionId) {
      setValue('religionId', session.user.religionId)
    }
    if (!isSuperAdmin && session?.user.tempatIbadahId) {
      setValue('tempatIbadahId', session.user.tempatIbadahId)
    }
  }, [isSuperAdmin, session, setValue])

  // Load rekening based on selected tempatIbadahId
  useEffect(() => {
    if (!tempatIbadahId) {
      setRekeningList([])
      return
    }

    setIsLoadingRekening(true)
    axios
      .get('/api/rekening', {
        params: {
          tempatIbadahId: tempatIbadahId,
          limit: 100,
        },
      })
      .then((res) => {
        setRekeningList(res.data.data || [])
      })
      .catch(() => {
        toast.error('Gagal memuat daftar rekening')
      })
      .finally(() => {
        setIsLoadingRekening(false)
      })
  }, [tempatIbadahId])

  async function onSubmit(data: PemasukanCreateInput) {
    try {
      await axios.post('/api/pemasukan', data)
      toast.success('Pemasukan berhasil dicatat')
      router.push('/kas')
    } catch (err) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal menyimpan')
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader title="Tambah Pemasukan Kas" subtitle="Catat pemasukan kas baru"
        action={
          <button onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <ArrowLeft size={15} /> Kembali
          </button>
        } />

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Scope Selector for Super Admin */}
          {isSuperAdmin ? (
            <ScopeSelector
              religionId={religionId}
              tempatIbadahId={tempatIbadahId}
              onChange={({ religionId, tempatIbadahId }) => {
                setValue('religionId', religionId as number)
                setValue('tempatIbadahId', tempatIbadahId)
                setValue('rekeningId', null) // Reset rekening on scope change
              }}
              errorReligion={errors.religionId?.message}
              errorTempatIbadah={errors.tempatIbadahId?.message}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agama</label>
                <input type="text" value={session?.user.religionName ?? ''} disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tempat Ibadah</label>
                <input type="text" value={session?.user.tempatIbadahNama ?? ''} disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500" />
              </div>
            </div>
          )}

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori <span className="text-red-500">*</span></label>
              <select {...register('kategori')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                {kategoriOptions.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Penyimpanan Rekening</label>
              <select
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null
                  setValue('rekeningId', val)
                }}
                disabled={isLoadingRekening || !tempatIbadahId}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50"
              >
                <option value="">Kas Tunai / Fisik</option>
                {rekeningList.map((rek) => (
                  <option key={rek.id} value={rek.id}>
                    {rek.namaBank} ({rek.nomorRekening}) a/n {rek.namaPemilik}
                  </option>
                ))}
              </select>
              {errors.rekeningId && <p className="mt-1 text-xs text-red-600">{errors.rekeningId.message}</p>}
            </div>
          </div>

          <FileUploadField
            label="Bukti Transaksi (opsional)"
            kind="bukti"
            accept="image/*,application/pdf"
            value={watch('bukti')}
            onChange={(url) => setValue('bukti', url ?? '', { shouldDirty: true })}
          />

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.back()}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Simpan Pemasukan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
