import React, { useState } from 'react'
import { Cog, ExternalLink, Truck, Plus, X, Factory, ChevronDown, AlertTriangle, CheckCircle2, Layers, Wrench, ListChecks } from 'lucide-react'
import { useProject } from '../state/store'
import { Badge, cn } from './ui'
import { fmtDate } from '../lib/scheduling'
import { resolveLink, BUCKET_META, opsScheduleUrl, opsDashboardUrl, pickOptions, suggestSerialId } from '../lib/workorder'
import type { ResolvedLink } from '../lib/workorder'
import type { Task, WorkOrderLink } from '../lib/types'

const GRAIN_META: Record<WorkOrderLink['grain'], { label: string; icon: any }> = {
  serial: { label: 'Module', icon: Layers },
  task: { label: 'Work order', icon: Wrench },
  step: { label: 'Step', icon: ListChecks },
}

const rid = () => 'wol' + Math.random().toString(36).slice(2, 7)

// Delivery date vs the field task's need-by, colored.
function DeliveryLine({ r, needBy }: { r: ResolvedLink; needBy: string }) {
  const late = r.risk === 'late'
  const tight = r.risk === 'tight'
  const c = r.risk === 'delivered' ? '#14804a' : late ? '#b45309' : tight ? '#b45309' : '#14804a'
  const bg = late || tight ? 'rgba(250,115,25,0.10)' : 'rgba(31,193,107,0.10)'
  const msg =
    r.risk === 'delivered' ? 'delivered'
      : late ? `${r.daysVsNeedBy}d after need-by (${fmtDate(needBy)})`
        : tight ? `same day as need-by (${fmtDate(needBy)}) — no slack`
          : `${Math.abs(r.daysVsNeedBy ?? 0)}d before need-by`
  return (
    <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium" style={{ background: bg, color: c }}>
      {late ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> : <Truck className="h-3.5 w-3.5 shrink-0" />}
      Delivers <b className="tabular-nums">{fmtDate(r.deliveryDate)}</b> · {msg}
    </div>
  )
}

// Compact chip for task cards / rows — clicking opens the ops app (the redirect).
export function WorkOrderChip({ link, task }: { link: WorkOrderLink; task: Task }) {
  const r = resolveLink(link, task.start)
  if (!r) return null
  const meta = BUCKET_META[r.bucket]
  const late = r.risk === 'late'
  return (
    <a
      href={opsScheduleUrl(r.projectId)}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`Open ${r.serialNo} in Operations`}
      className={cn('inline-flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 text-[11px] font-medium transition-colors hover:bg-surface', late ? 'border-warn/50' : 'border-line')}
    >
      <Cog className="h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />
      <span className="tabular-nums text-ink-700">{r.serialNo}</span>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      <span className="text-ink-600">{r.bucket === 'done' ? 'Delivered' : meta.label} · {r.pct}%</span>
      <span className={cn('tabular-nums', late ? 'font-semibold text-[#b45309]' : 'text-ink-400')}>· {late ? `${r.daysVsNeedBy}d late` : fmtDate(r.deliveryDate)}</span>
      <ExternalLink className="h-3 w-3 shrink-0 text-ink-400" />
    </a>
  )
}

// A resolved link detail row (drawer / sheet).
function LinkRow({ link, task, onUnlink }: { link: WorkOrderLink; task: Task; onUnlink: () => void }) {
  const r = resolveLink(link, task.start)
  const G = GRAIN_META[link.grain]
  if (!r) return (
    <div className="flex items-center justify-between rounded-lg border border-dashed border-line px-2.5 py-2 text-[12px] text-ink-400">
      Linked item not found (ref {link.refId}) <button onClick={onUnlink} className="text-ink-400 hover:text-danger"><X className="h-3.5 w-3.5" /></button>
    </div>
  )
  const meta = BUCKET_META[r.bucket]
  return (
    <div className="rounded-xl border border-line bg-white p-2.5">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-surface"><G.icon className="h-3.5 w-3.5 text-ink-500" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold text-ink-950">{r.serialNo}</span>
            <Badge tone={meta.tone}><span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />{r.bucket === 'done' ? 'Delivered' : meta.label}</Badge>
            <span className="ml-auto shrink-0 text-[11px] font-semibold tabular-nums text-ink-500">{r.stepsDone}/{r.stepsTotal} · {r.pct}%</span>
          </div>
          <div className="mt-0.5 text-[12px] text-ink-600">{G.label}: <b className="font-medium text-ink-800">{r.title}</b></div>
          <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: meta.color }} /></div>
        </div>
        <button onClick={onUnlink} title="Unlink" className="shrink-0 text-ink-400 hover:text-danger"><X className="h-3.5 w-3.5" /></button>
      </div>
      <div className="mt-2"><DeliveryLine r={r} needBy={task.start} /></div>
      <div className="mt-1.5 text-[10px] text-ink-400">Status from: <span className="text-ink-500">{r.sourcePath}</span></div>
      <div className="mt-2 flex items-center gap-2">
        <a href={opsScheduleUrl(r.projectId)} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11px] font-semibold text-brand-700 hover:bg-surface"><ExternalLink className="h-3 w-3" /> Open in Operations</a>
        <a href={opsDashboardUrl(r.plant, r.projectId)} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11px] font-semibold text-ink-600 hover:bg-surface"><Factory className="h-3 w-3" /> Plant dashboard</a>
      </div>
    </div>
  )
}

