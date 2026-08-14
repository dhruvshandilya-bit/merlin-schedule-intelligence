import React from 'react'
import { Sparkles, AlertTriangle, CheckCircle2, Clock, ArrowUpRight } from 'lucide-react'
import { PORTFOLIO } from '../data/project'
import { Card, Badge, cn } from './ui'

const HEALTH: Record<string, { dot: string; ring: string; label: string; tone: any }> = {
  green: { dot: '#1fc16b', ring: 'border-l-[#1fc16b]', label: 'On track', tone: 'ok' },
  amber: { dot: '#fa7319', ring: 'border-l-[#fa7319]', label: 'Running late', tone: 'warn' },
  red: { dot: '#fb3748', ring: 'border-l-[#fb3748]', label: 'Needs attention', tone: 'danger' },
}

export default function Portfolio({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const [tf, setTf] = React.useState<'all' | 'green' | 'red' | 'late'>('all')
  const late = PORTFOLIO.filter((p) => p.finishDelta > 0)
  const onTrack = PORTFOLIO.filter((p) => p.health === 'green').length
  const attention = PORTFOLIO.filter((p) => p.health === 'red').length
  const shown = PORTFOLIO.filter((p) => (tf === 'all' ? true : tf === 'late' ? p.finishDelta > 0 : p.health === tf))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-ink-950">All Projects</h1>
        <p className="text-[13px] text-ink-600">Every active build in one place — is it on schedule, and if not, what’s wrong and who owns it.</p>
      </div>

      {/* plain-language summary — click to filter the projects below */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile icon={CheckCircle2} label="On track" value={`${onTrack}`} sub={`of ${PORTFOLIO.length} projects`} tone="ok" active={tf === 'green'} onClick={() => setTf(tf === 'green' ? 'all' : 'green')} />
        <Tile icon={Clock} label="Running late" value={`${late.length}`} sub="finishing past plan" tone="warn" active={tf === 'late'} onClick={() => setTf(tf === 'late' ? 'all' : 'late')} />
        <Tile icon={AlertTriangle} label="Need attention" value={`${attention}`} sub="act on these today" tone="danger" active={tf === 'red'} onClick={() => setTf(tf === 'red' ? 'all' : 'red')} />
        <Tile icon={Clock} label="Worst slip" value={`${Math.max(...PORTFOLIO.map((p) => p.finishDelta))}d`} sub="open Barn Home" tone="danger" onClick={() => onOpenProject('CB-PRJ-00396')} />
      </div>
      {tf !== 'all' && <div className="-mt-2 text-2xs text-ink-500">Showing {shown.length} project(s) · <button onClick={() => setTf('all')} className="font-medium text-brand-700 hover:underline">clear filter</button></div>}

      {/* single agent brief */}
      <Card className="overflow-hidden border-brand-200">
        <div className="flex items-start gap-3 bg-gradient-to-r from-brand-50 to-white p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white"><Sparkles className="h-5 w-5" /></span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-ink-950">Merlin Project Agent</span>
              <Badge tone="warn">Where to act today</Badge>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-700">
              <b>3 of 6 projects are running late.</b> Start with{' '}
              <button onClick={() => onOpenProject('CB-PRJ-00396')} className="font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2">Nevarez — Barn Home</button>{' '}
              (12 days late): the framing crew is double-booked and 3 requests-for-info are sitting unanswered. <b>Coley</b> needs a weather call on Thursday’s slab pour.
            </p>
          </div>
        </div>
      </Card>

      {/* project cards — plain language, schedule-only */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[...shown].sort((a, b) => b.finishDelta - a.finishDelta).map((p) => {
          const h = HEALTH[p.health]
          const live = p.id === 'CB-PRJ-00441'
          return (
            <Card key={p.id} className={cn('cursor-pointer border-l-[3px] p-4 transition-shadow hover:shadow-pop', h.ring)} onClick={() => onOpenProject(p.id)}>
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-2xs text-ink-400">
                    <span className="tabular-nums">{p.code}</span>
                    {live && <Badge tone="brand">You’re here</Badge>}
                  </div>
                  <div className="mt-0.5 truncate text-[14px] font-semibold text-ink-950">{p.name}</div>
                </div>
                <Badge tone={h.tone}><span className="h-1.5 w-1.5 rounded-full" style={{ background: h.dot }} /> {h.label}</Badge>
              </div>

              {/* the two things that matter: how far along, and on-time or not */}
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-2xs">
                  <span className="text-ink-500">{p.phase} · {p.pct}% complete</span>
                  <span className={cn('font-semibold', p.finishDelta > 0 ? 'text-danger' : p.finishDelta < 0 ? 'text-[#14804a]' : 'text-ink-600')}>
                    {p.finishDelta > 0 ? `${p.finishDelta} days late` : p.finishDelta < 0 ? `${-p.finishDelta} days ahead` : 'On time'}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: h.dot }} /></div>
              </div>

              <div className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-surface px-2 py-1.5 text-2xs text-ink-600">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" style={{ color: h.dot }} />
                <span>{p.topRisk}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-2xs text-ink-400">
                <span>Manager · {p.pm}</span>
                <span className="flex items-center gap-0.5 font-medium text-brand-700">Open <ArrowUpRight className="h-3 w-3" /></span>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function Tile({ icon: Icon, label, value, sub, tone, onClick, active }: { icon: any; label: string; value: string; sub: string; tone: any; onClick?: () => void; active?: boolean }) {
  const c: Record<string, string> = { ok: 'text-[#14804a]', warn: 'text-warn', danger: 'text-danger', brand: 'text-brand-700' }
  return (
    <Card onClick={onClick} className={cn('p-3 transition-shadow', onClick && 'cursor-pointer hover:shadow-pop', active && 'ring-2 ring-brand-400')}>
      <div className="flex items-center gap-1.5 text-2xs font-medium text-ink-400"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className={cn('mt-1 text-lg font-semibold tabular-nums', c[tone])}>{value}</div>
      <div className="text-2xs text-ink-400">{sub}</div>
    </Card>
  )
}
