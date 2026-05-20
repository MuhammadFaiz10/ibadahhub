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
  pemasukanUpdateSchema,
  type PemasukanUpdateInput,
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

export default function PemasukanEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user.role === 'SUPERADMIN'
  const [readonly, setReadonly] = useState<{ religion?: string; tempatIbadah?: string }>({})
  const [rekeningList, setRekeningList] = useState<Rekening[]>([])
  const [isLoadingRekening, setIsLoadingRekening] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PemasukanUpdateInput>({ resolver: zodResolver(pemasukanUpdateSchema) })

  const religionId = watch('religionId')
  const tempatIbadahId = watch('tempatIbadahId')
  const selectedRekeningId = watch('rekeningId')

  // Load Pemasukan detail
  useEffect(() => {
    axios
      .get(`/api/pemasukan/${params.id}`)
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
          rekeningId: d.rekeningId ?? null,
        })
        setReadonly({ religion: d.religion?.nama, tempatIbadah: d.tempatIbadah?.nama })
      })
      .catch(() => {
        toast.error('Gagal memuat data')
        router.push('/kas')
      })
  }, [params.id, reset, router])

  // Load Rekening list based on tempatIbadahId
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

  async function onSubmit(data: PemasukanUpdateInput) {
    try {
      await axios.put(`/api/pemasukan/${params.id}`, data)
      toast.success('Pemasukan berhasil diperbarui')
      router.push('/kas')
    } catch (err) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal memperbarui')
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader title="Edit Pemasukan Kas" subtitle="Perbarui data pemasukan kas"
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
                setValue('religionId', religionId)
                setValue('tempatIbadahId', tempatIbadahId)
                setValue('rekeningId', null)
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select {...register('kategori')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                {kategoriOptions.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Penyimpanan Rekening</label>
              <select
                value={selectedRekeningId ?? ''}
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
            label="Bukti Transaksi"
            kind="bukti"
            accept="image/*,application/pdf"
            value={watch('bukti')}
            onChange={(url) => setValue('bukti', url ?? '', { shouldDirty: true })}
          />

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
