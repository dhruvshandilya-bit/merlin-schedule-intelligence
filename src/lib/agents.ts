import type { Task } from './types'

export type Confidence = 'High' | 'Moderate' | 'Low'
export type Severity = 'high' | 'medium' | 'low'

export interface Insight {
  id: string
  skill: string // capability of the single Merlin Project Agent (e.g. "Delay radar")
  severity: Severity
  title: string
  why: string[]
  confidence: Confidence
  actionLabel: string
  preview?: string
  destructive?: boolean
  run: () => string // performs the action and RETURNS a result message
  chain?: string[]
  checks?: string[] // the supporting signals this skill monitors in Merlin
}

// ── Schedule Builder: a lean-to add-on scope, chained into the build ──
export function generateAddonTasks(): Task[] {
  const mk = (over: Partial<Task> & Pick<Task, 'id' | 'wbs' | 'name' | 'start' | 'end' | 'deps'>): Task => ({
    phaseId: 'const',
    parentId: 'c0',
    baselineStart: over.start,
    baselineEnd: over.end,
    progress: 0,
    status: 'not-started',
    budget: 0,
    actualCost: 0,
    isNew: true,
    ...over,
  })
  return [
    mk({ id: 'L1', wbs: '3.16', name: 'Lean-to · Footings', start: '2026-08-13', end: '2026-08-14', crewId: 'concrete', assignee: 'Concrete Crew', deps: [{ pred: 'c4', type: 'FS', lag: 0 }], budget: 1600 }),
    mk({ id: 'L2', wbs: '3.17', name: 'Lean-to · Framing', start: '2026-08-19', end: '2026-08-22', crewId: 'framing', assignee: 'Framing Crew', deps: [{ pred: 'L1', type: 'FS', lag: 0 }], budget: 2400 }),
    mk({ id: 'L3', wbs: '3.18', name: 'Lean-to · Roofing & Trim', start: '2026-08-25', end: '2026-08-28', crewId: 'roofing', assignee: 'Roofing Crew', deps: [{ pred: 'L2', type: 'FS', lag: 0 }], budget: 2100 }),
  ]
}

// New-project WBS preview (shown in chat when asked to build from scratch)
export const NEW_GARAGE_WBS: { wbs: string; name: string; dur: string }[] = [
  { wbs: '1.0', name: 'Design (survey, topo, permit drawings)', dur: '14d' },
  { wbs: '2.0', name: 'Preconstruction (permit, engineering, site prep)', dur: '18d' },
  { wbs: '3.01', name: 'Foundation forms & rebar', dur: '6d' },
  { wbs: '3.02', name: 'Slab pour + cure', dur: '4d' },
  { wbs: '3.04', name: 'Framing — walls & roof trusses', dur: '9d' },
  { wbs: '3.08', name: 'Roofing / siding / MEP rough-in', dur: '7d' },
  { wbs: '3.11', name: 'Insulation, drywall, trim & paint', dur: '8d' },
  { wbs: '3.14', name: 'Final inspection & customer delivery', dur: '3d' },
]

export type Intent =
  | 'build' | 'addon' | 'atrisk' | 'recovery' | 'critical' | 'weather' | 'summary'
  | 'level' | 'overdue' | 'whatchanged' | 'customerupdate' | 'priority' | 'reassign'
  | 'simulate' | 'lookahead' | 'unknown'

export function classify(prompt: string): Intent {
  const p = prompt.toLowerCase()
  if (/(simulate|what.?if|what happens if).*(day|delay|slip)|simulate .* delay/.test(p)) return 'simulate'
  if (/(next week|look-?ahead|outlook|coming (up|week)|predict.*week)/.test(p)) return 'lookahead'
  if (/(will slip|what will slip|going to slip|show me what)/.test(p)) return 'atrisk'
  if (/(lean-?to|add-?on|add a|extension|append)/.test(p)) return 'addon'
  if (/(build|generate|create).*(schedule|garage|project)|new (garage|project|build)/.test(p)) return 'build'
  if (/(customer update|update the customer|draft.*(update|email|message|note)|status update|tell the (owner|customer))/.test(p)) return 'customerupdate'
  if (/(what changed|since yesterday|what.?s new|whats new|recap)/.test(p)) return 'whatchanged'
  if (/(recover|claw|catch up|get back|make up|fast-?track|crash|hit the date)/.test(p)) return 'recovery'
  if (/(overdue|past due|who.?s late|whats late|behind on)/.test(p)) return 'overdue'
  if (/(priorit|most important|top task|focus on|what should i)/.test(p)) return 'priority'
  if (/(reassign|hand off|who can take|move .* to )/.test(p)) return 'reassign'
  if (/(critical path|what.?s driving|float|slack)/.test(p)) return 'critical'
  if (/(weather|rain|pour|storm)/.test(p)) return 'weather'
  if (/(level|double-?book|overloaded|workload|crew|resource|who has)/.test(p)) return 'level'
  if (/(at risk|risk|slip|delay|problem)/.test(p)) return 'atrisk'
  if (/(summar|overview|status|health|how.?s)/.test(p)) return 'summary'
  return 'unknown'
}
