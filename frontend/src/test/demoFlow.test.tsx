/**
 * UI flow test: renders the real app in jsdom and drives the hackathon demo against a RUNNING backend.
 * Start the backend first in mock mode:  AI_MODE=mock MOCK_DELAY_SECONDS=0.2  (see README, "Testing").
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { AppProvider } from '../context/AppContext'

const API = process.env.FIXFLOW_TEST_API ?? 'http://127.0.0.1:8000'

beforeAll(async () => {
  window.scrollTo = (() => {}) as typeof window.scrollTo
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia
  const res = await fetch(`${API}/api/health`).catch(() => null)
  if (!res?.ok) throw new Error(`Backend not reachable at ${API}. Start it first (see README).`)
  await fetch(`${API}/api/history`, { method: 'DELETE' })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

const renderApp = (path: string) =>
  render(<MemoryRouter initialEntries={[path]}><AppProvider><App /></AppProvider></MemoryRouter>)

describe('FixFlow AI demo flow', () => {
  it('rejects a non-image screenshot with a friendly message', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const { container } = renderApp('/app/new')
    const input = container.querySelector('input[type=file]') as HTMLInputElement
    await user.upload(input, new File(['hello'], 'notes.txt', { type: 'text/plain' }))
    expect(await screen.findByText(/choose a PNG, JPG or WEBP/i)).toBeTruthy()
  })

  it('shows a validation error for an empty submission', async () => {
    const user = userEvent.setup()
    renderApp('/app/new')
    await user.click(screen.getByRole('button', { name: /analyze problem/i }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/describe the problem/i)
  })

  it('shows a friendly error when the backend is unreachable', async () => {
    const user = userEvent.setup()
    renderApp('/app/new?demo=1')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await user.click(screen.getByRole('button', { name: /analyze problem/i }))
    await waitFor(() => expect(screen.getAllByRole('alert').some((a) => /Can't reach the FixFlow backend/.test(a.textContent ?? ''))).toBe(true))
    expect(screen.getByRole('button', { name: /analyze problem/i })).toBeTruthy() // form (and the user's input) preserved
  })

  it('runs: analyze -> diagnosis -> guided fix -> still not fixed -> adaptive retry -> fixed -> history', async () => {
    const user = userEvent.setup()
    renderApp('/app/new?demo=1')
    expect((screen.getByLabelText(/error message/i) as HTMLTextAreaElement).value).toMatch(/No module named 'requests'/)

    await user.click(screen.getByRole('button', { name: /analyze problem/i }))
    expect(await screen.findByText(/analyzing your problem/i)).toBeTruthy()

    // Diagnosis
    expect(await screen.findByRole('heading', { name: /Missing Python package: requests/ }, { timeout: 15000 })).toBeTruthy()
    expect(screen.getByText('Root cause')).toBeTruthy()
    expect(screen.getByText('Why this happened')).toBeTruthy()
    expect(screen.getByText(/92%/)).toBeTruthy()
    expect(screen.getByText(/in plain words/i)).toBeTruthy()
    expect(screen.getAllByText('pip install requests').length).toBeGreaterThan(0)

    // Guided fix: walk every step
    await user.click(screen.getByRole('link', { name: /start guided fix/i }))
    expect(await screen.findByText(/Step 1 of 4/)).toBeTruthy()
    expect(screen.getByText(/never runs commands/i)).toBeTruthy()
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: /next step/i }))
    await user.click(await screen.findByRole('button', { name: /finished, verify/i }))

    // Verification -> still not fixed
    expect(await screen.findByRole('heading', { name: /did this fix your problem/i })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /still not fixed/i }))
    await user.type(await screen.findByLabelText(/what happened after/i), 'Same error again')
    await user.click(screen.getByRole('button', { name: /find a different approach/i }))

    // Adaptive retry: different strategy shown
    expect(await screen.findByRole('heading', { name: /pip and python point to different environments/i }, { timeout: 15000 })).toBeTruthy()
    expect(screen.getByText(/new strategy: fix interpreter mismatch/i)).toBeTruthy()
    expect(screen.getAllByRole('tab', { name: /Attempt 1/ }).length).toBe(1)
    expect(screen.getByRole('tab', { name: /Attempt 1 \(didn.t work\)/ })).toBeTruthy()

    // Fixed
    await user.click(screen.getByRole('link', { name: /start guided fix/i }))
    await user.click(await screen.findByRole('link', { name: /skip to verification/i }))
    await user.click(await screen.findByRole('button', { name: /yes, it.s fixed/i }))
    expect(await screen.findByRole('heading', { name: /problem solved/i })).toBeTruthy()
    expect(screen.getByText(/fixed on attempt 2/i)).toBeTruthy()

    // History
    await user.click(screen.getByRole('link', { name: /view in history/i }))
    const item = await screen.findByText(/pip and python point to different environments/i)
    const card = item.closest('li') as HTMLElement
    expect(within(card).getByText('Resolved')).toBeTruthy()
    expect(within(card).getByText('2 attempts')).toBeTruthy()
  })
})
