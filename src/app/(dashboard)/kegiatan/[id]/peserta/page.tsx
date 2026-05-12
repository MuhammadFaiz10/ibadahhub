'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Loader2,
  Mail,
  Phone,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatTanggal } from '@/lib/utils'

interface Pendaftaran {
  id: number
  status: 'TERDAFTAR' | 'HADIR' | 'TIDAK_HADIR' | 'BATAL'
  catatan: string | null
  createdAt: string
  user: {
    id: number
    nama: string
    email: string
    role: string
    jemaahProfile: { noHp: string | null } | null
  }
}

interface KegiatanInfo {
  id: number
  namaKegiatan: string
  tanggal: string
  waktuMulai: string
  lokasi: string
  kapasitas: number | null
  status: string
}

const statusBadge: Record<Pendaftaran['status'], { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  TERDAFTAR:    { label: 'Terdaftar',     bg: 'bg-blue-50',    text: 'text-blue-700',    icon: <Clock size={11} /> },
  HADIR:        { label: 'Hadir',         bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <CheckCircle2 size={11} /> },
  TIDAK_HADIR:  { label: 'Tidak Hadir',   bg: 'bg-amber-50',   text: 'text-amber-700',   icon: <XCircle size={11} /> },
  BATAL:        { label: 'Batal',         bg: 'bg-gray-100',   text: 'text-gray-600',    icon: <Ban size={11} /> },
}

export default function KegiatanPesertaPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<Pendaftaran[]>([])
  const [kegiatan, setKegiatan] = useState<KegiatanInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`/api/kegiatan/${params.id}/pendaftaran`)
      setData(res.data.data ?? [])
      setKegiatan(res.data.kegiatan ?? null)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error ?? 'Gagal memuat')
      }
      router.push('/kegiatan')
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  useEffect(() => {
    load()
  }, [load])

  async function updateStatus(id: number, status: Pendaftaran['status']) {
    setSavingId(id)
    try {
      await axios.patch(`/api/kegiatan/${params.id}/pendaftaran/${id}`, { status })
      setData((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)))
      toast.success('Status diperbarui')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error ?? 'Gagal memperbarui')
      }
    } finally {
      setSavingId(null)
    }
  }

  const counts = data.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1
      return acc
    },
    { TERDAFTAR: 0, HADIR: 0, TIDAK_HADIR: 0, BATAL: 0 } as Record<Pendaftaran['status'], number>
  )

  return (
    <div>
      <PageHeader
        title="Peserta Kegiatan"
        subtitle={kegiatan ? `${kegiatan.namaKegiatan} — ${formatTanggal(kegiatan.tanggal)}` : 'Kelola pendaftaran'}
        action={
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft size={15} /> Kembali
          </button>
        }
      />

      {/* Stat ringkas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {(['TERDAFTAR', 'HADIR', 'TIDAK_HADIR', 'BATAL'] as const).map((s) => {
          const b = statusBadge[s]
          return (
            <div key={s} className={`bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-lg ${b.bg} ${b.text} flex items-center justify-center flex-shrink-0`}>
                <span className="scale-150">{b.icon}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">{b.label}</p>
                <p className="text-xl font-bold text-gray-900">{counts[s]}</p>
              </div>
            </div>
          )
        })}
      </div>

      {kegiatan?.kapasitas != null && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex items-center gap-3">
          <Users size={18} className="text-gray-400" />
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-gray-900">{counts.TERDAFTAR + counts.HADIR}</span>{' '}
            terdaftar dari kapasitas {kegiatan.kapasitas} —{' '}
            <span className="text-gray-500">
              {Math.max(kegiatan.kapasitas - (counts.TERDAFTAR + counts.HADIR), 0)} slot tersisa
            </span>
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200">
          <EmptyState
            title="Belum ada pendaftaran"
            description="Belum ada jemaah yang mendaftar di kegiatan ini."
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Peserta</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Daftar</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((p) => {
                const b = statusBadge[p.status]
                const saving = savingId === p.id
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.user.nama}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail size={11} className="text-gray-400" />
                          {p.user.email}
                        </span>
                        {p.user.jemaahProfile?.noHp && (
                          <span className="flex items-center gap-1">
                            <Phone size={11} className="text-gray-400" />
                            {p.user.jemaahProfile.noHp}
                          </span>
                        )}
                      </div>
                      {p.catatan && (
                        <p className="text-xs text-gray-500 mt-1 italic">"{p.catatan}"</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatTanggal(p.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${b.bg} ${b.text}`}>
                        {b.icon}
                        {b.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {p.status !== 'HADIR' && (
                          <button
                            onClick={() => updateStatus(p.id, 'HADIR')}
                            disabled={saving}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white disabled:opacity-50"
                            title="Tandai hadir"
                          >
                            <CheckCircle2 size={11} /> Hadir
                          </button>
                        )}
                        {p.status !== 'TIDAK_HADIR' && (
                          <button
                            onClick={() => updateStatus(p.id, 'TIDAK_HADIR')}
                            disabled={saving}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-600 hover:text-white disabled:opacity-50"
                            title="Tandai tidak hadir"
                          >
                            <XCircle size={11} /> Absen
                          </button>
                        )}
                        {p.status !== 'TERDAFTAR' && p.status !== 'BATAL' && (
                          <button
                            onClick={() => updateStatus(p.id, 'TERDAFTAR')}
                            disabled={saving}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white disabled:opacity-50"
                            title="Reset ke terdaftar"
                          >
                            <Clock size={11} /> Reset
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
