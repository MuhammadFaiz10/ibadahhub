'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

interface UseDataFetchOptions {
  search?: string
  page?: number
  limit?: number
  arsip?: boolean
  [key: string]: unknown
}

interface UseDataFetchResult<T> {
  data: T[]
  total: number
  isLoading: boolean
  error: string | null
  mutate: () => void
}

export function useDataFetch<T>(
  endpoint: string,
  options: UseDataFetchOptions = {}
): UseDataFetchResult<T> {
  const [data, setData] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trigger, setTrigger] = useState(0)

  const mutate = useCallback(() => setTrigger((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    const params = Object.fromEntries(
      Object.entries(options).filter(([, v]) => v !== undefined && v !== '')
    )

    axios
      .get(endpoint, { params })
      .then((res) => {
        if (cancelled) return
        setData(res.data.data ?? [])
        setTotal(res.data.total ?? 0)
      })
      .catch((err) => {
        if (cancelled) return
        setError(axios.isAxiosError(err) ? err.response?.data?.error ?? 'Gagal memuat data' : 'Error')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, JSON.stringify(options), trigger])

  return { data, total, isLoading, error, mutate }
}
