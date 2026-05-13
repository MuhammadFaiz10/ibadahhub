'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import axios from 'axios'
import { Loader2, ArrowLeft } from 'lucide-react'
import { pengurusUpdateSchema, type PengurusUpdateInput } from '@/lib/validations/pengurus'
import { PageHeader } from '@/components/shared/PageHeader'

import { ScopeSelector } from '@/components/shared/ScopeSelector'

const subRoleOptions = [
  { value: 'KETUA',      label: 'Ketua' },
  { value: 'BENDAHARA',  label: 'Bendahara' },
  { value: 'SEKRETARIS', label: 'Sekretaris' },
]

export default function PengurusEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user.role === 'SUPERADMIN'
  const [originalEmail, setOriginalEmail] = useState('')
  const [readonly, setReadonly] = useState<{ religion?: string; tempatIbadah?: string }>({})

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PengurusUpdateInput>({ resolver: zodResolver(pengurusUpdateSchema) })

  useEffect(() => {
    axios
      .get(`/api/pengurus/${params.id}`)
      .then((res) => {
        const d = res.data.data
        setOriginalEmail(d.email)
        reset({
          nama: d.nama,
          subRole: d.subRole,
          religionId: d.religionId,
          tempatIbadahId: d.tempatIbadahId,
        })
        setReadonly({ religion: d.religion?.nama, tempatIbadah: d.tempatIbadah?.nama })
      })
      .catch(() => {
        toast.error('Gagal memuat data')
        router.push('/pengurus')
      })
  }, [params.id, reset, router])

  async function onSubmit(data: PengurusUpdateInput) {
    try {
      await axios.put(`/api/pengurus/${params.id}`, data)
      toast.success('Pengurus berhasil diperbarui')
      router.push('/pengurus')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error ?? 'Gagal memperbarui pengurus')
      }
    }
  }

  const allowedSubRoles = isSuperAdmin
    ? subRoleOptions
    : subRoleOptions.filter((s) => s.value !== 'KETUA')

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader
        title="Edit Pengurus"
        subtitle="Perbarui data pengurus"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              {...register('nama')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.nama && <p className="mt-1 text-xs text-red-600">{errors.nama.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={originalEmail}
              disabled
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-400">Email tidak dapat diubah</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sub Role</label>
            <select
              {...register('subRole')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Pilih Sub Role --</option>
              {allowedSubRoles.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {errors.subRole && <p className="mt-1 text-xs text-red-600">{errors.subRole.message}</p>}
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
