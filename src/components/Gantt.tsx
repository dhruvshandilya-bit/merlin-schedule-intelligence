import React, { useMemo, useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight, CloudRain, CloudLightning, Sun, Cloud, Flag, Diamond, ZoomIn, ZoomOut, UnfoldVertical, FoldVertical, Zap, Check, X } from 'lucide-react'
import { useProject } from '../state/store'
import { PHASES, WEATHER, memberColor, assigneesOf } from '../data/project'
import { HEALTH_META, PRIORITY_META, Avatar, AvatarStack, cn } from './ui'
import { diffDays, addDays, isWeekend, fmtDate, parse, parentSet, taskHealth, isOverdue, isDelayed, rollupProgress, rollupHealth, computeCpm, projectBounds, finishDate, baselineFinish, shiftWithRipple, workingDaysBetween } from '../lib/scheduling'
import type { Task } from '../lib/types'

const BASE_DAY = 24
const ROW_H = 36
const LEFT_W = 452
const HEAD_H = 52
const WEATHER_ICON: Record<string, any> = { rain: CloudRain, storm: CloudLightning, sun: Sun, cloud: Cloud }
const DEP_LABEL: Record<string, string> = { FS: 'Finish → Start', SS: 'Start → Start', FF: 'Finish → Finish', SF: 'Start → Finish' }

