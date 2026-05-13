'use client'

import { useSession } from 'next-auth/react'
import { TempatIbadahForm } from '../_form'

export default function TempatIbadahBaruPage() {
  const { data: session } = useSession()
  if (session?.user.role !== 'SUPERADMIN') {
    return <div className="text-red-600">Akses ditolak. Halaman ini hanya untuk Superadmin.</div>
  }
  return <TempatIbadahForm mode="create" />
}
