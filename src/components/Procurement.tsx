import React from 'react'
import { Cog, ExternalLink, Factory, AlertTriangle, Truck, CheckCircle2, ArrowUpRight } from 'lucide-react'
import { useProject } from '../state/store'
import { Card, Badge, cn } from './ui'
import { fmtDate } from '../lib/scheduling'
import { resolveLink, BUCKET_META, opsScheduleUrl, opsDashboardUrl } from '../lib/workorder'
import type { ResolvedLink } from '../lib/workorder'
import type { Task, WorkOrderLink } from '../lib/types'

interface Row { task: Task; link: WorkOrderLink; r: ResolvedLink }

const GRAIN_LABEL: Record<WorkOrderLink['grain'], string> = { serial: 'Module', task: 'Work order', step: 'Step' }
const RISK_ORDER = { late: 0, tight: 1, ok: 2, delivered: 3 } as const

export default function Procurement() {
  const { tasks } = useProject()
  const rows: Row[] = []
  tasks.forEach((task) => (task.workOrderLinks ?? []).forEach((link) => {
    const r = resolveLink(link, task.start)
    if (r) rows.push({ task, link, r })
  }))
  rows.sort((a, b) => (RISK_ORDER[a.r.risk ?? 'ok'] - RISK_ORDER[b.r.risk ?? 'ok']))

  const late = rows.filter((x) => x.r.risk === 'late').length
  const delivered = rows.filter((x) => x.r.bucket === 'done').length
  const building = rows.filter((x) => x.r.bucket === 'building').length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-ink-950">Procurement &amp; Deliveries</h1>
        <p className="text-[13px] text-ink-600">Every field task linked to production — live build status pulled from Operations, and whether the delivery date protects the on-site need-by.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile icon={Cog} label="Linked orders" value={`${rows.length}`} sub="tasks ↔ production" tone="brand" />
        <Tile icon={AlertTriangle} label="Delivery late" value={`${late}`} sub="past the need-by" tone={late ? 'danger' : 'ok'} />
        <Tile icon={Truck} label="In production" value={`${building}`} sub="being built now" tone="brand" />
        <Tile icon={CheckCircle2} label="Delivered" value={`${delivered}`} sub="on site" tone="ok" />
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-[13px] text-ink-400">No production links yet. Open a task and use “Production · Work Orders → Link”.</Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <thead className="border-b border-line bg-surface/60 text-2xs uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Field task</th>
                  <th className="px-3 py-2 font-semibold">Linked to</th>
                  <th className="px-3 py-2 font-semibold">Build status</th>
                  <th className="px-3 py-2 font-semibold">Delivers</th>
                  <th className="px-3 py-2 font-semibold">Need-by</th>
                  <th className="px-3 py-2 font-semibold">Risk</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ task, link, r }) => {
                  const meta = BUCKET_META[r.bucket]
                  const late = r.risk === 'late'
                  return (
                    <tr key={task.id + link.id} className="border-b border-line/60 hover:bg-surface/40">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-ink-950">{task.name}</div>
                        <div className="text-2xs tabular-nums text-ink-400">{task.wbs}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5 tabular-nums text-ink-800">{r.serialNo}</div>
                        <div className="text-2xs text-ink-400">{GRAIN_LABEL[link.grain]}: {r.title}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Badge tone={meta.tone}><span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />{r.bucket === 'done' ? 'Delivered' : meta.label}</Badge>
                          <span className="text-2xs tabular-nums text-ink-500">{r.pct}%</span>
                        </div>
                        <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: meta.color }} /></div>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-ink-800">{fmtDate(r.deliveryDate)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-ink-600">{fmtDate(task.start)}</td>
                      <td className="px-3 py-2.5">
                        {r.risk === 'delivered' ? <span className="text-2xs font-semibold text-[#14804a]">Delivered</span>
                          : late ? <span className="flex items-center gap-1 text-2xs font-bold text-danger"><AlertTriangle className="h-3 w-3" /> {r.daysVsNeedBy}d late</span>
                            : r.risk === 'tight' ? <span className="text-2xs font-semibold text-warn">No slack</span>
                              : <span className="text-2xs font-medium text-[#14804a]">On time</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <a href={opsScheduleUrl(r.projectId)} target="_blank" rel="noreferrer" title="Open in Operations" className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-2xs font-semibold text-brand-700 hover:bg-surface"><ExternalLink className="h-3 w-3" /> Ops</a>
                          <a href={opsDashboardUrl(r.plant, r.projectId)} target="_blank" rel="noreferrer" title="Plant dashboard" className="grid h-6 w-6 place-items-center rounded-lg border border-line text-ink-500 hover:bg-surface"><Factory className="h-3 w-3" /></a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <p className="text-2xs text-ink-400">Read-only mirror of Operations · pull-synced. Build status is derived from the linked module / work order / step. Links open the live Operations schedule.</p>
    </div>
  )
}

function Tile({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub: string; tone: 'ok' | 'warn' | 'danger' | 'brand' }) {
  const c: Record<string, string> = { ok: 'text-[#14804a]', warn: 'text-warn', danger: 'text-danger', brand: 'text-brand-700' }
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 text-2xs font-medium text-ink-400"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className={cn('mt-1 text-lg font-semibold tabular-nums', c[tone])}>{value}</div>
      <div className="text-2xs text-ink-400">{sub}</div>
    </Card>
  )
}
