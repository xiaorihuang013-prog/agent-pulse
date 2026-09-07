/** Window modes shared between renderer (who decides) and main (who resizes). */
export type WidgetMode = 'compact' | 'expanded' | 'completed' | 'failed' | 'approval'

export interface WidgetSize {
  width: number
  height: number
}

/**
 * Window dimensions; the card fills the window without an outer margin.
 * `compact` is a horizontal rounded rectangle rather than a square.
 */
export const WIDGET_SIZES: Record<WidgetMode, WidgetSize> = {
  compact: { width: 86, height: 43 },
  expanded: { width: 200, height: 200 },
  completed: { width: 104, height: 104 },
  failed: { width: 140, height: 140 },
  approval: { width: 140, height: 140 }
}
