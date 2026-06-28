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

import { ScopeSelector } from '@/components/shared/ScopeSelector'
interface RekeningInfo {
  id: number
  namaBank: string
  nomorRekening: string
  namaPemilik: string
  catatan: string | null
}

const metodeOptions = [
  { value: 'TUNAI', label: 'Tunai' },
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
  const [rekeningList, setRekeningList] = useState<RekeningInfo[]>([])
  const [selectedRekening, setSelectedRekening] = useState<RekeningInfo | null>(null)

  const filteredMetodeOptions = metodeOptions

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DonasiCreateInput>({
    resolver: zodResolver(donasiCreateSchema),
    defaultValues: {
      metodePembayaran: 'MIDTRANS',
      tanggal: new Date().toISOString().slice(0, 10),
    },
  })

  useEffect(() => {
    if (!isSuperAdmin && session?.user.religionId) {
      setValue('religionId', session.user.religionId)
    }
    if (!isSuperAdmin && session?.user.tempatIbadahId) {
      setValue('tempatIbadahId', session.user.tempatIbadahId)
    }
    if (isJemaah && session?.user.name) {
      setValue('namaDonatur', session.user.name)
    }
    // Tarik daftar rekening — JEMAAH juga bisa lihat rekening AKTIF di religion-nya
    axios.get('/api/rekening?limit=50').then((r) => {
      const rekeningData = r.data.data ?? []
      setRekeningList(rekeningData)
      if (isJemaah && rekeningData.length === 1) {
        setValue('rekeningId', rekeningData[0].id)
        setSelectedRekening(rekeningData[0])
      }
    }).catch(() => undefined)
  }, [isSuperAdmin, isJemaah, session, setValue])

  const metodePembayaran = watch('metodePembayaran')
  const rekeningId = watch('rekeningId')
  const isMidtrans = metodePembayaran === 'MIDTRANS'

  useEffect(() => {
    if (metodePembayaran === 'TRANSFER_BANK' && rekeningList.length > 0 && rekeningId) {
      const found = rekeningList.find(r => r.id === rekeningId)
      setSelectedRekening(found || null)
    } else {
      setSelectedRekening(null)
    }
  }, [metodePembayaran, rekeningList, rekeningId])

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
      {isJemaah && metodePembayaran === 'TRANSFER_BANK' && rekeningList.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex gap-3 items-start">
          <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            Tidak ada rekening donasi yang tersedia. Silakan hubungi pengurus atau pilih metode pembayaran lain.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {!isJemaah && (
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
          )}

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
              {filteredMetodeOptions.map((m) => (
                <option
                  key={m.value}
                  value={m.value}
                  disabled={isJemaah && m.value === 'TRANSFER_BANK' && rekeningList.length === 0}
                >
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {metodePembayaran === 'TRANSFER_BANK' && rekeningList.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rekening Tujuan
              </label>
              {rekeningList.length === 1 ? (
                <div className="p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm">
                  <p className="font-medium">{rekeningList[0]?.namaBank} - {rekeningList[0]?.nomorRekening}</p>
                  <p className="text-gray-600">a/n {rekeningList[0]?.namaPemilik}</p>
                  {rekeningList[0]?.catatan && <p className="text-xs text-gray-500 mt-1">{rekeningList[0]?.catatan}</p>}
                </div>
              ) : (
                <>
                  <select
                    {...register('rekeningId', { valueAsNumber: true })}
                    onChange={(e) => {
                      setValue('rekeningId', Number(e.target.value), { shouldValidate: true })
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Pilih Rekening (opsional) --</option>
                    {rekeningList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.namaBank} {r.nomorRekening} a/n {r.namaPemilik}
                      </option>
                    ))}
                  </select>
                  {selectedRekening && (() => {
                    const currentRekening = selectedRekening;
                    return (
                      <div className="mt-2 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm">
                        <p className="font-medium">{currentRekening.namaBank} - {currentRekening.nomorRekening}</p>
                        <p className="text-gray-600">a/n {currentRekening.namaPemilik}</p>
                        {currentRekening.catatan && <p className="text-xs text-gray-500 mt-1">{currentRekening.catatan}</p>}
                      </div>
                    );
                  })()}
                </>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Pilih rekening yang Anda transfer untuk memudahkan verifikasi pengurus.
              </p>
            </div>
          )}

          {metodePembayaran === 'TUNAI' && (
            <>
              <FileUploadField
                label="Bukti Kuitansi / Tanda Terima"
                kind="bukti"
                accept="image/*,application/pdf"
                value={watch('buktiPembayaran')}
                onChange={(url) => setValue('buktiPembayaran', url ?? '', { shouldDirty: true })}
              />
              <p className="-mt-3 text-xs text-gray-400">
                Opsional. Upload bukti serah terima kuitansi atau tanda terima jika ada (max 5 MB).
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
