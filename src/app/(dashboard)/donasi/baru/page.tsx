'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import axios from 'axios'
import { Loader2, ArrowLeft, Info } from 'lucide-react'
import { donasiCreateSchema, type DonasiCreateInput } from '@/lib/validations/donasi'
import { PageHeader } from '@/components/shared/PageHeader'
import { FileUploadField } from '@/components/shared/FileUploadField'

interface AgamaOption { id: number; nama: string }
interface RekeningInfo {
  id: number
  namaBank: string
  nomorRekening: string
  namaPemilik: string
}

const metodeOptions = [
  { value: 'TRANSFER_BANK', label: 'Transfer Bank' },
  { value: 'TUNAI', label: 'Tunai' },
  { value: 'QRIS', label: 'QRIS' },
  { value: 'MIDTRANS', label: 'Bayar Online (Midtrans)' },
]

function loadSnapScript(url: string, clientKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('midtrans-snap')
    if (existing) { resolve(); return }
    const script = document.createElement('script')
    script.id = 'midtrans-snap'
    script.src = url
    script.setAttribute('data-client-key', clientKey)
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export default function DonasiBaruPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const role = session?.user.role
  const isSuperAdmin = role === 'SUPERADMIN'
  const isJemaah = role === 'JEMAAH'
  const [agamaList, setAgamaList] = useState<AgamaOption[]>([])
  const [rekeningList, setRekeningList] = useState<RekeningInfo[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DonasiCreateInput>({
    resolver: zodResolver(donasiCreateSchema),
    defaultValues: {
      metodePembayaran: 'TRANSFER_BANK',
      tanggal: new Date().toISOString().slice(0, 10),
    },
  })

  useEffect(() => {
    if (!isSuperAdmin && session?.user.religionId) {
      setValue('religionId', session.user.religionId)
    }
    if (isJemaah && session?.user.name) {
      setValue('namaDonatur', session.user.name)
    }
    axios.get('/api/agama/public').then((r) => setAgamaList(r.data.data))
    // Tarik daftar rekening — JEMAAH juga bisa lihat rekening AKTIF di religion-nya
    axios.get('/api/rekening?limit=50').then((r) => {
      setRekeningList(r.data.data ?? [])
    }).catch(() => undefined)
  }, [isSuperAdmin, isJemaah, session, setValue])

  const metodePembayaran = watch('metodePembayaran')
  const showRekeningSelector = metodePembayaran === 'TRANSFER_BANK' && rekeningList.length > 0
  const isMidtrans = metodePembayaran === 'MIDTRANS'

  async function onSubmit(data: DonasiCreateInput) {
    try {
      const res = await axios.post('/api/donasi', data)

      if (data.metodePembayaran === 'MIDTRANS') {
        const snapRes = await axios.post('/api/donasi/midtrans', { donasiId: res.data.data.id })
        const { token, snapScriptUrl, clientKey } = snapRes.data.data
        await loadSnapScript(snapScriptUrl, clientKey)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).snap.pay(token, {
          onSuccess: () => { toast.success('Pembayaran berhasil!'); router.push('/donasi') },
          onPending: () => { toast.info('Menunggu pembayaran dikonfirmasi.'); router.push('/donasi') },
          onError: () => { toast.error('Pembayaran gagal. Coba lagi dari halaman donasi.'); router.push('/donasi') },
          onClose: () => { toast.warning('Pembayaran dibatalkan. Donasi tersimpan sebagai PENDING.'); router.push('/donasi') },
        })
      } else {
        toast.success(isJemaah ? 'Donasi berhasil dicatat. Menunggu konfirmasi pengurus.' : 'Donasi berhasil dicatat')
        router.push('/donasi')
      }
    } catch (err) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.error ?? 'Gagal menyimpan')
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader
        title={isJemaah ? 'Tambah Donasi' : 'Catat Donasi'}
        subtitle={isJemaah ? 'Salurkan donasi ke komunitas Anda' : 'Catat donasi yang masuk'}
        action={
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft size={15} /> Kembali
          </button>
        }
      />

      {/* Info rekening untuk JEMAAH */}
      {isJemaah && rekeningList.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex gap-3 items-start">
          <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            Hubungi pengurus untuk informasi nomor rekening donasi.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Donatur <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('namaDonatur')}
              disabled={isJemaah}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-500"
            />
            {errors.namaDonatur && <p className="mt-1 text-xs text-red-600">{errors.namaDonatur.message}</p>}
            {isJemaah && <p className="mt-1 text-xs text-gray-400">Otomatis pakai nama akun Anda</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nominal (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1000}
                step={1000}
                {...register('nominal')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.nominal && <p className="mt-1 text-xs text-red-600">{errors.nominal.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('tanggal')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metode Pembayaran <span className="text-red-500">*</span>
            </label>
            <select
              {...register('metodePembayaran')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {metodeOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {showRekeningSelector && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rekening Tujuan
              </label>
              <select
                {...register('rekeningId', { valueAsNumber: true })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Pilih Rekening (opsional) --</option>
                {rekeningList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.namaBank} {r.nomorRekening} a/n {r.namaPemilik}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Pilih rekening yang Anda transfer untuk memudahkan verifikasi pengurus.
              </p>
            </div>
          )}

          {!isMidtrans && (
            <>
              <FileUploadField
                label="Bukti Pembayaran"
                kind="bukti"
                accept="image/*,application/pdf"
                value={watch('buktiPembayaran')}
                onChange={(url) => setValue('buktiPembayaran', url ?? '', { shouldDirty: true })}
              />
              <p className="-mt-3 text-xs text-gray-400">
                Opsional. Upload screenshot atau PDF bukti transfer (max 5 MB).
              </p>
            </>
          )}

          {isMidtrans && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 items-start">
              <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                Setelah klik <strong>Kirim</strong>, halaman pembayaran Midtrans akan terbuka.
                Pilih metode bayar (transfer, e-wallet, QRIS, dll) dan selesaikan pembayaran di sana.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea
              rows={2}
              {...register('catatan')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {isSuperAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agama</label>
              <select
                {...register('religionId', { valueAsNumber: true })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Pilih Agama --</option>
                {agamaList.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}
              </select>
              {errors.religionId && <p className="mt-1 text-xs text-red-600">{errors.religionId.message}</p>}
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
              {isJemaah ? 'Kirim Donasi' : 'Simpan Donasi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
