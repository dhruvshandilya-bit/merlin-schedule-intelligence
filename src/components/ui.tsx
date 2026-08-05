import React from 'react'
import { Info } from 'lucide-react'

export function cn(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ')
}

export function InfoTip({ text, className, side = 'bottom' }: { text: string; className?: string; side?: 'bottom' | 'left' }) {
  return (
    <span className={cn('group/it relative inline-flex align-middle', className)}>
      <Info className="h-3 w-3 cursor-help text-ink-400 hover:text-brand-600" />
      <span
        className={cn(
          'pointer-events-none absolute z-[60] hidden w-56 rounded-lg bg-ink-950 px-2.5 py-1.5 text-[11px] font-normal normal-case leading-snug tracking-normal text-white shadow-pop group-hover/it:block',
          side === 'left' ? 'right-4 top-1/2 -translate-y-1/2' : 'left-1/2 top-full mt-1 -translate-x-1/2',
        )}
      >
        {text}
      </span>
    </span>
  )
}

export function Card({ className, children, onClick }: { className?: string; children: React.ReactNode; onClick?: () => void }) {
  return <div onClick={onClick} className={cn('bg-white border border-line rounded-card shadow-card', className)}>{children}</div>
}

export function Button({
  children,
  variant = 'default',
  size = 'md',
  className,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  variant?: 'default' | 'outline' | 'ghost' | 'brand' | 'danger' | 'subtle'
  size?: 'sm' | 'md' | 'icon'
  className?: string
  onClick?: () => void
  disabled?: boolean
}) {
  const variants: Record<string, string> = {
    default: 'bg-brand-600 text-white hover:bg-brand-700',
    brand: 'bg-brand-600 text-white hover:bg-brand-700',
    outline: 'border border-line bg-white text-ink-950 hover:bg-surface',
    ghost: 'text-ink-600 hover:bg-surface hover:text-ink-950',
    subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
    danger: 'bg-danger text-white hover:opacity-90',
  }
  const sizes: Record<string, string> = {
    sm: 'h-8 px-3 text-[13px] gap-1.5',
    md: 'h-9 px-4 text-sm gap-2',
    icon: 'h-8 w-8 p-0 justify-center',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'info' | 'blue'
  className?: string
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-surface text-ink-600 border-line',
    brand: 'bg-brand-50 text-brand-700 border-brand-100',
    ok: 'bg-[#effaf3] text-[#14804a] border-[#c6efd6]',
    warn: 'bg-[#fff4ec] text-[#b45309] border-[#fed7aa]',
    danger: 'bg-[#fef1f2] text-[#b91c1c] border-[#fecdd3]',
    info: 'bg-brand-50 text-brand-700 border-brand-100',
    blue: 'bg-[#eef4ff] text-[#1d4ed8] border-[#c7d7fe]',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-semibold', tones[tone], className)}>
      {children}
    </span>
  )
}

export const STATUS_META: Record<string, { label: string; dot: string; tone: 'ok' | 'warn' | 'danger' | 'neutral' | 'brand' | 'blue' }> = {
  done: { label: 'Done', dot: '#22c55e', tone: 'ok' },
  'in-progress': { label: 'In progress', dot: '#3b82f6', tone: 'blue' },
  track: { label: 'On track', dot: '#22c55e', tone: 'ok' },
  risk: { label: 'At risk', dot: '#eab308', tone: 'warn' },
  blocked: { label: 'Blocked', dot: '#ef4444', tone: 'danger' },
  'on-hold': { label: 'On hold', dot: '#a3a3a3', tone: 'neutral' },
  overdue: { label: 'Overdue', dot: '#fb3748', tone: 'danger' },
  cancelled: { label: 'Cancelled', dot: '#9ca3af', tone: 'neutral' },
  'not-started': { label: 'Not started', dot: '#cbd5e1', tone: 'neutral' },
}

// health colors for derived schedule state (from taskHealth)
export const HEALTH_META: Record<string, { label: string; color: string; tone: 'ok' | 'warn' | 'danger' | 'neutral' | 'blue' }> = {
  done: { label: 'Done', color: '#22c55e', tone: 'ok' },
  overdue: { label: 'Overdue', color: '#fb3748', tone: 'danger' },
  blocked: { label: 'Blocked', color: '#ef4444', tone: 'danger' },
  'on-hold': { label: 'On hold', color: '#a3a3a3', tone: 'neutral' },
  'at-risk': { label: 'At risk', color: '#eab308', tone: 'warn' },
  'in-progress': { label: 'In progress', color: '#3b82f6', tone: 'blue' },
  cancelled: { label: 'Cancelled', color: '#9ca3af', tone: 'neutral' },
  'not-started': { label: 'Not started', color: '#cbd5e1', tone: 'neutral' },
}

export const PRIORITY_META: Record<string, { label: string; tone: 'neutral' | 'blue' | 'warn' | 'danger'; color: string }> = {
  low: { label: 'Low', tone: 'neutral', color: '#a3a3a3' },
  medium: { label: 'Medium', tone: 'blue', color: '#3b82f6' },
  high: { label: 'High', tone: 'warn', color: '#fa7319' },
  critical: { label: 'Critical', tone: 'danger', color: '#fb3748' },
}

export function Avatar({ name, color }: { name?: string; color?: string }) {
  const initials = (name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  return (
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-white"
      style={{ background: color ?? '#8a4fa8' }}
      title={name}
    >
      {initials}
    </span>
  )
}

export function AvatarStack({ names, colorFn, max = 3 }: { names: string[]; colorFn: (n: string) => string; max?: number }) {
  if (!names.length) return null
  const shown = names.slice(0, max)
  const extra = names.length - shown.length
  return (
    <span className="flex items-center">
      {shown.map((n, i) => (
        <span key={i} className={cn(i > 0 && '-ml-2')}><Avatar name={n} color={colorFn(n)} /></span>
      ))}
      {extra > 0 && <span className="-ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink-400 text-[9px] font-semibold text-white ring-2 ring-white">+{extra}</span>}
    </span>
  )
}

export function money(n: number, compact = true): string {
  if (compact && Math.abs(n) >= 1000) return '$' + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k'
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export function Sparkline({ points, color = '#6e3785', className }: { points: number[]; color?: string; className?: string }) {
  const w = 60,
    h = 20
  const min = Math.min(...points),
    max = Math.max(...points)
  const range = max - min || 1
  const path = points
    .map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p - min) / range) * (h - 3) - 1.5}`)
    .join(' ')
  return (
    <svg width={w} height={h} className={className} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
