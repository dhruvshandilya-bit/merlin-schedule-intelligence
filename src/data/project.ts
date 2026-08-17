import type { Task, Phase, Crew, Constraint, ProjectMeta, WeatherDay, TeamMember, Priority, Comment } from '../lib/types'
import { WORK_ORDER_LINKS } from './operations'

export const TEAM: TeamMember[] = [
  { id: 'reyes', name: 'M. Reyes', role: 'Project Manager', color: '#6e3785' },
  { id: 'kim', name: 'A. Kim', role: 'Project Coordinator', color: '#3b82f6' },
  { id: 'pratt', name: 'D. Pratt', role: 'Surveyor', color: '#0ea5e9' },
  { id: 'alvarez', name: 'R. Alvarez', role: 'Concrete Lead', color: '#f59e0b' },
  { id: 'okafor', name: 'S. Okafor', role: 'Framing Lead', color: '#8a4fa8' },
  { id: 'moreno', name: 'L. Moreno', role: 'Roofing Lead', color: '#ef4444' },
  { id: 'doyle', name: 'N. Doyle', role: 'MEP Sub', color: '#14b8a6' },
  { id: 'fischer', name: 'G. Fischer', role: 'Finish Lead', color: '#10b981' },
  { id: 'delgado', name: 'D. Delgado', role: 'Delivery & Set', color: '#a855f7' },
  { id: 'city', name: 'City of BG', role: 'Inspector', color: '#64748b' },
  { id: 'struct', name: 'BG Structural', role: 'Engineer', color: '#334155' },
]
export const memberColor = (name?: string) => TEAM.find((m) => m.name === name)?.color ?? '#8a4fa8'
export const assigneesOf = (t: { assignees?: string[]; assignee?: string }): string[] =>
  t.assignees && t.assignees.length ? t.assignees : t.assignee ? [t.assignee] : []

// Fixed "today" for the demo — aligns with the live app date.
export const TODAY = '2026-07-23'

export const PROJECT: ProjectMeta = {
  id: 'CB-PRJ-00441',
  code: 'CB-PRJ-00441',
  name: 'Coley — 24×40 Detached Garage',
  customer: 'Coley, Corey & Jamie',
  contractValue: 48600,
  phaseName: 'Construction',
  address: '1418 Ridgeline Rd, Bowling Green, KY',
}

export const PHASES: Phase[] = [
  { id: 'design', name: 'Design', color: '#3b82f6' },
  { id: 'precon', name: 'Preconstruction', color: '#8a4fa8' },
  { id: 'const', name: 'Construction', color: '#6e3785' },
]

export const CREWS: Crew[] = [
  { id: 'survey', name: 'Survey Crew', color: '#0ea5e9', trade: 'Survey' },
  { id: 'office', name: 'Office / PM', color: '#64748b', trade: 'Office' },
  { id: 'concrete', name: 'Concrete Crew', color: '#f59e0b', trade: 'Concrete' },
  { id: 'framing', name: 'Framing Crew', color: '#6e3785', trade: 'Framing' },
  { id: 'roofing', name: 'Roofing Crew', color: '#ef4444', trade: 'Roofing' },
  { id: 'mep', name: 'MEP Sub', color: '#14b8a6', trade: 'Mechanical/Elec' },
  { id: 'finish', name: 'Finish Crew', color: '#10b981', trade: 'Finish' },
  { id: 'delivery', name: 'Delivery & Set', color: '#a855f7', trade: 'Logistics' },
]

// Helper to cut down repetition
function t(x: Partial<Task> & Pick<Task, 'id' | 'wbs' | 'name' | 'phaseId' | 'start' | 'end'>): Task {
  return {
    baselineStart: x.start,
    baselineEnd: x.end,
    progress: 0,
    status: 'not-started',
    deps: [],
    budget: 0,
    actualCost: 0,
    ...x,
  } as Task
}

