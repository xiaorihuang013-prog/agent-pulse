import type { Lang } from '../shared/i18n'
import { summarizeTaskTitle } from '../shared/taskSummary'

export function taskTitleFromPrompt(prompt: string, lang: Lang = 'en'): string {
  return summarizeTaskTitle(prompt, lang)
}

export function promptText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.filter(block => block && ['text', 'input_text'].includes(block.type))
    .map(block => typeof block.text === 'string' ? block.text : '').join('\n')
}
