import React, { useState } from 'react'
import { Search, Route, Flag, Calendar, Clock, X, Plus, CloudLightning, Paperclip, MessageSquare, Link2 } from 'lucide-react'
import { useProject } from '../state/store'
import { PROJECT, PORTFOLIO, CROSS_PROJECT_TASKS, assigneesOf, memberColor, TEAM } from '../data/project'
import type { BoardTask } from '../data/project'
import { AvatarStack, PRIORITY_META, Button, cn } from './ui'
import { isOverdue, fmtDate, workingDaysInclusive } from '../lib/scheduling'
import type { Task, TaskStatus } from '../lib/types'

const ME = 'M. Reyes'

const COLUMNS: { key: string; label: string; statuses: TaskStatus[]; dot: string }[] = [
  { key: 'not-started', label: 'To do', statuses: ['not-started'], dot: '#94a3b8' },
  { key: 'in-progress', label: 'In progress', statuses: ['in-progress', 'track', 'risk'], dot: '#3b82f6' },
  { key: 'blocked', label: 'Blocked / On hold', statuses: ['blocked', 'on-hold'], dot: '#ef4444' },
  { key: 'done', label: 'Done', statuses: ['done'], dot: '#22c55e' },
]

type View = 'all' | 'overdue' | 'critical' | 'mine'
const VIEWS: { key: View; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'critical', label: 'Critical path' },
  { key: 'mine', label: 'My tasks' },
]

