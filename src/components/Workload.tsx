import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { useProject } from '../state/store'
import { TEAM, memberColor } from '../data/project'
import { Card, Badge, Avatar, cn } from './ui'
import { workloadByAssignee, fmtDate, taskHealth, isOverdue } from '../lib/scheduling'

export default function Workload() {
  const { tasks, today, openDrawer } = useProject()
  const rows = workloadByAssignee(tasks, today)
  const maxDays = Math.max(1, ...rows.map((r) => r.activeDays))

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-[15px] font-semibold text-ink-950">Team workload — this project</h2>
        <p className="text-2xs text-ink-500">Who owns what, who’s overloaded, who’s behind. Click a name to see their tasks.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => {
          const member = TEAM.find((m) => m.name === r.name)
          const theirTasks = tasks.filter((t) => t.assignee === r.name && !tasks.some((x) => x.parentId === t.id))
          return (
            <Card key={r.key} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar name={r.name} color={memberColor(r.name)} />
                  <div>
                    <div className="text-[14px] font-semibold text-ink-950">{r.name}</div>
                    <div className="text-2xs text-ink-400">{member?.role ?? ''}</div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {r.overdue > 0 && <Badge tone="danger"><AlertTriangle className="h-2.5 w-2.5" /> {r.overdue} overdue</Badge>}
                  {r.atRisk > 0 && <Badge tone="warn">{r.atRisk} at risk</Badge>}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                <Metric label="Tasks" value={`${r.total}`} />
                <Metric label="Done" value={`${r.done}`} tone="ok" />
                <Metric label="On-time" value={`${r.onTimePct}%`} tone={r.onTimePct >= 90 ? 'ok' : r.onTimePct >= 75 ? 'warn' : 'danger'} />
                <Metric label="Next due" value={r.nextDue ? fmtDate(r.nextDue) : '—'} />
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-2xs text-ink-400">
                  <span>Active load</span>
                  <span className="tabular-nums">{r.activeDays} working-days</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                  <div className={cn('h-full rounded-full', r.activeDays / maxDays > 0.85 ? 'bg-danger' : r.activeDays / maxDays > 0.6 ? 'bg-warn' : 'bg-brand-600')} style={{ width: `${(r.activeDays / maxDays) * 100}%` }} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {theirTasks.slice(0, 4).map((t) => {
                  const od = isOverdue(t, today)
                  return (
                    <button key={t.id} onClick={() => openDrawer(t.id)} className={cn('rounded-md border px-1.5 py-0.5 text-2xs', od ? 'border-danger/30 bg-danger/5 text-danger' : 'border-line bg-white text-ink-600 hover:bg-surface')}>
                      {t.name.length > 20 ? t.name.slice(0, 20) + '…' : t.name}
                    </button>
                  )
                })}
                {theirTasks.length > 4 && <span className="px-1 py-0.5 text-2xs text-ink-400">+{theirTasks.length - 4}</span>}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' | 'danger' }) {
  const c = tone === 'ok' ? 'text-[#14804a]' : tone === 'warn' ? 'text-warn' : tone === 'danger' ? 'text-danger' : 'text-ink-950'
  return (
    <div className="rounded-lg bg-surface py-1.5">
      <div className={cn('text-[15px] font-semibold tabular-nums', c)}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-ink-400">{label}</div>
    </div>
  )
}
