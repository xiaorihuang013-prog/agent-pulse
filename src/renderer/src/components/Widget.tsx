import { useEffect, useRef } from 'react'
import type { Appearance, ProgressEvent, TaskState } from '@shared/types'
import type { Lang } from '@shared/i18n'
import { t } from '@shared/i18n'
import { localizeProgress } from '@shared/progressText'
import type { WidgetMode } from '@shared/layout'
import { useDrag } from '../hooks/useDrag'
import { useWidgetExpansion } from '../hooks/useWidgetExpansion'
import { useElapsedTime } from '../hooks/useElapsedTime'
import { formatElapsed, formatEta } from '../lib/format'
import { playAlertSound } from '../lib/sound'
import { HairlineProgress } from './HairlineProgress'

const APPEARANCE_ORDER: Appearance[] = ['auto', 'dark', 'light']

export function Widget({
  event: rawEvent,
  soundEnabled,
  notifyEnabled,
  lang,
  appearance,
  setAppearance
}: {
  event: ProgressEvent | null
  soundEnabled: boolean
  notifyEnabled: boolean
  lang: Lang
  appearance: Appearance
  setAppearance: (a: Appearance) => void
}) {
  const event = localizeProgress(rawEvent, lang)
  const idle = event == null
  const state: TaskState = event?.state ?? 'queued'
  const startedAt = event?.startedAt

  const heardAlerts = useRef(new Set<string>())
  const soundRef = useRef(soundEnabled)
  const notifyRef = useRef(notifyEnabled)
  const langRef = useRef(lang)

  useEffect(() => {
    soundRef.current = soundEnabled
  }, [soundEnabled])

  useEffect(() => {
    notifyRef.current = notifyEnabled
  }, [notifyEnabled])

  useEffect(() => {
    langRef.current = lang
  }, [lang])

  // One cue + optional notification per task / alert transition; polling never replays it.
  useEffect(() => {
    const key = `${event?.taskId ?? 'demo'}:${event?.noticeId ?? ''}:${state}`
    if ((state === 'completed' || state === 'approval' || state === 'failed') && !heardAlerts.current.has(key)) {
      heardAlerts.current.add(key)
      if (heardAlerts.current.size > 256) heardAlerts.current.delete(heardAlerts.current.values().next().value!)
      playAlertSound(state, soundRef.current)
      if (notifyRef.current) {
        const subject = event?.title ?? t(langRef.current, 'agentTask')
        if (state === 'completed') {
          window.agentPulse.notify(t(langRef.current, 'notifyCompleteTitle'), t(langRef.current, 'notifyCompleteBody', { title: subject }))
        } else if (state === 'failed') {
          window.agentPulse.notify(t(langRef.current, 'notifyFailedTitle'), t(langRef.current, 'notifyFailedBody', { title: subject }))
        } else {
          const agent = event?.source ?? 'Agent'
          window.agentPulse.notify(t(langRef.current, 'notifyApprovalTitle'), t(langRef.current, 'notifyApprovalBody', { agent }))
        }
      }
    }
  }, [state, event?.taskId, event?.noticeId, event?.title])

  const active = state === 'running' || state === 'waiting' || state === 'paused'
  const { expanded, onMouseEnter, onMouseLeave } = useWidgetExpansion(
    active, event ? `${event.source ?? 'demo'}:${event.taskId ?? event.startedAt ?? 'task'}` : null
  )
  const elapsedMs = useElapsedTime(startedAt, active)
  const elapsed = elapsedMs != null ? formatElapsed(elapsedMs) : '--:--'

  const mode: WidgetMode =
    state === 'approval' ? 'approval' : state === 'failed' ? 'failed' : state === 'completed' ? 'completed' : expanded ? 'expanded' : 'compact'

  useEffect(() => {
    window.agentPulse.setMode(mode)
  }, [mode])

  const drag = useDrag(() => {
    if (state === 'approval' || state === 'completed' || state === 'failed') window.agentPulse.openAgent()
    else window.agentPulse.openMain()
  })

  const cycleAppearance = (): void => {
    const i = APPEARANCE_ORDER.indexOf(appearance)
    setAppearance(APPEARANCE_ORDER[(i + 1) % APPEARANCE_ORDER.length])
  }

  return (
    <div
      className={`widget widget--${mode}`}
      data-state={state}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPointerDown={drag.onPointerDown}
    >
      <div className="widget__card" key={`${mode === 'approval' || mode === 'failed' || mode === 'completed' ? event?.noticeId ?? event?.taskId ?? mode : 'normal'}`}>
        {mode === 'approval' ? (
          <ApprovalView agent={event?.source ?? 'Agent'} lang={lang} />
        ) : mode === 'completed' ? (
          <CompletedView lang={lang} />
        ) : mode === 'failed' ? (
          <FailedView error={event?.error ?? t(lang, 'unknownError')} lang={lang} />
        ) : (
          <>
            <div className="widget__head">
              <span className="widget__time">{idle ? '—' : elapsed}</span>
              <StatusGlyph state={idle ? 'idle' : state} />
            </div>
            <div className="widget__body">
              <div className="widget__title">{idle ? '—' : event?.title ?? t(lang, 'agentTask')}</div>
              <HairlineProgress target={idle ? 0 : event?.progress ?? 0} />
              <div className="widget__meta">
                <span className="widget__stage">{idle ? '—' : `${event?.estimated ? t(lang, 'estimated') : ''}${event?.stage ?? '—'}`}</span>
                <span className="widget__eta">{formatEta(event, lang)}</span>
              </div>
              <div className="widget__message">
                <span>{idle ? '' : event?.activity ?? event?.message ?? ''}</span>
              </div>
            </div>
          </>
        )}
        {mode === 'compact' && (
          <div className="widget__compact-progress">
            <HairlineProgress target={event?.progress ?? 0} />
          </div>
        )}
        {mode === 'expanded' && (
          <button
            type="button"
            className="widget__theme"
            aria-label={`${t(lang, 'appearance')}: ${t(lang, appearance === 'auto' ? 'appearanceAuto' : appearance === 'dark' ? 'appearanceDark' : 'appearanceLight')}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              cycleAppearance()
            }}
          >
            {appearanceGlyph(appearance)}
          </button>
        )}
      </div>
    </div>
  )
}

function StatusGlyph({ state }: { state: TaskState | 'idle' }) {
  if (state === 'idle') return <span className="glyph glyph--idle">—</span>
  if (state === 'paused') return <span className="glyph glyph--pause">‖</span>
  if (state === 'waiting') return <DotLoader className="glyph glyph--loader" />
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

function CompletedView({ lang }: { lang: Lang }) {
  return (
    <div className="completed">
      <div className="completed__check">✓</div>
      <div className="completed__label">{t(lang, 'complete')}</div>
    </div>
  )
}

function ApprovalView({ agent, lang }: { agent: string; lang: Lang }) {
  const [l1, l2] = t(lang, 'approvalHint', { agent }).split('\n')
  return (
    <div className="approval" role="status" aria-live="polite">
      <div className="approval__icon" aria-hidden="true">!</div>
      <div className="approval__label">{t(lang, 'approval')}</div>
      <div className="approval__hint">{l1}<br />{l2}</div>
    </div>
  )
}

function FailedView({ error, lang }: { error: string; lang: Lang }) {
  return (
    <div className="failed" role="alert">
      <div className="failed__icon" aria-hidden="true">×</div>
      <div className="failed__label">{t(lang, 'failed')}</div>
      <div className="failed__error">{error}</div>
    </div>
  )
}

function appearanceGlyph(a: Appearance): string {
  return a === 'auto' ? '◐' : a === 'dark' ? '●' : '○'
}
