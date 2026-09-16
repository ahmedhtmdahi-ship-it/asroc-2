import { useCallback, useEffect, useRef, useState } from 'react'
import { AppError, USE_MOCK, wsUrl } from '../api/client'
import type { WsEvent } from '../api/types'

export interface Async<T> {
  data: T | null
  error: AppError | null
  loading: boolean
  reload: () => void
}

/** Fetch-on-mount with explicit loading/error states — every screen needs all three. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): Async<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<AppError | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    let alive = true
    setLoading(true)
    fnRef.current()
      .then(d => { if (alive) { setData(d); setError(null) } })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof AppError ? e : new AppError('UNKNOWN', String(e)))
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { data, error, loading, reload: useCallback(() => setTick(t => t + 1), []) }
}

/** Live updates from the backend. Reconnects with backoff; no-ops under the mock. */
export function useWs(onEvent: (e: WsEvent) => void): { connected: boolean } {
  const [connected, setConnected] = useState(false)
  const cb = useRef(onEvent)
  cb.current = onEvent

  useEffect(() => {
    if (USE_MOCK || typeof WebSocket === 'undefined') return
    let ws: WebSocket | null = null
    let timer: ReturnType<typeof setTimeout>
    let ping: ReturnType<typeof setInterval>
    let closed = false
    let attempt = 0

    const connect = () => {
      if (closed) return
      try { ws = new WebSocket(wsUrl()) } catch { return }
      ws.onopen = () => {
        attempt = 0
        setConnected(true)
        ping = setInterval(() => ws?.readyState === 1 && ws.send('ping'), 25000)
      }
      ws.onmessage = ev => {
        try { cb.current(JSON.parse(ev.data) as WsEvent) } catch { /* ignore */ }
      }
      ws.onclose = () => {
        setConnected(false)
        clearInterval(ping)
        if (!closed) timer = setTimeout(connect, Math.min(1000 * 2 ** attempt++, 15000))
      }
      ws.onerror = () => ws?.close()
    }
    connect()
    return () => { closed = true; clearTimeout(timer); clearInterval(ping); ws?.close() }
  }, [])

  return { connected }
}

/** Guards every irreversible action: one in-flight call at a time, no optimistic state. */
export function useAction<A extends unknown[]>(fn: (...args: A) => Promise<void>) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const run = useCallback(async (...args: A) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await fn(...args)
    } catch (e: unknown) {
      setError(e instanceof AppError ? e : new AppError('UNKNOWN', String(e)))
    } finally {
      setBusy(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, fn])
  return { run, busy, error }
}
