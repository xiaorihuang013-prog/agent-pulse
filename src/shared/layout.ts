/** Window modes shared between renderer (who decides) and main (who resizes). */
export type WidgetMode = 'compact' | 'expanded' | 'completed' | 'failed'

export interface WidgetSize {
  width: number
  height: number
}

/**
 * Pixel dimensions for each widget mode. Includes ~10px transparent margin on
 * every side so the card's glow can bloom outside its own edge.
 */
export const WIDGET_SIZES: Record<WidgetMode, WidgetSize> = {
  compact: { width: 260, height: 104 },
  expanded: { width: 340, height: 200 },
  completed: { width: 260, height: 104 },
  failed: { width: 340, height: 168 }
}
