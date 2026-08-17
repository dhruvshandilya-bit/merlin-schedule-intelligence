// Derives what a schedule task shows about its linked production work order.
// The link only stores { grain, refId }; everything visible (state, %, delivery
// date, slippage, provenance) is COMPUTED here from the ops data — so the status
// "comes directly from the Serial / task / Step" it maps to.
import type { OpsTaskState, WorkOrderLink } from './types'
import { OPS_PROJECT } from '../data/operations'
import type { OpsSerial, OpsWorkOrder, OpsStep } from '../data/operations'
import { diffDays } from './scheduling'

export type OpsBucket = 'queued' | 'building' | 'blocked' | 'done'

export const WO_STATE_META: Record<OpsTaskState, { label: string; bucket: OpsBucket; color: string }> = {
  DRAFT: { label: 'Draft', bucket: 'queued', color: '#94a3b8' },
  QUEUED: { label: 'Queued', bucket: 'queued', color: '#94a3b8' },
  SCHEDULED: { label: 'Scheduled', bucket: 'queued', color: '#64748b' },
  READY_TO_START: { label: 'Ready to start', bucket: 'queued', color: '#3b82f6' },
  OPERATOR_ASSIGNED: { label: 'Operator assigned', bucket: 'building', color: '#3b82f6' },
  IN_PROGRESS: { label: 'In production', bucket: 'building', color: '#3b82f6' },
  IN_REVIEW: { label: 'In QC', bucket: 'building', color: '#eab308' },
  COMPLETE: { label: 'Complete', bucket: 'done', color: '#22c55e' },
  BLOCKED: { label: 'Blocked', bucket: 'blocked', color: '#fb3748' },
  PAUSED: { label: 'Paused', bucket: 'blocked', color: '#eab308' },
}
export const BUCKET_META: Record<OpsBucket, { label: string; color: string; tone: 'ok' | 'warn' | 'danger' | 'brand' | 'neutral' }> = {
  queued: { label: 'Queued', color: '#64748b', tone: 'neutral' },
  building: { label: 'Building', color: '#3b82f6', tone: 'brand' },
  blocked: { label: 'Blocked', color: '#fb3748', tone: 'danger' },
  done: { label: 'Delivered', color: '#22c55e', tone: 'ok' },
}

// ── ops-data lookups ──
export interface OpsRef { serial: OpsSerial; wo?: OpsWorkOrder; step?: OpsStep }
export function findByGrain(grain: WorkOrderLink['grain'], refId: string): OpsRef | null {
  for (const serial of OPS_PROJECT.serials) {
    if (grain === 'serial') { if (serial.id === refId) return { serial } }
    for (const wo of serial.workOrders) {
      if (grain === 'task' && wo.id === refId) return { serial, wo }
      if (grain === 'step') { const step = wo.steps.find((s) => s.id === refId); if (step) return { serial, wo, step } }
    }
  }
  return null
}

function stepsOf(wo: OpsWorkOrder) { return wo.steps.length ? wo.steps : [{ id: wo.id, name: wo.name, state: wo.state } as OpsStep] }

// Roll a set of states up to a single "worst-first" state for a serial/work order.
function rollupState(states: OpsTaskState[]): OpsTaskState {
  if (!states.length) return 'QUEUED'
  if (states.every((s) => s === 'COMPLETE')) return 'COMPLETE'
  if (states.some((s) => s === 'BLOCKED')) return 'BLOCKED'
  if (states.some((s) => s === 'PAUSED')) return 'PAUSED'
  if (states.some((s) => s === 'IN_REVIEW')) return 'IN_REVIEW'
  if (states.some((s) => s === 'IN_PROGRESS' || s === 'OPERATOR_ASSIGNED')) return 'IN_PROGRESS'
  if (states.some((s) => s === 'READY_TO_START' || s === 'SCHEDULED')) return 'SCHEDULED'
  return 'QUEUED'
}

export type DeliveryRisk = 'ok' | 'tight' | 'late' | 'delivered'

