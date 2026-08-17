import React, { useState } from 'react'
import {
  LayoutGrid, BarChart3, Wallet, Package, Boxes, CalendarDays, Settings, Search,
  Sparkles, PanelRightClose, PanelRightOpen, Route, Check,
} from 'lucide-react'
import { ProjectProvider, useProject } from './state/store'
import type { FilterKey } from './state/store'
import { ProjectHeader } from './components/ProjectHeader'
import Gantt from './components/Gantt'
import TodayFeed from './components/TodayFeed'
import AgentPanel from './components/AgentPanel'
import TasksBoard from './components/TasksBoard'
import Portfolio from './components/Portfolio'
import Workload from './components/Workload'
import Procurement from './components/Procurement'
import TaskDrawer from './components/TaskDrawer'
import MobileApp from './components/MobileApp'
import { Button, Badge, InfoTip, cn } from './components/ui'
import { Plus, Info, Search as SearchIcon, Smartphone, Monitor } from 'lucide-react'
import { scheduleMetrics } from './lib/scheduling'

type Tab = 'project' | 'portfolio'
type Rail = 'today' | 'agent'

export default function App() {
  return (
    <ProjectProvider>
      <Shell />
    </ProjectProvider>
  )
}

function Shell() {
  const [tab, setTab] = useState<Tab>('project')
  const [railOpen, setRailOpen] = useState(false)
  const [rail, setRail] = useState<Rail>('today')
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const proj = useProject()

  if (device === 'mobile') return <MobilePreview onExit={() => setDevice('desktop')} />

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface text-ink-950">
      {/* ── Sidebar ── */}
      <aside className="flex w-[200px] shrink-0 flex-col border-r border-line bg-white">
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-800 text-sm font-bold text-white">MI</span>
          <span className="font-semibold">Merlin AI</span>
        </div>
        <div className="px-3 text-2xs font-semibold uppercase tracking-wide text-ink-400">Main</div>
        <nav className="mt-1 flex flex-col gap-0.5 px-2">
          <NavItem icon={BarChart3} label="Sales" />
          <NavItem icon={LayoutGrid} label="Projects" active />
          <NavItem icon={Wallet} label="Finance" />
          <NavItem icon={Package} label="Orders" />
          <NavItem icon={Boxes} label="Operations" />
        </nav>
        <div className="mt-4 px-3 text-2xs font-semibold uppercase tracking-wide text-ink-400">Communication</div>
        <nav className="mt-1 flex flex-col gap-0.5 px-2">
          <NavItem icon={CalendarDays} label="Calendar" />
        </nav>
        <div className="mt-auto border-t border-line p-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-2xs font-bold text-white">MR</span>
            <div className="text-2xs">
              <div className="font-semibold text-ink-950">M. Reyes</div>
              <div className="text-ink-400">Project Manager</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* top bar */}
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-white px-5">
          <div className="flex items-center gap-1">
            <TabBtn active={tab === 'project'} onClick={() => setTab('project')}>Schedule</TabBtn>
            <InfoTip text="Schedule — the full Gantt, tasks and the agent for the job you're in." />
            <TabBtn active={tab === 'portfolio'} onClick={() => setTab('portfolio')}>Tasks</TabBtn>
            <InfoTip text="Tasks — a Kanban board of every task, grouped by status." />
          </div>
          <div className="ml-2 hidden items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-2xs text-ink-400 md:flex">
            <Search className="h-3.5 w-3.5" /> Search projects, tasks…
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setDevice('mobile')} title="Mobile preview" className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[13px] font-medium text-ink-600 hover:bg-surface">
              <Smartphone className="h-4 w-4" /> Mobile
            </button>
            <OrgSettings />
            <Badge tone="brand">Schedule Intelligence · prototype</Badge>
            <Button
              variant={railOpen ? 'outline' : 'brand'}
              size="sm"
              onClick={() => setRailOpen((o) => !o)}
            >
              <Sparkles className="h-4 w-4" /> Ask AI
              {railOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {/* content + rail */}
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-auto p-5">
            {tab === 'project' ? (
              <div className="space-y-4">
                <ProjectHeader />
                <GanttToolbar />
                <Gantt />
              </div>
            ) : (
              <TasksTab onOpenProject={(id) => { if (id === 'CB-PRJ-00441') setTab('project') }} />
            )}
          </main>

          {/* ── AI rail ── */}
          {railOpen && (
            <aside className="flex w-[380px] shrink-0 flex-col border-l border-line bg-white">
              <div className="flex items-center gap-1 border-b border-line p-2">
                <RailTab active={rail === 'today'} onClick={() => setRail('today')} count={2}>Today</RailTab>
                <RailTab active={rail === 'agent'} onClick={() => setRail('agent')}>Agent</RailTab>
              </div>
              <div className="min-h-0 flex-1">
                {rail === 'today' ? (
                  <div className="h-full p-3">
                    <TodayFeed />
                  </div>
                ) : (
                  <AgentPanel />
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      <TaskDrawer />
      <Toasts />
    </div>
  )
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'at-risk', label: 'At risk' },
  { key: 'critical', label: 'Critical path' },
  { key: 'unstarted', label: 'Not started' },
]

function TasksTab({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const [sub, setSub] = useState<'board' | 'overview' | 'workload' | 'procurement'>('board')
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 inline-flex w-fit items-center gap-1 rounded-lg border border-line bg-white p-0.5">
        <SubTab active={sub === 'board'} onClick={() => setSub('board')}>Board</SubTab>
        <SubTab active={sub === 'overview'} onClick={() => setSub('overview')}>Projects overview</SubTab>
        <SubTab active={sub === 'workload'} onClick={() => setSub('workload')}>Team workload</SubTab>
        <SubTab active={sub === 'procurement'} onClick={() => setSub('procurement')}>Procurement</SubTab>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {sub === 'board' ? <TasksBoard /> : sub === 'overview' ? <Portfolio onOpenProject={onOpenProject} /> : sub === 'workload' ? <Workload /> : <Procurement />}
      </div>
    </div>
  )
}
function SubTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn('rounded-md px-3 py-1 text-[13px] font-semibold transition-colors', active ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-surface')}>
      {children}
    </button>
  )
}

function MobilePreview({ onExit }: { onExit: () => void }) {
  return (
    <div className="flex h-screen w-screen flex-col items-center overflow-auto bg-gradient-to-b from-ink-950 to-[#2a2540] py-6">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={onExit} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-white/20"><Monitor className="h-4 w-4" /> Back to desktop</button>
        <span className="text-[13px] text-white/70">Mobile field app · same live data &amp; agent</span>
      </div>
      <div className="relative h-[812px] w-[390px] shrink-0 overflow-hidden rounded-[46px] border-[11px] border-ink-950 bg-white shadow-pop">
        <div className="pointer-events-none absolute left-1/2 top-0 z-[60] h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-ink-950" />
        <MobileApp />
      </div>
      <Toasts />
    </div>
  )
}

function OrgSettings() {
  const { completionMode, setCompletionMode, includeWeekends, setIncludeWeekends } = useProject()
  const [open, setOpen] = useState(false)
  const opts: { v: 'status' | 'manual'; label: string; desc: string }[] = [
    { v: 'status', label: 'By task status', desc: 'Not started 0% · In progress 50% · Done 100% (Jira-style). Parents roll up from subtasks.' },
    { v: 'manual', label: 'Manual %', desc: 'Each task’s % is entered by hand with the slider.' },
  ]
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[13px] font-medium text-ink-600 hover:bg-surface" title="Workspace settings">
        <Settings className="h-4 w-4" /> Settings
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-[320px] rounded-xl border border-line bg-white p-3 shadow-pop">
            <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-ink-400">Org setting · Completion tracking</div>
            <p className="mb-2 text-2xs text-ink-500">How every task’s % complete is calculated across the workspace.</p>
            <div className="space-y-1.5">
              {opts.map((o) => (
                <button key={o.v} onClick={() => { setCompletionMode(o.v); setOpen(false) }} className={cn('flex w-full items-start gap-2 rounded-lg border p-2.5 text-left transition-colors', completionMode === o.v ? 'border-brand-300 bg-brand-50' : 'border-line hover:bg-surface')}>
                  <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border', completionMode === o.v ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300')}>{completionMode === o.v && <Check className="h-3 w-3" />}</span>
                  <span>
                    <span className="block text-[13px] font-semibold text-ink-950">{o.label}</span>
                    <span className="block text-2xs text-ink-500">{o.desc}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4 mb-1 text-2xs font-semibold uppercase tracking-wide text-ink-400">Org setting · Work week</div>
            <p className="mb-2 text-2xs text-ink-500">Which days count as working days for durations and the Gantt.</p>
            <div className="space-y-1.5">
              {([[false, 'Mon–Fri', 'Saturdays & Sundays are non-working — shaded on the Gantt; durations count working days only.'], [true, '7 days', 'Weekends are working days too — no weekend shading.']] as const).map(([v, label, desc]) => (
                <button key={String(v)} onClick={() => setIncludeWeekends(v)} className={cn('flex w-full items-start gap-2 rounded-lg border p-2.5 text-left transition-colors', includeWeekends === v ? 'border-brand-300 bg-brand-50' : 'border-line hover:bg-surface')}>
                  <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border', includeWeekends === v ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300')}>{includeWeekends === v && <Check className="h-3 w-3" />}</span>
                  <span>
                    <span className="block text-[13px] font-semibold text-ink-950">{label}</span>
                    <span className="block text-2xs text-ink-500">{desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function GanttToolbar() {
  const { setShowCritical, filter, setFilter, search, setSearch, openCreate, tasks, cpm, today, simDelay, setSimDelay } = useProject()
  const [glossary, setGlossary] = useState(false)
  const sm = scheduleMetrics(tasks, cpm, today)
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[15px] font-semibold text-ink-950">Project Schedule</h2>
        <div className="relative">
          <button onClick={() => setGlossary((g) => !g)} className="flex items-center gap-1 text-2xs text-ink-400 hover:text-brand-700">
            <Info className="h-3.5 w-3.5" /> What do these mean?
          </button>
          {glossary && <Glossary onClose={() => setGlossary(false)} />}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* What-if delay slider */}
          <div className={cn('flex items-center gap-2 rounded-lg border px-2.5 h-8', simDelay > 0 ? 'border-warn/50 bg-warn/5' : 'border-line bg-white')}>
            <span className="flex items-center gap-1 text-2xs font-semibold text-ink-600"><Sparkles className="h-3.5 w-3.5 text-brand-600" /> What if</span>
            <span className="text-2xs text-ink-400">delay</span>
            <input type="range" min={0} max={14} step={1} value={simDelay} onChange={(e) => setSimDelay(Number(e.target.value))} className="w-24 accent-warn" title="Drag to simulate a delay" />
            <span className={cn('w-10 text-2xs font-bold tabular-nums', simDelay > 0 ? 'text-warn' : 'text-ink-400')}>+{simDelay}d</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 h-8">
            <SearchIcon className="h-3.5 w-3.5 text-ink-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks" className="w-28 bg-transparent text-[13px] outline-none placeholder:text-ink-400" />
          </div>
          <Button size="sm" variant="brand" onClick={openCreate}><Plus className="h-3.5 w-3.5" /> New task</Button>
        </div>
      </div>
      {/* filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => {
          const count = f.key === 'overdue' ? sm.overdue : f.key === 'at-risk' ? sm.atRisk + sm.blocked : f.key === 'critical' ? sm.criticalCount : undefined
          const active = filter === f.key
          return (
            <button key={f.key} onClick={() => { setFilter(f.key); setShowCritical(f.key === 'critical') }} className={cn('flex items-center gap-1 rounded-full border px-2.5 py-1 text-2xs font-medium transition-colors', active ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white text-ink-600 hover:bg-surface')}>
              {f.key === 'critical' && <Route className="h-3 w-3" />}
              {f.label}
              {count !== undefined && count > 0 && <span className={cn('rounded-full px-1 text-[9px] font-bold', active ? 'bg-white/25' : 'bg-ink-100 text-ink-500')}>{count}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Glossary({ onClose }: { onClose: () => void }) {
  const items = [
    ['Actual dates', 'Where the work is really scheduled now — the solid bar, colored by status.'],
    ['Planned dates', 'The originally-approved plan (thin ghost bar). Your promise, and what slip is measured against.'],
    ['Critical path', 'The chain with zero buffer — any slip here moves the finish date. Filter to highlight it.'],
    ['+Nd', 'Working days later (+) or earlier (−) than the plan.'],
    ['Days behind plan', 'How far Actual has drifted from the planned dates = the delay.'],
    ['Buffer', 'Spare days a task can slip before it pushes the finish date. 0 = critical.'],
  ]
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-0 top-6 z-50 w-[340px] rounded-xl border border-line bg-white p-3 shadow-pop">
        <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-400">Reading the Gantt</div>
        <div className="space-y-1.5">
          {items.map(([t, d]) => (
            <div key={t} className="text-2xs leading-relaxed"><b className="text-ink-950">{t}</b> <span className="text-ink-600">— {d}</span></div>
          ))}
        </div>
      </div>
    </>
  )
}

function Toasts() {
  const { toasts } = useProject()
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium text-white shadow-pop animate-in',
            t.tone === 'ok' ? 'bg-[#14804a]' : t.tone === 'warn' ? 'bg-warn' : 'bg-brand-700',
          )}
        >
          <Check className="h-4 w-4" /> {t.msg}
        </div>
      ))}
    </div>
  )
}

function NavItem({ icon: Icon, label, active }: { icon: any; label: string; active?: boolean }) {
  return (
    <button className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors', active ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-surface')}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  )
}
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn('rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors', active ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-surface')}>
      {children}
    </button>
  )
}
function RailTab({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: React.ReactNode; count?: number }) {
  return (
    <button onClick={onClick} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[13px] font-semibold transition-colors', active ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-surface')}>
      {children}
      {count ? <span className="rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">{count}</span> : null}
    </button>
  )
}
