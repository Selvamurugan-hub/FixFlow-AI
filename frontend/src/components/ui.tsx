import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'
import type { Status } from '../lib/types'
import { statusLabel } from '../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', extra?: string) =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]',
    size === 'sm' && 'px-3 py-1.5 text-sm',
    size === 'md' && 'px-4 py-2.5 text-[15px]',
    size === 'lg' && 'px-6 py-3.5 text-base',
    variant === 'primary' && 'bg-brand text-brand-ink hover:brightness-110',
    variant === 'secondary' && 'border border-line bg-raised text-ink hover:border-brand/60',
    variant === 'ghost' && 'text-muted hover:bg-ink/5 hover:text-ink',
    variant === 'danger' && 'border border-fault/40 bg-fault/10 text-fault hover:bg-fault/15',
    extra,
  )

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode
}
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...rest }, ref,
) {
  return (
    <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
})

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-2xl border border-line bg-raised', className)}>{children}</div>
}

const tones = {
  neutral: 'bg-ink/5 text-muted',
  brand: 'bg-brand/12 text-brand',
  ok: 'bg-ok/12 text-ok',
  warn: 'bg-signal/15 text-signal',
  fault: 'bg-fault/12 text-fault',
}
export function Badge({ tone = 'neutral', children, className }: { tone?: keyof typeof tones; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>{children}</span>
}

export function StatusBadge({ status }: { status: Status }) {
  const tone = status === 'resolved' ? 'ok' : status === 'in_progress' ? 'brand' : 'warn'
  return <Badge tone={tone}>{statusLabel[status]}</Badge>
}

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-lg bg-ink/8', className)} aria-hidden />
)

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-fault/30 bg-fault/5 p-6 text-center">
      <p className="font-semibold text-fault">Something needs attention</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  )
}

export function ConfidenceRing({ value }: { value: number }) {
  const r = 30, c = 2 * Math.PI * r
  const color = value >= 75 ? 'text-ok' : value >= 50 ? 'text-signal' : 'text-fault'
  const label = value >= 75 ? 'High confidence' : value >= 50 ? 'Moderate confidence' : 'Low confidence'
  return (
    <div className="flex items-center gap-3" role="img" aria-label={`${label}: ${value} percent`}>
      <svg width="76" height="76" viewBox="0 0 76 76" className={color}>
        <circle cx="38" cy="38" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="7" />
        <circle cx="38" cy="38" r={r} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform="rotate(-90 38 38)"
          style={{ transition: 'stroke-dashoffset 0.9s ease-out' }} />
        <text x="38" y="43" textAnchor="middle" className="fill-ink font-display text-[18px] font-bold">{value}%</text>
      </svg>
      <span className="text-sm font-semibold text-muted">{label}</span>
    </div>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 font-display text-xl font-bold tracking-tight', className)}>
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="8" fill="rgb(var(--brand))" />
        <path d="M9 21l5-5-5-5" fill="none" stroke="rgb(var(--brand-ink))" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 22h7" stroke="#f2a71b" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      FixFlow<span className="text-brand">AI</span>
    </span>
  )
}