const SEED_TASKS: Task[] = [
  // ── DESIGN ─────────────────────────────────────────────
  t({ id: 'd0', wbs: '1.0', name: 'Design', phaseId: 'design', start: '2026-06-01', end: '2026-06-19', status: 'done', progress: 100 }),
  t({ id: 'd1', wbs: '1.01', name: '911 Address Assigned', phaseId: 'design', parentId: 'd0', start: '2026-06-01', end: '2026-06-02', status: 'done', progress: 100, crewId: 'office', assignee: 'M. Reyes', budget: 300, actualCost: 300 }),
  t({ id: 'd2', wbs: '1.02', name: 'Lot Survey', phaseId: 'design', parentId: 'd0', start: '2026-06-03', end: '2026-06-05', status: 'done', progress: 100, crewId: 'survey', assignee: 'D. Pratt', deps: [{ pred: 'd1', type: 'FS', lag: 0 }], budget: 900, actualCost: 850 }),
  t({ id: 'd3', wbs: '1.03', name: 'Topographical Survey', phaseId: 'design', parentId: 'd0', start: '2026-06-08', end: '2026-06-10', status: 'done', progress: 100, crewId: 'survey', assignee: 'D. Pratt', deps: [{ pred: 'd2', type: 'FS', lag: 0 }], budget: 750, actualCost: 750 }),
  t({ id: 'd4', wbs: '1.04', name: 'Tree Survey', phaseId: 'design', parentId: 'd0', start: '2026-06-08', end: '2026-06-09', status: 'done', progress: 100, crewId: 'survey', assignee: 'D. Pratt', deps: [{ pred: 'd2', type: 'FS', lag: 0 }], budget: 400, actualCost: 400 }),
  t({ id: 'd5', wbs: '1.05', name: 'Site Plan & Permit Drawings', phaseId: 'design', parentId: 'd0', start: '2026-06-11', end: '2026-06-18', status: 'done', progress: 100, crewId: 'office', assignee: 'A. Kim', deps: [{ pred: 'd3', type: 'FS', lag: 0 }], budget: 1800, actualCost: 1950 }),
  t({ id: 'dm', wbs: '1.06', name: 'Design Approved', phaseId: 'design', parentId: 'd0', start: '2026-06-19', end: '2026-06-19', status: 'done', progress: 100, milestone: true, deps: [{ pred: 'd5', type: 'FS', lag: 0 }] }),

  // ── PRECONSTRUCTION ────────────────────────────────────
  t({ id: 'p0', wbs: '2.0', name: 'Preconstruction', phaseId: 'precon', start: '2026-06-22', end: '2026-07-21', status: 'done', progress: 100 }),
  t({ id: 'p1', wbs: '2.01', name: 'Permit Submitted', phaseId: 'precon', parentId: 'p0', start: '2026-06-22', end: '2026-06-23', status: 'done', progress: 100, crewId: 'office', assignee: 'A. Kim', deps: [{ pred: 'dm', type: 'FS', lag: 0 }], budget: 350, actualCost: 350 }),
  // Permit review ran LONG — origin of the schedule slip (baseline ended Jul 8, actually Jul 15)
  t({ id: 'p2', wbs: '2.02', name: 'City Permit Review', phaseId: 'precon', parentId: 'p0', start: '2026-06-24', end: '2026-07-15', baselineStart: '2026-06-24', baselineEnd: '2026-07-09', status: 'done', progress: 100, crewId: 'office', assignee: 'City of BG', deps: [{ pred: 'p1', type: 'FS', lag: 0 }], budget: 0, actualCost: 0, note: 'Approved 4 working days late — cascaded to all downstream work.' }),
  t({ id: 'p3', wbs: '2.03', name: 'Engineering / Truss Package', phaseId: 'precon', parentId: 'p0', start: '2026-06-24', end: '2026-07-02', status: 'done', progress: 100, crewId: 'office', assignee: 'BG Structural', deps: [{ pred: 'p1', type: 'FS', lag: 0 }], budget: 2200, actualCost: 2200 }),
  t({ id: 'pm', wbs: '2.04', name: 'Permit Approved', phaseId: 'precon', parentId: 'p0', start: '2026-07-15', end: '2026-07-15', baselineStart: '2026-07-09', baselineEnd: '2026-07-09', status: 'done', progress: 100, milestone: true, deps: [{ pred: 'p2', type: 'FS', lag: 0 }] }),
  t({ id: 'p4', wbs: '2.05', name: 'Site Prep & Grading', phaseId: 'precon', parentId: 'p0', start: '2026-07-16', end: '2026-07-21', baselineStart: '2026-07-10', baselineEnd: '2026-07-15', status: 'done', progress: 100, crewId: 'concrete', assignee: 'Concrete Crew', deps: [{ pred: 'pm', type: 'FS', lag: 0 }], budget: 3400, actualCost: 3600 }),
  // Overdue: past its finish date, still incomplete
  t({ id: 'p6', wbs: '2.06', name: 'Temp Power & 811 Utility Locate', phaseId: 'precon', parentId: 'p0', start: '2026-07-16', end: '2026-07-21', baselineStart: '2026-07-10', baselineEnd: '2026-07-15', status: 'in-progress', progress: 60, crewId: 'office', assignee: 'A. Kim', deps: [{ pred: 'pm', type: 'FS', lag: 0 }], budget: 900, actualCost: 500, note: 'Overdue — utility locate ticket still open with the city.' }),

  // ── CONSTRUCTION ───────────────────────────────────────
  t({ id: 'c0', wbs: '3.0', name: 'Construction', phaseId: 'const', start: '2026-07-22', end: '2026-09-09', status: 'track', progress: 12 }),
  t({ id: 'c1', wbs: '3.01', name: 'Foundation Forms & Rebar', phaseId: 'const', parentId: 'c0', start: '2026-07-22', end: '2026-07-29', baselineStart: '2026-07-17', baselineEnd: '2026-07-24', status: 'track', progress: 45, crewId: 'concrete', assignee: 'Concrete Crew', deps: [{ pred: 'p4', type: 'FS', lag: 0 }], budget: 5200, actualCost: 2300 }),
  t({ id: 'c2', wbs: '3.02', name: 'Slab Pour', phaseId: 'const', parentId: 'c0', start: '2026-07-30', end: '2026-07-30', baselineStart: '2026-07-27', baselineEnd: '2026-07-27', status: 'risk', progress: 0, crewId: 'concrete', assignee: 'Concrete Crew', deps: [{ pred: 'c1', type: 'FS', lag: 0 }], weatherSensitive: true, budget: 6100, actualCost: 0, note: 'Weather-sensitive: rain 80% forecast Thu Jul 30.' }),
  t({ id: 'cm1', wbs: '3.03', name: 'Slab Poured', phaseId: 'const', parentId: 'c0', start: '2026-07-30', end: '2026-07-30', baselineStart: '2026-07-27', baselineEnd: '2026-07-27', status: 'not-started', progress: 0, milestone: true, deps: [{ pred: 'c2', type: 'FS', lag: 0 }] }),
  t({ id: 'c3', wbs: '3.04', name: 'Slab Cure', phaseId: 'const', parentId: 'c0', start: '2026-07-31', end: '2026-08-04', baselineStart: '2026-07-28', baselineEnd: '2026-07-30', status: 'not-started', progress: 0, crewId: 'concrete', deps: [{ pred: 'c2', type: 'FS', lag: 0 }], budget: 0, actualCost: 0 }),
  t({ id: 'c4', wbs: '3.05', name: 'Framing — Walls', phaseId: 'const', parentId: 'c0', start: '2026-08-05', end: '2026-08-12', baselineStart: '2026-07-31', baselineEnd: '2026-08-06', status: 'not-started', progress: 0, crewId: 'framing', assignee: 'Framing Crew', deps: [{ pred: 'c3', type: 'FS', lag: 0 }], budget: 7800, actualCost: 0 }),
  t({ id: 'c5', wbs: '3.06', name: 'Framing — Roof Trusses', phaseId: 'const', parentId: 'c0', start: '2026-08-13', end: '2026-08-18', baselineStart: '2026-08-07', baselineEnd: '2026-08-12', status: 'not-started', progress: 0, crewId: 'framing', assignee: 'Framing Crew', deps: [{ pred: 'c4', type: 'FS', lag: 0 }], budget: 6400, actualCost: 0, note: 'Needs truss delivery on site by Aug 13.' }),
  t({ id: 'cm2', wbs: '3.07', name: 'Dry-in / Framing Complete', phaseId: 'const', parentId: 'c0', start: '2026-08-18', end: '2026-08-18', baselineStart: '2026-08-12', baselineEnd: '2026-08-12', status: 'not-started', progress: 0, milestone: true, deps: [{ pred: 'c5', type: 'FS', lag: 0 }] }),
  t({ id: 'c6', wbs: '3.08', name: 'Roofing', phaseId: 'const', parentId: 'c0', start: '2026-08-19', end: '2026-08-24', baselineStart: '2026-08-13', baselineEnd: '2026-08-18', status: 'not-started', progress: 0, crewId: 'roofing', assignee: 'Roofing Crew', deps: [{ pred: 'c5', type: 'FS', lag: 0 }], weatherSensitive: true, budget: 5200, actualCost: 0 }),
  t({ id: 'c7', wbs: '3.09', name: 'Siding & Exterior Trim', phaseId: 'const', parentId: 'c0', start: '2026-08-19', end: '2026-08-26', baselineStart: '2026-08-13', baselineEnd: '2026-08-20', status: 'not-started', progress: 0, crewId: 'finish', assignee: 'Finish Crew', deps: [{ pred: 'c5', type: 'SS', lag: 0 }], budget: 4300, actualCost: 0 }),
  // Subtasks under Siding (roll up to c7)
  t({ id: 'c7a', wbs: '3.09.1', name: 'Install siding panels', phaseId: 'const', parentId: 'c7', start: '2026-08-19', end: '2026-08-22', baselineStart: '2026-08-13', baselineEnd: '2026-08-18', status: 'not-started', progress: 0, crewId: 'finish', assignee: 'Finish Crew', deps: [{ pred: 'c5', type: 'SS', lag: 0 }], budget: 2600, actualCost: 0 }),
  t({ id: 'c7b', wbs: '3.09.2', name: 'Corner boards & door trim', phaseId: 'const', parentId: 'c7', start: '2026-08-23', end: '2026-08-26', baselineStart: '2026-08-19', baselineEnd: '2026-08-20', status: 'not-started', progress: 0, crewId: 'finish', assignee: 'Finish Crew', deps: [{ pred: 'c7a', type: 'FS', lag: 0 }], budget: 1700, actualCost: 0 }),
  t({ id: 'c8', wbs: '3.10', name: 'Electrical Rough-in', phaseId: 'const', parentId: 'c0', start: '2026-08-19', end: '2026-08-22', baselineStart: '2026-08-13', baselineEnd: '2026-08-17', status: 'not-started', progress: 0, crewId: 'mep', assignee: 'MEP Sub', deps: [{ pred: 'c5', type: 'FS', lag: 0 }], budget: 3100, actualCost: 0 }),
  t({ id: 'c9', wbs: '3.11', name: 'Rough-in Inspection', phaseId: 'const', parentId: 'c0', start: '2026-08-25', end: '2026-08-25', baselineStart: '2026-08-19', baselineEnd: '2026-08-19', status: 'not-started', progress: 0, crewId: 'office', deps: [{ pred: 'c8', type: 'FS', lag: 0 }, { pred: 'c6', type: 'FS', lag: 0 }], budget: 0, actualCost: 0, note: 'City inspection — must be scheduled 48h ahead.' }),
  t({ id: 'c10', wbs: '3.12', name: 'Insulation & Drywall', phaseId: 'const', parentId: 'c0', start: '2026-08-26', end: '2026-08-31', baselineStart: '2026-08-20', baselineEnd: '2026-08-25', status: 'not-started', progress: 0, crewId: 'finish', assignee: 'Finish Crew', deps: [{ pred: 'c9', type: 'FS', lag: 0 }], budget: 3600, actualCost: 0 }),
  t({ id: 'c11', wbs: '3.13', name: 'Interior Trim & Paint', phaseId: 'const', parentId: 'c0', start: '2026-09-01', end: '2026-09-04', baselineStart: '2026-08-26', baselineEnd: '2026-08-31', status: 'not-started', progress: 0, crewId: 'finish', assignee: 'Finish Crew', deps: [{ pred: 'c10', type: 'FS', lag: 0 }], budget: 2900, actualCost: 0 }),
  t({ id: 'c12', wbs: '3.14', name: 'Final Inspection', phaseId: 'const', parentId: 'c0', start: '2026-09-07', end: '2026-09-07', baselineStart: '2026-09-01', baselineEnd: '2026-09-01', status: 'not-started', progress: 0, crewId: 'office', deps: [{ pred: 'c11', type: 'FS', lag: 0 }], budget: 0, actualCost: 0 }),
  t({ id: 'cmF', wbs: '3.15', name: 'Customer Delivery & Walkthrough', phaseId: 'const', parentId: 'c0', start: '2026-09-08', end: '2026-09-09', baselineStart: '2026-09-02', baselineEnd: '2026-09-03', status: 'not-started', progress: 0, milestone: true, crewId: 'delivery', deps: [{ pred: 'c12', type: 'FS', lag: 0 }], budget: 1200, actualCost: 0 }),
]

