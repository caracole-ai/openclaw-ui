export interface SystemEvent {
  id: string
  type: string
  timestamp: string
  actor: string
  data: Record<string, any>
}

export interface EventsSource {
  events: SystemEvent[]
}
