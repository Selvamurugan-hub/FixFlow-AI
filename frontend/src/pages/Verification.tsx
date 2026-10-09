import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, GitBranch, History as HistoryIcon, PartyPopper, Plus, RefreshCcw, TriangleAlert, XCircle } from 'lucide-react'
import { api, errorMessage } from '../lib/api'
import { FlowSteps, useSession } from '../components/SessionBits'
import Analyzing from '../components/Analyzing'
import { Button, Card, ErrorState, Skeleton, buttonClass } from '../components/ui'
import { useApp } from '../context/AppContext'

export default function Verification() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { toast, health } = useApp()
  const { session, setSession, loading, error, reload } = useSession(id)
  const [busy, setBusy] = useState<'fixed' | 'retry' | null>(null)
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [inlineError, setInlineError] = useState<string | null>(null)

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-64" /></div>
  if (error || !session) return <ErrorState message={error ?? 'Session not found.'} onRetry={reload} />

  const latest = session.attempts[session.attempts.length - 1]
  const maxAttempts = health?.max_attempts ?? 5
  const outOfIdeas = session.attempts.length >= maxAttempts

  const markFixed = async () => {
    setBusy('fixed'); setInlineError(null)
    try { setSession(await api.verify(id, true)); toast('success', 'Saved to your history. Nice work!') }
    catch (e) { setInlineError(errorMessage(e)); toast('error', errorMessage(e)) }
    finally { setBusy(null) }
  }

  const retry = async () => {
    setBusy('retry'); setInlineError(null)
    try {
      await api.verify(id, false, feedback.trim())
      await api.retry(id)
      nav(`/app/session/${id}/diagnosis`)
    } catch (e) {
      setBusy(null); setInlineError(errorMessage(e)); toast('error', errorMessage(e)); reload()
    }
  }

  if (busy === 'retry') {
    return <Analyzing title="Finding a different approach" subtitle="We're keeping what we learned and ruling out what didn't work."
      stages={['Reviewing what you already tried', 'Looking for a different likely cause', 'Writing a new set of steps']} />
  }

  if (session.status === 'resolved') {
    const n = session.attempts.length
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }}>
          <Card className="overflow-hidden text-center">
            <div className="bg-ok/10 px-6 pb-6 pt-10">
              <svg width="84" height="84" viewBox="0 0 84 84" className="mx-auto text-ok" aria-hidden>
                <motion.circle cx="42" cy="42" r="36" fill="none" stroke="currentColor" strokeWidth="5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
                <motion.path d="M26 43l11 11 21-23" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 0.45 }} />
              </svg>
              <h1 className="mt-4 text-3xl font-bold">Problem solved</h1>
              <p className="mt-1 text-muted">{latest.diagnosis.detected_issue}</p>
            </div>
            <div className="space-y-3 p-6 text-left text-sm">
              <p><span className="font-semibold">What worked: </span>{latest.diagnosis.strategy_label}</p>
              <p><span className="font-semibold">Attempts: </span>{n === 1 ? 'Fixed on the first try.' : `Fixed on attempt ${n}, after adapting the approach.`}</p>
              <p className="rounded-xl bg-surface p-3 text-muted"><PartyPopper className="mr-1.5 inline h-4 w-4 text-signal" aria-hidden />This session is saved in your history, so you can find the fix again if it comes back.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 border-t border-line p-5">
              <Link to="/app/history" className={buttonClass('secondary')}><HistoryIcon className="h-4 w-4" aria-hidden />View in History</Link>
              <Link to="/app/new" className={buttonClass('primary')}><Plus className="h-4 w-4" aria-hidden />New troubleshooting</Link>
            </div>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FlowSteps id={id} current="verify" />
      <Card className="p-6 sm:p-8">
        <h1 className="text-3xl font-bold">Did this fix your problem?</h1>
        <p className="mt-2 text-muted">{latest.diagnosis.verification}</p>

        {inlineError && <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-fault/30 bg-fault/5 p-3 text-sm"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-fault" aria-hidden />{inlineError}</div>}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button size="lg" loading={busy === 'fixed'} disabled={busy !== null} onClick={markFixed} icon={<CheckCircle2 className="h-5 w-5" />}>Yes, it's fixed</Button>
          <Button size="lg" variant="secondary" disabled={busy !== null} onClick={() => setOpen(true)} aria-expanded={open} icon={<XCircle className="h-5 w-5" />}>Still not fixed</Button>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-6 space-y-4 border-t border-line pt-6">
                {outOfIdeas ? (
                  <div className="rounded-xl bg-signal/10 p-4 text-sm"><p className="font-semibold">We've tried {maxAttempts} different approaches.</p><p className="mt-1">Please share the full error and what you tried with an instructor, teammate or IT contact. Your history keeps every attempt for reference.</p></div>
                ) : (
                  <>
                    <div className="flex gap-3 rounded-xl bg-brand/8 p-4 text-sm">
                      <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                      <p><span className="font-semibold">Next, we'll try something different. </span>{latest.diagnosis.alternative_strategy}</p>
                    </div>
                    <div>
                      <label htmlFor="fb" className="mb-1.5 block text-sm font-semibold">What happened after you tried the steps? <span className="font-normal text-muted">(optional)</span></label>
                      <textarea id="fb" rows={3} maxLength={2000} className="field" value={feedback} onChange={(e) => setFeedback(e.target.value)}
                        placeholder="e.g. The install worked but I get the same error when I run my program" />
                    </div>
                    <Button onClick={retry} icon={<RefreshCcw className="h-4 w-4" />}>Find a different approach</Button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
      <p className="text-center text-sm text-muted">Attempt {latest.number} · <Link to={`/app/session/${id}/fix`} className="underline hover:text-ink">Review the steps again</Link></p>
    </div>
  )
}
