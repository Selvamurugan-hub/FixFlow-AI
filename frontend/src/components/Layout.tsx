import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { History, LayoutDashboard, Menu, Moon, Plus, Settings, Sun, WifiOff, X, Cpu, FlaskConical } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Logo, buttonClass } from './ui'
import { cn } from '../lib/utils'

const nav = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/history', label: 'History', icon: History },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { defaultMode } = useApp()
  return (
    <div className="flex h-full flex-col gap-6 p-5">
      <Link to="/" onClick={onNavigate} aria-label="FixFlow AI home"><Logo /></Link>
      <Link to="/app/new" onClick={onNavigate} className={buttonClass('primary', 'md', 'w-full')}>
        <Plus className="h-4 w-4" aria-hidden /> New troubleshooting
      </Link>
      <nav className="flex flex-col gap-1" aria-label="Main">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate}
            className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-colors',
              isActive ? 'bg-brand/12 text-brand' : 'text-muted hover:bg-ink/5 hover:text-ink')}>
            <Icon className="h-[18px] w-[18px]" aria-hidden /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-signal/20 font-display font-bold text-signal" aria-hidden>D</div>
        <div className="min-w-0 text-sm leading-tight">
          <p className="font-semibold">Demo profile</p>
          <p className="text-muted">{defaultMode === 'beginner' ? 'Beginner mode' : 'Developer mode'}</p>
        </div>
      </div>
    </div>
  )
}

function useCrumbs() {
  const { pathname } = useLocation()
  const { id } = useParams()
  const p = pathname.replace(/\/$/, '')
  const out: { label: string; to?: string }[] = [{ label: 'Dashboard', to: '/app' }]
  if (p === '/app') return [{ label: 'Dashboard' }]
  if (p === '/app/new') out.push({ label: 'New troubleshooting' })
  else if (p === '/app/history') out.push({ label: 'History' })
  else if (p === '/app/settings') out.push({ label: 'Settings' })
  else if (id) {
    const page = p.split('/').pop()
    out.push({ label: 'History', to: '/app/history' }, { label: 'Session', to: `/app/session/${id}/diagnosis` })
    out.push({ label: page === 'fix' ? 'Guided fix' : page === 'verify' ? 'Verification' : 'Diagnosis' })
  }
  return out
}

function StatusChip() {
  const { backendOnline, health } = useApp()
  if (backendOnline === null) return null
  if (!backendOnline) {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-fault/12 px-3 py-1 text-xs font-semibold text-fault"><WifiOff className="h-3.5 w-3.5" aria-hidden />Backend offline</span>
  }
  return health?.ai_mode === 'mock' ? (
    <span title="No API key configured: answers come from the built-in demo AI and screenshots are not analysed." className="inline-flex items-center gap-1.5 rounded-full bg-signal/15 px-3 py-1 text-xs font-semibold text-signal"><FlaskConical className="h-3.5 w-3.5" aria-hidden />Demo AI (mock)</span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/12 px-3 py-1 text-xs font-semibold text-ok"><Cpu className="h-3.5 w-3.5" aria-hidden />Claude connected</span>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { theme, setTheme } = useApp()
  const crumbs = useCrumbs()
  const dark = document.documentElement.classList.contains('dark')

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-line bg-surface lg:block"><Sidebar /></aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-line bg-surface lg:hidden"
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'tween', duration: 0.2 }}>
              <button className="absolute right-3 top-3 text-muted" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
              <Sidebar onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur sm:px-8">
          <button className="rounded-lg p-1.5 text-muted hover:bg-ink/5 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="flex items-center gap-1.5 truncate text-sm text-muted">
              {crumbs.map((c, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden>/</span>}
                  {c.to ? <Link to={c.to} className="hover:text-ink">{c.label}</Link> : <span className="font-semibold text-ink" aria-current="page">{c.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
          <StatusChip />
          <button onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`} data-theme={theme}
            className="rounded-lg p-2 text-muted hover:bg-ink/5 hover:text-ink">
            {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8"><Outlet /></main>
      </div>
    </div>
  )
}