// Map old crew-based assignees → real people (Crew/Trade removed)
const CREW_TO_PERSON: Record<string, string> = { concrete: 'R. Alvarez', framing: 'S. Okafor', roofing: 'L. Moreno', mep: 'N. Doyle', finish: 'G. Fischer', delivery: 'D. Delgado', office: 'A. Kim', survey: 'D. Pratt' }
const REMAP: Record<string, string> = { 'Concrete Crew': 'R. Alvarez', 'Framing Crew': 'S. Okafor', 'Roofing Crew': 'L. Moreno', 'MEP Sub': 'N. Doyle', 'Finish Crew': 'G. Fischer', 'Delivery & Set': 'D. Delgado' }
const PRIORITY: Record<string, Priority> = { c1: 'high', c2: 'critical', c5: 'high', c6: 'high', p6: 'medium', c9: 'high', cmF: 'high', c4: 'high' }
const RICH: Record<string, Partial<Task>> = {
  c2: {
    description:
      'Pour 4" slab with fiber-mesh reinforcement over compacted #57 base. Hold for the city pre-pour inspection sign-off before any concrete is placed. Confirm the pump truck and 8 yd³ mix order the day before, and verify the forecast — do not pour into rain.',
    attachments: [
      { id: 'a1', name: 'Slab_rebar_plan_R3.pdf', size: '2.1 MB', kind: 'pdf' },
      { id: 'a2', name: 'Forms_squared_photo.jpg', size: '840 KB', kind: 'img' },
    ],
    comments: [
      {
        id: 'k1', author: 'M. Reyes', color: '#6e3785', body: '@R. Alvarez are the forms squared and rebar tied? Inspector is coming Wed.', ts: '2d ago',
        replies: [
          { id: 'k1r1', author: 'R. Alvarez', color: '#f59e0b', body: 'Forms are done, rebar ~90%. @A. Kim can you confirm the pump truck?', ts: '1d ago', replies: [] },
          { id: 'k1r2', author: 'A. Kim', color: '#3b82f6', body: 'Pump truck booked Thu 7am. Watching the rain though — 80% Thursday.', ts: '22h ago', replies: [] },
        ],
      },
    ],
  },
  c1: {
    description: 'Set edge forms, install rebar mat and anchor bolts per the engineered plan. Coordinate the underground plumbing rough-in before closing the forms.',
    comments: [{ id: 'k2', author: 'R. Alvarez', color: '#f59e0b', body: 'Rebar delivery is on site. Should wrap forming tomorrow.', ts: '5h ago', replies: [] }],
  },
  p6: { description: 'Utility locate (811) ticket + temporary power pole. Ticket still open with the city — following up daily.' },
}

