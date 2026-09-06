import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import type { ProgressEvent, TaskState } from '@shared/types'
import type { WidgetMode } from '@shared/layout'
import { useAnimatedInteger } from '../hooks/useAnimatedInteger'
import { useDrag } from '../hooks/useDrag'
import { playCompletionSound } from '../lib/sound'
import { DotMatrix } from './DotMatrix'
import { HairlineProgress } from './HairlineProgress'

const COMPLETED_HOLD_MS = 3600

export function Widget({ event, soundEnabled }: { event: ProgressEvent | null; soundEnabled: boolean }) {
  const state: TaskState = event?.state ?? 'queued'
  const pct = useAnimatedInteger(event?.progress ?? 0)

  const [hovered, setHovered] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  const prevState = useRef<TaskState>(state)
  const soundRef = useRef(soundEnabled)
  const expandTimer = useRef<number | null>(null)
  const collapseTimer = useRef<number | null>(null)

  useEffect(() => {
    soundRef.current = soundEnabled
  }, [soundEnabled])

  // Completed transition: transient completed view + chime, then revert to compact.
  useEffect(() => {
    const prev = prevState.current
    prevState.current = state
    if (prev !== 'completed' && state === 'completed') {
      setShowCompleted(true)
      playCompletionSound(soundRef.current)
      const t = window.setTimeout(() => setShowCompleted(false), COMPLETED_HOLD_MS)
      return () => window.clearTimeout(t)
    }
    if (state !== 'completed') setShowCompleted(false)
  }, [state])

  const mode: WidgetMode =
    state === 'failed' ? 'failed' : showCompleted ? 'completed' : hovered ? 'expanded' : 'compact'

  useEffect(() => {
    window.agentPulse.setMode(mode)
  }, [mode])

  const onMouseEnter = (e: MouseEvent<HTMLDivElement>): void => {
    if (e.buttons !== 0) return // don't expand mid-drag
    if (collapseTimer.current) {
      window.clearTimeout(collapseTimer.current)
      collapseTimer.current = null
    }
    if (expandTimer.current) return
    expandTimer.current = window.setTimeout(() => {
      setHovered(true)
      expandTimer.current = null
    }, 140)
  }

  const onMouseLeave = (): void => {
    if (expandTimer.current) {
      window.clearTimeout(expandTimer.current)
      expandTimer.current = null
    }
    if (collapseTimer.current) return
    collapseTimer.current = window.setTimeout(() => {
      setHovered(false)
      collapseTimer.current = null
    }, 120)
  }

  const drag = useDrag(() => window.agentPulse.openMain())

  return (
    <div
      className={`widget widget--${mode}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPointerDown={drag.onPointerDown}
    >
      <div className="widget__card">
        {mode === 'completed' ? (
          <CompletedView />
        ) : mode === 'failed' ? (
          <FailedView error={event?.error ?? 'Unknown error'} />
        ) : (
          <>
            <div className="widget__head">
              <DotMatrix value={`${pct}%`} />
              <StatusGlyph state={state} />
            </div>
            <div className="widget__body">
              <div className="widget__title">{event?.title ?? 'Agent task'}</div>
              <HairlineProgress target={event?.progress ?? 0} />
              <div className="widget__meta">
                <span className="widget__stage">{event?.stage ?? '—'}</span>
                <span className="widget__eta">{formatEta(event)}</span>
              </div>
              <div className="widget__message">
                {isThinking(event) ? <DotLoader /> : <span>{event?.message ?? ''}</span>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatusGlyph({ state }: { state: TaskState }) {
  if (state === 'paused') return <span className="glyph glyph--pause">‖</span>
  if (state === 'waiting') return <DotLoader className="glyph glyph--loader" />
  if (state === 'completed') return <span className="glyph glyph--done">✓</span>
  if (state === 'cancelled') return <span className="glyph glyph--cancelled">✕</span>
  if (state === 'queued') return <span className="glyph glyph--queued">…</span>
  return null
}

function DotLoader({ className }: { className?: string }) {
  return (
    <span className={`dotloader${className ? ` ${className}` : ''}`} aria-label="loading">
      <span />
      <span />
      <span />
      <span />
    </span>
  )
}

function CompletedView() {
  return (
    <div className="completed">
      <div className="completed__check">✓</div>
      <div className="completed__label">Complete</div>
      <div className="completed__pct">100%</div>
    </div>
  )
}

function FailedView({ error }: { error: string }) {
  return (
    <div className="failed">
      <div className="failed__icon">⚠</div>
      <div className="failed__label">Failed</div>
      <div className="failed__error">{error}</div>
    </div>
  )
}

function isThinking(event: ProgressEvent | null): boolean {
  if (!event) return false
  return event.state === 'waiting' || event.message.startsWith('Thinking')
}

function formatEta(event: ProgressEvent | null): string {
  if (!event) return '—'
  if (event.state === 'paused') return 'Paused'
  if (event.state === 'queued') return 'Queued'
  if (event.state === 'cancelled') return 'Stopped'
  if (event.etaSeconds == null) return '—'
  const s = event.etaSeconds
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}
