export type BuildEventType =
  | 'init'
  | 'tool_use'
  | 'tool_error'
  | 'agent_spawn'
  | 'agent_result'
  | 'result'

export interface BuildEvent {
  id: string
  projectId: string
  sessionId: string | null
  type: BuildEventType
  toolName: string | null
  summary: string
  filePath: string | null
  command: string | null
  isError: boolean
  errorText: string | null
  parentToolUseId: string | null
  costUsd: number | null
  durationMs: number | null
  numTurns: number | null
  createdAt: string
}
