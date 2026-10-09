import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, History as HistoryIcon, Plus, Search, Trash2 } from 'lucide-react'
import { api, errorMessage } from '../lib/api'
import type { SessionSummary, Status } from '../lib/types'
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton, StatusBadge, buttonClass } from '../components/ui'
import { useApp } from '../context/AppContext'
import { cn, fullDate, timeAgo } from '../lib/utils'

const FILTERS: { key: 'all' | Status; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'resolved', label: 'Resolved' }, { key: 'in_progress', label: 'In progress' }, { key: 'not_fixed', label: 'Not fixed' },
]

export default function History() {
  const { toast } = useApp()
  const [items, setItems] = useState<SessionSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | Status>('all')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setError(null)
    try { setItems(await api.history()) } catch (e) { setError(errorMessage(e)) }
  }, [])
  useEffect(() => { load() }, [load])

  const shown = useMemo(() => (items ?? []).filter((i) =>
    (filter === 'all' || i.status === filter) && (!q || `${i.problem} ${i.detected_issue} ${i.category}`.toLowerCase().includes(q.toLowerCase()))), [items, filter, q])

  const remove = async (id: string) => {
    if (!window.confirm('Delete this session from your history?')) return
    try { await api.deleteSession(id); setItems((x) => (x ?? []).filter((i) => i.id !== id)); toast('success', 'Session deleted.') }
    catch (e) { toast('error', errorMessage(e)) }
  }
  const clearAll = async () => {
    if (!window.confirm('Delete ALL troubleshooting history? This cannot be undone.')) return
    try { await api.clearHistory(); setItems([]); toast('success', 'History cleared.') } catch (e) { toast('error', errorMessage(e)) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-3xl font-bold">History</h1><p className="mt-1 text-muted">Every problem you've worked through, and how it ended.</p></div>
        {!!items?.length && <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={clearAll}>Clear history</Button>}
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : items === null ? (
        <div className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={<HistoryIcon className="h-7 w-7" />} title="No sessions yet" body="Solve your first problem and it will show up here with the diagnosis and the outcome."
          action={<Link to="/app/new" className={buttonClass('primary')}><Plus className="h-4 w-4" aria-hidden />New troubleshooting</Link>} />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} className="field pl-10" placeholder="Search problems and issues" aria-label="Search history" />
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
              {FILTERS.map((f) => (
                <button key={f.key} onClick={() => setFilter(f.key)} aria-pressed={filter === f.key}
                  className={cn('rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors', filter === f.key ? 'border-brand bg-brand text-brand-ink' : 'border-line text-muted hover:border-brand/50')}>{f.label}</button>
              ))}
            </div>
          </div>
          {shown.length === 0 ? <p className="py-10 text-center text-muted">Nothing matches that search.</p> : (
            <ul className="space-y-3">
              {shown.map((s) => (
                <li key={s.id}>
                  <Card className="flex items-stretch transition-colors hover:border-brand/50">
                    <Link to={`/app/session/${s.id}/diagnosis`} className="min-w-0 flex-1 p-5">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={s.status} /><Badge>{s.category}</Badge>
                        {s.attempts_count > 1 && <Badge tone="warn">{s.attempts_count} attempts</Badge>}
                        {s.has_screenshot && <Badge><Camera className="h-3 w-3" aria-hidden />Screenshot</Badge>}
                      </div>
                      <p className="truncate text-lg font-bold">{s.detected_issue}</p>
                      <p className="truncate text-sm text-muted">{s.problem}</p>
                      <p className="mt-1.5 text-xs text-muted" title={fullDate(s.created_at)}>{fullDate(s.created_at)} · {timeAgo(s.created_at)}</p>
                    </Link>
                    <button onClick={() => remove(s.id)} aria-label="Delete session" className="px-4 text-muted transition-colors hover:text-fault"><Trash2 className="h-4 w-4" /></button>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
