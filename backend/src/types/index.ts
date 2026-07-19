/**
 * Clocksy domain types (snake_case JSON shapes returned by the API).
 *
 * These are duplicated (by design) in the `desktop` and `dashboard` repos.
 * When the schema changes, update every repo's copy by hand.
 */

export type UserRole = 'employee' | 'admin'

export type SessionStatus = 'active' | 'paused' | 'ended'

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  team_id: string | null
  role: UserRole
}

export interface Team {
  id: string
  name: string
  created_at: string
}

export interface Session {
  id: string
  user_id: string
  team_id: string
  started_at: string
  ended_at: string | null
  paused_seconds: number
  status: SessionStatus
  client_at: string
  received_at: string
}

export interface ActivityLog {
  id: string
  session_id: string
  user_id: string
  bucket_start: string
  keyboard_count: number
  mouse_count: number
  is_idle: boolean
  client_at: string
  received_at: string
}

export interface Screenshot {
  id: string
  session_id: string
  user_id: string
  taken_at: string
  storage_path: string
  activity_percent: number
}