export interface ResolvedLink {
  grain: WorkOrderLink['grain']
  serialNo: string
  serialName: string
  title: string // the specific thing linked (serial / wo / step name)
  projectId: string
  plant: string
  state: OpsTaskState
  bucket: OpsBucket
  stepsDone: number
  stepsTotal: number
  pct: number
  deliveryDate: string
  sourcePath: string // provenance, e.g. "SL-… · Truss Assembly · Press top chord"
  // delivery vs the task's need-by (set by caller)
  risk?: DeliveryRisk
  daysVsNeedBy?: number
}

// Resolve a link into everything the UI shows. needBy = the task's required-on-site date.
export function resolveLink(link: WorkOrderLink, needBy?: string): ResolvedLink | null {
  const ref = findByGrain(link.grain, link.refId)
  if (!ref) return null
  const { serial, wo, step } = ref

  let state: OpsTaskState
  let stepsDone = 0
  let stepsTotal = 0
  let title = serial.name
  let sourcePath = serial.serialNo

  if (link.grain === 'step' && step && wo) {
    state = step.state
    stepsTotal = 1
    stepsDone = step.state === 'COMPLETE' ? 1 : 0
    title = step.name
    sourcePath = `${serial.serialNo} · ${wo.name} · ${step.name}`
  } else if (link.grain === 'task' && wo) {
    const steps = stepsOf(wo)
    stepsTotal = steps.length
    stepsDone = steps.filter((s) => s.state === 'COMPLETE').length
    state = rollupState(steps.map((s) => s.state))
    title = wo.name
    sourcePath = `${serial.serialNo} · ${wo.name}`
  } else {
    const steps = serial.workOrders.flatMap(stepsOf)
    stepsTotal = steps.length
    stepsDone = steps.filter((s) => s.state === 'COMPLETE').length
    state = rollupState(serial.workOrders.map((w) => rollupState(stepsOf(w).map((s) => s.state))))
    title = serial.name
    sourcePath = serial.serialNo
  }

  const pct = stepsTotal ? Math.round((stepsDone / stepsTotal) * 100) : 0
  const out: ResolvedLink = {
    grain: link.grain,
    serialNo: serial.serialNo,
    serialName: serial.name,
    title,
    projectId: OPS_PROJECT.projectId,
    plant: OPS_PROJECT.plant,
    state,
    bucket: WO_STATE_META[state].bucket,
    stepsDone,
    stepsTotal,
    pct,
    deliveryDate: serial.requestedDelivery,
    sourcePath,
  }
  if (needBy) {
    const delta = diffDays(needBy, serial.requestedDelivery) // >0 = delivered after need-by (late)
    out.daysVsNeedBy = delta
    out.risk = out.bucket === 'done' ? 'delivered' : delta > 0 ? 'late' : delta === 0 ? 'tight' : 'ok'
  }
  return out
}

// ── deep links into the real operations app ──
const BASE = 'https://app.merlinai.co'
export function opsScheduleUrl(projectId: string) { return `${BASE}/operations/schedule?projectId=${projectId}` }
export function opsDashboardUrl(plant: string, projectId?: string) { return `${BASE}/operations/dashboard?plant=${plant}${projectId ? `&project=${projectId}` : ''}` }

// Options for the mapping picker, grouped by grain, with a name-match auto-suggest.
export interface PickOption { grain: WorkOrderLink['grain']; refId: string; label: string; sub: string }
export function pickOptions(): { serials: PickOption[]; tasks: PickOption[]; steps: PickOption[] } {
  const serials: PickOption[] = []
  const tasks: PickOption[] = []
  const steps: PickOption[] = []
  OPS_PROJECT.serials.forEach((s) => {
    serials.push({ grain: 'serial', refId: s.id, label: s.name, sub: s.serialNo })
    s.workOrders.forEach((w) => {
      tasks.push({ grain: 'task', refId: w.id, label: w.name, sub: `${s.serialNo} · ${w.station}` })
      w.steps.forEach((st) => steps.push({ grain: 'step', refId: st.id, label: st.name, sub: `${s.serialNo} · ${w.name}` }))
    })
  })
  return { serials, tasks, steps }
}
// crude name-similarity to suggest a serial for a task
export function suggestSerialId(taskName: string): string | undefined {
  const n = taskName.toLowerCase()
  const hit = OPS_PROJECT.serials.find((s) => {
    const words = s.name.toLowerCase().split(/\s+/)
    return words.some((w) => w.length > 3 && n.includes(w))
  })
  return hit?.id
}
