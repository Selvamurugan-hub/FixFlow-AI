import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ImagePlus, Sparkles, Trash2, TriangleAlert, Wand2 } from 'lucide-react'
import { api, errorMessage } from '../lib/api'
import type { Mode } from '../lib/types'
import { useApp } from '../context/AppContext'
import Analyzing from '../components/Analyzing'
import { Button, Card } from '../components/ui'
import { DEMO, cn } from '../lib/utils'

const TYPES = ['image/png', 'image/jpeg', 'image/webp']

export default function NewSession() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { defaultMode, health, toast, refreshHealth } = useApp()
  const maxMb = health?.max_image_mb ?? 5

  const [problem, setProblem] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [context, setContext] = useState('')
  const [mode, setMode] = useState<Mode>(defaultMode)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const fillDemo = () => { setProblem(DEMO.problem); setErrorMsg(DEMO.error_message); setContext(DEMO.context); setError(null) }
  useEffect(() => { if (params.get('demo')) fillDemo() }, [params])

  const pick = (f: File | undefined | null) => {
    if (!f) return
    if (!TYPES.includes(f.type)) return setFileError('Please choose a PNG, JPG or WEBP image.')
    if (f.size > maxMb * 1024 * 1024) return setFileError(`That image is larger than ${maxMb} MB. Try a smaller screenshot.`)
    setFileError(null); setFile(f)
  }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]) }
  const onPaste = (e: ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'))
    if (item) pick(item.getAsFile())
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (problem.trim().length < 5 && errorMsg.trim().length < 5 && !file) {
      return setError('Describe the problem, paste the error message, or attach a screenshot so we have something to work with.')
    }
    setBusy(true)
    abort.current = new AbortController()
    try {
      const s = await api.troubleshoot({ problem, error_message: errorMsg, context, mode, screenshot: file }, abort.current.signal)
      nav(`/app/session/${s.id}/diagnosis`)
    } catch (err) {
      setBusy(false)
      const msg = errorMessage(err)
      if (msg !== 'Cancelled.') { setError(msg); toast('error', msg); refreshHealth() }
    }
  }

  if (busy) {
    return (
      <Analyzing title="Analyzing your problem" subtitle="This usually takes a few seconds."
        stages={['Reading your description', file ? 'Looking at your screenshot' : 'Studying the error message', 'Working out the root cause', 'Writing a step-by-step fix']}
        onCancel={() => { abort.current?.abort(); setBusy(false) }} />
    )
  }

  return (
    <form onSubmit={submit} onPaste={onPaste} noValidate className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">What's going wrong?</h1>
          <p className="mt-1 max-w-xl text-muted">Tell us in your own words. The more detail you share, the better the fix. You can also paste a screenshot.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" icon={<Wand2 className="h-4 w-4" />} onClick={fillDemo}>Try the demo problem</Button>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-fault/30 bg-fault/5 p-4 text-sm">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-fault" aria-hidden /> <p>{error}</p>
        </div>
      )}

      <Card className="space-y-5 p-5 sm:p-6">
        <div>
          <label htmlFor="problem" className="mb-1.5 block text-sm font-semibold">Problem description</label>
          <textarea id="problem" rows={3} maxLength={4000} className="field" value={problem} onChange={(e) => setProblem(e.target.value)}
            placeholder="e.g. My Python program crashes as soon as I run it" />
        </div>
        <div>
          <label htmlFor="err" className="mb-1.5 block text-sm font-semibold">Error message <span className="font-normal text-muted">(optional)</span></label>
          <textarea id="err" rows={4} maxLength={4000} className="field font-mono text-sm" value={errorMsg} onChange={(e) => setErrorMsg(e.target.value)}
            placeholder="Paste the exact error text here" spellCheck={false} />
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-semibold">Screenshot <span className="font-normal text-muted">(optional)</span></span>
          {file && preview ? (
            <div className="flex items-center gap-4 rounded-xl border border-line bg-surface p-3">
              <img src={preview} alt="Screenshot preview" className="h-20 w-28 rounded-lg border border-line object-cover" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-semibold">{file.name}</p>
                <p className="text-muted">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <Button type="button" variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => setFile(null)} aria-label="Remove screenshot">Remove</Button>
            </div>
          ) : (
            <div role="button" tabIndex={0} aria-label="Upload a screenshot"
              onClick={() => inputRef.current?.click()} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), inputRef.current?.click())}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
              className={cn('flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
                dragging ? 'border-brand bg-brand/8' : 'border-line hover:border-brand/60')}>
              <ImagePlus className="h-6 w-6 text-brand" aria-hidden />
              <p className="text-sm font-semibold">Drop a screenshot, click to browse, or paste with Ctrl+V</p>
              <p className="text-xs text-muted">PNG, JPG or WEBP, up to {maxMb} MB</p>
            </div>
          )}
          <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" className="hidden"
            onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
          {fileError && <p role="alert" className="mt-2 text-sm text-fault">{fileError}</p>}
          {file && health?.ai_mode === 'mock' && (
            <p className="mt-2 text-xs text-signal">Demo AI is active: the screenshot will be validated and saved as attached, but not read. Add an API key to analyse images.</p>
          )}
        </div>

        <div>
          <label htmlFor="ctx" className="mb-1.5 block text-sm font-semibold">Anything else we should know? <span className="font-normal text-muted">(optional)</span></label>
          <textarea id="ctx" rows={2} maxLength={4000} className="field" value={context} onChange={(e) => setContext(e.target.value)}
            placeholder="Operating system, tools and versions, what you changed recently" />
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">How should we explain it?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {([['beginner', 'Beginner', 'Plain language, every term explained, clear expectations.'], ['developer', 'Developer', 'Concise, technical reasoning, exact commands and checks.']] as const).map(([v, t, d]) => (
              <label key={v} className={cn('cursor-pointer rounded-xl border p-3.5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand',
                mode === v ? 'border-brand bg-brand/8' : 'border-line hover:border-brand/50')}>
                <input type="radio" name="mode" value={v} checked={mode === v} onChange={() => setMode(v)} className="sr-only" />
                <span className="block font-semibold">{t}</span>
                <span className="text-sm text-muted">{d}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" icon={<Sparkles className="h-5 w-5" />}>Analyze Problem</Button>
      </div>
    </form>
  )
}
