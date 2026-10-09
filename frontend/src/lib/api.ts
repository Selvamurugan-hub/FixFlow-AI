import type { Health, Mode, Session, SessionSummary, Stats } from './types'

const BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').replace(/\/$/, '')

export type ApiErrorKind = 'network' | 'timeout' | 'aborted' | 'http'
export class ApiError extends Error {
  kind: ApiErrorKind
  status: number
  constructor(message: string, kind: ApiErrorKind, status = 0) {
    super(message)
    this.kind = kind
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}, opts: { timeoutMs?: number; signal?: AbortSignal } = {}): Promise<T> {
  const ctrl = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; ctrl.abort() }, opts.timeoutMs ?? 90_000)
  opts.signal?.addEventListener('abort', () => ctrl.abort())
  try {
    const res = await fetch(`${BASE}/api${path}`, { ...init, signal: ctrl.signal })
    if (!res.ok) {
      let detail = 'Something went wrong. Please try again.'
      try {
        const body = await res.json()
        if (typeof body?.detail === 'string') detail = body.detail
      } catch { /* non-JSON error body */ }
      if (res.status >= 500 && res.status !== 502 && res.status !== 504) detail = 'The server hit a problem. Please try again.'
      throw new ApiError(detail, 'http', res.status)
    }
    return (await res.json()) as T
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (timedOut) throw new ApiError('This is taking longer than expected. Please try again.', 'timeout')
    if (opts.signal?.aborted) throw new ApiError('Cancelled.', 'aborted')
    throw new ApiError("Can't reach the FixFlow backend. Make sure it is running (uvicorn on port 8000) and try again.", 'network')
  } finally {
    clearTimeout(timer)
  }
}

const json = (body: unknown): RequestInit => ({
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

export interface NewSessionInput {
  problem: string; error_message: string; context: string; mode: Mode; screenshot: File | null
}

export const api = {
  health: () => request<Health>('/health', {}, { timeoutMs: 6000 }),
  troubleshoot: (input: NewSessionInput, signal?: AbortSignal) => {
    const f = new FormData()
    f.set('problem', input.problem)
    f.set('error_message', input.error_message)
    f.set('context', input.context)
    f.set('mode', input.mode)
    if (input.screenshot) f.set('screenshot', input.screenshot)
    return request<Session>('/troubleshoot', { method: 'POST', body: f }, { signal })
  },
  verify: (session_id: string, fixed: boolean, feedback?: string) =>
    request<Session>('/troubleshoot/verify', json({ session_id, fixed, feedback: feedback || null })),
  retry: (session_id: string, signal?: AbortSignal) =>
    request<Session>('/troubleshoot/retry', json({ session_id }), { signal }),
  history: () => request<SessionSummary[]>('/history'),
  session: (id: string) => request<Session>(`/history/${encodeURIComponent(id)}`),
  clearHistory: () => request<{ deleted: number }>('/history', { method: 'DELETE' }),
  deleteSession: (id: string) => request<{ deleted: number }>(`/history/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  stats: () => request<Stats>('/stats'),
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.')
