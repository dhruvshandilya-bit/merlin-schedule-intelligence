import React, { createContext, useContext, useMemo, useReducer, useState } from 'react'
import type { Task } from '../lib/types'
import { INITIAL_TASKS, TODAY } from '../data/project'
import { computeCpm, computeEv, finishDate, baselineFinish, projectBounds, parentSet } from '../lib/scheduling'
import type { TaskStatus } from '../lib/types'

export type CompletionMode = 'status' | 'manual'
// Jira-style status → % completion mapping (org default)
export const STATUS_PCT: Record<TaskStatus, number> = {
  'not-started': 0,
  'in-progress': 50,
  track: 50,
  risk: 50,
  blocked: 50,
  'on-hold': 50,
  cancelled: 0,
  done: 100,
}
// derive leaf progress from status when in 'status' mode (parents keep rolling up)
function normalizeProgress(tasks: Task[], mode: CompletionMode): Task[] {
  if (mode !== 'status') return tasks
  const P = parentSet(tasks)
  return tasks.map((t) => (P.has(t.id) || t.milestone ? t : { ...t, progress: STATUS_PCT[t.status] ?? t.progress }))
}

interface HistoryState {
  present: Task[]
  past: Task[][]
  future: Task[][]
}
type Action =
  | { type: 'commit'; tasks: Task[] }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; tasks: Task[] }

function reducer(s: HistoryState, a: Action): HistoryState {
  switch (a.type) {
    case 'commit':
      return { present: a.tasks, past: [...s.past, s.present], future: [] }
    case 'undo':
      if (!s.past.length) return s
      return { present: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.present, ...s.future] }
    case 'redo':
      if (!s.future.length) return s
      return { present: s.future[0], past: [...s.past, s.present], future: s.future.slice(1) }
    case 'reset':
      return { present: a.tasks, past: [], future: [] }
  }
}

export interface Toast {
  id: number
  msg: string
  tone?: 'ok' | 'brand' | 'warn'
}

interface Ctx {
  tasks: Task[]
  today: string
  cpm: ReturnType<typeof computeCpm>
  ev: ReturnType<typeof computeEv>
  finish: string
  baseFinish: string
  bounds: { min: string; max: string }
  canUndo: boolean
  commit: (tasks: Task[], toast?: string) => void
  updateTask: (id: string, patch: Partial<Task>, toast?: string) => void
  addTask: (task: Task, toast?: string) => void
  deleteTask: (id: string, toast?: string) => void
  undo: () => void
  reset: () => void
  highlight: string[]
  setHighlight: (ids: string[]) => void
  selected: string | null
  setSelected: (id: string | null) => void
  toasts: Toast[]
  pushToast: (msg: string, tone?: Toast['tone']) => void
  showCritical: boolean
  setShowCritical: (b: boolean) => void
  completionMode: CompletionMode
  setCompletionMode: (m: CompletionMode) => void
  simDelay: number
  setSimDelay: (d: number) => void
  includeWeekends: boolean
  setIncludeWeekends: (b: boolean) => void
  // drawer + filters
  drawerId: string | null
  creating: boolean
  openDrawer: (id: string) => void
  openCreate: () => void
  closeDrawer: () => void
  filter: FilterKey
  setFilter: (f: FilterKey) => void
  search: string
  setSearch: (s: string) => void
}

export type FilterKey = 'all' | 'overdue' | 'at-risk' | 'critical' | 'milestones' | 'unstarted'

const ME_USER = 'M. Reyes'
const nowStamp = () => new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

const ProjectContext = createContext<Ctx | null>(null)

