import { useState, useEffect, useCallback } from 'react'

// In-memory layer (fast access within session)
const memCache = new Map<string, unknown>()

const LS_PREFIX = 'logger-data:'

function lsGet<T>(url: string): T | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + url)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function lsSet(url: string, data: unknown): void {
  try {
    localStorage.setItem(LS_PREFIX + url, JSON.stringify(data))
  } catch {
    // localStorage full or unavailable — skip
  }
}

function lsDel(url: string): void {
  try {
    localStorage.removeItem(LS_PREFIX + url)
  } catch {}
}

function getCached<T>(url: string): T | null {
  if (memCache.has(url)) return memCache.get(url) as T
  const persisted = lsGet<T>(url)
  if (persisted !== null) {
    memCache.set(url, persisted) // warm the mem cache
    return persisted
  }
  return null
}

function setCached(url: string, data: unknown): void {
  memCache.set(url, data)
  lsSet(url, data)
}

function delCached(url: string): void {
  memCache.delete(url)
  lsDel(url)
}

interface DataState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useData<T>(url: string | null): DataState<T> {
  const [data, setData] = useState<T | null>(() => (url ? getCached<T>(url) : null))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => {
    if (url) delCached(url)
    setTick((t) => t + 1)
  }, [url])

  useEffect(() => {
    if (!url) return

    // Use cache on first mount if available
    if (tick === 0) {
      const cached = getCached<T>(url)
      if (cached !== null) {
        setData(cached)
        setLoading(false)
        return
      }
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    // On explicit refresh (tick > 0), tell the server to bypass its cache too
    const fetchUrl = tick > 0
      ? (url.includes('?') ? `${url}&_r=1` : `${url}?_r=1`)
      : url

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        return res.json() as Promise<T>
      })
      .then((d) => {
        if (!cancelled) {
          setCached(url, d)
          setData(d)
          setLoading(false)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [url, tick])

  return { data, loading, error, refetch }
}
