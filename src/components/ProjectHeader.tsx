import React from 'react'
import { Check, CalendarClock, Gauge, Percent, AlertTriangle, Flag, Route, Diamond } from 'lucide-react'
import { useProject } from '../state/store'
import { PROJECT, PHASES } from '../data/project'
import { Card, Badge, InfoTip, HEALTH_META, cn } from './ui'
import { fmtDate, fmtDateFull, workingDaysBetween, scheduleMetrics, isDelayed, taskHealth } from '../lib/scheduling'
import { ArrowRight } from 'lucide-react'

export function ProjectHeader() {
  const { finish, baseFinish, tasks, cpm, today, setShowCritical, setFilter, openDrawer, pushToast } = useProject()
  const sm = scheduleMetrics(tasks, cpm, today)
  const delta = workingDaysBetween(baseFinish, finish)
  const currentPhase = 'Construction'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-2xs text-ink-400">
            <span className="tabular-nums">{PROJECT.code}</span>
            <span>·</span>
            <span>{PROJECT.address}</span>
          </div>
          <h1 className="mt-0.5 text-xl font-semibold text-ink-950">{PROJECT.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-[13px] text-ink-600">
            <span>{PROJECT.customer}</span>
            <span>·</span>
            <span>{PROJECT.contractValue > 0 ? '24×40 · 960 sq ft' : ''}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {PHASES.map((p, i) => {
            const done = i < 2
            const active = p.name === currentPhase
            return (
              <React.Fragment key={p.id}>
                <div className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium', active ? 'bg-brand-600 text-white' : done ? 'bg-brand-50 text-brand-700' : 'bg-surface text-ink-400')}>
                  {done && <Check className="h-3.5 w-3.5" />}
                  {p.name}
                </div>
                {i < PHASES.length - 1 && <div className="h-px w-4 bg-line" />}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      <KpiRow sm={sm} delta={delta} finish={finish} />

      {/* Schedule status strip */}
      <Card className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-brand-600" />
            <span className="text-[13px] font-semibold text-ink-950">Schedule health</span>
            <InfoTip text="A one-glance read of this project's schedule: overall completion, tasks done, on-time rate, how many tasks sit on the critical path, and the next key date." />
          </div>
          {/* status-tone stacked completion bar (Jira-style) */}
          <StatusBar tasks={tasks} today={today} pct={sm.pctComplete} />
          <div className="h-8 w-px bg-line" />
          <Stat label="Tasks done" value={`${sm.doneCount}/${sm.totalCount}`} />
          <Stat label="On-time" value={`${sm.onTimePct}%`} tone={sm.onTimePct >= 90 ? 'ok' : sm.onTimePct >= 75 ? 'warn' : 'danger'} />
        </div>
      </Card>
    </div>
  )
}

function StatusBar({ tasks, today, pct }: { tasks: any[]; today: string; pct: number }) {
  const leaves = tasks.filter((t) => !tasks.some((x) => x.parentId === t.id))
  const order = ['done', 'in-progress', 'at-risk', 'overdue', 'blocked', 'on-hold', 'not-started'] as const
  const dist: Record<string, number> = {}
  leaves.forEach((t) => { const h = taskHealth(t, today); dist[h] = (dist[h] ?? 0) + 1 })
  const total = leaves.length || 1
  return (
    <div className="flex min-w-[220px] flex-1 items-center gap-3">
      <div className="flex-1">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface">
          {order.filter((k) => dist[k]).map((k) => (
            <div key={k} style={{ width: `${(dist[k] / total) * 100}%`, background: HEALTH_META[k]?.color }} title={`${HEALTH_META[k]?.label}: ${dist[k]} task${dist[k] > 1 ? 's' : ''}`} />
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {order.filter((k) => dist[k]).map((k) => (
            <span key={k} className="flex items-center gap-1 text-[11px] font-medium text-ink-600"><span className="h-2 w-2 rounded-full" style={{ background: HEALTH_META[k]?.color }} /> {HEALTH_META[k]?.label} {dist[k]}</span>
          ))}
        </div>
      </div>
      <span className="text-[15px] font-semibold tabular-nums text-ink-950">{pct}%</span>
    </div>
  )
}

function Stat({ label, value, tone, onClick }: { label: string; value: string; tone?: 'ok' | 'warn' | 'danger'; onClick?: () => void }) {
  const c = tone === 'ok' ? 'text-[#14804a]' : tone === 'warn' ? 'text-warn' : tone === 'danger' ? 'text-danger' : 'text-ink-950'
  return (
    <div onClick={onClick} className={cn(onClick && 'cursor-pointer rounded-md px-1.5 py-0.5 -mx-1.5 hover:bg-brand-50')}>
      <div className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</div>
      <div className={cn('text-[16px] font-bold tabular-nums', c)}>{value}</div>
    </div>
  )
}

function KpiRow({ sm, delta, finish }: { sm: ReturnType<typeof scheduleMetrics>; delta: number; finish: string }) {
  const { setFilter, setShowCritical, setHighlight, tasks, pushToast } = useProject()
  const delayedIds = tasks.filter((t) => !tasks.some((x) => x.parentId === t.id) && isDelayed(t) && t.status !== 'done').map((t) => t.id)
  const go: Record<string, () => void> = {
    'Predicted finish': () => { setShowCritical(true); setFilter('critical'); pushToast('Showing the critical path — what drives your finish date', 'brand') },
    'On-time tasks': () => { setHighlight(delayedIds); pushToast(`Highlighted ${delayedIds.length} task(s) slipping vs baseline`, 'brand') },
    '% Complete': () => { setFilter('unstarted'); pushToast('Filtered to work not yet started', 'brand') },
    'Overdue': () => { setFilter('overdue'); pushToast('Filtered to overdue tasks', 'brand') },
    'At risk / blocked': () => { setFilter('at-risk'); pushToast('Filtered to at-risk & blocked tasks', 'brand') },
    'Schedule buffer': () => { setShowCritical(true); setFilter('critical'); pushToast('Showing the critical tasks with no spare days', 'brand') },
  }
  const cards = [
    { icon: CalendarClock, label: 'Predicted finish', info: 'The projected finish from current task dates + dependencies, compared to the approved baseline.', value: fmtDateFull(finish).replace(/^\w+, /, ''), delta: delta > 0 ? `${delta}d late vs baseline` : delta < 0 ? `${-delta}d ahead` : 'on baseline', tone: delta > 0 ? 'warn' : delta < 0 ? 'ok' : 'neutral' },
    { icon: Gauge, label: 'On-time tasks', info: 'Of the tasks due by today, the share that finished on or before their baseline date.', value: `${sm.onTimePct}%`, delta: sm.onTimePct >= 90 ? 'healthy' : 'behind plan', tone: sm.onTimePct >= 90 ? 'ok' : sm.onTimePct >= 75 ? 'warn' : 'danger' },
    { icon: Percent, label: '% Complete', info: 'Duration-weighted completion across every task and subtask (longer tasks count more).', value: `${sm.pctComplete}%`, delta: `${sm.doneCount}/${sm.totalCount} tasks done`, tone: 'brand' },
    { icon: AlertTriangle, label: 'Overdue', info: 'Tasks past their finish date that are not yet complete — a today problem.', value: `${sm.overdue}`, delta: sm.overdue ? 'past due date' : 'none past due', tone: sm.overdue ? 'danger' : 'ok' },
    { icon: Flag, label: 'At risk / blocked', info: 'Tasks you or the agent flagged at-risk or blocked and that need attention.', value: `${sm.atRisk + sm.blocked}`, delta: sm.atRisk + sm.blocked ? 'need attention' : 'clear', tone: sm.atRisk + sm.blocked > 1 ? 'danger' : sm.atRisk + sm.blocked === 1 ? 'warn' : 'ok' },
    { icon: Route, label: 'Schedule buffer', info: 'The smallest slack (float) left on any near-critical task before the finish date starts moving. 1 day = very tight.', value: `${sm.floatDays}d`, delta: sm.floatDays <= 1 ? 'tight — no room to slip' : 'some room', tone: sm.floatDays <= 1 ? 'warn' : 'ok' },
  ] as const
  const toneText: Record<string, string> = { ok: 'text-[#14804a]', warn: 'text-warn', danger: 'text-danger', brand: 'text-brand-700', neutral: 'text-ink-600' }
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <Card key={c.label} onClick={go[c.label]} className="group flex cursor-pointer flex-col p-3 transition-shadow hover:shadow-pop">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-500">
            <c.icon className="h-4 w-4" />
            {c.label}
            <InfoTip text={c.info} className="ml-auto" />
          </div>
          <div className="mt-2">
            <div className="text-[22px] font-bold leading-tight tabular-nums text-ink-950">{c.value}</div>
            <div className={cn('mt-0.5 text-xs font-semibold', toneText[c.tone])}>{c.delta}</div>
          </div>
          <div className="mt-2 flex items-center gap-0.5 text-[11px] font-semibold text-brand-600/70 transition-colors group-hover:text-brand-700">View tasks <ArrowRight className="h-3 w-3" /></div>
        </Card>
      ))}
    </div>
  )
}