const DEFAULT_COMPLETION_MODE: CompletionMode = 'status'

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { present: normalizeProgress(INITIAL_TASKS, DEFAULT_COMPLETION_MODE), past: [], future: [] })
  const [completionMode, setCompletionModeState] = useState<CompletionMode>(DEFAULT_COMPLETION_MODE)
  const [simDelay, setSimDelay] = useState(0)
  const [includeWeekends, setIncludeWeekendsState] = useState(false)
  const [highlight, setHighlight] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [showCritical, setShowCritical] = useState(false)
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')

  const pushToast = (msg: string, tone: Toast['tone'] = 'brand') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }

  const tasks = state.present
  const cpm = useMemo(() => computeCpm(tasks), [tasks])
  const ev = useMemo(() => computeEv(tasks, TODAY), [tasks])
  const finish = useMemo(() => finishDate(tasks), [tasks])
  const baseFinish = useMemo(() => baselineFinish(tasks), [tasks])
  const bounds = useMemo(() => projectBounds(tasks), [tasks])

  const value: Ctx = {
    tasks,
    today: TODAY,
    cpm,
    ev,
    finish,
    baseFinish,
    bounds,
    canUndo: state.past.length > 0,
    commit: (t, toast) => {
      dispatch({ type: 'commit', tasks: t })
      if (toast) pushToast(toast, 'ok')
    },
    updateTask: (id, patch, toast) => {
      // when completion follows status, a status change also sets % (parents/milestones excluded)
      const isParent = tasks.some((t) => t.parentId === id)
      let p = patch
      if (patch.status && completionMode === 'status' && !isParent) {
        const self = tasks.find((t) => t.id === id)
        if (!self?.milestone) p = { ...patch, progress: STATUS_PCT[patch.status] ?? patch.progress ?? 0 }
      }
      const stamped = { ...p, updatedBy: ME_USER, updatedAt: nowStamp() }
      dispatch({ type: 'commit', tasks: tasks.map((t) => (t.id === id ? { ...t, ...stamped } : t)) })
      if (toast) pushToast(toast, 'ok')
    },
    addTask: (task, toast) => {
      const withAudit = { createdBy: ME_USER, createdAt: nowStamp(), updatedBy: ME_USER, updatedAt: nowStamp(), ...task }
      // insert after the last sibling of its phase for tidy ordering
      const idx = tasks.map((t) => t.phaseId).lastIndexOf(withAudit.phaseId)
      const next = [...tasks]
      next.splice(idx >= 0 ? idx + 1 : tasks.length, 0, withAudit)
      dispatch({ type: 'commit', tasks: next })
      if (toast) pushToast(toast, 'ok')
    },
    deleteTask: (id, toast) => {
      dispatch({ type: 'commit', tasks: tasks.filter((t) => t.id !== id && t.parentId !== id) })
      if (toast) pushToast(toast, 'ok')
    },
    undo: () => dispatch({ type: 'undo' }),
    reset: () => dispatch({ type: 'reset', tasks: normalizeProgress(INITIAL_TASKS, completionMode) }),
    completionMode,
    setCompletionMode: (m) => {
      setCompletionModeState(m)
      if (m === 'status') dispatch({ type: 'commit', tasks: normalizeProgress(tasks, 'status') })
      pushToast(m === 'status' ? 'Completion now follows task status (org setting)' : 'Completion is now entered manually', 'brand')
    },
    simDelay,
    setSimDelay,
    includeWeekends,
    setIncludeWeekends: (b) => { setIncludeWeekendsState(b); pushToast(b ? 'Work week set to 7 days (weekends included)' : 'Work week set to Mon–Fri (weekends off)', 'brand') },
    highlight,
    setHighlight,
    selected,
    setSelected,
    toasts,
    pushToast,
    showCritical,
    setShowCritical,
    drawerId,
    creating,
    openDrawer: (id) => { setCreating(false); setDrawerId(id) },
    openCreate: () => { setCreating(true); setDrawerId(null) },
    closeDrawer: () => { setCreating(false); setDrawerId(null) },
    filter,
    setFilter,
    search,
    setSearch,
  }
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  const c = useContext(ProjectContext)
  if (!c) throw new Error('useProject outside provider')
  return c
}