// captured when a late task is completed — tuned for small GCs, manufacturers, remodelers
export const DELAY_REASONS: { code: string; label: string }[] = [
  { code: 'weather', label: 'Weather' },
  { code: 'permit', label: 'Permit / inspection delay' },
  { code: 'material', label: 'Material / supplier late' },
  { code: 'sub', label: 'Subcontractor / crew unavailable' },
  { code: 'rework', label: 'Rework / quality issue' },
  { code: 'change', label: 'Change order / added scope' },
  { code: 'rfi', label: 'Design / RFI wait' },
  { code: 'site', label: 'Site / existing conditions' },
  { code: 'client', label: 'Client decision / selection' },
  { code: 'equipment', label: 'Equipment / breakdown' },
  { code: 'other', label: 'Other' },
]

// audit seed dates by phase (display strings)
const CREATED_AT: Record<string, string> = { design: 'May 28, 2026', precon: 'Jun 20, 2026', const: 'Jul 10, 2026' }

// short, field-relevant descriptions for every item
const DESC: Record<string, string> = {
  d1: 'Confirm the 911 street address with the county for permits and utility hookups.',
  d2: 'Stake the property corners and locate the build pad.',
  d3: 'Shoot grades and elevations across the lot for the site plan.',
  d4: 'Mark the trees to protect or clear before grading.',
  d5: 'Draft the site plan and permit drawings for submittal.',
  dm: 'Design sign-off — drawings approved and ready to permit.',
  p1: 'Submit the full permit package to the city.',
  pm: 'Building permit issued — construction can begin.',
  p3: 'Engineered slab and truss package from the structural engineer.',
  c3: 'Let the slab cure to strength before framing loads it.',
  c4: 'Stand and brace the exterior walls per the framing plan.',
  c5: 'Set the roof trusses and sheath the roof deck.',
  cm1: 'Slab poured and cured — foundation complete.',
  cm2: 'Dry-in — building is weather-tight, framing complete.',
  c6: 'Underlayment, flashing and shingles — get it weather-tight.',
  c7: 'Wrap the building and install siding and exterior trim.',
  c7a: 'Hang and fasten the siding panels to the walls.',
  c7b: 'Install corner boards and door/window trim.',
  c8: 'Rough-in electrical boxes, wiring and the panel.',
  c9: 'City rough-in inspection for framing, electrical and plumbing.',
  c10: 'Insulate the walls and hang/finish drywall.',
  c11: 'Interior trim, doors and paint.',
  c12: 'Final city inspection for occupancy.',
  cmF: 'Handover and walkthrough with the customer.',
}
// a few tasks carry more than one person
const ASSIGNEES: Record<string, string[]> = {
  c1: ['R. Alvarez', 'N. Doyle'],
  c4: ['S. Okafor', 'G. Fischer'],
  c9: ['A. Kim', 'City of BG'],
  c7a: ['G. Fischer', 'S. Okafor'], // subtask with two people
}

