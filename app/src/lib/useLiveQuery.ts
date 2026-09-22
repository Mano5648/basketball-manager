import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

/** Fetch data once, then refresh whenever any of `tables` changes via Supabase realtime. */
export function useLiveQuery<T>(
  fetcher: () => Promise<T>,
  tables: string[],
  deps: unknown[] = [],
): { data: T | null; loading: boolean; error: string | null; refresh: () => Promise<void> } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refresh = useCallback(async () => {
    try {
      const next = await fetcherRef.current()
      setData((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    if (!supabase || tables.length === 0) return
    let timer: number | null = null
    const schedule = () => {
      if (timer !== null) window.clearTimeout(timer)
      timer = window.setTimeout(() => void refresh(), 250)
    }
    const channel = supabase.channel(`live:${tables.join(',')}:${Math.random().toString(36).slice(2)}`)
    for (const table of tables) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, schedule)
    }
    channel.subscribe()
    const onVisible = () => { if (document.visibilityState === 'visible') schedule() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      if (timer !== null) window.clearTimeout(timer)
      void supabase!.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(','), refresh])

  return { data, loading, error, refresh }
}
