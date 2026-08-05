import { useProject } from './store'
import { dominoChain, shiftWithRipple, workingDaysBetween, finishDate, fmtDate } from '../lib/scheduling'
import type { Insight } from '../lib/agents'

export function useInsights(): Insight[] {
  const { tasks, cpm, finish, baseFinish, commit, setHighlight, pushToast } = useProject()
  const delta = workingDaysBetween(baseFinish, finish)

  const out: Insight[] = []

  // ① Silent finish-date push
  if (delta > 0) {
    const chain = dominoChain(tasks, 'p2')
    out.push({
      id: 'push',
      skill: 'Delay radar',
      severity: 'high',
      title: `Finish date slipped to ${fmtDate(finish)} (+${delta}d vs baseline)`,
      why: [
        'City Permit Review approved 4 working days late (Jul 15 vs Jul 9 baseline).',
        'The slip cascaded down the critical path: site prep → foundation → slab pour → framing.',
        'No downstream task has absorbed it — every day flows straight to the finish date.',
      ],
      confidence: 'High',
      checks: [
        'Baseline vs actual dates + slip on every predecessor',
        'Critical-path float remaining and float burn',
        '% complete vs planned-to-date (are we earning progress)',
        'Open RFIs / submittals gating a downstream task',
        'Permit & inspection status; crew/assignee availability',
        'Historical duration variance for this task type',
      ],
      actionLabel: 'Trace the delay chain',
      preview: `${chain.length}-task domino chain → finish ${fmtDate(finish)}`,
      chain,
      run: () => {
        setHighlight(chain)
        return `Highlighted the ${chain.length}-task delay chain on the Gantt. Ask me to recover the date next.`
      },
    })
  }

  // ② Weather → slab pour
  const pour = tasks.find((t) => t.id === 'c2')
  if (pour && pour.status !== 'done') {
    out.push({
      id: 'weather',
      skill: 'Weather watch',
      severity: 'high',
      title: 'Slab pour is exposed to Thu storms (80% precip)',
      why: [
        'Slab Pour is scheduled Thu Jul 30 — thunderstorms forecast at 80%.',
        'Pouring into rain risks curing defects and a failed inspection.',
        'Next dry window is Mon Aug 3.',
      ],
      confidence: 'High',
      checks: [
        'Hourly forecast: precip %, temp min/max, wind, humidity',
        'Weather-sensitive tasks in the 10-day look-ahead',
        'Concrete cure temps, roofing/crane wind limits, paint humidity',
        'Delivery road/site conditions and the workday calendar',
      ],
      actionLabel: 'Reschedule pour → Aug 3',
      preview: 'Moves pour + successors +2d (recoverable)',
      destructive: true,
      run: () => {
        const { tasks: next, affected } = shiftWithRipple(tasks, 'c2', 2)
        commit(next)
        setHighlight(affected)
        return `Pour moved to Aug 3. ${affected.length} downstream tasks shifted; finish is now ${fmtDate(finishDate(next))}. Ask me to recover it.`
      },
    })
  }

  // ③ Constraint not cleared — trusses
  out.push({
    id: 'trusses',
    skill: 'Look-ahead',
    severity: 'medium',
    title: 'Roof trusses not ordered — needed on site Aug 13',
    why: [
      'Framing — Roof Trusses (3.06) starts Aug 13 but its truss delivery is unconfirmed.',
      'Truss lead time is typically 3–4 weeks; the window to order is now.',
      'If it slips, framing and everything after it stalls.',
    ],
    confidence: 'Moderate',
    checks: [
      'Each look-ahead task’s constraints: material ordered vs lead-time & need-by',
      'Submittal approvals and RFI answers still outstanding',
      'Permits pulled, inspections booked, prior trade complete',
      'Equipment reserved, crew assigned, site access/readiness',
    ],
    actionLabel: 'Draft PO to truss supplier',
    run: () => 'Drafted PO #TR-0442 to Sunbelt Trusses (28 pcs, need-by Aug 13). Sitting in your approvals.',
    chain: ['c5'],
  })

  // ④ Crew double-booked
  out.push({
    id: 'crew',
    skill: 'Resource leveling',
    severity: 'medium',
    title: 'Framing crew double-booked the week of Aug 5',
    why: [
      'S. Okafor (Framing) is on this job and Nevarez — Barn Home the same week.',
      'Barn Home is already 12 days behind and will hold the crew.',
      'Recommend starting this job’s framing 1 day later or splitting the crew.',
    ],
    confidence: 'Moderate',
    checks: [
      'Every crew/assignee’s tasks across all active projects',
      'Overlapping task windows and daily capacity/hours',
      'Trade/skill match and current PTO / availability',
      'Travel zone and overtime already booked',
    ],
    actionLabel: 'Level the crew (+1d)',
    destructive: true,
    run: () => {
      const { tasks: next, affected } = shiftWithRipple(tasks, 'c4', 1)
      commit(next)
      setHighlight(affected)
      return `Framing shifted +1 day to clear the conflict; finish now ${fmtDate(finishDate(next))}.`
    },
    chain: ['c4'],
  })

  // ⑤ Overdue nudge
  const overdueTask = tasks.find((t) => t.id === 'p6')
  if (overdueTask && overdueTask.status !== 'done') {
    out.push({
      id: 'overdue',
      skill: 'Overdue sweep',
      severity: 'medium',
      title: 'Temp Power & 811 Locate is overdue',
      why: [
        'Due Jul 21, still 60% done — the utility-locate ticket is open with the city.',
        'Owner: A. Kim. It gates nothing critical yet but is aging.',
      ],
      confidence: 'High',
      checks: [
        'Tasks past their finish date and under 100% complete',
        'Owner, days overdue, and what it blocks downstream',
        'Whether a delay reason was captured on close',
      ],
      actionLabel: 'Nudge owner + reschedule',
      run: () => 'Reminder sent to A. Kim and finish reset to today. I’ll re-check tomorrow.',
      chain: ['p6'],
    })
  }

  return out
}