export const INITIAL_TASKS: Task[] = SEED_TASKS.map((t) => {
  const assignee = t.assignee ? REMAP[t.assignee] ?? t.assignee : t.crewId ? CREW_TO_PERSON[t.crewId] : undefined
  const assignees = ASSIGNEES[t.id] ?? (assignee ? [assignee] : undefined)
  const base: Partial<Task> = {
    createdBy: 'M. Reyes',
    createdAt: CREATED_AT[t.phaseId] ?? 'Jun 1, 2026',
    updatedBy: assignee ?? 'M. Reyes',
    updatedAt: t.status === 'done' ? 'Jul 15, 2026 · 4:32 PM' : t.progress > 0 ? 'Jul 23, 2026 · 8:05 AM' : (CREATED_AT[t.phaseId] ?? 'Jun 1, 2026'),
    description: DESC[t.id] ?? t.description,
    startTime: t.startTime ?? (t.milestone ? '09:00' : '07:00'),
    endTime: t.endTime ?? (t.milestone ? '09:00' : '15:30'),
    assignees,
  }
  const seed = { ...t, assignee, priority: PRIORITY[t.id] ?? t.priority, ...base, ...(RICH[t.id] ?? {}), ...(WORK_ORDER_LINKS[t.id] ? { workOrderLinks: WORK_ORDER_LINKS[t.id] } : {}) }
  // one late+done task already has its delay reason logged
  if (t.id === 'p2') seed.delayReason = { code: 'permit', label: 'Permit / inspection delay', note: 'City plan review queue ran 6 working days over the quoted 10-day turnaround.' }
  return seed
})

