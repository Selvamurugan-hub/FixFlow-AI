import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Layers, Percent, Plus, Sparkles, Wand2 } from 'lucide-react'
import { api, errorMessage } from '../lib/api'
import type { Stats } from '../lib/types'
import { Card, EmptyState, ErrorState, Skeleton, StatusBadge, buttonClass } from '../components/ui'
import { timeAgo } from '../lib/utils'

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    setError(null)
    try { setStats(await api.stats()) } catch (e) { setError(errorMessage(e)) }
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-3xl font-bold">Dashboard</h1><p className="mt-1 text-muted">Your troubleshooting at a glance. Numbers come from your saved sessions.</p></div>
        <Link to="/app/new" className={buttonClass('primary')}><Plus className="h-4 w-4" aria-hidden />New troubleshooting</Link>
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : !stats ? (
        <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div><Skeleton className="h-64" /></div>
      ) : stats.total === 0 ? (
        <EmptyState icon={<Sparkles className="h-7 w-7" />} title="Nothing here yet" body="Once you troubleshoot a problem, your sessions, success rate and common problem types will appear here."
          action={<div className="flex flex-wrap justify-center gap-3">
            <Link to="/app/new" className={buttonClass('primary')}><Plus className="h-4 w-4" aria-hidden />Start troubleshooting</Link>
            <Link to="/app/new?demo=1" className={buttonClass('secondary')}><Wand2 className="h-4 w-4" aria-hidden />Try the demo problem</Link></div>} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Total sessions', value: stats.total, icon: Layers, tone: 'text-brand bg-brand/12' },
              { label: 'Problems solved', value: stats.resolved, icon: CheckCircle2, tone: 'text-ok bg-ok/12' },
              { label: 'Success rate', value: `${stats.success_rate ?? 0}%`, icon: Percent, tone: 'text-signal bg-signal/15' },
            ].map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card className="flex items-center gap-4 p-5">
                  <div className={`grid h-12 w-12 place-items-center rounded-xl ${c.tone}`}><c.icon className="h-6 w-6" aria-hidden /></div>
                  <div><p className="font-display text-3xl font-bold leading-none">{c.value}</p><p className="mt-1 text-sm text-muted">{c.label}</p></div>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Recent sessions</h2><Link to="/app/history" className="text-sm font-semibold text-brand hover:underline">View all</Link></div>
              <ul className="divide-y divide-line">
                {stats.recent.map((s) => (
                  <li key={s.id}>
                    <Link to={`/app/session/${s.id}/diagnosis`} className="flex items-center gap-3 py-3 hover:text-brand">
                      <div className="min-w-0 flex-1"><p className="truncate font-semibold">{s.detected_issue}</p><p className="text-xs text-muted">{timeAgo(s.created_at)} · {s.category}</p></div>
                      <StatusBadge status={s.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-5">
              <h2 className="mb-4 text-lg font-bold">Common problem categories</h2>
              <ul className="space-y-3">
                {stats.categories.map((c) => (
                  <li key={c.name}>
                    <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{c.name}</span><span className="text-muted">{c.count}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-line" role="presentation"><motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${(c.count / stats.total) * 100}%` }} transition={{ duration: 0.7 }} /></div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
