import React, { useEffect, useState } from 'react'
import { X, Trash2, Plus, Diamond, Link2, GitBranch, AlertTriangle, CloudLightning, Route, ChevronRight, Paperclip, FileText, Image as ImageIcon, Flag, History, ArrowRightLeft, Clock } from 'lucide-react'
import { useProject } from '../state/store'
import { PHASES, TEAM, memberColor, assigneesOf, DELAY_REASONS } from '../data/project'
import { Button, Badge, Avatar, InfoTip, AssigneeSelect, HEALTH_META, STATUS_META, PRIORITY_META, cn } from './ui'
import Comments from './Comments'
import { taskHealth, isOverdue, isDelayed, fmtDate, diffDays, workingDaysInclusive, rollupProgress, addWorkingDays } from '../lib/scheduling'
import type { Task, DepType, TaskStatus, Priority, Attachment } from '../lib/types'

const STATUS_OPTIONS: TaskStatus[] = ['not-started', 'in-progress', 'blocked', 'on-hold', 'done', 'cancelled']
const PRIORITY_OPTIONS: Priority[] = ['low', 'medium', 'high', 'critical']
const DEP_TYPES: DepType[] = ['FS', 'SS', 'FF', 'SF']
const SAMPLE_FILES: Attachment[] = [
  { id: 's1', name: 'Site_plan_stamped.pdf', size: '3.4 MB', kind: 'pdf' },
  { id: 's2', name: 'Progress_photo.jpg', size: '1.2 MB', kind: 'img' },
  { id: 's3', name: 'Truss_shop_drawings.dwg', size: '5.1 MB', kind: 'dwg' },
]
const FILE_ICON: Record<string, any> = { pdf: FileText, img: ImageIcon, doc: FileText, dwg: FileText, xls: FileText }

function blankTask(): Task {
  const start = '2026-08-03'
  return {
    id: 't' + Math.random().toString(36).slice(2, 7), wbs: '3.99', name: '', phaseId: 'const', parentId: 'c0',
    start, end: addWorkingDays(start, 2), baselineStart: start, baselineEnd: addWorkingDays(start, 2),
    progress: 0, status: 'not-started', priority: 'medium', deps: [], budget: 0, actualCost: 0, isNew: true,
    startTime: '08:00', endTime: '16:00',
  }
}

