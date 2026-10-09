import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Copy, Eye, ShieldAlert, TerminalSquare } from 'lucide-react'
import { FlowSteps, useSession } from '../components/SessionBits'
import { Button, Card, ErrorState, Skeleton, buttonClass } from '../components/ui'
import { useApp } from '../context/AppContext'
import { cn } from '../lib/utils'

export default function GuidedFix() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { toast } = useApp()
  const { session, loading, error, reload } = useSession(id)
  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState<number[]>([])
  const attemptNo = session?.attempts[session.attempts.length - 1].number ?? 0
  const key = `fixflow.steps.${id}.${attemptNo}`

  useEffect(() => {
    if (!attemptNo) return
    try { setDone(JSON.parse(localStorage.getItem(key) || '[]')) } catch { setDone([]) }
    setIdx(0)
  }, [key, attemptNo])
  const persist = (d: number[]) => { setDone(d); try { localStorage.setItem(key, JSON.stringify(d)) } catch { /* ignore */ } }

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-80" /></div>
  if (error || !session) return <ErrorState message={error ?? 'Session not found.'} onRetry={reload} />

  const attempt = session.attempts[session.attempts.length - 1]
  const steps = attempt.diagnosis.steps
  const step = steps[idx]
  const last = idx === steps.length - 1
  const toggleDone = (n: number) => persist(done.includes(n) ? done.filter((x) => x !== n) : [...done, n])
  const next = () => { if (!done.includes(step.step)) persist([...done, step.step]); last ? nav(`/app/session/${id}/verify`) : setIdx(idx + 1) }

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast('success', 'Command copied. Paste it into your terminal when you are ready.') }
    catch { toast('error', 'Could not copy automatically. Select the command and copy it manually.') }
  }

  return (
    <div className="space-y-6">
      <FlowSteps id={id} current="fix" />
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{attempt.diagnosis.detected_issue}</h1>
        <p className="mt-1 text-muted">Work through each step at your own pace. Step {idx + 1} of {steps.length}.</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
          <motion.div className="h-full rounded-full bg-brand" animate={{ width: `${((idx + 1) / steps.length) * 100}%` }} transition={{ duration: 0.35 }} />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[250px_1fr]">
        <ol className="hidden space-y-1 md:block" aria-label="Steps">
          {steps.map((s, i) => (
            <li key={s.step}>
              <button onClick={() => setIdx(i)} aria-current={i === idx ? 'step' : undefined}
                className={cn('flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors', i === idx ? 'bg-brand/12 font-semibold text-brand' : 'text-muted hover:bg-ink/5')}>
                <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px]', done.includes(s.step) ? 'border-ok bg-ok text-white' : 'border-current')}>
                  {done.includes(s.step) ? <Check className="h-3 w-3" /> : s.step}
                </span>
                <span>{s.title}</span>
              </button>
            </li>
          ))}
        </ol>

        <div>
          <motion.div key={step.step} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
            <Card className="space-y-5 p-6">
              <div>
                <p className="text-sm font-semibold text-brand">Step {step.step}</p>
                <h2 className="text-2xl font-bold">{step.title}</h2>
                <p className="mt-2 max-w-prose leading-relaxed">{step.description}</p>
              </div>

              {step.command && (
                <div>
                  {step.risky && (
                    <div role="alert" className="mb-2 flex gap-2 rounded-lg border border-fault/30 bg-fault/8 p-3 text-sm text-fault">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <p><span className="font-semibold">Careful.</span> This command can delete data or change system settings. Make sure you understand it, or ask someone you trust, before running it.</p>
                    </div>
                  )}
                  <div className="overflow-hidden rounded-xl border border-line bg-[#0c1514] text-[#dff3ee]">
                    <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-xs text-white/60">
                      <span className="flex items-center gap-1.5"><TerminalSquare className="h-3.5 w-3.5" aria-hidden />Command to run in your terminal</span>
                      <button onClick={() => copy(step.command!)} className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/10 hover:text-white"><Copy className="h-3.5 w-3.5" aria-hidden />Copy</button>
                    </div>
                    <pre className="scroll-thin overflow-x-auto p-4 font-mono text-sm"><code>{step.command}</code></pre>
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted"><Eye className="h-3.5 w-3.5" aria-hidden />Shown for your review only. FixFlow never runs commands.</p>
                </div>
              )}

              {step.expected_result && (
                <div className="rounded-xl border border-ok/25 bg-ok/8 p-4">
                  <p className="text-sm font-semibold text-ok">What you should see</p>
                  <p className="mt-0.5">{step.expected_result}</p>
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
                <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--brand))]" checked={done.includes(step.step)} onChange={() => toggleDone(step.step)} />
                I've done this step
              </label>

              <div className="flex items-center justify-between border-t border-line pt-5">
                <Button variant="ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)} icon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
                <Button onClick={next}>{last ? 'I\u2019ve finished, verify' : 'Next step'} <ArrowRight className="h-4 w-4" aria-hidden /></Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
      <p className="text-center text-sm text-muted">Stuck? <Link to={`/app/session/${id}/verify`} className={cn(buttonClass('ghost', 'sm'), 'inline-flex underline')}>Skip to verification</Link></p>
    </div>
  )
}
