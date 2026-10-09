import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Button, Card } from './ui'

interface Props { title: string; subtitle: string; stages: string[]; onCancel?: () => void }

export default function Analyzing({ title, subtitle, stages, onCancel }: Props) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, stages.length - 1)), 2200)
    return () => clearInterval(t)
  }, [stages.length])

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center" role="status" aria-live="polite">
      <Card className="w-full overflow-hidden p-8 shadow-lift">
        <div className="relative mb-7 h-1.5 overflow-hidden rounded-full bg-line">
          <motion.div className="absolute inset-y-0 left-0 rounded-full bg-brand"
            initial={{ width: '6%' }} animate={{ width: `${Math.min(92, 18 + (i + 1) * (74 / stages.length))}%` }} transition={{ duration: 1.4, ease: 'easeOut' }} />
          <div className="sweep absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <ul className="mt-6 space-y-3">
          {stages.map((s, idx) => {
            const done = idx < i, active = idx === i
            return (
              <li key={s} className={`flex items-center gap-3 text-[15px] transition-opacity ${idx > i ? 'opacity-40' : ''}`}>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs ${done ? 'border-ok bg-ok text-white' : active ? 'border-brand' : 'border-line'}`}>
                  {done ? <Check className="h-3.5 w-3.5" /> : active ? <span className="h-2 w-2 animate-ping rounded-full bg-brand" /> : null}
                </span>
                <span className={active ? 'font-semibold' : ''}>{s}</span>
              </li>
            )
          })}
        </ul>
        {onCancel && <Button variant="ghost" size="sm" className="mt-7" onClick={onCancel}>Cancel</Button>}
      </Card>
    </div>
  )
}