export const CONSTRAINTS: Constraint[] = [
  { id: 'k1', taskId: 'c5', label: 'Roof trusses delivery', kind: 'material', cleared: false, neededBy: '2026-08-13' },
  { id: 'k2', taskId: 'c9', label: 'City rough-in inspection slot', kind: 'inspection', cleared: false, neededBy: '2026-08-25' },
  { id: 'k3', taskId: 'c4', label: 'Framing lumber package', kind: 'material', cleared: true, neededBy: '2026-08-05' },
  { id: 'k4', taskId: 'c8', label: 'Electrical permit rider', kind: 'permit', cleared: true, neededBy: '2026-08-19' },
]

export const WEATHER: WeatherDay[] = [
  { date: '2026-07-28', icon: 'sun', label: 'Sunny 88°', precip: 5 },
  { date: '2026-07-29', icon: 'cloud', label: 'Cloudy 84°', precip: 20 },
  { date: '2026-07-30', icon: 'storm', label: 'Thunderstorms 78°', precip: 80 },
  { date: '2026-07-31', icon: 'rain', label: 'Rain 76°', precip: 60 },
  { date: '2026-08-01', icon: 'cloud', label: 'Cloudy 81°', precip: 25 },
]

// ── Portfolio (for the cross-project view) ─────────────────
export interface PortfolioProject {
  id: string
  code: string
  name: string
  phase: string
  health: 'green' | 'amber' | 'red'
  spi: number
  cpi: number
  pct: number
  finishDelta: number // working days vs baseline (+late)
  value: number
  topRisk: string
  pm: string
}

