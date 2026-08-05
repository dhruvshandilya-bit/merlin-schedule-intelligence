export type TaskStatus = 'done' | 'track' | 'risk' | 'blocked' | 'not-started' | 'in-progress' | 'on-hold' | 'cancelled'
export type DepType = 'FS' | 'SS' | 'FF' | 'SF'
export type Priority = 'low' | 'medium' | 'high' | 'critical'

export interface TeamMember {
  id: string
  name: string
  role: string
  color: string
}

export interface Comment {
  id: string
  author: string
  color: string
  body: string // may contain @Name mentions
  ts: string // display time
  replies: Comment[]
  audioDuration?: string // set when this is a voice note (e.g. "0:14")
}

export interface Attachment {
  id: string
  name: string
  size: string
  kind: 'pdf' | 'img' | 'doc' | 'dwg' | 'xls'
}

export interface Dependency {
  pred: string // predecessor task id
  type: DepType
  lag: number // working days, + = lag, - = lead
}

export interface Crew {
  id: string
  name: string
  color: string
  trade: string
}

export interface Task {
  id: string
  wbs: string
  name: string
  phaseId: string
  parentId?: string
  start: string // ISO date
  end: string // ISO date (inclusive last working day)
  baselineStart: string
  baselineEnd: string
  progress: number // 0..100
  status: TaskStatus
  crewId?: string
  assignee?: string
  assignees?: string[] // multiple people can be assigned
  deps: Dependency[]
  milestone?: boolean
  weatherSensitive?: boolean
  budget: number // planned value $ (BAC contribution)
  actualCost: number // AC $ so far
  note?: string
  isNew?: boolean // agent just added
  // rich fields
  priority?: Priority
  description?: string
  startTime?: string // HH:MM
  endTime?: string // HH:MM
  comments?: Comment[]
  attachments?: Attachment[]
  // audit
  createdBy?: string
  createdAt?: string
  updatedBy?: string
  updatedAt?: string
  // captured when a late task is completed
  delayReason?: { code: string; label: string; note?: string }
}

export interface DelayReasonOption {
  code: string
  label: string
}

export interface Phase {
  id: string
  name: string
  color: string
}

export interface Constraint {
  id: string
  taskId: string
  label: string
  kind: 'material' | 'rfi' | 'permit' | 'inspection' | 'submittal'
  cleared: boolean
  neededBy: string // ISO
}

export interface ProjectMeta {
  id: string
  code: string
  name: string
  customer: string
  contractValue: number
  phaseName: string
  address: string
}

export interface WeatherDay {
  date: string // ISO
  icon: 'rain' | 'storm' | 'sun' | 'cloud'
  label: string
  precip: number // %
}