export default function TaskDrawer() {
  const { tasks, cpm, today, drawerId, creating, closeDrawer, updateTask, addTask, deleteTask, openDrawer, pushToast, completionMode } = useProject()
  const existing = tasks.find((t) => t.id === drawerId) || null
  const open = !!drawerId || creating
  const [draft, setDraft] = useState<Task>(blankTask())
  const [subDrafts, setSubDrafts] = useState<string[]>([])
  const [confirmDel, setConfirmDel] = useState(false)
  useEffect(() => { if (creating) { setDraft(blankTask()); setSubDrafts([]) } }, [creating])
  useEffect(() => { setConfirmDel(false) }, [drawerId])
  if (!open) return null
  const task = creating ? draft : existing
  if (!task) return null

  const set = (patch: Partial<Task>) => (creating ? setDraft((d) => ({ ...d, ...patch })) : updateTask(task.id, patch))

  const info = cpm[task.id]
  const health = taskHealth(task, today)
  const overdue = isOverdue(task, today)
  const delayed = isDelayed(task)
  const slip = diffDays(task.baselineEnd, task.end)
  const children = tasks.filter((t) => t.parentId === task.id)
  const leafTasks = tasks.filter((t) => !tasks.some((x) => x.parentId === t.id) && t.id !== task.id)
  const attachments = task.attachments ?? []
  // candidate parents to move under (exclude self + descendants)
  const descendantIds = (() => {
    const s = new Set<string>([task.id]); const stack = [task.id]
    while (stack.length) { const id = stack.pop()!; tasks.filter((t) => t.parentId === id).forEach((k) => { s.add(k.id); stack.push(k.id) }) }
    return s
  })()
  const parentOptions = tasks.filter((t) => !descendantIds.has(t.id))
  const lateDone = !creating && task.status === 'done' && diffDays(task.baselineEnd, task.end) > 0

  const addSubtask = () => {
    addTask({ ...blankTask(), id: 't' + Math.random().toString(36).slice(2, 7), wbs: `${task.wbs}.${children.length + 1}`, name: 'New subtask', phaseId: task.phaseId, parentId: task.id, start: task.start, end: addWorkingDays(task.start, 1), baselineStart: task.start, baselineEnd: addWorkingDays(task.start, 1) }, 'Subtask added')
  }
  const addDep = () => { const c = leafTasks[0]; if (c) set({ deps: [...task.deps, { pred: c.id, type: 'FS', lag: 0 }] }) }
  const attachFile = () => { const f = SAMPLE_FILES[attachments.length % SAMPLE_FILES.length]; set({ attachments: [...attachments, { ...f, id: 'f' + Math.random().toString(36).slice(2, 6) }] }) }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink-950/20" onClick={closeDrawer} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-[460px] flex-col bg-white shadow-pop">
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-2xs text-ink-400">
              <span className="tabular-nums">{task.wbs}</span>
              <span>· {PHASES.find((p) => p.id === task.phaseId)?.name}</span>
              {task.parentId && !/\.0$/.test(tasks.find((x) => x.id === task.parentId)?.wbs ?? '') && <Badge tone="neutral"><GitBranch className="h-2.5 w-2.5" /> Subtask</Badge>}
            </div>
            <div className="mt-1 text-[15px] font-semibold text-ink-950">{creating ? 'New task' : task.name}</div>
          </div>
          <button onClick={closeDrawer} className="text-ink-400 hover:text-ink-950"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-auto px-5 py-4">
          {!creating && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={HEALTH_META[health]?.tone as any}><span className="h-1.5 w-1.5 rounded-full" style={{ background: HEALTH_META[health]?.color }} />{HEALTH_META[health]?.label}</Badge>
              {task.priority && <Badge tone={PRIORITY_META[task.priority].tone}><Flag className="h-2.5 w-2.5" /> {PRIORITY_META[task.priority].label}</Badge>}
              {overdue && <Badge tone="danger"><AlertTriangle className="h-2.5 w-2.5" /> Overdue</Badge>}
              {delayed && slip > 0 && <Badge tone="warn">Slipped +{slip}d</Badge>}
              {task.delayReason && <Badge tone="neutral"><Clock className="h-2.5 w-2.5" /> {task.delayReason.label}</Badge>}
              {info?.critical && <Badge tone="danger"><Route className="h-2.5 w-2.5" /> Critical path</Badge>}
              {info && info.float > 0 && <Badge tone="neutral">{info.float}d float</Badge>}
              {task.weatherSensitive && <Badge tone="warn"><CloudLightning className="h-2.5 w-2.5" /> Weather</Badge>}
            </div>
          )}

          <Field label="Task name"><input value={task.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Slab pour" className="input" /></Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select value={task.status} onChange={(e) => set({ status: e.target.value as TaskStatus, progress: e.target.value === 'done' ? 100 : task.progress })} className="input">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={task.priority ?? ''} onChange={(e) => set({ priority: (e.target.value || undefined) as Priority })} className="input">
                <option value="">None</option>
                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Assignees">
            <AssigneeSelect selected={assigneesOf(task)} onChange={(next) => set({ assignees: next, assignee: next[0] })} />
          </Field>

          <Field label="Description">
            <textarea value={task.description ?? ''} onChange={(e) => set({ description: e.target.value })} placeholder="Add detail, scope, or instructions…" rows={3} className="input resize-none" />
          </Field>

          <Field label={`Completion · ${task.progress}%${completionMode === 'status' ? ' · auto from status' : ''}`}>
            {completionMode === 'manual' ? (
              <input type="range" min={0} max={100} step={5} value={task.progress} onChange={(e) => set({ progress: Number(e.target.value) })} className="w-full accent-brand-600" />
            ) : (
              <div className="mb-1 text-2xs text-ink-400">Org setting: completion follows status. Change the status to update %.</div>
            )}
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full transition-all" style={{ width: `${task.progress}%`, background: HEALTH_META[health]?.color }} /></div>
          </Field>

          {/* dates with time */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start"><div className="flex gap-1.5"><input type="date" value={task.start} onChange={(e) => set({ start: e.target.value })} className="input !px-2" /><input type="time" value={task.startTime ?? '08:00'} onChange={(e) => set({ startTime: e.target.value })} className="input !w-[86px] !px-2" /></div></Field>
            <Field label="Finish"><div className="flex gap-1.5"><input type="date" value={task.end} onChange={(e) => set({ end: e.target.value })} className="input !px-2" /><input type="time" value={task.endTime ?? '16:00'} onChange={(e) => set({ endTime: e.target.value })} className="input !w-[86px] !px-2" /></div></Field>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-2xs text-ink-600">
            <span>Duration <b className="text-ink-950">{`${Math.max(1, workingDaysInclusive(task.start, task.end))} working days`}</b></span>
            <span>Planned <b className="text-ink-950">{fmtDate(task.baselineStart)}–{fmtDate(task.baselineEnd)}</b></span>
          </div>
          {/* actual (done) / forecast (open) dates — only when the task did not stay on plan */}
          {!creating && task.status !== 'cancelled' && (overdue || slip > 0 || diffDays(task.baselineStart, task.start) > 0) && (
            <div className="rounded-lg border border-warn/40 bg-warn/5 px-3 py-2">
              <div className="mb-1 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-[#b45309]">
                <History className="h-3.5 w-3.5" /> {task.status === 'done' ? 'Actual' : 'Forecast'} dates{slip > 0 ? ` · ${slip}d late` : ''}
              </div>
              <div className="flex items-center gap-6 text-[13px]">
                <span>{task.status === 'done' ? 'Actual start' : 'Forecast start'} <b className="tabular-nums text-ink-950">{fmtDate(task.start)}{task.startTime ? ` · ${task.startTime}` : ''}</b></span>
                <span>{task.status === 'done' ? 'Actual finish' : 'Forecast finish'} <b className="tabular-nums text-ink-950">{fmtDate(task.end)}{task.endTime ? ` · ${task.endTime}` : ''}</b></span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <label className="flex items-center gap-1.5 pb-1.5 text-[13px] text-ink-700"><input type="checkbox" checked={!!task.weatherSensitive} onChange={(e) => set({ weatherSensitive: e.target.checked })} className="accent-brand-600" /> Weather-sensitive <InfoTip text="Tells the Weather Watch agent to monitor this task — it warns when rain, wind, temperature or humidity threatens the scheduled day (pours, roofing, crane, paint, delivery)." /></label>
          </div>

          {/* Parent — where it lives (create) / move (edit) */}
          <Field label={creating ? 'Add under (pick a phase for a task, or a task to make it a subtask)' : 'Parent — move under another task'}>
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 shrink-0 text-ink-400" />
              <select
                value={task.parentId ?? ''}
                onChange={(e) => { const np = tasks.find((x) => x.id === e.target.value); set({ parentId: e.target.value || undefined, phaseId: np?.phaseId ?? task.phaseId }) }}
                className="input flex-1"
              >
                <option value="">Top-level (no parent)</option>
                {parentOptions.map((p) => <option key={p.id} value={p.id}>{p.wbs} · {p.name}</option>)}
              </select>
            </div>
          </Field>

          {/* Delay reason capture (late + done) */}
          {lateDone && <DelayReason task={task} onSet={(dr) => set({ delayReason: dr })} />}

          {/* dependencies */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-400"><Link2 className="h-3.5 w-3.5" /> Dependencies</span>
              <button onClick={addDep} className="flex items-center gap-1 text-2xs font-medium text-brand-700 hover:underline"><Plus className="h-3 w-3" /> Add</button>
            </div>
            {task.deps.length === 0 && <div className="rounded-lg border border-dashed border-line px-3 py-2 text-2xs text-ink-400">No predecessors — can start freely.</div>}
            <div className="space-y-1.5">
              {task.deps.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <select value={d.pred} onChange={(e) => set({ deps: task.deps.map((x, k) => (k === i ? { ...x, pred: e.target.value } : x)) })} className="input flex-1 !py-1 text-2xs">
                    {leafTasks.map((lt) => <option key={lt.id} value={lt.id}>{lt.wbs} · {lt.name}</option>)}
                  </select>
                  <select value={d.type} onChange={(e) => set({ deps: task.deps.map((x, k) => (k === i ? { ...x, type: e.target.value as DepType } : x)) })} className="input !w-14 !py-1 text-2xs">{DEP_TYPES.map((dt) => <option key={dt} value={dt}>{dt}</option>)}</select>
                  <input type="number" value={d.lag} onChange={(e) => set({ deps: task.deps.map((x, k) => (k === i ? { ...x, lag: Number(e.target.value) } : x)) })} className="input !w-12 !py-1 text-2xs" title="lag (days)" />
                  <button onClick={() => set({ deps: task.deps.filter((_, k) => k !== i) })} className="text-ink-400 hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* attachments */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-400"><Paperclip className="h-3.5 w-3.5" /> Files {attachments.length > 0 && `· ${attachments.length}`}</span>
              <button onClick={attachFile} className="flex items-center gap-1 text-2xs font-medium text-brand-700 hover:underline"><Plus className="h-3 w-3" /> Attach</button>
            </div>
            {attachments.length === 0 && <div className="rounded-lg border border-dashed border-line px-3 py-2 text-2xs text-ink-400">No files attached.</div>}
            <div className="space-y-1">
              {attachments.map((a) => {
                const Icon = FILE_ICON[a.kind] ?? FileText
                return (
                  <div key={a.id} className="group flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5">
                    <Icon className="h-4 w-4 shrink-0 text-brand-600" />
                    <span className="flex-1 truncate text-[13px] text-ink-700">{a.name}</span>
                    <span className="text-2xs text-ink-400">{a.size}</span>
                    <button onClick={() => set({ attachments: attachments.filter((x) => x.id !== a.id) })} className="text-ink-400 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* subtasks */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-400">
                <GitBranch className="h-3.5 w-3.5" /> Subtasks {!creating && children.length > 0 && `· ${rollupProgress(tasks, task.id)}% rolled up`}
                <InfoTip text="Break a task into steps. Each subtask has its own status, % complete, owner and dates — and rolls up into this task's completion." />
              </span>
              {!creating && <button onClick={addSubtask} className="flex items-center gap-1 text-2xs font-medium text-brand-700 hover:underline"><Plus className="h-3 w-3" /> Add subtask</button>}
            </div>
            {creating ? (
              <div className="space-y-1.5">
                {subDrafts.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                    <input value={s} onChange={(e) => setSubDrafts(subDrafts.map((x, k) => (k === i ? e.target.value : x)))} placeholder="Subtask name" className="input flex-1 !py-1.5 text-[13px]" />
                    <button onClick={() => setSubDrafts(subDrafts.filter((_, k) => k !== i))} className="text-ink-400 hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                <button onClick={() => setSubDrafts([...subDrafts, ''])} className="flex items-center gap-1 text-2xs font-medium text-brand-700 hover:underline"><Plus className="h-3 w-3" /> Add subtask</button>
              </div>
            ) : (
              <>
                {children.length === 0 && <div className="rounded-lg border border-dashed border-line px-3 py-2 text-2xs text-ink-400">No subtasks. Break this into steps.</div>}
                <div className="space-y-1">
                  {children.map((c) => {
                    const ch = taskHealth(c, today)
                    return (
                      <div key={c.id} className="group flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5">
                        <button onClick={() => openDrawer(c.id)} className="flex flex-1 items-center gap-2 text-left">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: HEALTH_META[ch]?.color }} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="flex-1 truncate text-[13px] text-ink-700">{c.name}</span>
                              {c.priority && (c.priority === 'high' || c.priority === 'critical') && <Flag className="h-3 w-3 shrink-0" style={{ color: PRIORITY_META[c.priority].color }} />}
                            </span>
                            <span className="mt-1 flex h-1 w-full overflow-hidden rounded-full bg-surface">
                              <span className="h-full rounded-full" style={{ width: `${c.progress}%`, background: HEALTH_META[ch]?.color }} />
                            </span>
                          </span>
                          {c.assignee && <Avatar name={c.assignee} color={memberColor(c.assignee)} />}
                          <span className="w-8 text-right text-2xs tabular-nums text-ink-400">{`${c.progress}%`}</span>
                        </button>
                        <button onClick={() => deleteTask(c.id, 'Subtask deleted')} title="Delete subtask" className="text-ink-400 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {task.note && <div className="rounded-lg bg-brand-50/60 px-3 py-2 text-2xs text-ink-700">{task.note}</div>}

          {/* comments */}
          {!creating && <div className="border-t border-line pt-4"><Comments task={task} /></div>}

          {/* audit trail */}
          {!creating && (
            <div className="border-t border-line pt-3 text-2xs text-ink-400">
              <div className="flex items-center gap-1.5"><Plus className="h-3 w-3" /> Created by <b className="font-medium text-ink-600">{task.createdBy ?? '—'}</b> · {task.createdAt ?? '—'}</div>
              <div className="mt-1 flex items-center gap-1.5"><History className="h-3 w-3" /> Updated by <b className="font-medium text-ink-600">{task.updatedBy ?? '—'}</b> · {task.updatedAt ?? '—'}</div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-line px-5 py-3">
          {creating ? (
            <>
              <Button variant="brand" onClick={() => {
                if (!draft.name.trim()) { pushToast('Give the task a name', 'warn'); return }
                addTask({ ...draft, baselineStart: draft.start, baselineEnd: draft.end })
                const subs = subDrafts.map((n) => n.trim()).filter(Boolean)
                subs.forEach((name, i) => addTask({ ...blankTask(), id: 't' + Math.random().toString(36).slice(2, 7), wbs: `${draft.wbs}.${i + 1}`, name, phaseId: draft.phaseId, parentId: draft.id, start: draft.start, end: addWorkingDays(draft.start, 1), baselineStart: draft.start, baselineEnd: addWorkingDays(draft.start, 1) }))
                pushToast(subs.length ? `Task created with ${subs.length} subtask${subs.length > 1 ? 's' : ''}` : 'Task created', 'ok')
                closeDrawer()
              }}>Create task</Button>
              <Button variant="ghost" onClick={closeDrawer}>Cancel</Button>
            </>
          ) : confirmDel ? (
            <div className="flex w-full items-center gap-2">
              <span className="flex items-center gap-1.5 text-[13px] text-ink-700"><AlertTriangle className="h-4 w-4 shrink-0 text-danger" /> Delete <b className="font-semibold text-ink-950">{task.name}</b>{children.length > 0 ? ` and its ${children.length} subtask${children.length > 1 ? 's' : ''}` : ''}? This can’t be undone.</span>
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => setConfirmDel(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => { deleteTask(task.id, `${task.name} deleted`); closeDrawer() }}><Trash2 className="h-4 w-4" /> Delete</Button>
            </div>
          ) : (
            <>
              <Button variant="outline" onClick={closeDrawer}>Close</Button>
              <button onClick={() => setConfirmDel(true)} className="ml-auto flex items-center gap-1.5 text-[13px] font-medium text-danger hover:underline"><Trash2 className="h-4 w-4" /> Delete {task.parentId && !/\.0$/.test(tasks.find((x) => x.id === task.parentId)?.wbs ?? '') ? 'subtask' : 'task'}</button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-2xs font-medium text-ink-500">{label}</span>{children}</label>
}

function DelayReason({ task, onSet }: { task: Task; onSet: (dr: Task['delayReason']) => void }) {
  const [code, setCode] = useState(task.delayReason?.code ?? '')
  const [note, setNote] = useState(task.delayReason?.note ?? '')
  const [editing, setEditing] = useState(!task.delayReason)

  if (task.delayReason && !editing) {
    return (
      <div className="rounded-xl border border-warn/30 bg-warn/5 p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-warn"><Clock className="h-3.5 w-3.5" /> Reason for delay</span>
          <button onClick={() => setEditing(true)} className="text-2xs font-medium text-brand-700 hover:underline">Edit</button>
        </div>
        <div className="mt-1 text-[13px] font-medium text-ink-950">{task.delayReason.label}</div>
        {task.delayReason.note && <div className="mt-0.5 text-2xs text-ink-600">{task.delayReason.note}</div>}
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-warn/40 bg-warn/5 p-3">
      <div className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-warn"><AlertTriangle className="h-3.5 w-3.5" /> This finished late — why?</div>
      <p className="mt-0.5 text-2xs text-ink-600">Logging a reason trains Delay Radar and feeds your on-time reporting.</p>
      <select value={code} onChange={(e) => setCode(e.target.value)} className="input mt-2">
        <option value="">Select a reason…</option>
        {DELAY_REASONS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
      </select>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add detail (optional)…" rows={2} className="input mt-2 resize-none" />
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" variant="brand" disabled={!code} onClick={() => { const r = DELAY_REASONS.find((x) => x.code === code)!; onSet({ code, label: r.label, note: note.trim() || undefined }); setEditing(false) }}>Save reason</Button>
        {task.delayReason && <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
      </div>
    </div>
  )
}
