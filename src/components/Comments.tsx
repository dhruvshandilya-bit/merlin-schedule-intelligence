import React, { useState, useEffect } from 'react'
import { CornerDownRight, Trash2, AtSign, Send, Mic, Play, Square } from 'lucide-react'
import { useProject } from '../state/store'
import { TEAM, memberColor } from '../data/project'
import { Avatar, cn } from './ui'
import type { Comment, Task } from '../lib/types'

const ME = 'M. Reyes'

function renderBody(body: string) {
  const names = TEAM.map((m) => m.name.replace('.', '\\.'))
  const re = new RegExp(`(@(?:${names.join('|')}))`, 'g')
  return body.split(re).map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="font-medium text-brand-700">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function newComment(body: string): Comment {
  return { id: 'c' + Math.random().toString(36).slice(2, 7), author: ME, color: memberColor(ME), body, ts: 'just now', replies: [] }
}

export default function Comments({ task }: { task: Task }) {
  const { updateTask } = useProject()
  const comments = task.comments ?? []
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  const setComments = (next: Comment[]) => updateTask(task.id, { comments: next })

  const addTop = () => {
    if (!draft.trim()) return
    setComments([...comments, newComment(draft)])
    setDraft('')
  }
  const addVoice = (duration: string) => setComments([...comments, { ...newComment(''), audioDuration: duration }])
  const addReply = (id: string) => {
    if (!replyText.trim()) return
    setComments(comments.map((c) => (c.id === id ? { ...c, replies: [...c.replies, newComment(replyText)] } : c)))
    setReplyText('')
    setReplyTo(null)
  }
  const addReplyVoice = (id: string, duration: string) => {
    setComments(comments.map((c) => (c.id === id ? { ...c, replies: [...c.replies, { ...newComment(''), audioDuration: duration }] } : c)))
    setReplyTo(null)
  }
  const del = (id: string, parentId?: string) => {
    if (parentId) setComments(comments.map((c) => (c.id === parentId ? { ...c, replies: c.replies.filter((r) => r.id !== id) } : c)))
    else setComments(comments.filter((c) => c.id !== id))
  }

  return (
    <div>
      <div className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-400">Comments {comments.length > 0 && `· ${comments.reduce((n, c) => n + 1 + c.replies.length, 0)}`}</div>

      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id}>
            <CommentRow c={c} onReply={() => setReplyTo(replyTo === c.id ? null : c.id)} onDelete={() => del(c.id)} />
            {c.replies.length > 0 && (
              <div className="ml-6 mt-2 space-y-2 border-l border-line pl-3">
                {c.replies.map((r) => (
                  <CommentRow key={r.id} c={r} small onDelete={() => del(r.id, c.id)} />
                ))}
              </div>
            )}
            {replyTo === c.id && (
              <div className="ml-6 mt-2">
                <Composer value={replyText} onChange={setReplyText} onSend={() => addReply(c.id)} onVoice={(d) => addReplyVoice(c.id, d)} placeholder={`Reply to ${c.author}…`} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Composer value={draft} onChange={setDraft} onSend={addTop} onVoice={addVoice} placeholder="Add a comment… use @ to tag" />
      </div>
    </div>
  )
}

function VoiceNote({ duration, small }: { duration: string; small?: boolean }) {
  const [playing, setPlaying] = useState(false)
  const bars = [6, 11, 8, 14, 9, 13, 7, 12, 8, 10, 6, 13, 9, 7]
  return (
    <div className={cn('mt-1 flex w-fit items-center gap-2 rounded-full bg-brand-50 py-1.5 pl-1.5 pr-3', small && 'py-1')}>
      <button onClick={() => setPlaying((p) => !p)} className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
        {playing ? <Square className="h-2.5 w-2.5" /> : <Play className="h-3 w-3" />}
      </button>
      <div className="flex items-center gap-[2px]">
        {bars.map((h, i) => <span key={i} className="w-[2px] rounded-full bg-brand-400" style={{ height: h }} />)}
      </div>
      <span className="text-[11px] font-semibold tabular-nums text-brand-700">{duration}</span>
    </div>
  )
}

function CommentRow({ c, small, onReply, onDelete }: { c: Comment; small?: boolean; onReply?: () => void; onDelete?: () => void }) {
  return (
    <div className="group flex gap-2">
      <Avatar name={c.author} color={c.color} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-ink-950">{c.author}</span>
          <span className="text-2xs text-ink-400">{c.ts}</span>
          <div className="ml-auto flex items-center gap-2.5">
            {onReply && <button onClick={onReply} className="flex items-center gap-0.5 text-2xs font-medium text-brand-700"><CornerDownRight className="h-3 w-3" /> Reply</button>}
            {onDelete && <button onClick={onDelete} className="text-ink-300 hover:text-danger"><Trash2 className="h-3 w-3" /></button>}
          </div>
        </div>
        {c.audioDuration ? <VoiceNote duration={c.audioDuration} small={small} /> : <div className={cn('mt-0.5 text-[13px] leading-relaxed text-ink-700', small && 'text-2xs')}>{renderBody(c.body)}</div>}
      </div>
    </div>
  )
}

function Composer({ value, onChange, onSend, onVoice, placeholder }: { value: string; onChange: (v: string) => void; onSend: () => void; onVoice?: (duration: string) => void; placeholder: string }) {
  const [showMentions, setShowMentions] = useState(false)
  const [recording, setRecording] = useState(false)
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    if (!recording) return
    const id = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [recording])
  const fmt = (s: number) => `0:${String(s).padStart(2, '0')}`

  if (recording) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/5 p-2.5">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" />
        <span className="text-[13px] font-medium text-danger">Recording… {fmt(secs)}</span>
        <button onClick={() => { setRecording(false); setSecs(0) }} className="ml-auto text-[12px] font-medium text-ink-500">Cancel</button>
        <button onClick={() => { onVoice?.(fmt(Math.max(1, secs))); setRecording(false); setSecs(0) }} className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-white"><Send className="h-3.5 w-3.5" /></button>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-line bg-white p-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSend() }}
        placeholder={placeholder}
        rows={2}
        className="w-full resize-none bg-transparent text-[13px] outline-none placeholder:text-ink-400"
      />
      <div className="flex items-center gap-1">
        <button onClick={() => setShowMentions((s) => !s)} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs text-ink-400 hover:bg-surface hover:text-brand-700"><AtSign className="h-3 w-3" /> Tag</button>
        {onVoice && <button onClick={() => { setSecs(0); setRecording(true) }} title="Record voice note" className="flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs text-ink-400 hover:bg-surface hover:text-brand-700"><Mic className="h-3 w-3" /> Voice</button>}
        <button onClick={onSend} disabled={!value.trim()} className="ml-auto grid h-6 w-6 place-items-center rounded-md bg-brand-600 text-white disabled:opacity-40"><Send className="h-3 w-3" /></button>
      </div>
      {showMentions && (
        <div className="mt-1 flex flex-wrap gap-1 border-t border-line pt-1.5">
          {TEAM.slice(0, 9).map((m) => (
            <button key={m.id} onClick={() => { onChange((value ? value + ' ' : '') + '@' + m.name + ' '); setShowMentions(false) }} className="flex items-center gap-1 rounded-full border border-line px-1.5 py-0.5 text-2xs text-ink-600 hover:bg-brand-50">
              <span className="h-3 w-3 rounded-full" style={{ background: m.color }} /> {m.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
