import type { AgentPulseApi } from '@shared/api'

declare global {
  interface Window {
    agentPulse: AgentPulseApi
  }
}

export {}
