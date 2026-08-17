import React, { useRef, useState, useEffect } from 'react'
import { Sparkles, Send, Mic, RotateCcw, ArrowRight, Check, Wand2, Plus } from 'lucide-react'
import { useProject } from '../state/store'
import { Button, Badge, cn } from './ui'
import { classify, generateAddonTasks, NEW_GARAGE_WBS } from '../lib/agents'
import { finishDate, workingDaysBetween, fmtDate, shiftWithRipple, scheduleMetrics, isOverdue } from '../lib/scheduling'

interface Proposal {
  title: string
  lines: string[]
  wbs?: { wbs: string; name: string; dur: string }[]
  primaryLabel?: string
  onPrimary?: () => void
  tone?: 'brand' | 'warn' | 'ok'
}
interface Msg {
  role: 'user' | 'agent'
  text?: string
  proposal?: Proposal
  id: number
}

const BUBBLES = [
  'Show me what will slip',
  'Simulate a 5-day delay',
  'Recover the finish date',
  'What is blocking the critical path?',
  'Next week outlook',
  'Level the framing crew',
  'Draft a customer update',
  'Add a lean-to add-on',
]

let uid = 1

export default function AgentPanel() {
  const proj = useProject()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [applied, setApplied] = useState<Set<number>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, thinking])

  function push(m: Omit<Msg, 'id'>) {
    setMsgs((s) => [...s, { ...m, id: uid++ }])
  }

  function respond(prompt: string) {
    const intent = classify(prompt)
    const { tasks, commit, setHighlight, pushToast, finish, baseFinish, cpm } = proj

    if (intent === 'addon') {
      const addon = generateAddonTasks()
      const preview = finishDate([...tasks, ...addon])
      const d = workingDaysBetween(finish, preview)
      push({
        role: 'agent',
        text: 'I can add a 12×16 covered lean-to. Here’s the scope I’d chain into framing:',
        proposal: {
          title: 'Lean-to add-on · 3 tasks · +$6.1k',
          lines: [`Chained to Framing — Walls (3.05)`, `New finish: ${fmtDate(preview)} (${d >= 0 ? '+' : ''}${d}d)`, `Crews: Concrete → Framing → Roofing`],
          wbs: addon.map((t) => ({ wbs: t.wbs, name: t.name, dur: '2–4d' })),
          primaryLabel: 'Insert into schedule',
          tone: 'brand',
          onPrimary: () => {
            commit([...tasks, ...addon])
            setHighlight(addon.map((t) => t.id))
            pushToast('Lean-to add-on inserted · 3 tasks added to the Gantt', 'ok')
          },
        },
      })
      return
    }
    if (intent === 'build') {
      push({
        role: 'agent',
        text: 'From "24×40 detached garage, start Aug 4" I generated a full work breakdown using the Standard Detached Garage template — durations, FS dependencies, crews and key dates:',
        proposal: {
          title: 'Generated schedule · 30 tasks · 3 phases',
          lines: ['Working-day calendar, weekends off', 'Critical path auto-computed', 'Ready to apply to a new project'],
          wbs: NEW_GARAGE_WBS,
          primaryLabel: 'Preview on Gantt',
          onPrimary: () => {
            proj.setHighlight(proj.tasks.filter((t) => !/\.0$/.test(t.wbs)).map((t) => t.id))
            proj.pushToast('This project already runs this template — highlighted the generated WBS', 'brand')
          },
        },
      })
      return
    }
    if (intent === 'recovery') {
      const { tasks: next } = ripplePreview('c6', -2)
      const preview = finishDate(next)
      const d = workingDaysBetween(finish, preview)
      push({
        role: 'agent',
        text: 'To pull the finish date back I’d fast-track the exterior: overlap Roofing with the tail of framing and compress the roofing window by 2 working days. Tradeoff: roofing crew works a Saturday.',
        proposal: {
          title: 'Recovery · Fast-track roofing (−2d)',
          lines: [`Current finish: ${fmtDate(finish)}`, `Recovered finish: ${fmtDate(preview)} (${d}d)`, 'Cost: +$450 weekend premium · no quality risk'],
          primaryLabel: 'Apply recovery',
          tone: 'ok',
          onPrimary: () => {
            const { tasks: t2, affected } = ripplePreview('c6', -2)
            commit(t2)
            setHighlight(affected)
            pushToast(`Recovery applied · finish recovered to ${fmtDate(finishDate(t2))}`, 'ok')
          },
        },
      })
      return
    }
    if (intent === 'critical') {
      const crit = tasks.filter((t) => cpm[t.id]?.critical && !/\.0$/.test(t.wbs))
      setHighlight(crit.map((t) => t.id))
      push({
        role: 'agent',
        text: `Your critical path runs through ${crit.length} tasks — any slip on these moves the finish date. I’ve highlighted them on the Gantt:`,
        proposal: {
          title: 'Critical path',
          lines: crit.slice(0, 6).map((t) => `${t.wbs} · ${t.name}`),
        },
      })
      return
    }
    if (intent === 'weather') {
      push({
        role: 'agent',
        text: 'Thu Jul 30 shows 80% thunderstorms during your Slab Pour. Pouring into rain risks curing defects. Next dry day is Mon Aug 3.',
        proposal: {
          title: 'Reschedule Slab Pour → Aug 3',
          lines: ['Moves pour + successors +2d', 'Then ask me to recover the date'],
          tone: 'warn',
          primaryLabel: 'Reschedule pour',
          onPrimary: () => {
            const { tasks: t2, affected } = ripplePreview('c2', 2)
            commit(t2)
            setHighlight(affected)
            pushToast('Pour rescheduled to Aug 3', 'warn')
          },
        },
      })
      return
    }
    if (intent === 'atrisk') {
      const delta = workingDaysBetween(baseFinish, finish)
      push({
        role: 'agent',
        text: `Top risks right now:\n1. Finish is ${delta > 0 ? `+${delta}d late` : 'on baseline'} — permit review cascaded down the critical path.\n2. Slab pour exposed to Thu storms (80%).\n3. Roof trusses not yet ordered (needed Aug 13).\n4. Framing crew double-booked the week of Aug 5.\n\nWant me to build a recovery plan?`,
      })
      return
    }
    if (intent === 'summary') {
      const delta = workingDaysBetween(baseFinish, finish)
      const sm = scheduleMetrics(tasks, cpm, proj.today)
      push({
        role: 'agent',
        text: `Coley — 24×40 Garage is in Construction, ${sm.pctComplete}% complete (${sm.doneCount}/${sm.totalCount} tasks).\n• Finish ${fmtDate(finish)} (${delta > 0 ? '+' + delta + 'd late' : 'on time'})\n• On-time tasks ${sm.onTimePct}% · ${sm.overdue} overdue · ${sm.atRisk + sm.blocked} at risk/blocked\n• ${sm.criticalCount} tasks on the critical path, ${sm.floatDays}d float to the deadline\n• Next key date: ${sm.nextMilestone ? sm.nextMilestone.name + ' · ' + fmtDate(sm.nextMilestone.end) : '—'}`,
      })
      return
    }
    if (intent === 'overdue') {
      const od = tasks.filter((t) => isOverdue(t, proj.today))
      setHighlight(od.map((t) => t.id))
      if (!od.length) { push({ role: 'agent', text: 'Nothing is overdue right now — every open task is still within its finish date.' }); return }
      push({
        role: 'agent',
        text: `${od.length} task${od.length > 1 ? 's are' : ' is'} overdue:\n${od.map((t) => `• ${t.name} — due ${fmtDate(t.end)}, ${t.progress}% done (${t.assignee ?? 'unassigned'})`).join('\n')}\n\nI’ve highlighted them. Want me to reschedule and notify the owners?`,
        proposal: {
          title: 'Recover overdue work',
          lines: od.map((t) => `${t.name} → push finish to ${fmtDate(proj.today)} + notify ${t.assignee ?? 'crew'}`),
          tone: 'warn',
          primaryLabel: 'Reschedule + notify',
          onPrimary: () => {
            od.forEach((t) => proj.updateTask(t.id, { end: proj.today, status: 'in-progress' }))
            pushToast(`${od.length} overdue task(s) rescheduled and owners notified`, 'ok')
          },
        },
      })
      return
    }
    if (intent === 'level') {
      setHighlight(['c4', 'c5'])
      push({
        role: 'agent',
        text: 'Framing Crew is booked on this job and CB-PRJ-00396 (Barn Home) the week of Aug 5 — a double-booking. Barn Home is 12d behind and will hold them.',
        proposal: {
          title: 'Level framing crew (+1d start)',
          lines: ['Push Framing — Walls start by 1 day', 'Keeps a single crew, avoids a split', 'Finish impact: +1d (recoverable)'],
          primaryLabel: 'Apply leveling',
          onPrimary: () => {
            const { tasks: t2, affected } = ripplePreview('c4', 1)
            commit(t2)
            setHighlight(affected)
            pushToast('Framing shifted +1d to clear the crew conflict', 'ok')
          },
        },
      })
      return
    }
    if (intent === 'simulate') {
      const m = prompt.match(/(\d+)\s*day/)
      const d = Math.min(14, m ? Number(m[1]) : 5)
      proj.setSimDelay(d)
      push({ role: 'agent', text: `Running a what-if: what if we slip ${d} more day${d > 1 ? 's' : ''}? I've set the What-if slider — the Gantt now shows the projected finish. Drag the slider to explore, then "Apply to schedule" if you want to commit it.` })
      return
    }
    if (intent === 'lookahead') {
      const upcoming = tasks
        .filter((t) => !tasks.some((x) => x.parentId === t.id) && t.status !== 'done' && !t.milestone)
        .sort((a, b) => a.start.localeCompare(b.start))
        .slice(0, 6)
      push({ role: 'agent', text: `Next up on the schedule:\n${upcoming.map((t) => `• ${t.name} — starts ${fmtDate(t.start)} (${t.assignee ?? 'unassigned'})${cpm[t.id]?.critical ? ' · critical' : ''}`).join('\n')}\n\nWatch: the slab pour needs a dry Thursday, and roof trusses must be on site by Aug 13.` })
      return
    }
    if (intent === 'whatchanged') {
      const sm = scheduleMetrics(tasks, cpm, proj.today)
      push({ role: 'agent', text: `What changed recently:\n• Permit review closed 4 working days late → finish moved to ${fmtDate(finish)}.\n• Thursday's slab pour flagged for 80% rain.\n• Foundation forms now 45% done (R. Alvarez).\n• Temp Power & 811 Locate went overdue (A. Kim).\n• ${sm.pctComplete}% complete overall.\n\nWant me to build the recovery plan?` })
      return
    }
    if (intent === 'customerupdate') {
      const sm = scheduleMetrics(tasks, cpm, proj.today)
      push({
        role: 'agent',
        text: `Here's a plain-English update for Corey & Jamie:\n\n"Quick update on your garage — we're about ${sm.pctComplete}% through and tracking to finish ${fmtDate(finish)}. The city permit took a few extra days, which nudged the schedule slightly, but the foundation is underway this week and we're already working to make up time. We'll confirm the slab pour once we clear Thursday's weather. Thanks for your patience!"`,
        proposal: { title: 'Send to customer', lines: ['Emails Corey & Jamie', 'Logs to the project timeline'], primaryLabel: 'Send update', onPrimary: () => pushToast('Update sent to the Coleys', 'ok') },
      })
      return
    }
    if (intent === 'priority') {
      const hi = tasks.filter((t) => !tasks.some((x) => x.parentId === t.id) && (t.priority === 'high' || t.priority === 'critical') && t.status !== 'done')
      setHighlight(hi.map((t) => t.id))
      push({ role: 'agent', text: `Your top priorities right now (highlighted on the Gantt):\n${hi.map((t) => `• [${t.priority!.toUpperCase()}] ${t.name} — ${t.assignee ?? 'unassigned'}, due ${fmtDate(t.end)}`).join('\n')}` })
      return
    }
    if (intent === 'reassign') {
      push({
        role: 'agent',
        text: 'S. Okafor (Framing) is overloaded the week of Aug 5. I can either split the crew (no delay) or push framing a day.',
        proposal: {
          title: 'Reassign / level framing',
          lines: ['Option A — split crew: no delay', 'Option B — push Framing — Walls +1d'],
          primaryLabel: 'Push framing +1d',
          onPrimary: () => { const { tasks: t2, affected } = ripplePreview('c4', 1); commit(t2); setHighlight(affected); pushToast(`Framing pushed +1d · finish ${fmtDate(finishDate(t2))}`, 'ok') },
        },
      })
      return
    }
    push({ role: 'agent', text: 'I’m your one Project Agent — I run the whole schedule. Try: "recover the finish date", "what changed since yesterday", "draft a customer update", "what are my priorities", "who’s overdue", "level the framing crew", or "add a lean-to add-on".' })
  }

  // local ripple that doesn't commit (for previews)
  function ripplePreview(rootId: string, days: number) {
    return shiftWithRipple(proj.tasks, rootId, days)
  }

  function send(prompt: string) {
    if (!prompt.trim()) return
    push({ role: 'user', text: prompt })
    setInput('')
    setThinking(true)
    setTimeout(() => {
      setThinking(false)
      respond(prompt)
    }, 650)
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-400 via-brand-600 to-brand-800 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[13px] font-semibold text-ink-950">Merlin Project Agent</div>
            <div className="flex items-center gap-1 text-2xs text-ink-400">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Schedule agents online
            </div>
          </div>
        </div>
        {msgs.length > 0 && (
          <Button size="icon" variant="ghost" onClick={() => setMsgs([])} title="New chat">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-auto p-4">
        {msgs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 via-brand-600 to-brand-800 text-white shadow-pop">
              <Wand2 className="h-6 w-6" />
            </span>
            <div className="text-sm font-semibold text-ink-950">One agent for the whole schedule</div>
            <div className="mt-1 max-w-[250px] text-2xs text-ink-400">I read the plan, predict what will bite, and hand you a fix to approve. I preview every change — you stay in control.</div>
            <div className="mt-3 flex flex-wrap justify-center gap-1 px-2">
              {['Build & extend schedules', 'Predict & trace delays', 'Recover a date', 'Level & reassign crews', 'Clear overdue work', 'Draft customer updates', 'Set priorities', 'Weather calls'].map((c) => (
                <span key={c} className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">{c}</span>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id}>
            {m.text && (
              <div className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-[13px] leading-relaxed', m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-surface text-ink-800')}>{m.text}</div>
              </div>
            )}
            {m.proposal && <ProposalCard proposal={m.proposal} applied={applied.has(m.id)} onApply={() => { m.proposal!.onPrimary?.(); setApplied((s) => new Set(s).add(m.id)) }} />}
          </div>
        ))}
        {thinking && (
          <div className="flex items-center gap-1.5 px-1 text-ink-400">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400 [animation-delay:-0.2s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.1s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-600" />
          </div>
        )}
      </div>

      {/* prompt bubbles */}
      {msgs.length === 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {BUBBLES.map((b) => (
            <button key={b} onClick={() => send(b)} className="rounded-full border border-line bg-white px-2.5 py-1 text-2xs font-medium text-ink-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700">
              {b}
            </button>
          ))}
        </div>
      )}

      {/* input */}
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 focus-within:border-brand-300">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            placeholder="Ask the schedule agent…"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-400"
          />
          <Mic className="h-4 w-4 cursor-pointer text-ink-400 hover:text-brand-600" />
          <button onClick={() => send(input)} className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-white hover:bg-brand-700">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function ProposalCard({ proposal, onApply, applied }: { proposal: Proposal; onApply: () => void; applied: boolean }) {
  const tone = proposal.tone ?? 'brand'
  const ring = tone === 'ok' ? 'border-[#c6efd6]' : tone === 'warn' ? 'border-[#fed7aa]' : 'border-brand-200'
  return (
    <div className={cn('mt-2 rounded-xl border bg-white p-3 shadow-card', ring)}>
      <div className="flex items-center gap-1.5">
        <Wand2 className="h-3.5 w-3.5 text-brand-600" />
        <span className="text-[13px] font-semibold text-ink-950">{proposal.title}</span>
      </div>
      <ul className="mt-1.5 space-y-1 text-2xs text-ink-600">
        {proposal.lines.map((l, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <ArrowRight className="h-3 w-3 text-ink-400" />
            {l}
          </li>
        ))}
      </ul>
      {proposal.wbs && (
        <div className="mt-2 max-h-40 space-y-0.5 overflow-auto rounded-lg bg-surface p-2">
          {proposal.wbs.map((w) => (
            <div key={w.wbs} className="flex items-center gap-2 text-2xs">
              <span className="tabular-nums text-ink-400 w-8">{w.wbs}</span>
              <span className="flex-1 truncate text-ink-700">{w.name}</span>
              <span className="tabular-nums text-ink-400">{w.dur}</span>
            </div>
          ))}
        </div>
      )}
      {proposal.primaryLabel && (
        <div className="mt-2.5 flex items-center gap-2">
          {applied ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-ok/10 px-3 py-1.5 text-[13px] font-semibold text-[#14804a]">
              <Check className="h-4 w-4" /> Applied
            </span>
          ) : (
            <Button size="sm" variant={tone === 'ok' ? 'brand' : 'brand'} onClick={onApply}>
              <Check className="h-3.5 w-3.5" /> {proposal.primaryLabel}
            </Button>
          )}
          {!applied && <span className="text-2xs text-ink-400">You approve · reversible</span>}
        </div>
      )}
    </div>
  )
}
