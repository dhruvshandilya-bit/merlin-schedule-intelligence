import React, { useState, useEffect } from 'react'
import {
  Search, Plus, ChevronDown, ChevronRight, X, Camera, AlertTriangle, CloudLightning, Flag, Clock, Ban, Diamond, Calendar, CalendarCheck, Timer, Link2, MessageSquare, Paperclip, Route, GitBranch, Filter, CheckCircle2, ArrowRightLeft,
} from 'lucide-react'
import { useProject } from '../state/store'
import { PHASES, TEAM, memberColor, assigneesOf, DELAY_REASONS } from '../data/project'
import { Avatar, AvatarStack, Badge, HEALTH_META, STATUS_META, PRIORITY_META, cn } from './ui'

const DEP_LABEL: Record<string, string> = { FS: 'after it finishes', SS: 'when it starts', FF: 'to finish with it', SF: 'to start when it finishes' }
import Comments from './Comments'
import { taskHealth, isOverdue, isDelayed, fmtDate, diffDays, workingDaysInclusive, scheduleMetrics, rollupProgress, rollupHealth, workingDaysBetween } from '../lib/scheduling'
import type { Task, TaskStatus } from '../lib/types'

const ME = 'M. Reyes'
const STATUS_QUICK: TaskStatus[] = ['not-started', 'in-progress', 'blocked', 'on-hold', 'done', 'cancelled']

function fmtDT(date: string, time?: string) {
  return time ? `${fmtDate(date)} · ${time}` : fmtDate(date)
}

interface Banner { tone: 'danger' | 'warn' | 'neutral' | 'brand'; icon: any; text: string }
function bannersFor(t: Task, today: string): Banner[] {
  const b: Banner[] = []
  if (isOverdue(t, today)) b.push({ tone: 'danger', icon: AlertTriangle, text: `Overdue — was due ${fmtDate(t.end)}, ${t.progress}% done` })
  else if (t.status === 'blocked') b.push({ tone: 'danger', icon: Ban, text: 'Blocked — needs attention to proceed' })
  else if (isDelayed(t) && t.status !== 'done') b.push({ tone: 'warn', icon: Clock, text: `Running ${diffDays(t.baselineEnd, t.end)} days behind schedule` })
  if (t.weatherSensitive && t.status !== 'done') b.push({ tone: 'warn', icon: CloudLightning, text: 'Weather-sensitive — check the forecast before this date' })
  if (t.delayReason) b.push({ tone: 'neutral', icon: Clock, text: `Delay logged: ${t.delayReason.label}` })
  return b
}
const BANNER_STYLE: Record<string, string> = {
  danger: 'bg-danger/10 text-danger',
  warn: 'bg-warn/10 text-[#b45309]',
  neutral: 'bg-surface text-ink-600',
  brand: 'bg-brand-50 text-brand-700',
}

