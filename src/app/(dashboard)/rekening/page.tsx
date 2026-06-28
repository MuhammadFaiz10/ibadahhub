import { redirect } from 'next/navigation'

export default function RekeningRedirectPage() {
  redirect('/keuangan?tab=rekening')
}
