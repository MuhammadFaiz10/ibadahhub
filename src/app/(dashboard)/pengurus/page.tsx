import { redirect } from 'next/navigation'

export default function PengurusRedirectPage() {
  redirect('/pengguna?tab=pengurus')
}
