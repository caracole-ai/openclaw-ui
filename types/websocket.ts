export type WSEventType =
  | 'agent:created' | 'agent:updated'
  | 'project:created' | 'project:stateChanged'
  | 'skill:installed' | 'skill:assigned' | 'skill:unassigned' | 'skill:verified'
  | 'skill:pending'
  | 'approval:required'
  | 'tokens:updated'
  | 'log:new'
  | 'build:event'
  | 'data:updated' | 'connected'

export interface WSEvent<T = any> {
  type: WSEventType
  data: T
  timestamp: string
}
