import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Camera, GitBranch, GraduationCap, History, Moon, ShieldCheck, Sun, Users, Laptop, Building2, Layers } from 'lucide-react'
import { Logo, buttonClass } from '../components/ui'
import { useApp } from '../context/AppContext'

const reveal = (i: number) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.15 + i * 0.22, duration: 0.5, ease: 'easeOut' as const } })

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]" aria-label="Example: a Python error turned into a plain explanation">
      <motion.div {...reveal(0)} className="rounded-2xl border border-white/10 bg-[#0c1514] p-5 font-mono text-[13px] leading-relaxed text-[#dff3ee] shadow-lift">
        <div className="mb-3 flex gap-1.5" aria-hidden><span className="h-2.5 w-2.5 rounded-full bg-[#f07564]" /><span className="h-2.5 w-2.5 rounded-full bg-[#f1b037]" /><span className="h-2.5 w-2.5 rounded-full bg-[#5ecf96]" /></div>
        <p className="text-white/50">Traceback (most recent call last):</p>
        <p className="text-white/50">&nbsp;&nbsp;File "main.py", line 1, in &lt;module&gt;</p>
        <p className="text-[#f07564]">ModuleNotFoundError: No module named 'requests'</p>
      </motion.div>

      <motion.div {...reveal(1)} className="ml-6 flex items-center gap-2 py-3 text-sm font-semibold text-brand" aria-hidden>
        <span className="h-8 w-px bg-brand/50" /> FixFlow reads it for you
      </motion.div>

      <motion.div {...reveal(2)} className="rounded-2xl border border-line bg-raised p-5 shadow-lift sm:ml-8">
        <p className="text-sm font-semibold text-fault">Detected issue</p>
        <p className="font-display text-xl font-bold">A package your code needs isn't installed</p>
        <p className="mt-2 text-[15px] text-muted">Your program wants to borrow a toolkit called <b className="text-ink">requests</b>, but it hasn't been downloaded to this computer yet.</p>
        <div className="mt-3 rounded-lg bg-ink/6 px-3 py-2 font-mono text-[13px]">pip install requests</div>
      </motion.div>
    </div>
  )
}

const features = [
  { icon: GitBranch, title: 'Adaptive retry', body: "If the first fix doesn't work, say so. FixFlow keeps the full context and tries a different strategy instead of repeating itself.", wide: true },
  { icon: GraduationCap, title: 'Beginner or developer', body: 'Plain language with every term explained, or concise technical reasoning. You choose per session.' },
  { icon: Camera, title: 'Screenshot aware', body: 'Attach a screenshot of the error. With a Claude API key configured, the image is read as part of the diagnosis.' },
  { icon: ShieldCheck, title: 'You stay in control', body: 'Commands are shown for review and never run automatically. Risky ones carry a warning.' },
  { icon: History, title: 'A record of what worked', body: 'Every session, attempt and outcome is saved, so a fix is easy to find the next time.', wide: true },
]