// The grain-flexible mapping picker.
function LinkEditor({ task, onAdd, onClose }: { task: Task; onAdd: (l: WorkOrderLink) => void; onClose: () => void }) {
  const opts = pickOptions()
  const suggested = suggestSerialId(task.name)
  const [grain, setGrain] = useState<WorkOrderLink['grain']>('serial')
  const list = grain === 'serial' ? opts.serials : grain === 'task' ? opts.tasks : opts.steps
  const [refId, setRefId] = useState<string>(suggested ?? list[0]?.refId ?? '')
  const onGrain = (g: WorkOrderLink['grain']) => { setGrain(g); const l = g === 'serial' ? opts.serials : g === 'task' ? opts.tasks : opts.steps; setRefId(l[0]?.refId ?? '') }
  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-2.5">
      <div className="mb-1.5 text-[11px] font-semibold text-ink-600">Link a production work order — pick the level to track from</div>
      <div className="mb-2 inline-flex rounded-lg border border-line bg-white p-0.5">
        {(['serial', 'task', 'step'] as const).map((g) => {
          const G = GRAIN_META[g]
          return (
            <button key={g} onClick={() => onGrain(g)} className={cn('flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium', grain === g ? 'bg-brand-600 text-white' : 'text-ink-600')}>
              <G.icon className="h-3 w-3" /> {G.label}
            </button>
          )
        })}
      </div>
      {suggested && grain === 'serial' && <div className="mb-1.5 text-[10px] text-ink-500">Auto-suggested from the task name.</div>}
      <div className="relative">
        <select value={refId} onChange={(e) => setRefId(e.target.value)} className="input w-full appearance-none pr-8">
          {list.map((o) => <option key={o.refId} value={o.refId}>{o.label} — {o.sub}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button onClick={() => { if (refId) { onAdd({ id: rid(), grain, refId }); onClose() } }} className="rounded-lg bg-brand-600 px-3 py-1.5 text-[12px] font-semibold text-white active:bg-brand-700">Link work order</button>
        <button onClick={onClose} className="rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-600">Cancel</button>
      </div>
    </div>
  )
}

// Full section for the task drawer / mobile sheet.
export function WorkOrderSection({ task }: { task: Task }) {
  const { updateTask, pushToast } = useProject()
  const links = task.workOrderLinks ?? []
  const [editing, setEditing] = useState(false)
  const add = (l: WorkOrderLink) => { updateTask(task.id, { workOrderLinks: [...links, l] }, 'Work order linked'); }
  const remove = (id: string) => { updateTask(task.id, { workOrderLinks: links.filter((x) => x.id !== id) }, 'Work order unlinked') }
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400"><Cog className="h-3.5 w-3.5" /> Production · Work Orders {links.length > 0 && `· ${links.length}`}</span>
        {!editing && <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline"><Plus className="h-3 w-3" /> Link</button>}
      </div>
      {links.length === 0 && !editing && (
        <div className="rounded-lg border border-dashed border-line px-3 py-2 text-[12px] text-ink-400">Not linked to production. Link a module, work order, or step to pull its live build status &amp; delivery date.</div>
      )}
      <div className="space-y-2">
        {links.map((l) => <LinkRow key={l.id} link={l} task={task} onUnlink={() => remove(l.id)} />)}
      </div>
      {editing && <div className="mt-2"><LinkEditor task={task} onAdd={add} onClose={() => setEditing(false)} /></div>}
    </div>
  )
}
