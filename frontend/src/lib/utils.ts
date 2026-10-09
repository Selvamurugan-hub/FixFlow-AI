import type { Status } from './types'

export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')

export function timeAgo(iso: string) {
  const d = new Date(iso)
  const s = Math.round((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`
  return d.toLocaleDateString()
}
export const fullDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export const statusLabel: Record<Status, string> = {
  in_progress: 'In progress', resolved: 'Resolved', not_fixed: 'Not fixed yet',
}

export const DEMO = {
  problem: 'My Python project stopped working after I ran it. It shows an import error.',
  error_message: "Traceback (most recent call last):\n  File \"main.py\", line 1, in <module>\n    import requests\nModuleNotFoundError: No module named 'requests'",
  context: 'Windows 11, VS Code, Python 3.12',
}