export default function Landing() {
  const { theme, setTheme } = useApp()
  const dark = document.documentElement.classList.contains('dark')
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-3 text-sm font-semibold" aria-label="Primary">
          <a href="#how" className="hidden rounded-lg px-3 py-2 text-muted hover:text-ink sm:block">How it works</a>
          <a href="#features" className="hidden rounded-lg px-3 py-2 text-muted hover:text-ink sm:block">Features</a>
          <a href="#impact" className="hidden rounded-lg px-3 py-2 text-muted hover:text-ink sm:block">Impact</a>
          <button onClick={() => setTheme(dark ? 'light' : 'dark')} data-theme={theme} aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`} className="rounded-lg p-2 text-muted hover:bg-ink/5 hover:text-ink">{dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}</button>
          <Link to="/app" className={buttonClass('secondary', 'sm')}>Open app</Link>
        </nav>
      </header>

      <section className="relative overflow-hidden">
        <div className="grid-bg absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div>
            <h1 className="text-[2.6rem] font-bold leading-[1.05] sm:text-6xl">Understand the problem.<br />Follow the fix.<br />Get back to work.</h1>
            <p className="mt-6 max-w-xl text-lg text-muted">Error messages are written for experts. FixFlow AI turns them into a clear explanation of what went wrong, why it happened, and the exact steps to fix it, then checks whether it worked.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/app/new" className={buttonClass('primary', 'lg')}>Start Troubleshooting</Link>
              <Link to="/app/new?demo=1" className={buttonClass('secondary', 'lg')}>Try the demo problem</Link>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="max-w-2xl text-3xl font-bold sm:text-4xl">The answer exists somewhere. It's just not written for you.</h2>
          <p className="mt-4 max-w-2xl text-muted">Fixes are scattered across documentation, forum threads and videos, and most assume you already know the vocabulary. Beginners get stuck on three questions:</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {['What actually went wrong?', 'Why did it happen to me?', 'What exactly should I do next, and did it work?'].map((q) => (
              <p key={q} className="rounded-2xl border border-line bg-raised p-5 font-display text-xl font-bold">{q}</p>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl font-bold sm:text-4xl">From error to fixed, in five moves</h2>
        <ol className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Describe', 'Type the problem, paste the error, or drop in a screenshot.'],
            ['Diagnose', 'Get the detected issue, root cause and a plain-language explanation.'],
            ['Follow the fix', 'Walk through guided steps with the commands and what you should see.'],
            ['Verify', 'Tell FixFlow if it worked. Fixed goes straight into your history.'],
            ['Adapt', 'Still broken? A new strategy that avoids what already failed.'],
          ].map(([t, b], i) => (
            <li key={t} className="relative border-t-2 border-brand pt-4">
              <span className="font-display text-sm font-bold text-brand">Step {i + 1}</span>
              <h3 className="mt-1 text-xl font-bold">{t}</h3>
              <p className="mt-1.5 text-[15px] text-muted">{b}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="features" className="bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-bold sm:text-4xl">Built to teach, not just to answer</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-6">
            {features.map((f) => (
              <div key={f.title} className={`rounded-2xl border border-line bg-raised p-6 ${f.wide ? 'md:col-span-3' : 'md:col-span-2'}`}>
                <f.icon className="h-6 w-6 text-brand" aria-hidden />
                <h3 className="mt-3 text-xl font-bold">{f.title}</h3>
                <p className="mt-1.5 text-[15px] text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl font-bold sm:text-4xl">Made for people without a tech team behind them</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[[GraduationCap, 'College students', 'Debugging assignments at midnight with no TA online.'], [Laptop, 'Beginners', 'Learning to code and hitting their first wall of red text.'], [Users, 'Non-technical users', 'Anyone who just needs the computer to work again.'], [Building2, 'Small teams', 'Groups with no dedicated IT support.']].map(([I, t, b]) => {
            const Icon = I as typeof Users
            return <div key={t as string} className="rounded-2xl border border-line p-5"><Icon className="h-5 w-5 text-signal" aria-hidden /><h3 className="mt-3 text-lg font-bold">{t as string}</h3><p className="mt-1 text-sm text-muted">{b as string}</p></div>
          })}
        </div>
      </section>

      <section id="impact" className="bg-[#0c1514] text-[#e6efec]">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <Layers className="h-7 w-7 text-[#3cc8bd]" aria-hidden />
          <h2 className="mt-4 max-w-3xl text-3xl font-bold sm:text-4xl">Lowering the barrier to solving technical problems</h2>
          <p className="mt-5 max-w-2xl text-lg text-white/70">Whether you can fix your own computer shouldn't depend on whether you already speak the language of error messages. FixFlow AI turns confusing errors into understandable explanations and guided actions, which matters most to learners and to people who have no technical support to ask.</p>
          <Link to="/app/new" className={buttonClass('primary', 'lg', 'mt-8')}>Start Troubleshooting</Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-muted sm:flex-row">
        <Logo className="text-base" />
        <p>Understand the problem. Follow the fix. Get back to work.</p>
      </footer>
    </div>
  )
}