export const PORTFOLIO: PortfolioProject[] = [
  { id: 'CB-PRJ-00441', code: 'CB-PRJ-00441', name: 'Coley — 24×40 Garage', phase: 'Construction', health: 'amber', spi: 0.92, cpi: 0.97, pct: 34, finishDelta: 5, value: 48600, topRisk: 'Slab pour rain risk Thu; finish +5d', pm: 'M. Reyes' },
  { id: 'CB-PRJ-00396', code: 'CB-PRJ-00396', name: 'Nevarez — Barn Home', phase: 'Construction', health: 'red', spi: 0.81, cpi: 0.89, pct: 52, finishDelta: 12, value: 214000, topRisk: 'Framing crew double-booked; 3 RFIs aging', pm: 'J. Doss' },
  { id: 'CB-PRJ-00393', code: 'CB-PRJ-00393', name: 'Russell — Lean-to Addition', phase: 'Preconstruction', health: 'green', spi: 1.03, cpi: 1.01, pct: 18, finishDelta: -2, value: 31200, topRisk: 'On track — ahead 2 days', pm: 'M. Reyes' },
  { id: 'CB-PRJ-00206', code: 'CB-PRJ-00206', name: 'Rasor — Well House', phase: 'Construction', health: 'amber', spi: 0.95, cpi: 0.93, pct: 61, finishDelta: 3, value: 27800, topRisk: 'Underbilling drift −18%; trim behind', pm: 'A. Kim' },
  { id: 'CB-PRJ-00200', code: 'CB-PRJ-00200', name: 'James — Garage #2', phase: 'Design', health: 'green', spi: 1.0, cpi: 1.0, pct: 6, finishDelta: 0, value: 52400, topRisk: 'Permit submitted — no blockers', pm: 'J. Doss' },
  { id: 'CB-PRJ-00381', code: 'CB-PRJ-00381', name: 'Bardreau — Storage Barn', phase: 'Closeout', health: 'amber', spi: 0.98, cpi: 0.9, pct: 96, finishDelta: 1, value: 39900, topRisk: 'Punch list 7 open; retainage unbilled', pm: 'A. Kim' },
]

// ── Cross-project task board data ──────────────────────────────
// The Tasks board spans every active project. Coley's tasks come live from the
// store; these are the other projects' tasks (read-only preview in the prototype).
export interface BoardTask extends Task {
  projectId: string
  projectName: string
  external?: boolean // true = belongs to another project (not the live Coley store)
  crit?: boolean // on the critical path (external tasks carry this flag directly)
}

const cmt = (id: string, author: string, color: string, body: string, ts: string): Comment => ({ id, author, color, body, ts, replies: [] })
function bt(projectId: string, projectName: string, o: Partial<Task> & Pick<Task, 'id' | 'wbs' | 'name' | 'start' | 'end' | 'status' | 'progress'> & { crit?: boolean }): BoardTask {
  return {
    phaseId: '', baselineStart: o.start, baselineEnd: o.end, deps: [], budget: 0, actualCost: 0,
    ...o, projectId, projectName, external: true,
  } as BoardTask
}