export default function TasksBoard() {
  const { tasks, cpm, today, updateTask, openDrawer, openCreate, pushToast } = useProject()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>('all')
  const [proj, setProj] = useState<string | null>(null)
  const [assignee, setAssignee] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)
  const [extStatus, setExtStatus] = useState<Record<string, TaskStatus>>({})

  // Coley's live tasks (from store) + other projects' tasks, unified as BoardTasks
  const coleyLeaves: BoardTask[] = tasks
    .filter((t) => !tasks.some((x) => x.parentId === t.id) && t.status !== 'cancelled')
    .map((t) => ({ ...t, projectId: PROJECT.id, projectName: PROJECT.name, external: false, crit: !!cpm[t.id]?.critical }))
  const all: BoardTask[] = [...coleyLeaves, ...CROSS_PROJECT_TASKS].map((t) => (t.external && extStatus[t.id] ? { ...t, status: extStatus[t.id] } : t))

  const q = search.trim().toLowerCase()
  const visible = all.filter((t) => {
    if (q && !(t.name.toLowerCase().includes(q) || t.wbs.includes(q) || t.projectName.toLowerCase().includes(q))) return false
    if (proj && t.projectId !== proj) return false
    if (assignee && !assigneesOf(t).includes(assignee)) return false
    if (view === 'overdue' && !isOverdue(t, today)) return false
    if (view === 'critical' && !t.crit) return false
    if (view === 'mine' && !assigneesOf(t).includes(ME)) return false
    return true
  })
  const assignees = TEAM.filter((m) => all.some((t) => assigneesOf(t).includes(m.name)))

  const drop = (colKey: string) => {
    const col = COLUMNS.find((c) => c.key === colKey)!
    const t = all.find((x) => x.id === dragId)
    if (t) {
      if (t.external) setExtStatus((s) => ({ ...s, [t.id]: col.statuses[0] }))
      else updateTask(t.id, { status: col.statuses[0] })
      pushToast(`${t.name} → ${col.label}`, 'brand')
    }
    setDragId(null); setOverCol(null)
  }

  const open = (t: BoardTask) => {
    if (t.external) pushToast(`${t.projectName} is a read-only preview in this prototype`, 'brand')
    else openDrawer(t.id)
  }

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} className={cn('flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-2xs font-medium transition-colors', active ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white text-ink-600 hover:bg-surface')}>{children}</button>
  )

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <h2 className="text-[15px] font-semibold text-ink-950">All Tasks</h2>
        <span className="rounded-full bg-surface px-2 py-0.5 text-2xs font-semibold text-ink-500">{visible.length}</span>
        <span className="text-2xs text-ink-400">across {PORTFOLIO.length} projects · drag to change status</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 h-8">
            <Search className="h-3.5 w-3.5 text-ink-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks" className="w-32 bg-transparent text-[13px] outline-none placeholder:text-ink-400" />
            {search && <button onClick={() => setSearch('')} className="text-ink-400"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Button size="sm" variant="brand" onClick={openCreate}><Plus className="h-3.5 w-3.5" /> New task</Button>
        </div>
      </div>

      {/* view filters */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {VIEWS.map((v) => {
          const count = v.key === 'overdue' ? all.filter((t) => isOverdue(t, today)).length : v.key === 'critical' ? all.filter((t) => t.crit).length : undefined
          return (
            <Chip key={v.key} active={view === v.key} onClick={() => setView(v.key)}>
              {v.key === 'critical' && <Route className="h-3 w-3" />}
              {v.label}
              {count !== undefined && count > 0 && <span className={cn('rounded-full px-1 text-[9px] font-bold', view === v.key ? 'bg-white/25' : 'bg-ink-100 text-ink-500')}>{count}</span>}
            </Chip>
          )
        })}
      </div>

      {/* project filter */}
      <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <span className="shrink-0 text-2xs font-medium text-ink-400">Project</span>
        <Chip active={!proj} onClick={() => setProj(null)}>All projects</Chip>
        {PORTFOLIO.map((p) => <Chip key={p.id} active={proj === p.id} onClick={() => setProj(proj === p.id ? null : p.id)}>{p.name.split(' — ')[0]}</Chip>)}
      </div>

      {/* assignee filter */}
      <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <span className="shrink-0 text-2xs font-medium text-ink-400">Assignee</span>
        <button onClick={() => setAssignee(null)} className={cn('shrink-0 rounded-full border px-2.5 py-1 text-2xs font-medium', !assignee ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line bg-white text-ink-500 hover:bg-surface')}>Everyone</button>
        {assignees.map((m) => (
          <button key={m.id} onClick={() => setAssignee(assignee === m.name ? null : m.name)} className={cn('shrink-0 rounded-full border px-2.5 py-1 text-2xs font-medium', assignee === m.name ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line bg-white text-ink-600 hover:bg-surface')}>{m.name}</button>
        ))}
      </div>

      {/* board */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = visible.filter((t) => col.statuses.includes(t.status))
          const overdueN = items.filter((t) => isOverdue(t, today)).length
          return (
            <div
              key={col.key}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col.key) }}
              onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
              onDrop={() => drop(col.key)}
              className={cn('flex min-h-0 flex-col rounded-xl border bg-surface/50 transition-colors', overCol === col.key ? 'border-brand-400 bg-brand-50/60' : 'border-line')}
            >
              <div className="flex items-center gap-2 border-b border-line/70 px-3 py-2.5">
                <span className="h-2 w-2 rounded-full" style={{ background: col.dot }} />
                <span className="text-[13px] font-semibold text-ink-800">{col.label}</span>
                {overdueN > 0 && <span className="rounded-full bg-danger/10 px-1.5 text-[10px] font-bold text-danger">{overdueN} overdue</span>}
                <span className="ml-auto rounded-full bg-white px-1.5 text-2xs font-semibold text-ink-500">{items.length}</span>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-auto p-2">
                {items.map((t) => (
                  <TaskCard key={t.id} t={t} overdue={isOverdue(t, today)} onOpen={() => open(t)} onDragStart={() => setDragId(t.id)} />
                ))}
                {!items.length && <div className="rounded-lg border border-dashed border-line py-6 text-center text-2xs text-ink-400">Nothing here</div>}
                <button onClick={openCreate} className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-line py-1.5 text-2xs font-medium text-ink-400 hover:border-brand-300 hover:text-brand-700"><Plus className="h-3 w-3" /> Add task</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TaskCard({ t, overdue, onOpen, onDragStart }: { t: BoardTask; overdue: boolean; onOpen: () => void; onDragStart: () => void }) {
  const days = Math.max(1, workingDaysInclusive(t.start, t.end))
  const hi = t.priority === 'high' || t.priority === 'critical'
  const nComments = t.comments?.length ?? 0
  const nFiles = t.attachments?.length ?? 0
  const nDeps = t.deps?.length ?? 0
  const short = t.projectName.split(' — ')[0]
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className="cursor-pointer rounded-lg border border-line bg-white p-2.5 shadow-card transition-shadow hover:shadow-pop active:cursor-grabbing"
    >
      {/* project name — spans multiple builds */}
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> {short}
        </span>
        <span className="ml-auto text-[10px] tabular-nums text-ink-400">{t.wbs}</span>
      </div>

      <div className="flex items-start gap-1.5">
        {hi && <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: PRIORITY_META[t.priority!].color }} />}
        <span className="text-[13px] font-semibold leading-snug text-ink-950">{t.name}</span>
      </div>

      {(t.crit || overdue || t.weatherSensitive) && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {overdue && <span className="inline-flex items-center gap-1 rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-bold text-danger"><Clock className="h-2.5 w-2.5" /> Overdue</span>}
          {t.crit && <span className="inline-flex items-center gap-1 rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-600"><Route className="h-2.5 w-2.5" /> Critical path</span>}
          {t.weatherSensitive && t.status !== 'done' && <span className="inline-flex items-center gap-1 rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-600"><CloudLightning className="h-2.5 w-2.5" /> Weather</span>}
        </div>
      )}

      {/* completion % */}
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full" style={{ width: `${t.progress}%`, background: t.progress >= 100 ? '#22c55e' : '#6e3785' }} /></div>
        <span className="w-8 text-right text-[10px] font-semibold tabular-nums text-ink-500">{t.progress}%</span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px]">
        <Calendar className="h-3 w-3 shrink-0 text-ink-400" />
        <span className={cn('tabular-nums', overdue ? 'font-semibold text-danger' : 'text-ink-500')}>{fmtDate(t.start)} – {fmtDate(t.end)}</span>
        <span className="text-ink-300">·</span>
        <span className="tabular-nums text-ink-500">{days}d</span>
        <div className="ml-auto"><AvatarStack names={assigneesOf(t)} colorFn={memberColor} max={3} /></div>
      </div>

      {/* meta badges: deps · files · comments */}
      {(nDeps > 0 || nFiles > 0 || nComments > 0) && (
        <div className="mt-2 flex items-center gap-3 border-t border-line/70 pt-1.5 text-[10px] font-medium text-ink-400">
          {nDeps > 0 && <span className="inline-flex items-center gap-1" title={`Waits for ${nDeps} task(s)`}><Link2 className="h-3 w-3" /> {nDeps}</span>}
          {nFiles > 0 && <span className="inline-flex items-center gap-1" title={`${nFiles} attachment(s)`}><Paperclip className="h-3 w-3" /> {nFiles}</span>}
          {nComments > 0 && <span className="inline-flex items-center gap-1" title={`${nComments} comment(s)`}><MessageSquare className="h-3 w-3" /> {nComments}</span>}
        </div>
      )}
    </div>
  )
}
