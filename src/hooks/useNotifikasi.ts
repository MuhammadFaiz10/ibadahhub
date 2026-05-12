'use client'

import useSWR from 'swr'
import axios from 'axios'

const fetcher = (url: string) => axios.get(url).then((r) => r.data)

export function useNotifikasiCount(): number {
  const { data } = useSWR('/api/notifikasi/unread', fetcher, {
    refreshInterval: 30000,
  })
  return (data?.count as number) ?? 0
}
