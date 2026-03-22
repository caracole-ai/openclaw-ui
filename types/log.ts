export interface LogEntry {
  id: string
  script: string
  level: string
  message: string
  function: string | null
  module: string | null
  args: string | null
  return_value: string | null
  traceback: string | null
  created_at: string
}

export interface LogStats {
  total_today: number
  errors_today: number
  warnings_today: number
  active_scripts: string[]
  by_level: Record<string, number>
  by_script: Record<string, number>
  latest_errors: LogEntry[]
}
