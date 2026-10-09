import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Camera, CircleHelp, FlaskConical, GitBranch, Lightbulb, ListChecks, Sparkles, Target, Wrench } from 'lucide-react'
import { FlowSteps, useSession } from '../components/SessionBits'
import { Badge, Button, Card, ConfidenceRing, ErrorState, Skeleton, StatusBadge, buttonClass } from '../components/ui'
import { cn, fullDate } from '../lib/utils'

export default function Diagnosis() {
  const { id = '' } = useParams()
  const { session, loading, error, reload } = useSession(id)
  const [viewing, setViewing] = useState<number | null>(null)
  const [tab, setTab] = useState<'beginner' | 'technical' | null>(null)

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-44" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
  if (error || !session) return <ErrorState message={error ?? 'Session not found.'} onRetry={reload} />

  const latest = session.attempts[session.attempts.length - 1]
  const attempt = session.attempts.find((a) => a.number === (viewing ?? latest.number)) ?? latest
  const d = attempt.diagnosis
  const isLatest = attempt.number === latest.number
  const activeTab = tab ?? (session.mode === 'developer' ? 'technical' : 'beginner')

  return (
    <div className="space-y-6">
      <FlowSteps id={session.id} current="diagnosis" />

      {session.attempts.length > 1 && (
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Attempts">
          {session.attempts.map((a) => (
            <button key={a.number} role="tab" aria-selected={a.number === attempt.number} onClick={() => setViewing(a.number)}
              className={cn('rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors',
                a.number === attempt.number ? 'border-brand bg-brand text-brand-ink' : 'border-line text-muted hover:border-brand/50')}>
              Attempt {a.number}{a.outcome === 'not_fixed' ? ' (didn\u2019t work)' : a.outcome === 'fixed' ? ' (fixed)' : ''}
            </button>
          ))}
        </div>
      )}

      <motion.div key={attempt.number} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
        <Card className="overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-fault via-signal to-brand" aria-hidden />
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge tone="fault">Detected issue</Badge>
                <Badge>{d.category}</Badge>
                {attempt.number > 1 && <Badge tone="warn"><GitBranch className="h-3 w-3" aria-hidden />Different approach</Badge>}
                {attempt.provider === 'mock' && <Badge tone="warn"><FlaskConical className="h-3 w-3" aria-hidden />Demo AI</Badge>}
                <StatusBadge status={session.status} />
              </div>
              <h1 className="text-2xl font-bold sm:text-3xl">{d.detected_issue}</h1>
              <p className="mt-2 line-clamp-2 text-sm text-muted">You reported: {session.problem}</p>
              <p className="mt-1 text-xs text-muted">{fullDate(attempt.created_at)}</p>
            </div>
            <ConfidenceRing value={d.confidence} />
          </div>
        </Card>

        {attempt.number > 1 && (
          <div className="flex gap-3 rounded-2xl border border-signal/30 bg-signal/8 p-4 text-sm">
            <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
            <p><span className="font-semibold">New strategy: {d.strategy_label}.</span> The earlier approach didn't solve it, so we're looking at a different likely cause instead of repeating the same steps.</p>
          </div>
        )}
        {session.has_screenshot && (
          <div className="flex gap-3 rounded-2xl border border-line bg-surface p-4 text-sm">
            <Camera className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            <p>{session.screenshot_analyzed ? 'Your screenshot was analysed as part of this diagnosis.' : session.screenshot_note}</p>
          </div>
        )}
        {!isLatest && attempt.user_feedback && (
          <div className="rounded-2xl border border-line bg-surface p-4 text-sm"><span className="font-semibold">Your feedback on this attempt:</span> {attempt.user_feedback}</div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><Target className="h-5 w-5 text-fault" aria-hidden />Root cause</h2>
            <p className="leading-relaxed text-ink/90">{d.root_cause}</p>
          </Card>
          <Card className="p-5">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><CircleHelp className="h-5 w-5 text-signal" aria-hidden />Why this happened</h2>
            <p className="leading-relaxed text-ink/90">{d.why_this_happened}</p>
          </Card>
        </div>

        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Lightbulb className="h-5 w-5 text-brand" aria-hidden />Explanation</h2>
            <div className="inline-flex rounded-lg border border-line p-0.5 text-sm" role="tablist">
              {(['beginner', 'technical'] as const).map((t) => (
                <button key={t} role="tab" aria-selected={activeTab === t} onClick={() => setTab(t)}
                  className={cn('rounded-md px-3 py-1 font-semibold transition-colors', activeTab === t ? 'bg-brand text-brand-ink' : 'text-muted hover:text-ink')}>
                  {t === 'beginner' ? 'In plain words' : 'Technical'}
                </button>
              ))}
            </div>
          </div>
          <p className="max-w-prose leading-relaxed">{activeTab === 'beginner' ? d.beginner_explanation : d.technical_explanation}</p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Wrench className="h-5 w-5 text-brand" aria-hidden />Recommended solution</h2>
          <ol className="space-y-2.5">
            {d.steps.map((s) => (
              <li key={s.step} className="flex gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/12 text-xs font-bold text-brand">{s.step}</span>
                <div className="min-w-0">
                  <p className="font-semibold">{s.title}</p>
                  {s.command && <code className="mt-1 inline-block max-w-full overflow-x-auto rounded-md bg-ink/6 px-2 py-0.5 font-mono text-[13px]">{s.command}</code>}
                </div>
              </li>
            ))}
          </ol>
          {d.expected_result && (
            <div className="mt-4 flex gap-2 rounded-xl bg-ok/10 p-3 text-sm"><ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden /><p><span className="font-semibold">Expected result: </span>{d.expected_result}</p></div>
          )}
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-sm text-muted"><Sparkles className="mr-1 inline h-4 w-4 text-signal" aria-hidden />FixFlow never runs commands for you. You review each one and run it yourself.</p>
          {isLatest ? (
            session.status === 'resolved'
              ? <Link to={`/app/session/${session.id}/verify`} className={buttonClass('secondary')}>View result</Link>
              : <Link to={`/app/session/${session.id}/fix`} className={buttonClass('primary', 'lg')}>Start guided fix <ArrowRight className="h-5 w-5" aria-hidden /></Link>
          ) : (
            <Button variant="secondary" onClick={() => setViewing(null)}>Back to latest attempt</Button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
