import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { api } from '../lib/api'
import type { Health, Mode } from '../lib/types'

export type Theme = 'light' | 'dark' | 'system'
type ToastKind = 'success' | 'error' | 'info'
interface Toast { id: number; kind: ToastKind; message: string }

interface Ctx {
  theme: Theme
  setTheme: (t: Theme) => void
  defaultMode: Mode
  setDefaultMode: (m: Mode) => void
  health: Health | null
  backendOnline: boolean | null // null = still checking
  refreshHealth: () => Promise<void>
  toast: (kind: ToastKind, message: string) => void
}

const AppCtx = createContext<Ctx | null>(null)
export const useApp = () => {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp must be used inside AppProvider')
  return c
}

const read = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const write = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* storage unavailable */ } }

function applyTheme(t: Theme) {
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => (read('fixflow.theme') as Theme) || 'system')
  const [defaultMode, setModeState] = useState<Mode>(() => (read('fixflow.mode') === 'developer' ? 'developer' : 'beginner'))
  const [health, setHealth] = useState<Health | null>(null)
  const [backendOnline, setOnline] = useState<boolean | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => applyTheme('system')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [theme])

  const setTheme = useCallback((t: Theme) => { setThemeState(t); write('fixflow.theme', t) }, [])
  const setDefaultMode = useCallback((m: Mode) => { setModeState(m); write('fixflow.mode', m) }, [])

  const refreshHealth = useCallback(async () => {
    try { setHealth(await api.health()); setOnline(true) } catch { setOnline(false) }
  }, [])
  useEffect(() => {
    refreshHealth()
    const t = setInterval(refreshHealth, 30_000)
    return () => clearInterval(t)
  }, [refreshHealth])

  const toast = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t.slice(-2), { id, kind, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, defaultMode, setDefaultMode, health, backendOnline, refreshHealth, toast }),
    [theme, setTheme, defaultMode, setDefaultMode, health, backendOnline, refreshHealth, toast],
  )

  const icon = { success: CheckCircle2, error: TriangleAlert, info: Info }
  const tone = { success: 'text-ok', error: 'text-fault', info: 'text-brand' }
  return (
    <AppCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = icon[t.kind]
            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                role={t.kind === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto flex max-w-md items-start gap-3 rounded-xl border border-line bg-raised px-4 py-3 text-sm shadow-lift">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone[t.kind]}`} aria-hidden />
                <p className="flex-1">{t.message}</p>
                <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss" className="text-muted hover:text-ink">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </AppCtx.Provider>
  )
}
