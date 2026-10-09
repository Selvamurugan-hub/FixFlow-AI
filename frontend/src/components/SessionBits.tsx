import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { api, errorMessage } from '../lib/api'
import type { Session } from '../lib/types'
import { cn } from '../lib/utils'

export function useSession(id: string | undefined) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    if (!id) return
    setLoading(true); setError(null)
    try { setSession(await api.session(id)) } catch (e) { setError(errorMessage(e)) } finally { setLoading(false) }
  }, [id])
  useEffect(() => { load() }, [load])
  return { session, setSession, loading, error, reload: load }
}

const FLOW = [
  { key: 'diagnosis', label: 'Diagnosis' },
  { key: 'fix', label: 'Guided fix' },
  { key: 'verify', label: 'Verify' },
] as const

export function FlowSteps({ id, current }: { id: string; current: (typeof FLOW)[number]['key'] }) {
  const idx = FLOW.findIndex((f) => f.key === current)
  return (
    <ol className="mb-7 flex items-center gap-2 text-sm" aria-label="Troubleshooting progress">
      {FLOW.map((f, i) => (
        <li key={f.key} className="flex items-center gap-2">
          {i > 0 && <span className={cn('h-px w-6 sm:w-12', i <= idx ? 'bg-brand' : 'bg-line')} aria-hidden />}
          <Link to={`/app/session/${id}/${f.key}`} aria-current={i === idx ? 'step' : undefined}
            className={cn('flex items-center gap-2 rounded-full px-3 py-1.5 font-semibold transition-colors',
              i === idx ? 'bg-brand text-brand-ink' : i < idx ? 'text-brand hover:bg-brand/10' : 'text-muted hover:bg-ink/5')}>
            <span className={cn('grid h-5 w-5 place-items-center rounded-full text-[11px]', i === idx ? 'bg-brand-ink/20' : i < idx ? 'bg-brand/15' : 'bg-ink/8')}>
              {i < idx ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className="hidden sm:inline">{f.label}</span>
          </Link>
        </li>
      ))}
    </ol>
  )
}
