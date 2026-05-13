'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import axios from 'axios'
import { Loader2, ArrowLeft } from 'lucide-react'
import { donasiUpdateSchema, type DonasiUpdateInput } from '@/lib/validations/donasi'
import { PageHeader } from '@/components/shared/PageHeader'
import { FileUploadField } from '@/components/shared/FileUploadField'

import { ScopeSelector } from '@/components/shared/ScopeSelector'

const metodeOptions = [
  { value: 'TRANSFER_BANK', label: 'Transfer Bank' },
  { value: 'TUNAI', label: 'Tunai' },
  { value: 'QRIS', label: 'QRIS' },
]

export default function DonasiEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user.role === 'SUPERADMIN'
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DonasiUpdateInput>({ resolver: zodResolver(donasiUpdateSchema) })

  useEffect(() => {
    axios
      .get(`/api/donasi/${params.id}`)
      .then((res) => {
        const d = res.data.data
        reset({
          namaDonatur: d.namaDonatur,
          nominal: Number(d.nominal),
          tanggal: new Date(d.tanggal).toISOString().slice(0, 10),
          metodePembayaran: d.metodePembayaran,
          catatan: d.catatan ?? '',
          buktiPembayaran: d.buktiPembayaran ?? '',
          religionId: d.religionId,
          tempatIbadahId: d.tempatIbadahId,
        })
      })
      .catch(() => {
        toast.error('Gagal memuat data')
        router.push('/donasi')
      })
  }, [params.id, reset, router])

  async function onSubmit(data: DonasiUpdateInput) {
    try {
      await axios.put(`/api/donasi/${params.id}`, data)
      toast.success('Donasi berhasil diperbarui')
      router.push('/donasi')
    } catch (err) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal memperbarui')
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader title="Edit Donasi" subtitle="Perbarui data donasi"
        action={
          <button onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <ArrowLeft size={15} /> Kembali
          </button>
        } />

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Donatur</label>
            <input type="text" {...register('namaDonatur')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            {errors.namaDonatur && <p className="mt-1 text-xs text-red-600">{errors.namaDonatur.message}</p>}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Metode Pembayaran</label>
            <select {...register('metodePembayaran')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              {metodeOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <FileUploadField
            label="Bukti Pembayaran"
            kind="bukti"
            accept="image/*,application/pdf"
            value={watch('buktiPembayaran')}
            onChange={(url) => setValue('buktiPembayaran', url ?? '', { shouldDirty: true })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea rows={2} {...register('catatan')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>

          {isSuperAdmin && (
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
