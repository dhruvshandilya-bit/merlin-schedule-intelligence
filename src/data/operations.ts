// Mock mirror of the real Merlin operations/production model.
// Shapes follow ether-server (Production Order → assemblies=serials) and
// ether-web-v1 (an Operation Task IS a Work Order, keyed by project+serial+task,
// running the OperationTaskState lifecycle, with steps under a task).
//
// In the real product this data is pulled read-only from
//   GET /operations/api/v1/schedule?projectId=…   and   /production-orders
// Here it is static so the linkage is demoable end-to-end.
import type { OpsTaskState, WorkOrderLink } from '../lib/types'

export interface OpsStep {
  id: string
  name: string
  state: OpsTaskState
}
export interface OpsWorkOrder {
  id: string // operation-task id (a "Work Order")
  name: string
  station: string
  state: OpsTaskState
  steps: OpsStep[]
}
export interface OpsSerial {
  id: string // internal id
  serialNo: string // display serial e.g. SL-PRJ-00200994
  name: string
  requestedDelivery: string // ISO — the promised on-site date
  workOrders: OpsWorkOrder[]
}
export interface OpsProject {
  projectId: string // real ops projectId (used in the redirect URL)
  plant: string // real plant id (used in the dashboard redirect)
  name: string
  serials: OpsSerial[]
}

// Real ids the user has open in operations — so "Open in Operations" lands on a live page.
const OPS_PROJECT_ID = '6a552be91b31866e8d679d73'
const OPS_PLANT_ID = '6a4807b7a826615ba6be7d07'

export const OPS_PROJECT: OpsProject = {
  projectId: OPS_PROJECT_ID,
  plant: OPS_PLANT_ID,
  name: 'Coley 24×40 — Prefab Package',
  serials: [
    // ── Roof truss set — feeds field task c5 (Framing — Roof Trusses) ──
    // Promised 08-15, but field needs it 08-13 → LATE by 2 days (drives the shortage banner).
    {
      id: 'srl-truss',
      serialNo: 'SL-PRJ-00200994',
      name: 'Roof Truss Set',
      requestedDelivery: '2026-08-15',
      workOrders: [
        {
          id: 'wo-truss-cut', name: 'Cut & Web', station: 'Saw Line', state: 'COMPLETE',
          steps: [
            { id: 'st-tc1', name: 'Cut top chords', state: 'COMPLETE' },
            { id: 'st-tc2', name: 'Cut webs', state: 'COMPLETE' },
            { id: 'st-tc3', name: 'QC cut list', state: 'COMPLETE' },
          ],
        },
        {
          id: 'wo-truss-asm', name: 'Truss Assembly', station: 'Truss Jig', state: 'IN_PROGRESS',
          steps: [
            { id: 'st-ta1', name: 'Press top chord', state: 'IN_PROGRESS' },
            { id: 'st-ta2', name: 'Press bottom chord', state: 'QUEUED' },
            { id: 'st-ta3', name: 'Plate & gusset', state: 'QUEUED' },
          ],
        },
        {
          id: 'wo-truss-qc', name: 'QC & Bundle', station: 'QC', state: 'QUEUED',
          steps: [{ id: 'st-tq1', name: 'Dimensional QC', state: 'QUEUED' }, { id: 'st-tq2', name: 'Bundle & label', state: 'QUEUED' }],
        },
        {
          id: 'wo-truss-ship', name: 'Stage & Ship', station: 'Staging', state: 'QUEUED',
          steps: [{ id: 'st-ts1', name: 'Load trailer', state: 'QUEUED' }],
        },
      ],
    },
    // ── Wall panel set — feeds field task c4 (Framing — Walls) ──
    // Promised 08-04, needed 08-05 → on time. Linked at TASK grain (one station op).
    {
      id: 'srl-wall',
      serialNo: 'SL-PRJ-00200992',
      name: 'Wall Panel Set',
      requestedDelivery: '2026-08-04',
      workOrders: [
        {
          id: 'wo-wall-frame', name: 'Panel Framing', station: 'Wall Line', state: 'IN_REVIEW',
          steps: [
            { id: 'st-wf1', name: 'Plate & stud layout', state: 'COMPLETE' },
            { id: 'st-wf2', name: 'Nail-up', state: 'COMPLETE' },
            { id: 'st-wf3', name: 'Squaring QC', state: 'IN_PROGRESS' },
          ],
        },
        {
          id: 'wo-wall-sheath', name: 'Sheathing', station: 'Sheathing Bridge', state: 'QUEUED',
          steps: [{ id: 'st-ws1', name: 'Apply sheathing', state: 'QUEUED' }, { id: 'st-ws2', name: 'House wrap', state: 'QUEUED' }],
        },
        {
          id: 'wo-wall-ship', name: 'Stage & Ship', station: 'Staging', state: 'QUEUED',
          steps: [{ id: 'st-wsh1', name: 'Load trailer', state: 'QUEUED' }],
        },
      ],
    },
    // ── Cladding / siding package — feeds subtask c7a (Install siding panels) ──
    // Linked at STEP grain to a single fabrication step. Promised 08-18, needed 08-19 → on time.
    {
      id: 'srl-clad',
      serialNo: 'SL-PRJ-00200991',
      name: 'Cladding Package',
      requestedDelivery: '2026-08-18',
      workOrders: [
        {
          id: 'wo-clad-fab', name: 'Panel Fabrication', station: 'Cladding Bay', state: 'IN_PROGRESS',
          steps: [
            { id: 'st-cf1', name: 'Cut & profile panels', state: 'COMPLETE' },
            { id: 'st-cf2', name: 'Powder-coat', state: 'IN_PROGRESS' },
            { id: 'st-cf3', name: 'Trim & flashing kit', state: 'QUEUED' },
          ],
        },
        {
          id: 'wo-clad-ship', name: 'Stage & Ship', station: 'Staging', state: 'QUEUED',
          steps: [{ id: 'st-cs1', name: 'Crate & label', state: 'QUEUED' }],
        },
      ],
    },
  ],
}

// Seed links onto existing schedule tasks — one at each grain to show the mapping.
export const WORK_ORDER_LINKS: Record<string, WorkOrderLink[]> = {
  c5: [{ id: 'wol1', grain: 'serial', refId: 'srl-truss' }], // whole module
  c4: [{ id: 'wol2', grain: 'task', refId: 'wo-wall-frame' }], // one work order
  c7a: [{ id: 'wol3', grain: 'step', refId: 'st-cf2' }], // one step
}
