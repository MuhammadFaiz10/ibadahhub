'use client'

import { use, useEffect, useState } from 'react'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { TempatIbadahForm } from '../../_form'

export default function TempatIbadahEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: session } = useSession()
  const [initial, setInitial] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios
      .get(`/api/tempat-ibadah/${id}`)
      .then((res) => setInitial(res.data.data))
      .catch((err) => {
        toast.error(
          axios.isAxiosError(err)
            ? err.response?.data?.error ?? 'Gagal memuat data'
            : 'Error'
        )
      })
      .finally(() => setLoading(false))
  }, [id])

  if (session?.user.role !== 'SUPERADMIN') {
    return <div className="text-red-600">Akses ditolak. Halaman ini hanya untuk Superadmin.</div>
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 size={20} className="animate-spin mr-2" /> Memuat data...
      </div>
    )
  }
  if (!initial) {
    return <div className="text-red-600">Tempat ibadah tidak ditemukan.</div>
  }
  return (
    <TempatIbadahForm
      mode="edit"
      initialData={{ ...initial, id: Number(id) } as Parameters<typeof TempatIbadahForm>[0]['initialData']}
    />
  )
}
