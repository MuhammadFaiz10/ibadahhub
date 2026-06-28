import { redirect } from 'next/navigation'

export default function DonasiRedirectPage() {
  redirect('/keuangan?tab=donasi')
}
