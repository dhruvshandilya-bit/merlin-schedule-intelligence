import React, { useState } from 'react'
import { Sparkles, ChevronDown, ChevronRight, ShieldAlert, CloudLightning, PackageSearch, Users, Clock, Zap, Check, Eye } from 'lucide-react'
import { useInsights } from '../state/useInsights'
import { Card, Badge, Button, InfoTip, cn } from './ui'
import { useProject } from '../state/store'
import type { Insight } from '../lib/agents'

const SKILL_ICON: Record<string, any> = {
  'Delay radar': ShieldAlert,
  'Weather watch': CloudLightning,
  'Look-ahead': PackageSearch,
  'Resource leveling': Users,
  'Overdue sweep': Clock,
}
const SEV: Record<string, { bar: string; dot: string }> = {
  high: { bar: '#fb3748', dot: '#fb3748' },
  medium: { bar: '#fa7319', dot: '#fa7319' },
  low: { bar: '#a3a3a3', dot: '#a3a3a3' },
}

export default function TodayFeed() {
  const insights = useInsights()
  const ranked = [...insights].sort((a, b) => ({ high: 0, medium: 1, low: 2 })[a.severity] - ({ high: 0, medium: 1, low: 2 })[b.severity])
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white"><Sparkles className="h-4 w-4" /></span>
          <div>
            <div className="flex items-center gap-1 text-[13px] font-semibold text-ink-950">Merlin Project Agent <InfoTip text="One agent watching the whole schedule. Each card is a skill (delay, weather, look-ahead, crews, overdue) — expand it to see what it checks and apply a fix you approve." /></div>
            <div className="text-2xs text-ink-400">What needs you today — ranked</div>
          </div>
        </div>
        <Badge tone="danger">{ranked.filter((i) => i.severity === 'high').length} urgent</Badge>
      </div>
      <div className="flex-1 space-y-2.5 overflow-auto p-3">
        {ranked.map((i) => <InsightCard key={i.id} insight={i} />)}
      </div>
    </Card>
  )
}

function InsightCard({ insight }: { insight: Insight }) {
  const [open, setOpen] = useState(insight.severity === 'high')
  const [result, setResult] = useState<string | null>(null)
  const { setHighlight } = useProject()
  const sev = SEV[insight.severity]
  const Icon = SKILL_ICON[insight.skill] ?? Zap
  const highConf = insight.confidence === 'High'
  return (
    <div
      className="rounded-lg border border-line bg-white transition-shadow hover:shadow-card"
      onMouseEnter={() => insight.chain && setHighlight(insight.chain)}
      onMouseLeave={() => setHighlight([])}
    >
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-2 px-3 py-2.5 text-left">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: sev.dot }} title={`${insight.severity} priority`} />
            <span className="text-2xs font-semibold uppercase tracking-wide text-ink-500">{insight.skill}</span>
          </div>
          <div className="mt-0.5 text-[13px] font-semibold leading-snug text-ink-950">{insight.title}</div>
          {insight.preview && !result && <div className="mt-0.5 text-2xs font-medium text-brand-700">{insight.preview}</div>}
        </div>
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-ink-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" />}
      </button>
      {open && (
        <div className="px-3 pb-3 pl-9">
          <ul className="space-y-1 text-2xs leading-relaxed text-ink-600">
            {insight.why.map((w, k) => (
              <li key={k} className="flex gap-1.5"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-ink-400" /><span>{w}</span></li>
            ))}
          </ul>
          {insight.checks && (
            <div className="mt-2 rounded-lg bg-surface p-2">
              <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400"><Eye className="h-3 w-3" /> What I check in Merlin</div>
              <ul className="space-y-0.5">
                {insight.checks.map((c, k) => (
                  <li key={k} className="flex gap-1.5 text-[11px] leading-snug text-ink-600"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand-400" /><span>{c}</span></li>
                ))}
              </ul>
            </div>
          )}
          {result ? (
            <div className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-ok/10 px-2.5 py-2 text-2xs font-medium text-[#14804a]">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {result}
            </div>
          ) : (
            <div className="mt-2.5 flex items-center gap-2">
              <Button size="sm" variant={highConf ? 'brand' : 'outline'} onClick={() => setResult(insight.run())}>
                {insight.destructive && <Zap className="h-3.5 w-3.5" />}
                {insight.actionLabel}
              </Button>
              {!highConf && <span className="text-2xs text-ink-400">Review before applying</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