export const CROSS_PROJECT_TASKS: BoardTask[] = [
  // Nevarez — Barn Home (12 days late, red)
  bt('CB-PRJ-00396', 'Nevarez — Barn Home', { id: 'nv1', wbs: '2.04', name: 'Framing — Second Floor', start: '2026-07-28', end: '2026-08-05', status: 'in-progress', progress: 45, assignee: 'Framing Crew', priority: 'high', crit: true, deps: [{ pred: 'nv0', type: 'FS', lag: 0 }, { pred: 'nvp', type: 'FS', lag: 0 }], comments: [cmt('n1', 'J. Doss', '#6E3785', 'Crew double-booked — need Wed', '2d'), cmt('n2', 'Framing Crew', '#0ea5e9', 'Can start Thu at earliest', '1d')], attachments: [{ id: 'na1', name: 'Truss_layout.pdf', size: '1.2 MB', kind: 'pdf' }] }),
  bt('CB-PRJ-00396', 'Nevarez — Barn Home', { id: 'nv2', wbs: '2.05', name: 'Roofing Dry-in', start: '2026-08-06', end: '2026-08-12', status: 'not-started', progress: 0, assignee: 'Roofing Crew', weatherSensitive: true, crit: true, deps: [{ pred: 'nv1', type: 'FS', lag: 0 }] }),
  bt('CB-PRJ-00396', 'Nevarez — Barn Home', { id: 'nv3', wbs: '2.02', name: 'Foundation Waterproofing', start: '2026-07-20', end: '2026-07-24', status: 'blocked', progress: 30, assignee: 'Concrete Crew', priority: 'high', deps: [{ pred: 'nv0', type: 'FS', lag: 0 }], comments: [cmt('n3', 'J. Doss', '#6E3785', 'RFI aging 3 days on membrane spec', '3d')] }),
  bt('CB-PRJ-00396', 'Nevarez — Barn Home', { id: 'nv4', wbs: '2.01', name: 'Site Excavation', start: '2026-07-08', end: '2026-07-14', status: 'done', progress: 100, assignee: 'Concrete Crew', attachments: [{ id: 'na2', name: 'Grade_cert.pdf', size: '640 KB', kind: 'pdf' }] }),

  // Russell — Lean-to Addition (2 days ahead, green)
  bt('CB-PRJ-00393', 'Russell — Lean-to Addition', { id: 'ru1', wbs: '1.03', name: 'Permit Drawings', start: '2026-08-03', end: '2026-08-07', status: 'in-progress', progress: 60, assignee: 'A. Kim', deps: [{ pred: 'ru0', type: 'FS', lag: 0 }], attachments: [{ id: 'ra1', name: 'Site_plan.dwg', size: '2.1 MB', kind: 'dwg' }] }),
  bt('CB-PRJ-00393', 'Russell — Lean-to Addition', { id: 'ru2', wbs: '1.02', name: 'Lot Survey', start: '2026-07-27', end: '2026-07-29', status: 'done', progress: 100, assignee: 'D. Pratt' }),
  bt('CB-PRJ-00393', 'Russell — Lean-to Addition', { id: 'ru3', wbs: '1.04', name: 'Footing Layout', start: '2026-08-10', end: '2026-08-12', status: 'not-started', progress: 0, assignee: 'Concrete Crew', deps: [{ pred: 'ru1', type: 'FS', lag: 0 }] }),

  // Rasor — Well House (3 days late, amber)
  bt('CB-PRJ-00206', 'Rasor — Well House', { id: 'rs1', wbs: '3.11', name: 'Interior Trim', start: '2026-07-29', end: '2026-08-04', status: 'in-progress', progress: 55, assignee: 'Finish Crew', crit: true, deps: [{ pred: 'rs0', type: 'FS', lag: 0 }], comments: [cmt('r1', 'A. Kim', '#f59e0b', 'Trim behind — underbilling −18%', '1d')] }),
  bt('CB-PRJ-00206', 'Rasor — Well House', { id: 'rs2', wbs: '3.12', name: 'Final Paint', start: '2026-08-05', end: '2026-08-08', status: 'not-started', progress: 0, assignee: 'Finish Crew', deps: [{ pred: 'rs1', type: 'FS', lag: 0 }] }),
  bt('CB-PRJ-00206', 'Rasor — Well House', { id: 'rs3', wbs: '3.09', name: 'Pump & Pressure Test', start: '2026-07-24', end: '2026-07-25', status: 'done', progress: 100, assignee: 'MEP Sub', attachments: [{ id: 'rsa1', name: 'Pressure_test.pdf', size: '410 KB', kind: 'pdf' }] }),

  // Bardreau — Storage Barn (closeout, amber)
  bt('CB-PRJ-00381', 'Bardreau — Storage Barn', { id: 'bd1', wbs: '4.02', name: 'Punch List Walk', start: '2026-07-30', end: '2026-08-01', status: 'in-progress', progress: 40, assignee: 'A. Kim', priority: 'high', comments: [cmt('b1', 'A. Kim', '#f59e0b', '7 punch items open', '1d'), cmt('b2', 'Finish Crew', '#22c55e', 'Door #3 adjusted', '4h')], attachments: [{ id: 'bda1', name: 'Punchlist.xls', size: '88 KB', kind: 'xls' }] }),
  bt('CB-PRJ-00381', 'Bardreau — Storage Barn', { id: 'bd2', wbs: '4.03', name: 'Final Inspection', start: '2026-08-04', end: '2026-08-04', status: 'not-started', progress: 0, assignee: 'City of BG', deps: [{ pred: 'bd1', type: 'FS', lag: 0 }] }),
]