export default function MobileApp() {
  const { tasks, cpm, today, openCreate } = useProject()
  const [assignee, setAssignee] = useState<string | null>(null)
  const [quick, setQuick] = useState<'all' | 'overdue' | 'critical'>('all')
  const [search, setSearch] = useState('')
  const [openMs, setOpenMs] = useState<string | null>(null)
  const q = search.trim().toLowerCase()
  const matchesSearch = (t: Task) => {
    if (!q) return true
    if (t.name.toLowerCase().includes(q) || t.wbs.includes(q)) return true
    return tasks.some((k) => k.parentId === t.id && k.name.toLowerCase().includes(q))
  }

  const topTasks = tasks.filter((t) => !t.parentId) // phase parents
  const assignees = TEAM.filter((m) => tasks.some((t) => t.assignee === m.name))

  // Milestone-driven grouping: each milestone owns the tile-tasks that lead up to it
  const tileTasks = tasks.filter((t) => t.parentId && topTasks.some((p) => p.id === t.parentId))
  const groups: { milestone: Task | null; tasks: Task[] }[] = []
  let bucket: Task[] = []
  tileTasks.forEach((t) => {
    if (t.milestone) { groups.push({ milestone: t, tasks: bucket }); bucket = [] }
    else bucket.push(t)
  })
  if (bucket.length) groups.push({ milestone: null, tasks: bucket })

  const leafMatchesAssignee = (leaf: Task) => !assignee || leaf.assignee === assignee
  const taskVisible = (t: Task) => {
    const kids = tasks.filter((x) => x.parentId === t.id)
    const self = kids.length ? kids : [t]
    // assignee filter: task shows if it or any subtask matches
    if (assignee && !(t.assignee === assignee || self.some((k) => k.assignee === assignee))) return false
    if (quick === 'overdue') return self.some((k) => isOverdue(k, today)) || isOverdue(t, today)
    if (quick === 'critical') return self.some((k) => cpm[k.id]?.critical) || !!cpm[t.id]?.critical
    return true
  }

  const milestoneGroups = groups.filter((g) => g.milestone)
  const activeGroup = openMs ? groups.find((g) => g.milestone?.id === openMs) : null

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* status bar */}
      <div className="flex h-11 shrink-0 items-end justify-between bg-white px-6 pb-1 text-[11px] font-semibold text-ink-950">
        <span>9:41</span>
        <span className="flex items-center gap-1">●●● Wi-Fi 100%</span>
      </div>

      {!activeGroup ? (
        /* ═══ LEVEL 1 — milestones only ═══ */
        <>
          <div className="shrink-0 bg-white px-4 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium text-ink-500">CB-PRJ-00441 · Construction</div>
                <div className="text-[18px] font-bold text-ink-950">Coley — 24×40 Garage</div>
              </div>
              <button onClick={openCreate} className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-white active:scale-95"><Plus className="h-5 w-5" /></button>
            </div>
          </div>

          <MetricsBand />

          <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
            <div className="px-1 text-[12px] font-semibold uppercase tracking-wide text-ink-500">Milestones · tap to open</div>
            {milestoneGroups.map((g) => (
              <MilestoneTile key={g.milestone!.id} ms={g.milestone!} feeders={g.tasks} onOpen={() => setOpenMs(g.milestone!.id)} />
            ))}
          </div>
        </>
      ) : (
        /* ═══ LEVEL 2 — inside a milestone ═══ */
        <>
          <div className="shrink-0 border-b border-line bg-white px-3 pt-1">
            <div className="flex items-center gap-2">
              <button onClick={() => { setOpenMs(null); setQuick('all'); setAssignee(null); setSearch('') }} className="flex items-center gap-1 rounded-lg py-1.5 pr-2 text-[13px] font-semibold text-brand-700 active:opacity-60">
                <ChevronRight className="h-5 w-5 rotate-180" /> Milestones
              </button>
              <span className="ml-auto text-[11px] font-medium text-ink-400">Inside milestone</span>
            </div>
            {/* search */}
            <div className="mb-2 mt-1 flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-2">
              <Search className="h-4 w-4 shrink-0 text-ink-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search in this milestone" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-400" />
              {search && <button onClick={() => setSearch('')} className="text-ink-400"><X className="h-4 w-4" /></button>}
            </div>
            <div className="mb-2 flex gap-1.5 overflow-x-auto">
              {([['all', 'All tasks'], ['overdue', 'Overdue'], ['critical', 'Critical path']] as const).map(([k, label]) => (
                <button key={k} onClick={() => setQuick(k)} className={cn('shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium', quick === k ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white text-ink-600')}>{label}</button>
              ))}
            </div>
            {/* assignee filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <Filter className="h-3.5 w-3.5 shrink-0 text-ink-400" />
              <button onClick={() => setAssignee(null)} className={cn('shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium', !assignee ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line text-ink-500')}>Everyone</button>
              {assignees.map((m) => (
                <button key={m.id} onClick={() => setAssignee(assignee === m.name ? null : m.name)} className={cn('flex shrink-0 items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2 text-[11px] font-medium', assignee === m.name ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line text-ink-600')}>
                  <Avatar name={m.name} color={m.color} /> {m.name}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-3">
            <MilestoneTile ms={activeGroup.milestone!} feeders={activeGroup.tasks} />
            {(() => {
              const visible = activeGroup.tasks.filter((t) => taskVisible(t) && leafOrHasMatch(t, tasks, assignee) && matchesSearch(t))
              if (!visible.length) return <div className="mt-4 rounded-xl border border-dashed border-line py-8 text-center text-[13px] text-ink-400">No tasks match your filters</div>
              return (
                <div className="mt-3 space-y-2.5">
                  {visible.map((t) => <TaskTile key={t.id} t={t} assigneeFilter={assignee} />)}
                </div>
              )
            })()}
          </div>
        </>
      )}

      <MobileTaskSheet />
    </div>
  )
}

function leafDescendants(tasks: Task[], id: string): Task[] {
  const kids = tasks.filter((t) => t.parentId === id)
  if (!kids.length) { const t = tasks.find((x) => x.id === id); return t ? [t] : [] }
  return kids.flatMap((k) => leafDescendants(tasks, k.id))
}

// ── Milestone hero tile (its own rolled-up readiness metric) ─
function MilestoneTile({ ms, feeders, onOpen }: { ms: Task; feeders: Task[]; onOpen?: () => void }) {
  const { tasks, today } = useProject()
  const leaves = feeders.flatMap((f) => leafDescendants(tasks, f.id))
  const total = leaves.length
  const done = leaves.filter((t) => t.status === 'done').length
  const overdue = leaves.filter((t) => isOverdue(t, today)).length
  const blocked = leaves.filter((t) => t.status === 'blocked').length
  let w = 0, p = 0
  leaves.forEach((t) => { const d = Math.max(1, t.milestone ? 1 : workingDaysInclusive(t.start, t.end)); w += d; p += d * (t.progress / 100) })
  const pct = w ? Math.round((p / w) * 100) : 0
  const slip = diffDays(ms.baselineEnd, ms.end)
  const isDone = ms.status === 'done' || ms.progress >= 100
  const color = isDone ? '#22c55e' : overdue > 0 ? '#fb3748' : slip > 0 ? '#fa7319' : '#1fc16b'
  const label = isDone ? 'Reached' : overdue > 0 ? 'At risk' : slip > 0 ? `Slipping +${slip}d` : 'On track'
  const phase = PHASES.find((x) => x.id === ms.phaseId)?.name
  const Wrap: any = onOpen ? 'button' : 'div'
  return (
    <Wrap onClick={onOpen} className={cn('block w-full rounded-2xl border border-line bg-white p-3.5 text-left shadow-card', onOpen && 'transition-shadow active:scale-[0.99] active:shadow-none')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface">
            {isDone ? <CheckCircle2 className="h-5 w-5" style={{ color }} /> : <Diamond className="h-4 w-4" style={{ color }} />}
          </span>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Milestone · {phase}</div>
            <div className="text-[16px] font-bold leading-tight text-ink-950">{ms.name}</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[9px] uppercase tracking-wide text-ink-400">Target</div>
          <div className="text-[13px] font-bold tabular-nums text-ink-950">{fmtDate(ms.end)}</div>
          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-ink-500"><span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />{label}</span>
        </div>
      </div>

      {!isDone && (overdue > 0 || slip > 0) && (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold" style={{ background: color + '1c', color }}>
          {overdue > 0 ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> : <Clock className="h-3.5 w-3.5 shrink-0" />}
          {overdue > 0 ? `${overdue} task${overdue > 1 ? 's' : ''} feeding this are overdue — this date is at risk` : `Trending ${slip} days late — feeding work is behind schedule`}
        </div>
      )}

      {ms.description && <p className="mt-2 text-[12px] leading-relaxed text-ink-600">{ms.description}</p>}

      <div className="mt-3 flex gap-2">
        <MStat label="Tasks done" value={`${done}/${total}`} />
        <MStat label="Readiness" value={`${pct}%`} color={color} />
        <MStat label={overdue ? 'Overdue' : blocked ? 'Blocked' : 'Remaining'} value={overdue ? `${overdue}` : blocked ? `${blocked}` : `${total - done}`} color={overdue || blocked ? color : undefined} />
      </div>
      <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></div>
      {onOpen ? (
        <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5 text-[13px] font-semibold text-brand-700">
          <span>Open · {total} task{total !== 1 ? 's' : ''} inside</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      ) : (
        <div className="mt-1.5 text-[10px] text-ink-500">Readiness = how much of the work leading to this milestone is complete</div>
      )}
    </Wrap>
  )
}
function MStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex-1 rounded-lg border border-line bg-surface/60 px-2 py-1.5 text-center">
      <div className="text-[14px] font-bold tabular-nums" style={{ color: color ?? '#171717' }}>{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-ink-400">{label}</div>
    </div>
  )
}

function leafOrHasMatch(t: Task, tasks: Task[], assignee: string | null) {
  if (!assignee) return true
  const kids = tasks.filter((x) => x.parentId === t.id)
  return t.assignee === assignee || kids.some((k) => k.assignee === assignee)
}

// ── Metrics band ───────────────────────────────────────
function MetricsBand() {
  const { tasks, cpm, today, finish, baseFinish } = useProject()
  const sm = scheduleMetrics(tasks, cpm, today)
  const delta = workingDaysBetween(baseFinish, finish)
  const leaves = tasks.filter((t) => !tasks.some((x) => x.parentId === t.id))
  const order = ['done', 'in-progress', 'at-risk', 'overdue', 'blocked', 'not-started'] as const
  const dist: Record<string, number> = {}
  leaves.forEach((t) => { const h = taskHealth(t, today); dist[h] = (dist[h] ?? 0) + 1 })
  const total = leaves.length || 1
  return (
    <div className="shrink-0 bg-white px-4 pb-3">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[28px] font-bold leading-none text-ink-950">{sm.pctComplete}%</div>
          <div className="mt-1 text-[12px] font-medium text-ink-500">complete · {sm.doneCount}/{sm.totalCount} done</div>
        </div>
        <div className="flex gap-4 text-right">
          <MetricMini label="Finish" value={fmtDate(finish)} sub={delta > 0 ? `+${delta}d` : 'on time'} tone={delta > 0 ? 'warn' : 'ok'} />
          <MetricMini label="Overdue" value={`${sm.overdue}`} tone={sm.overdue ? 'danger' : 'ok'} />
          <MetricMini label="At risk" value={`${sm.atRisk + sm.blocked}`} tone={sm.atRisk + sm.blocked ? 'warn' : 'ok'} />
        </div>
      </div>
      <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-surface">
        {order.filter((k) => dist[k]).map((k) => <div key={k} style={{ width: `${(dist[k] / total) * 100}%`, background: HEALTH_META[k]?.color }} />)}
      </div>
    </div>
  )
}
function MetricMini({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'ok' | 'warn' | 'danger' }) {
  const c = tone === 'ok' ? 'text-ink-950' : tone === 'warn' ? 'text-warn' : 'text-danger'
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</div>
      <div className={cn('text-[16px] font-bold tabular-nums', c)}>{value}</div>
      {sub && <div className={cn('text-[11px] font-semibold', c)}>{sub}</div>}
    </div>
  )
}

// ── Task tile (big, contains subtasks) ─────────────────
function TaskTile({ t, assigneeFilter }: { t: Task; assigneeFilter: string | null }) {
  const { tasks, today, cpm, openDrawer } = useProject()
  const kids = tasks.filter((x) => x.parentId === t.id)
  const isSummary = kids.length > 0
  const h = isSummary ? rollupHealth(tasks, t.id, today) : taskHealth(t, today)
  const pct = isSummary ? rollupProgress(tasks, t.id) : t.progress
  const info = cpm[t.id]
  const banners = bannersFor(t, today).slice(0, 2)
  const critical = info?.critical

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="flex">
        <div className="min-w-0 flex-1 p-3">
          {/* header */}
          <button onClick={() => openDrawer(t.id)} className="flex w-full items-start gap-2 text-left">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {t.milestone && <Diamond className="h-3.5 w-3.5 shrink-0 fill-brand-600 text-brand-600" />}
                {t.priority && (t.priority === 'high' || t.priority === 'critical') && <Flag className="h-3.5 w-3.5 shrink-0" style={{ color: PRIORITY_META[t.priority].color }} />}
                <span className="truncate text-[15px] font-bold text-ink-950">{t.name}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[12px] text-ink-500">
                <span className="tabular-nums">{t.wbs}</span>
                <span className="flex items-center gap-1 font-medium text-ink-500"><span className="h-1.5 w-1.5 rounded-full" style={{ background: HEALTH_META[h]?.color }} />{HEALTH_META[h]?.label}</span>
                {!t.milestone && pct > 0 && pct < 100 && <span className="font-semibold text-ink-500">{pct}% done</span>}
                {critical && <span className="flex items-center gap-0.5 text-danger"><Route className="h-3 w-3" /> Critical</span>}
                {isSummary && <span className="flex items-center gap-0.5"><GitBranch className="h-3 w-3" /> {kids.length} subtasks</span>}
              </div>
            </div>
            <AvatarStack names={assigneesOf(t)} colorFn={memberColor} />
          </button>

          {/* banners */}
          {banners.map((b, i) => (
            <div key={i} className={cn('mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium', BANNER_STYLE[b.tone])}>
              <b.icon className="h-3.5 w-3.5 shrink-0" /> {b.text}
            </div>
          ))}

          {/* dates */}
          {!t.milestone ? (
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <DateCell icon={Calendar} label="Start" value={fmtDT(t.start, t.startTime)} />
              <DateCell icon={CalendarCheck} label="End" value={fmtDT(t.end, t.endTime)} />
              <DateCell icon={Timer} label="Duration" value={`${Math.max(1, workingDaysInclusive(t.start, t.end))}d`} />
            </div>
          ) : (
            <div className="mt-2.5"><DateCell icon={Diamond} label="Milestone date" value={fmtDT(t.start, t.startTime)} /></div>
          )}

          {/* description */}
          {(t.description || t.note) && <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-ink-600">{t.description || t.note}</p>}


        </div>
      </div>
    </div>
  )
}

function DateCell({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface/60 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-500"><Icon className="h-3 w-3" /> {label}</div>
      <div className="mt-0.5 text-[12px] font-bold tabular-nums text-ink-900">{value}</div>
    </div>
  )
}

// ── Subtask row (expands to end-to-end details) ────────
function SubtaskRow({ t }: { t: Task }) {
  const { today, openDrawer } = useProject()
  const [open, setOpen] = useState(false)
  const h = taskHealth(t, today)
  const overdue = isOverdue(t, today)
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2.5 p-2.5 text-left">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: HEALTH_META[h]?.color }} />
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-ink-900">{t.name}</span>
          <span className="text-[12px] text-ink-500">{STATUS_META[t.status]?.label} · {fmtDate(t.start)}–{fmtDate(t.end)}{overdue ? ' · overdue' : ''}</span>
        </div>
        <AvatarStack names={assigneesOf(t)} colorFn={memberColor} />
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-ink-300" /> : <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" />}
      </button>
      {open && (
        <div className="border-t border-line px-2.5 pb-2.5 pt-2">
          <div className="grid grid-cols-3 gap-2">
            <DateCell icon={Calendar} label="Start" value={fmtDT(t.start, t.startTime)} />
            <DateCell icon={CalendarCheck} label="End" value={fmtDT(t.end, t.endTime)} />
            <DateCell icon={Timer} label="Duration" value={`${Math.max(1, workingDaysInclusive(t.start, t.end))} work-days`} />
          </div>
          {t.description && <p className="mt-2 text-[12px] leading-relaxed text-ink-600">{t.description}</p>}
          <button onClick={() => openDrawer(t.id)} className="mt-2 text-[12px] font-semibold text-brand-700">Open &amp; edit →</button>
        </div>
      )}
    </div>
  )
}

// ── Bottom sheet for edit / comments (opened from a tile) ─
function MobileTaskSheet() {
  const { tasks, drawerId, creating, closeDrawer, updateTask, addTask, deleteTask, today, cpm, pushToast, completionMode } = useProject()
  const existing = tasks.find((t) => t.id === drawerId) || null
  const [newName, setNewName] = useState('')
  const [newAssignees, setNewAssignees] = useState<string[]>([])
  const [newParent, setNewParent] = useState('c0')
  useEffect(() => { if (creating) { setNewName(''); setNewAssignees([]); setNewParent('c0') } }, [creating])
  const phaseParents = tasks.filter((x) => !x.parentId && tasks.some((k) => k.parentId === x.id))
  const subtaskParents = tasks.filter((x) => !x.milestone && x.parentId && phaseParents.some((pp) => pp.id === x.parentId))

  if (creating) {
    const parentTask = tasks.find((x) => x.id === newParent)
    const asSub = !phaseParents.some((p) => p.id === newParent)
    return (
      <Sheet onClose={closeDrawer} title={asSub ? 'New subtask' : 'New task'}>
        <div className="mb-1 text-[11px] font-medium text-ink-500">Name</div>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={asSub ? 'Subtask name' : 'Task name'} className="input mb-3" autoFocus />

        <div className="mb-1 text-[11px] font-medium text-ink-500">Add it</div>
        <select value={newParent} onChange={(e) => setNewParent(e.target.value)} className="input mb-3">
          <optgroup label="As a task in phase">
            {phaseParents.map((p) => <option key={p.id} value={p.id}>{PHASES.find((ph) => ph.id === p.phaseId)?.name}</option>)}
          </optgroup>
          <optgroup label="As a subtask of">
            {subtaskParents.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </optgroup>
        </select>

        <div className="mb-1 text-[11px] font-medium text-ink-500">Assign to</div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {TEAM.map((m) => {
            const on = newAssignees.includes(m.name)
            return (
              <button key={m.id} onClick={() => setNewAssignees((a) => on ? a.filter((x) => x !== m.name) : [...a, m.name])} className={cn('flex items-center gap-1 rounded-full border py-0.5 pl-0.5 pr-2 text-[11px] font-medium', on ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-line text-ink-500')}>
                <Avatar name={m.name} color={m.color} /> {m.name.split(' ')[0]}
              </button>
            )
          })}
        </div>

        <button
          onClick={() => {
            if (!newName.trim()) { pushToast('Give it a name', 'warn'); return }
            const kids = tasks.filter((x) => x.parentId === newParent).length
            addTask({
              id: 't' + Math.random().toString(36).slice(2, 7),
              wbs: asSub && parentTask ? `${parentTask.wbs}.${kids + 1}` : '3.99',
              name: newName, phaseId: parentTask?.phaseId ?? 'const', parentId: newParent,
              start: '2026-08-03', end: '2026-08-05', baselineStart: '2026-08-03', baselineEnd: '2026-08-05',
              startTime: '07:00', endTime: '15:30',
              progress: 0, status: 'not-started', priority: 'medium', deps: [], budget: 0, actualCost: 0, isNew: true,
              assignees: newAssignees.length ? newAssignees : undefined, assignee: newAssignees[0],
            }, asSub ? 'Subtask created' : 'Task created')
            closeDrawer()
          }}
          className="w-full rounded-xl bg-brand-600 py-3 text-[15px] font-semibold text-white active:bg-brand-700"
        >
          Create {asSub ? 'subtask' : 'task'}
        </button>
      </Sheet>
    )
  }
  if (!existing) return null
  const t = existing
  const h = taskHealth(t, today)
  const slip = diffDays(t.baselineEnd, t.end)
  const lateDone = t.status === 'done' && slip > 0
  const children = tasks.filter((x) => x.parentId === t.id)
  const set = (patch: Partial<Task>) => updateTask(t.id, patch)
  const descendantIds = (() => { const s = new Set<string>([t.id]); const st = [t.id]; while (st.length) { const id = st.pop()!; tasks.filter((x) => x.parentId === id).forEach((k) => { s.add(k.id); st.push(k.id) }) } return s })()
  const parentOptions = tasks.filter((x) => !descendantIds.has(x.id))
  return (
    <Sheet onClose={closeDrawer} title={t.name} sub={`${t.wbs} · ${PHASES.find((p) => p.id === t.phaseId)?.name}`}>
      {/* crew / attributes */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {assigneesOf(t).length > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-surface py-0.5 pl-0.5 pr-2 text-[11px] font-medium text-ink-700"><AvatarStack names={assigneesOf(t)} colorFn={memberColor} /> {assigneesOf(t).join(', ')}</span>
        )}
        {t.priority && <Badge tone={PRIORITY_META[t.priority].tone}><Flag className="h-2.5 w-2.5" /> {PRIORITY_META[t.priority].label} priority</Badge>}
        {t.weatherSensitive && <Badge tone="warn"><CloudLightning className="h-2.5 w-2.5" /> Weather-sensitive</Badge>}
      </div>
      {!t.milestone && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          <DateCell icon={Calendar} label="Start" value={fmtDT(t.start, t.startTime)} />
          <DateCell icon={CalendarCheck} label="Finish" value={fmtDT(t.end, t.endTime)} />
          <DateCell icon={Timer} label="Duration" value={`${Math.max(1, workingDaysInclusive(t.start, t.end))} work-days`} />
        </div>
      )}
      {t.description && <p className="mb-3 rounded-lg bg-surface p-2.5 text-[13px] leading-relaxed text-ink-600">{t.description}</p>}

      {/* dependencies */}
      {t.deps.length > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400"><Link2 className="h-3.5 w-3.5" /> Waits for</div>
          <div className="space-y-1.5">
            {t.deps.map((d, i) => {
              const p = tasks.find((x) => x.id === d.pred)
              if (!p) return null
              const ph = taskHealth(p, today)
              const pColor = HEALTH_META[ph]?.color
              const pDone = p.status === 'done'
              const pLate = isOverdue(p, today)
              return (
                <div key={i} className="rounded-lg border border-line px-2.5 py-2 text-[12px]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: pColor }} />
                    <span className="flex-1 truncate font-medium text-ink-800">{p.name}</span>
                    <span className="shrink-0 text-[11px] font-semibold" style={{ color: pColor }}>{STATUS_META[p.status]?.label}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 pl-4 text-[11px] text-ink-500">
                    <span>Starts {DEP_LABEL[d.type]}{d.lag ? ` +${d.lag}d` : ''}</span>
                    <span className={cn('ml-auto tabular-nums font-medium', pLate && 'text-danger')}>
                      {pDone ? `finished ${fmtDate(p.end)}` : pLate ? `was due ${fmtDate(p.end)}` : `due ${fmtDate(p.end)}`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mb-1 text-[11px] font-medium text-ink-500">Status {completionMode === 'status' && '· sets % complete'}</div>
      <div className="grid grid-cols-3 gap-1.5">
        {STATUS_QUICK.map((s) => (
          <button key={s} onClick={() => set({ status: s })} className={cn('flex items-center justify-center gap-1 rounded-lg border py-2 text-[11px] font-medium', t.status === s ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line text-ink-600')}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_META[s]?.dot }} /> {STATUS_META[s]?.label}
          </button>
        ))}
      </div>
      {/* assignees editor (works for tasks and subtasks) */}
      <div className="mt-3">
        <div className="mb-1 text-[11px] font-medium text-ink-500">Assigned to</div>
        <div className="flex flex-wrap gap-1.5">
          {TEAM.map((m) => {
            const list = assigneesOf(t)
            const on = list.includes(m.name)
            return (
              <button key={m.id} onClick={() => { const next = on ? list.filter((x) => x !== m.name) : [...list, m.name]; set({ assignees: next, assignee: next[0] }) }} className={cn('flex items-center gap-1 rounded-full border py-0.5 pl-0.5 pr-2 text-[11px] font-medium', on ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-line text-ink-500')}>
                <Avatar name={m.name} color={m.color} /> {m.name.split(' ')[0]}
              </button>
            )
          })}
        </div>
      </div>

      {/* move under another task */}
      <div className="mt-3">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-ink-500"><ArrowRightLeft className="h-3.5 w-3.5" /> Move under another task</div>
        <select value={t.parentId ?? ''} onChange={(e) => { const np = tasks.find((x) => x.id === e.target.value); set({ parentId: e.target.value || undefined, phaseId: np?.phaseId ?? t.phaseId }) }} className="input">
          <option value="">Top-level task</option>
          {parentOptions.map((p) => <option key={p.id} value={p.id}>{p.wbs} · {p.name}</option>)}
        </select>
      </div>
      {/* subtasks — visible only inside the task */}
      {children.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400"><GitBranch className="h-3.5 w-3.5" /> Subtasks · {rollupProgress(tasks, t.id)}%</div>
          <div className="space-y-2">{children.map((c) => <SubtaskRow key={c.id} t={c} />)}</div>
        </div>
      )}

      {/* photos & files — multiple */}
      <div className="mt-4">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Photos &amp; files</div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(t.attachments ?? []).filter((a) => a.kind === 'img').map((a) => (
            <div key={a.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line">
              <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-100 to-brand-50"><Camera className="h-5 w-5 text-brand-400" /></div>
              <button onClick={() => set({ attachments: (t.attachments ?? []).filter((x) => x.id !== a.id) })} className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-ink-950/70 text-white"><X className="h-2.5 w-2.5" /></button>
            </div>
          ))}
          <button onClick={() => { const n = (t.attachments ?? []).filter((a) => a.kind === 'img').length + 1; set({ attachments: [...(t.attachments ?? []), { id: 'p' + Math.random().toString(36).slice(2, 6), name: `Site_photo_${n}.jpg`, size: '1.4 MB', kind: 'img' }] }); pushToast('Photo added', 'ok') }} className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border-2 border-dashed border-line text-ink-400 active:bg-surface"><Camera className="h-5 w-5" /></button>
        </div>
        {(t.attachments ?? []).filter((a) => a.kind !== 'img').length > 0 && (
          <div className="mt-2 space-y-1">
            {(t.attachments ?? []).filter((a) => a.kind !== 'img').map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5"><Paperclip className="h-3.5 w-3.5 text-brand-600" /><span className="flex-1 truncate text-[12px] text-ink-700">{a.name}</span><span className="text-[10px] text-ink-400">{a.size}</span></div>
            ))}
          </div>
        )}
      </div>
      {lateDone && (
        <div className="mt-3 rounded-xl border border-warn/40 bg-warn/5 p-3">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-warn">Finished late — why?</div>
          {t.delayReason ? <div className="text-[13px] font-medium text-ink-950">{t.delayReason.label}</div> : (
            <div className="flex flex-wrap gap-1.5">{DELAY_REASONS.slice(0, 6).map((r) => <button key={r.code} onClick={() => set({ delayReason: { code: r.code, label: r.label } })} className="rounded-full border border-line bg-white px-2 py-1 text-[11px] text-ink-600">{r.label}</button>)}</div>
          )}
        </div>
      )}
      <div className="mt-3 border-t border-line pt-3"><Comments task={t} /></div>

      <div className="mt-4 border-t border-line pt-3 text-[11px] text-ink-400">
        <div>Created by <b className="font-medium text-ink-600">{t.createdBy ?? '—'}</b> · {t.createdAt ?? '—'}</div>
        <div className="mt-0.5">Last updated by <b className="font-medium text-ink-600">{t.updatedBy ?? '—'}</b> · {t.updatedAt ?? '—'}</div>
      </div>

      <button onClick={() => { deleteTask(t.id, 'Task deleted'); closeDrawer() }} className="mt-4 w-full rounded-xl border border-danger/30 py-2.5 text-[13px] font-medium text-danger active:bg-danger/5">Delete task</button>
    </Sheet>
  )
}

function Sheet({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <div className="absolute inset-0 bg-ink-950/30" onClick={onClose} />
      <div className="relative z-10 max-h-[90%] overflow-auto rounded-t-3xl bg-white pb-8">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-2 border-b border-line bg-white px-4 pb-3 pt-3">
          <div className="min-w-0">
            {sub && <div className="text-[11px] text-ink-400">{sub}</div>}
            <div className="truncate text-[16px] font-semibold text-ink-950">{title}</div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface text-ink-500"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-4 pt-3">{children}</div>
      </div>
    </div>
  )
}
