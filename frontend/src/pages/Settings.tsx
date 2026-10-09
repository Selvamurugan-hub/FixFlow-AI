import { useState } from 'react'
import { Monitor, Moon, Sun, Trash2 } from 'lucide-react'
import { api, errorMessage } from '../lib/api'
import { useApp, type Theme } from '../context/AppContext'
import { Button, Card } from '../components/ui'
import type { Mode } from '../lib/types'
import { cn } from '../lib/utils'

function Choice<T extends string>({ value, current, onPick, children }: { value: T; current: T; onPick: (v: T) => void; children: React.ReactNode }) {
  return (
    <button onClick={() => onPick(value)} aria-pressed={current === value}
      className={cn('flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors', current === value ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted hover:border-brand/50')}>{children}</button>
  )
}

export default function SettingsPage() {
  const { theme, setTheme, defaultMode, setDefaultMode, health, backendOnline, toast } = useApp()
  const [busy, setBusy] = useState(false)
  const clear = async () => {
    if (!window.confirm('Delete ALL troubleshooting history? This cannot be undone.')) return
    setBusy(true)
    try { const r = await api.clearHistory(); toast('success', `Deleted ${r.deleted} session${r.deleted === 1 ? '' : 's'}.`) } catch (e) { toast('error', errorMessage(e)) } finally { setBusy(false) }
  }
  const row = (k: string, v: string) => <div className="flex justify-between gap-4 py-2 text-sm"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>

  return (
    <div className="max-w-2xl space-y-6">
      <div><h1 className="text-3xl font-bold">Settings</h1><p className="mt-1 text-muted">Preferences are stored in this browser.</p></div>
      <Card className="p-5">
        <h2 className="text-lg font-bold">Theme</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {([['light', Sun, 'Light'], ['dark', Moon, 'Dark'], ['system', Monitor, 'System']] as [Theme, typeof Sun, string][]).map(([v, Icon, l]) => (
            <Choice key={v} value={v} current={theme} onPick={setTheme}><Icon className="h-4 w-4" aria-hidden />{l}</Choice>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="text-lg font-bold">Default explanation style</h2>
        <p className="mt-1 text-sm text-muted">Used as the starting choice on every new troubleshooting session.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {([['beginner', 'Beginner'], ['developer', 'Developer']] as [Mode, string][]).map(([v, l]) => <Choice key={v} value={v} current={defaultMode} onPick={setDefaultMode}>{l}</Choice>)}
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="text-lg font-bold">Your data</h2>
        <p className="mt-1 text-sm text-muted">Sessions are stored in a local SQLite database on the backend. Screenshots are analysed in memory and are not saved.</p>
        <Button variant="danger" size="sm" className="mt-3" loading={busy} onClick={clear} icon={<Trash2 className="h-4 w-4" />}>Clear history</Button>
      </Card>
      <Card className="p-5">
        <h2 className="text-lg font-bold">About this app</h2>
        <dl className="mt-2 divide-y divide-line">
          {row('Application', 'FixFlow AI')}
          {row('Backend', backendOnline === null ? 'Checking' : backendOnline ? 'Connected' : 'Offline')}
          {row('AI provider', health ? (health.ai_mode === 'live' ? `Claude (${health.model})` : 'Demo AI (mock, no API key set)') : 'Unknown')}
          {row('Backend version', health?.version ?? 'Unknown')}
        </dl>
      </Card>
    </div>
  )
}