export default function Gantt() {
  const { tasks: realTasks, today, cpm: realCpm, bounds: realBounds, highlight, selected, setSelected, showCritical, openDrawer, filter, search, simDelay, setSimDelay, commit, pushToast, includeWeekends } = useProject()
  const simActive = simDelay > 0
  const delayRoot = useMemo(() => {
    const P = parentSet(realTasks)
    const leaves = realTasks.filter((t) => !P.has(t.id) && t.status !== 'done')
    return (leaves.find((t) => realCpm[t.id]?.critical) ?? leaves[0])?.id
  }, [realTasks, realCpm])
  const tasks = useMemo(() => (simActive && delayRoot ? shiftWithRipple(realTasks, delayRoot, simDelay).tasks : realTasks), [realTasks, simActive, delayRoot, simDelay])
  const cpm = useMemo(() => (simActive ? computeCpm(tasks) : realCpm), [simActive, tasks, realCpm])
  const bounds = useMemo(() => (simActive ? projectBounds(tasks) : realBounds), [simActive, tasks, realBounds])
  const simFinish = simActive ? finishDate(tasks) : ''
  const simDelta = simActive ? workingDaysBetween(baselineFinish(realTasks), simFinish) : 0
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [dayW, setDayW] = useState(BASE_DAY)
  const [tip, setTip] = useState<{ x: number; y: number; title: string; lines: string[] } | null>(null)
  const moveTip = (e: React.MouseEvent, title: string, lines: string[]) => setTip({ x: e.clientX, y: e.clientY, title, lines: lines.filter(Boolean) })
  const hideTip = () => setTip(null)
  const P = useMemo(() => parentSet(tasks), [tasks])
  const depthOf = (t: Task): number => {
    let d = 0, cur = t.parentId
    while (cur) { d++; cur = tasks.find((x) => x.id === cur)?.parentId }
    return d
  }
  const matchesFilter = (t: Task): boolean => {
    if (P.has(t.id)) return true
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.wbs.includes(search)) return false
    switch (filter) {
      case 'overdue': return isOverdue(t, today)
      case 'at-risk': return t.status === 'risk' || t.status === 'blocked'
      case 'critical': return !!cpm[t.id]?.critical
      case 'unstarted': return t.status === 'not-started'
      default: return true
    }
  }

  const padMin = addDays(bounds.min, -2)
  const padMax = addDays(bounds.max, 3)
  const totalDays = diffDays(padMin, padMax) + 1
  const timelineW = totalDays * dayW
  const x = (d: string) => (diffDays(padMin, d)) * dayW

  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, x(today) - 260)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ordered visible rows (respect collapse)
  const rows = useMemo(() => {
    const out: Task[] = []
    for (const t of tasks) {
      if (t.parentId && collapsed.has(t.parentId)) continue
      out.push(t)
    }
    return out
  }, [tasks, collapsed])

  const rowIndex = new Map(rows.map((t, i) => [t.id, i]))
  const isParent = (t: Task) => P.has(t.id)

  const dimNonCritical = showCritical
  const collapseAll = () => setCollapsed(new Set([...P]))
  const expandAll = () => setCollapsed(new Set())

  // day columns
  const days: string[] = []
  for (let i = 0; i < totalDays; i++) days.push(addDays(padMin, i))
  // month header groups
  const months: { label: string; span: number; x: number }[] = []
  days.forEach((d, i) => {
    const label = parse(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    const last = months[months.length - 1]
    if (last && last.label === label) last.span++
    else months.push({ label, span: 1, x: i * dayW })
  })

  const weatherByDate = new Map(WEATHER.map((w) => [w.date, w]))

  // dependency arrows among visible leaves
  const barRect = (t: Task) => {
    const i = rowIndex.get(t.id)!
    const left = x(t.start)
    const w = (diffDays(t.start, t.end) + 1) * dayW
    return { x: left, w, y: i * ROW_H + ROW_H / 2, i }
  }
  const arrows = useMemo(() => {
    const segs: { d: string; crit: boolean; key: string; predName: string; taskName: string; type: string; lag: number }[] = []
    rows.forEach((t) => {
      if (isParent(t)) return
      t.deps.forEach((dep) => {
        const p = rows.find((r) => r.id === dep.pred)
        if (!p || isParent(p)) return
        const pr = barRect(p)
        const tr = barRect(t)
        const startX = dep.type === 'SS' ? pr.x : pr.x + pr.w
        const startY = pr.y
        const endX = tr.x
        const endY = tr.y
        const crit = !!(cpm[t.id]?.critical && cpm[p.id]?.critical)
        const midX = Math.max(startX + 8, endX - 10)
        const d = `M ${startX} ${startY} H ${midX - 6} ` + `Q ${midX} ${startY} ${midX} ${startY + Math.sign(endY - startY) * 6} ` + `V ${endY - Math.sign(endY - startY) * 6} ` + `Q ${midX} ${endY} ${midX + 6} ${endY} ` + `H ${endX - 4}`
        segs.push({ d, crit, key: `${p.id}-${t.id}`, predName: p.name, taskName: t.name, type: dep.type, lag: dep.lag })
      })
    })
    return segs
  }, [rows, cpm])

  const toggle = (id: string) =>
    setCollapsed((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  return (
    <div className="rounded-card border border-line bg-white shadow-card overflow-hidden">
      {/* legend */}
      <div className="flex items-center gap-4 border-b border-line px-4 py-2 text-xs text-ink-600 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-4 rounded-sm bg-brand-600" /> Actual dates</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-1.5 w-4 rounded-sm bg-ink-400/40 border border-ink-400/50" /> Planned dates</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-4 rounded-sm bg-white border-2" style={{ borderColor: '#ef4444' }} /> Critical path</span>
        <span className="flex items-center gap-1.5"><span className="text-danger font-semibold">+Nd</span> Days behind plan</span>
        <span className="flex items-center gap-1.5"><CloudLightning className="h-3.5 w-3.5 text-danger" /> Weather risk</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={expandAll} title="Expand all" className="grid h-6 w-6 place-items-center rounded-md text-ink-500 hover:bg-surface"><UnfoldVertical className="h-3.5 w-3.5" /></button>
          <button onClick={collapseAll} title="Collapse all" className="grid h-6 w-6 place-items-center rounded-md text-ink-500 hover:bg-surface"><FoldVertical className="h-3.5 w-3.5" /></button>
          <div className="mx-1 h-4 w-px bg-line" />
          <button onClick={() => setDayW((w) => Math.max(12, w - 4))} title="Zoom out" className="grid h-6 w-6 place-items-center rounded-md text-ink-500 hover:bg-surface"><ZoomOut className="h-3.5 w-3.5" /></button>
          <button onClick={() => setDayW((w) => Math.min(44, w + 4))} title="Zoom in" className="grid h-6 w-6 place-items-center rounded-md text-ink-500 hover:bg-surface"><ZoomIn className="h-3.5 w-3.5" /></button>
          <div className="mx-1 h-4 w-px bg-line" />
          <span className="flex items-center gap-1.5 text-brand-700 font-medium"><span className="inline-block h-3 w-0.5 bg-brand-600" /> Today · {fmtDate(today)}</span>
        </div>
      </div>

      {simActive && (
        <div className="flex flex-wrap items-center gap-2 border-b border-warn/30 bg-warn/[0.07] px-4 py-2">
          <Zap className="h-3.5 w-3.5 text-warn" />
          <span className="text-2xs font-semibold text-warn">What-if · +{simDelay} day{simDelay > 1 ? 's' : ''} delay</span>
          <span className="text-2xs text-ink-600">Projected finish <b className="text-ink-950">{fmtDate(simFinish)}</b> ({simDelta >= 0 ? '+' : ''}{simDelta}d vs baseline){delayRoot ? ` · delaying "${realTasks.find((t) => t.id === delayRoot)?.name}" and everything downstream` : ''}</span>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => { commit(tasks); setSimDelay(0); pushToast(`Applied +${simDelay}d delay to the schedule`, 'warn') }} className="inline-flex items-center gap-1 rounded-md bg-warn px-2.5 h-7 text-2xs font-semibold text-white"><Check className="h-3 w-3" /> Apply to schedule</button>
            <button onClick={() => setSimDelay(0)} className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 h-7 text-2xs font-medium text-ink-600"><X className="h-3 w-3" /> Clear</button>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="overflow-auto" style={{ maxHeight: 560 }}>
        <div className="relative" style={{ width: LEFT_W + timelineW }}>
          {/* ── HEADER ── */}
          <div className="sticky top-0 z-30 flex" style={{ height: HEAD_H }}>
            {/* left header */}
            <div className="sticky left-0 z-40 flex items-end bg-white border-b border-r border-line" style={{ width: LEFT_W, height: HEAD_H }}>
              <div className="grid w-full text-xs font-semibold uppercase tracking-wide text-ink-500 px-3 pb-2" style={{ gridTemplateColumns: '46px 1fr 44px 46px 52px' }}>
                <span>#</span>
                <span>Task</span>
                <span className="text-center">Owner</span>
                <span className="text-right">Days</span>
                <span className="text-right" title="Buffer — spare days before this task delays the finish">Buffer</span>
              </div>
            </div>
            {/* timeline header */}
            <div className="relative bg-white border-b border-line" style={{ width: timelineW, height: HEAD_H }}>
              {months.map((m) => (
                <div key={m.label} className="absolute top-0 flex h-6 items-center border-r border-line px-2 text-[11px] font-semibold text-ink-700" style={{ left: m.x, width: m.span * dayW }}>
                  {m.label}
                </div>
              ))}
              {days.map((d, i) => {
                const w = weatherByDate.get(d)
                const WI = w ? WEATHER_ICON[w.icon] : null
                const wkndHdr = isWeekend(d) && !includeWeekends
                return (
                  <div key={d} className={cn('absolute top-6 flex flex-col items-center justify-start text-[10px] leading-none', wkndHdr ? 'font-semibold text-ink-500' : 'text-ink-700')} style={{ left: i * dayW, width: dayW, height: HEAD_H - 24 }}>
                    <span className="mt-0.5">{parse(d).getUTCDate()}</span>
                    {wkndHdr && <span className="mt-[1px] text-[8px] font-bold uppercase tracking-tight text-ink-400">{parse(d).getUTCDay() === 6 ? 'Sa' : 'Su'}</span>}
                    {WI && !wkndHdr && (
                      <span title={`${w!.label} · ${w!.precip}% precip`} className="mt-0.5">
                        <WI className={cn('h-3 w-3', w!.precip >= 60 ? 'text-danger' : w!.precip >= 30 ? 'text-warn' : 'text-[#0ea5e9]')} />
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── BODY ── */}
          <div className="relative flex">
            {/* left column */}
            <div className="sticky left-0 z-20 bg-white border-r border-line" style={{ width: LEFT_W }}>
              {rows.map((t) => {
                const parent = isParent(t)
                const info = cpm[t.id]
                const isHi = highlight.includes(t.id)
                const health = parent ? rollupHealth(tasks, t.id, today) : taskHealth(t, today)
                const rollPct = parent ? rollupProgress(tasks, t.id) : t.progress
                const overdue = isOverdue(t, today)
                const delayed = isDelayed(t) && !parent
                const dimF = !parent && !matchesFilter(t)
                const depth = depthOf(t)
                return (
                  <div
                    key={t.id}
                    onClick={() => (parent ? setSelected(selected === t.id ? null : t.id) : openDrawer(t.id))}
                    className={cn(
                      'group grid items-center border-b border-line/70 px-3 cursor-pointer transition-colors',
                      parent ? 'bg-surface/60 font-semibold' : 'hover:bg-brand-50/40',
                      selected === t.id && 'bg-brand-50',
                      isHi && 'bg-amber-50',
                      dimF && 'opacity-35',
                    )}
                    style={{ height: ROW_H, gridTemplateColumns: '46px 1fr 44px 46px 52px' }}
                  >
                    <span className="text-[12px] tabular-nums text-ink-500">{t.wbs}</span>
                    <span className="flex items-center gap-1.5 min-w-0" style={{ paddingLeft: depth > 1 ? (depth - 1) * 12 : 0 }}>
                      {parent ? (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); toggle(t.id) }} className="text-ink-400 hover:text-ink-700">
                            {collapsed.has(t.id) ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                          <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: HEALTH_META[health]?.color ?? '#cbd5e1' }} title={`${HEALTH_META[health]?.label} · ${rollPct}% complete`} />
                        </>
                      ) : (
                        <span className="ml-1 inline-block h-2 w-2 rounded-full shrink-0" style={{ background: HEALTH_META[health]?.color ?? '#cbd5e1' }} title={HEALTH_META[health]?.label} />
                      )}
                      {!parent && t.priority && (t.priority === 'high' || t.priority === 'critical') && (
                        <Flag className="h-3 w-3 shrink-0" style={{ color: PRIORITY_META[t.priority].color }} />
                      )}
                      <span className={cn('truncate text-[14px]', parent ? 'font-semibold text-ink-950' : 'text-ink-800')}>{t.name}</span>
                      {parent && <span className="shrink-0 rounded bg-surface px-1 text-[9px] font-semibold tabular-nums text-ink-500">{rollPct}%</span>}
                      {overdue && <span className="shrink-0 rounded bg-danger/10 px-1 text-[9px] font-bold text-danger">OVERDUE</span>}
                      {!overdue && delayed && <span className="shrink-0 rounded bg-warn/10 px-1 text-[9px] font-bold text-warn">DELAYED</span>}
                      {!parent && showCritical && info?.critical && <span className="shrink-0 rounded bg-danger/10 px-1 text-[9px] font-bold text-danger">CP</span>}
                      {t.isNew && <span className="shrink-0 rounded bg-brand-600 px-1 text-[9px] font-bold text-white">NEW</span>}
                    </span>
                    <span className="flex justify-center">
                      {!parent && <AvatarStack names={assigneesOf(t)} colorFn={memberColor} max={2} />}
                    </span>
                    <span className="text-right text-[12px] tabular-nums text-ink-700">{parent ? '—' : `${Math.max(1, diffDays(t.start, t.end) + 1)}d`}</span>
                    <span className={cn('text-right text-[12px] tabular-nums', info && info.float <= 0 && !parent ? 'font-bold text-danger' : 'text-ink-500')}>
                      {parent ? '' : info ? (info.float <= 0 ? '0' : `${info.float}d`) : ''}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* timeline body */}
            <div className="relative" style={{ width: timelineW, height: rows.length * ROW_H }}>
              {/* weekend + weather column shading */}
              {days.map((d, i) => {
                const w = weatherByDate.get(d)
                const storm = w && w.precip >= 60
                const wknd = isWeekend(d) && !includeWeekends
                if (!wknd && !storm) return null
                return (
                  <div
                    key={d}
                    className={cn('absolute top-0 bottom-0 cursor-help', storm ? 'bg-danger/[0.06]' : 'bg-ink-950/[0.045]')}
                    style={{ left: i * dayW, width: dayW }}
                    onMouseMove={(e) => moveTip(e, storm ? w!.label : 'Weekend — no work', storm ? [`${w!.precip}% chance of precipitation`, 'Weather risk to outdoor work'] : [parse(d).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }), 'Non-working day (Mon–Fri work week)'])}
                    onMouseLeave={hideTip}
                  />
                )
              })}
              {/* row separators */}
              {rows.map((t, i) => (
                <div key={t.id} className={cn('absolute left-0 right-0 border-b border-line/60', isParent(t) && 'bg-surface/40')} style={{ top: i * ROW_H, height: ROW_H }} />
              ))}
              {/* today line */}
              <div className="absolute top-0 z-20" style={{ left: x(today), height: rows.length * ROW_H }}>
                <div className="absolute -left-[3px] top-0 cursor-help" style={{ width: 7, height: rows.length * ROW_H }} onMouseMove={(e) => moveTip(e, 'Today', [fmtDate(today), 'Everything left of this line should be done'])} onMouseLeave={hideTip} />
                <div className="pointer-events-none absolute left-0 top-0 w-0.5 bg-brand-600" style={{ height: rows.length * ROW_H }} />
                <span className="pointer-events-none absolute -top-[46px] -left-6 rounded bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold text-white whitespace-nowrap">TODAY</span>
              </div>

              {/* dependency arrows */}
              <svg className="absolute inset-0 z-10" style={{ pointerEvents: 'none' }} width={timelineW} height={rows.length * ROW_H}>
                <defs>
                  <marker id="ah" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" className="fill-ink-400" />
                  </marker>
                  <marker id="ahc" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
                  </marker>
                </defs>
                {arrows.map((a) => (
                  <g key={a.key}>
                    <path d={a.d} fill="none" stroke={a.crit ? '#ef4444' : '#cbd5e1'} strokeWidth={a.crit ? 1.6 : 1.2} markerEnd={a.crit ? 'url(#ahc)' : 'url(#ah)'} opacity={dimNonCritical && !a.crit ? 0.25 : 0.9} />
                    {/* invisible wide hit path for hover */}
                    <path
                      d={a.d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={9}
                      style={{ pointerEvents: 'stroke', cursor: 'help' }}
                      onMouseMove={(e) => moveTip(e, `${a.predName} → ${a.taskName}`, [DEP_LABEL[a.type], `Lag ${a.lag} working day${Math.abs(a.lag) === 1 ? '' : 's'}`, a.crit ? 'On the critical path' : 'Predecessor link'])}
                      onMouseLeave={hideTip}
                    />
                  </g>
                ))}
              </svg>

              {/* bars */}
              {rows.map((t, i) => {
                if (isParent(t)) {
                  // roll-up bracket with aggregate completion fill
                  const left = x(t.start)
                  const w = (diffDays(t.start, t.end) + 1) * dayW
                  const ph = PHASES.find((p) => p.id === t.phaseId)
                  const c = ph?.color ?? '#6e3785'
                  const pct = rollupProgress(tasks, t.id)
                  const rh = rollupHealth(tasks, t.id, today)
                  const kidCount = tasks.filter((k) => k.parentId === t.id).length
                  return (
                    <div key={t.id} className="absolute z-10 cursor-help" style={{ left, top: i * ROW_H + ROW_H / 2 - 4, width: w, height: 8 }} onMouseMove={(e) => moveTip(e, t.name, [`Roll-up of ${kidCount} tasks`, `${pct}% complete`, HEALTH_META[rh]?.label ?? '', `${fmtDate(t.start)} – ${fmtDate(t.end)}`])} onMouseLeave={hideTip}>
                      <div className="relative h-2 overflow-hidden rounded-sm" style={{ background: c + '22', border: `1px solid ${c}55` }}>
                        <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: HEALTH_META[rh]?.color ?? c }} />
                      </div>
                      <span className="pointer-events-none absolute -top-[3px] text-[9px] font-semibold tabular-nums" style={{ left: w + 5, color: c }}>{pct}%</span>
                    </div>
                  )
                }
                const info = cpm[t.id]
                const crit = info?.critical
                const emphasizeCrit = showCritical && crit
                const health = taskHealth(t, today)
                const HC: Record<string, { tint: string; color: string }> = {
                  done: { tint: '#f1f5f2', color: '#22c55e' },
                  overdue: { tint: '#fef1f2', color: '#fb3748' },
                  blocked: { tint: '#fef1f2', color: '#ef4444' },
                  'at-risk': { tint: '#fef9e7', color: '#eab308' },
                  'in-progress': { tint: '#eef4ff', color: '#3b82f6' },
                  'on-hold': { tint: '#f5f5f5', color: '#a3a3a3' },
                  'not-started': { tint: '#efe9f4', color: '#b98fce' },
                }
                const hc = HC[health] ?? HC['not-started']
                const slip = diffDays(t.baselineEnd, t.end) // >0 late
                const dim = (dimNonCritical && !crit) || !matchesFilter(t)
                const isHi = highlight.includes(t.id)

                // baseline ghost
                const blLeft = x(t.baselineStart)
                const blW = Math.max(dayW * 0.6, (diffDays(t.baselineStart, t.baselineEnd) + 1) * dayW)

                const left = x(t.start)
                const w = Math.max(dayW * 0.5, (diffDays(t.start, t.end) + 1) * dayW)
                return (
                  <div key={t.id} className="absolute z-10 cursor-pointer" style={{ top: i * ROW_H, height: ROW_H, left: 0, right: 0 }} onClick={() => openDrawer(t.id)}>
                    {/* baseline ghost */}
                    {Math.abs(diffDays(t.baselineStart, t.start)) + Math.abs(slip) > 0 && (
                      <div className="absolute rounded-sm border border-ink-400/40 bg-ink-400/15" style={{ left: blLeft, width: blW, top: ROW_H / 2 + 6, height: 4 }} title={`Baseline: ${fmtDate(t.baselineStart)} – ${fmtDate(t.baselineEnd)}`} />
                    )}
                    {/* actual bar */}
                    <div
                      className={cn('group absolute flex cursor-help items-center rounded-md shadow-sm transition-all', isHi && 'ring-2 ring-amber-400')}
                      style={{
                        left,
                        width: w,
                        top: ROW_H / 2 - 9,
                        height: 16,
                        opacity: dim ? 0.3 : 1,
                        background: emphasizeCrit ? '#fee2e2' : hc.tint,
                        border: `1.5px solid ${emphasizeCrit ? '#ef4444' : hc.color}`,
                      }}
                      onMouseMove={(e) =>
                        moveTip(e, t.name, [
                          `${HEALTH_META[health]?.label} · ${t.progress}% complete`,
                          `${fmtDate(t.start)} – ${fmtDate(t.end)} (${Math.max(1, diffDays(t.start, t.end) + 1)}d)`,
                          `Baseline ${fmtDate(t.baselineStart)} – ${fmtDate(t.baselineEnd)}`,
                          slip > 0 ? `Slipped +${slip}d vs baseline` : slip < 0 ? `${slip}d vs baseline` : 'On baseline',
                          t.assignee ? `Owner: ${t.assignee}` : '',
                          t.priority ? `Priority: ${t.priority}` : '',
                          crit ? 'On critical path · 0 float' : info ? `${info.float}d float` : '',
                          t.weatherSensitive ? 'Weather-sensitive' : '',
                        ])
                      }
                      onMouseLeave={hideTip}
                    >
                      {/* progress fill */}
                      <div className="absolute left-0 top-0 h-full rounded-l-md" style={{ width: `${t.progress}%`, background: (emphasizeCrit ? '#ef4444' : hc.color) + '55' }} />
                      {t.weatherSensitive && <CloudLightning className="relative z-10 ml-1 h-3 w-3 text-danger shrink-0" />}
                    </div>
                    {/* slip callout */}
                    {slip !== 0 && (
                      <span className={cn('absolute rounded px-1 text-[9px] font-bold', slip > 0 ? 'bg-danger/10 text-danger' : 'bg-ok/10 text-[#14804a]')} style={{ left: left + w + 4, top: ROW_H / 2 - 8 }}>
                        {slip > 0 ? `+${slip}d` : `${slip}d`}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {tip && (
        <div className="pointer-events-none fixed z-[100]" style={{ left: Math.min(tip.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 1400) - 250), top: tip.y + 16 }}>
          <div className="max-w-[236px] rounded-lg bg-ink-950 px-2.5 py-2 text-white shadow-pop">
            <div className="text-[11px] font-semibold leading-tight">{tip.title}</div>
            {tip.lines.map((l, i) => (
              <div key={i} className="mt-0.5 text-[10px] leading-snug text-white/80">{l}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
