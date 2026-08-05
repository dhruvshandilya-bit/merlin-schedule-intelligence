import type { Task } from './types'

// ── Date helpers (UTC to avoid tz drift) ────────────────────
export function parse(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
export function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}
export function addDays(isoStr: string, n: number): string {
  const d = parse(isoStr)
  d.setUTCDate(d.getUTCDate() + n)
  return iso(d)
}
export function diffDays(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000)
}
export function isWeekend(isoStr: string): boolean {
  const day = parse(isoStr).getUTCDay()
  return day === 0 || day === 6
}
export function addWorkingDays(isoStr: string, n: number): string {
  let cur = isoStr
  let step = n >= 0 ? 1 : -1
  let remaining = Math.abs(n)
  while (remaining > 0) {
    cur = addDays(cur, step)
    if (!isWeekend(cur)) remaining--
  }
  return cur
}
// inclusive working-day count of a task span
export function workingDaysInclusive(start: string, end: string): number {
  if (diffDays(start, end) < 0) return 0
  let cur = start
  let count = 0
  while (diffDays(cur, end) >= 0) {
    if (!isWeekend(cur)) count++
    cur = addDays(cur, 1)
  }
  return count
}
// working days from a->b (a=0)
export function workingDaysBetween(a: string, b: string): number {
  const sign = diffDays(a, b) >= 0 ? 1 : -1
  const [lo, hi] = sign > 0 ? [a, b] : [b, a]
  let cur = lo
  let count = 0
  while (diffDays(cur, hi) > 0) {
    if (!isWeekend(cur)) count++
    cur = addDays(cur, 1)
  }
  return count * sign
}
export function fmtDate(isoStr: string): string {
  return parse(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}
export function fmtDateFull(isoStr: string): string {
  return parse(isoStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

// ── Critical Path Method ────────────────────────────────────
export interface CpmInfo {
  es: number
  ef: number
  ls: number
  lf: number
  float: number
  critical: boolean
  dur: number
}

export const parentSet = (tasks: Task[]) => new Set(tasks.filter((t) => t.parentId).map((t) => t.parentId as string))
const isParentIn = (t: Task, P: Set<string>) => P.has(t.id)

export function computeCpm(tasks: Task[]): Record<string, CpmInfo> {
  const P = parentSet(tasks)
  const leaves = tasks.filter((t) => !isParentIn(t, P))
  const anchor = leaves.reduce((m, t) => (diffDays(t.start, m) > 0 ? t.start : m), leaves[0].start)
  const byId = new Map(leaves.map((t) => [t.id, t]))
  const wIndex = (d: string) => workingDaysBetween(anchor, d)
  const dur = (t: Task) => (t.milestone ? 0 : Math.max(1, workingDaysInclusive(t.start, t.end)))

  const info: Record<string, CpmInfo> = {}
  leaves.forEach((t) => {
    info[t.id] = { es: 0, ef: 0, ls: 0, lf: 0, float: 0, critical: false, dur: dur(t) }
  })

  // forward pass (iterate to stabilize)
  for (let pass = 0; pass < leaves.length + 2; pass++) {
    leaves.forEach((t) => {
      const deps = t.deps.filter((d) => byId.has(d.pred))
      let es = deps.length === 0 ? wIndex(t.start) : 0
      deps.forEach((d) => {
        const p = info[d.pred]
        if (!p) return
        let cand = 0
        if (d.type === 'SS') cand = p.es + d.lag
        else if (d.type === 'FF') cand = p.ef + d.lag - info[t.id].dur
        else cand = p.ef + d.lag // FS / SF
        es = Math.max(es, cand)
      })
      info[t.id].es = es
      info[t.id].ef = es + info[t.id].dur
    })
  }

  const maxEf = leaves.reduce((m, t) => Math.max(m, info[t.id].ef), 0)
  leaves.forEach((t) => (info[t.id].lf = maxEf))

  // successors map
  const succ = new Map<string, { id: string; type: string; lag: number }[]>()
  leaves.forEach((t) =>
    t.deps.forEach((d) => {
      if (!byId.has(d.pred)) return
      const arr = succ.get(d.pred) ?? []
      arr.push({ id: t.id, type: d.type, lag: d.lag })
      succ.set(d.pred, arr)
    }),
  )

  // backward pass
  for (let pass = 0; pass < leaves.length + 2; pass++) {
    ;[...leaves].reverse().forEach((t) => {
      const outs = succ.get(t.id) ?? []
      let lf = outs.length === 0 ? maxEf : Infinity
      outs.forEach((s) => {
        const sInfo = info[s.id]
        let cand = maxEf
        if (s.type === 'SS') cand = sInfo.ls - s.lag + info[t.id].dur
        else if (s.type === 'FF') cand = sInfo.lf - s.lag
        else cand = sInfo.ls - s.lag // FS
        lf = Math.min(lf, cand)
      })
      info[t.id].lf = lf === Infinity ? maxEf : lf
      info[t.id].ls = info[t.id].lf - info[t.id].dur
      info[t.id].float = info[t.id].ls - info[t.id].es
      info[t.id].critical = info[t.id].float <= 0
    })
  }
  return info
}

// ── Project roll-ups ────────────────────────────────────────
export function projectBounds(tasks: Task[]) {
  const P = parentSet(tasks)
  const leaves = tasks.filter((t) => !isParentIn(t, P))
  const starts = leaves.flatMap((t) => [t.start, t.baselineStart])
  const ends = leaves.flatMap((t) => [t.end, t.baselineEnd])
  const min = starts.reduce((m, s) => (diffDays(s, m) > 0 ? s : m), starts[0]) // earliest
  const max = ends.reduce((m, s) => (diffDays(m, s) > 0 ? s : m), ends[0]) // latest
  return { min, max }
}
export function finishDate(tasks: Task[]): string {
  const P = parentSet(tasks)
  const leaves = tasks.filter((t) => !isParentIn(t, P))
  return leaves.reduce((m, t) => (diffDays(m, t.end) > 0 ? t.end : m), leaves[0].end)
}
export function baselineFinish(tasks: Task[]): string {
  const P = parentSet(tasks)
  const leaves = tasks.filter((t) => !isParentIn(t, P))
  return leaves.reduce((m, t) => (diffDays(m, t.baselineEnd) > 0 ? t.baselineEnd : m), leaves[0].baselineEnd)
}

// ── Schedule-only status derivation & metrics ───────────────
const leafOnly = (tasks: Task[]) => {
  const P = parentSet(tasks)
  return tasks.filter((t) => !P.has(t.id))
}

export function isOverdue(t: Task, today: string): boolean {
  return t.status !== 'done' && t.status !== 'cancelled' && t.progress < 100 && diffDays(t.end, today) > 0
}
export function isDelayed(t: Task): boolean {
  return t.status !== 'cancelled' && diffDays(t.baselineEnd, t.end) > 0
}
export type Health = 'done' | 'overdue' | 'blocked' | 'on-hold' | 'at-risk' | 'in-progress' | 'not-started' | 'cancelled'
export function taskHealth(t: Task, today: string): Health {
  if (t.status === 'cancelled') return 'cancelled'
  if (t.status === 'done' || t.progress >= 100) return 'done'
  if (t.status === 'blocked') return 'blocked'
  if (t.status === 'on-hold') return 'on-hold'
  if (isOverdue(t, today)) return 'overdue'
  if (t.status === 'risk') return 'at-risk'
  if (t.status === 'in-progress' || t.status === 'track' || t.progress > 0 || diffDays(t.start, today) >= 0) return 'in-progress'
  return 'not-started'
}

// weighted % complete of a subtree (by duration), recursing through nested summaries
export function rollupProgress(tasks: Task[], parentId: string): number {
  const kids = tasks.filter((t) => t.parentId === parentId)
  if (!kids.length) return 0
  let w = 0,
    p = 0
  kids.forEach((k) => {
    const hasKids = tasks.some((x) => x.parentId === k.id)
    const kp = hasKids ? rollupProgress(tasks, k.id) : k.progress
    const d = Math.max(1, k.milestone ? 1 : workingDaysInclusive(k.start, k.end))
    w += d
    p += d * (kp / 100)
  })
  return w ? Math.round((p / w) * 100) : 0
}

// aggregate health of a summary from its leaf descendants
export function rollupHealth(tasks: Task[], parentId: string, today: string): Health {
  const leaves: Task[] = []
  const collect = (id: string) => {
    const kids = tasks.filter((t) => t.parentId === id)
    if (!kids.length) { const t = tasks.find((x) => x.id === id); if (t) leaves.push(t); return }
    kids.forEach((k) => collect(k.id))
  }
  collect(parentId)
  if (leaves.some((t) => isOverdue(t, today))) return 'overdue'
  if (leaves.some((t) => t.status === 'blocked')) return 'blocked'
  if (leaves.length && leaves.every((t) => t.status === 'done')) return 'done'
  if (leaves.some((t) => t.status === 'risk')) return 'at-risk'
  if (leaves.some((t) => t.progress > 0 || t.status === 'in-progress' || t.status === 'done')) return 'in-progress'
  return 'not-started'
}

export interface ScheduleMetrics {
  pctComplete: number
  onTimePct: number
  overdue: number
  atRisk: number
  blocked: number
  criticalCount: number
  floatDays: number // min positive float across near-critical chain
  nextMilestone?: Task
  deltaFinish: number
  doneCount: number
  totalCount: number
}
export function scheduleMetrics(tasks: Task[], cpm: Record<string, CpmInfo>, today: string): ScheduleMetrics {
  const leaves = leafOnly(tasks)
  let w = 0,
    p = 0
  leaves.forEach((t) => {
    const d = Math.max(1, t.milestone ? 1 : workingDaysInclusive(t.start, t.end))
    w += d
    p += d * (t.progress / 100)
  })
  const dueByNow = leaves.filter((t) => diffDays(t.baselineEnd, today) >= 0)
  const onTime = dueByNow.filter((t) => t.status === 'done' || diffDays(t.baselineEnd, t.end) <= 0)
  const overdue = leaves.filter((t) => isOverdue(t, today)).length
  const atRisk = leaves.filter((t) => t.status === 'risk').length
  const blocked = leaves.filter((t) => t.status === 'blocked').length
  const criticalCount = leaves.filter((t) => cpm[t.id]?.critical).length
  const floats = leaves.filter((t) => cpm[t.id] && cpm[t.id].float > 0).map((t) => cpm[t.id].float)
  const floatDays = floats.length ? Math.min(...floats) : 0
  const upcoming = leaves
    .filter((t) => t.milestone && t.status !== 'done' && diffDays(today, t.end) >= 0)
    .sort((a, b) => diffDays(a.end, b.end))
  const fin = finishDate(tasks)
  const bfin = baselineFinish(tasks)
  return {
    pctComplete: w ? Math.round((p / w) * 100) : 0,
    onTimePct: dueByNow.length ? Math.round((onTime.length / dueByNow.length) * 100) : 100,
    overdue,
    atRisk,
    blocked,
    criticalCount,
    floatDays,
    nextMilestone: upcoming[0],
    deltaFinish: workingDaysBetween(bfin, fin),
    doneCount: leaves.filter((t) => t.status === 'done').length,
    totalCount: leaves.length,
  }
}

// per-assignee / crew workload
export interface WorkloadRow {
  key: string
  name: string
  total: number
  done: number
  overdue: number
  atRisk: number
  onTimePct: number
  nextDue?: string
  activeDays: number
}
export function workloadByAssignee(tasks: Task[], today: string): WorkloadRow[] {
  const leaves = leafOnly(tasks)
  const map = new Map<string, Task[]>()
  leaves.forEach((t) => {
    const names = t.assignees && t.assignees.length ? t.assignees : t.assignee ? [t.assignee] : []
    names.forEach((k) => map.set(k, [...(map.get(k) ?? []), t]))
  })
  const rows: WorkloadRow[] = []
  map.forEach((ts, name) => {
    const done = ts.filter((t) => t.status === 'done').length
    const overdue = ts.filter((t) => isOverdue(t, today)).length
    const atRisk = ts.filter((t) => t.status === 'risk').length
    const dueByNow = ts.filter((t) => diffDays(t.baselineEnd, today) >= 0)
    const onTime = dueByNow.filter((t) => t.status === 'done' || diffDays(t.baselineEnd, t.end) <= 0)
    const upcoming = ts.filter((t) => t.status !== 'done' && diffDays(today, t.end) >= 0).sort((a, b) => diffDays(a.end, b.end))
    const activeDays = ts.filter((t) => t.status !== 'done').reduce((s, t) => s + (t.milestone ? 0 : workingDaysInclusive(t.start, t.end)), 0)
    rows.push({
      key: name,
      name,
      total: ts.length,
      done,
      overdue,
      atRisk,
      onTimePct: dueByNow.length ? Math.round((onTime.length / dueByNow.length) * 100) : 100,
      nextDue: upcoming[0]?.end,
      activeDays,
    })
  })
  return rows.sort((a, b) => b.overdue - a.overdue || b.total - a.total)
}

// ── Earned Value (retained for reference, not shown) ─────────
export interface Ev {
  bac: number
  ev: number
  pv: number
  ac: number
  spi: number
  cpi: number
  pctSchedule: number // cost-weighted % complete
  pctCost: number
}
function plannedPct(t: Task, today: string): number {
  if (diffDays(t.baselineEnd, today) >= 0) return 1
  if (diffDays(today, t.baselineStart) >= 0) return 0
  const total = Math.max(1, workingDaysInclusive(t.baselineStart, t.baselineEnd))
  const done = workingDaysInclusive(t.baselineStart, today)
  return Math.min(1, done / total)
}
export function computeEv(tasks: Task[], today: string): Ev {
  const P = parentSet(tasks)
  const leaves = tasks.filter((t) => !P.has(t.id))
  let bac = 0,
    ev = 0,
    pv = 0,
    ac = 0
  leaves.forEach((t) => {
    bac += t.budget
    ev += t.budget * (t.progress / 100)
    pv += t.budget * plannedPct(t, today)
    ac += t.actualCost
  })
  const spi = pv > 0 ? ev / pv : 1
  const cpi = ac > 0 ? ev / ac : 1
  return { bac, ev, pv, ac, spi, cpi, pctSchedule: bac ? ev / bac : 0, pctCost: bac ? ac / bac : 0 }
}

// ── Ripple shift (Recovery / What-if agent) ─────────────────
// Move a task + all transitive FS/SS successors by n working days.
export function shiftWithRipple(tasks: Task[], rootId: string, workDays: number): { tasks: Task[]; affected: string[] } {
  const P = parentSet(tasks)
  const leaves = tasks.filter((t) => !P.has(t.id))
  const succ = new Map<string, string[]>()
  leaves.forEach((t) => t.deps.forEach((d) => {
    const arr = succ.get(d.pred) ?? []
    arr.push(t.id)
    succ.set(d.pred, arr)
  }))
  const affected = new Set<string>()
  const stack = [rootId]
  while (stack.length) {
    const id = stack.pop()!
    if (affected.has(id)) continue
    affected.add(id)
    ;(succ.get(id) ?? []).forEach((s) => stack.push(s))
  }
  const next = tasks.map((t) => {
    if (!affected.has(t.id)) return t
    return {
      ...t,
      start: addWorkingDays(t.start, workDays),
      end: addWorkingDays(t.end, workDays),
    }
  })
  return { tasks: next, affected: [...affected] }
}

// domino chain: ordered path of critical successors from a task to the finish
export function dominoChain(tasks: Task[], rootId: string): string[] {
  const P = parentSet(tasks)
  const leaves = tasks.filter((t) => !P.has(t.id))
  const byId = new Map(leaves.map((t) => [t.id, t]))
  const succ = new Map<string, string[]>()
  leaves.forEach((t) => t.deps.forEach((d) => {
    const arr = succ.get(d.pred) ?? []
    arr.push(t.id)
    succ.set(d.pred, arr)
  }))
  const chain: string[] = [rootId]
  let cur = rootId
  const guard = new Set<string>()
  while (succ.get(cur) && succ.get(cur)!.length && !guard.has(cur)) {
    guard.add(cur)
    // pick the successor that finishes latest (drives the finish date)
    const outs = succ.get(cur)!
    const nextId = outs.reduce((late, id) => (diffDays(byId.get(late)!.end, byId.get(id)!.end) > 0 ? id : late), outs[0])
    chain.push(nextId)
    cur = nextId
  }
  return chain
}
