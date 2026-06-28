import { redirect } from 'next/navigation'

export default function KasRedirectPage() {
  redirect('/keuangan?tab=kas')
}
