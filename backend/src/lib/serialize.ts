import type {
  ActivityLog,
  Client,
  Project,
  Screenshot,
  Session,
  User
} from '@prisma/client'

/**
 * Maps Prisma models (camelCase, Date/Decimal) to the snake_case JSON shapes
 * the desktop and dashboard clients consume.
 */

export function serializeProfile(
  user: Pick<
    User,
    'id' | 'displayName' | 'avatarUrl' | 'teamId' | 'role'
  >
): {
  id: string
  display_name: string
  avatar_url: string | null
  team_id: string | null
  role: string
} {
  return {
    id: user.id,
    display_name: user.displayName,
    avatar_url: user.avatarUrl,
    team_id: user.teamId,
    role: user.role
  }
}

export function serializeSession(
  session: Session & { project?: Project | null }
): {
  id: string
  user_id: string
  team_id: string | null
  project_id: string | null
  project_name: string | null
  started_at: string
  ended_at: string | null
  paused_seconds: number
  status: string
  client_at: string | null
  received_at: string
} {
  return {
    id: session.id,
    user_id: session.userId,
    team_id: session.teamId,
    project_id: session.projectId,
    project_name: session.project?.name ?? null,
    started_at: session.startedAt.toISOString(),
    ended_at: session.endedAt?.toISOString() ?? null,
    paused_seconds: session.pausedSeconds,
    status: session.status,
    client_at: session.clientAt?.toISOString() ?? null,
    received_at: session.receivedAt.toISOString()
  }
}

export function serializeClient(client: Client): {
  id: string
  team_id: string
  name: string
  created_at: string
} {
  return {
    id: client.id,
    team_id: client.teamId,
    name: client.name,
    created_at: client.createdAt.toISOString()
  }
}

export function serializeProject(
  project: Project & { client?: Client | null }
): {
  id: string
  team_id: string
  client_id: string | null
  client_name: string | null
  name: string
  archived: boolean
  created_at: string
} {
  return {
    id: project.id,
    team_id: project.teamId,
    client_id: project.clientId,
    client_name: project.client?.name ?? null,
    name: project.name,
    archived: project.archived,
    created_at: project.createdAt.toISOString()
  }
}

export function serializeActivityLog(log: ActivityLog): {
  id: string
  session_id: string
  user_id: string
  bucket_start: string
  keyboard_count: number
  mouse_count: number
  is_idle: boolean
  client_at: string | null
  received_at: string
} {
  return {
    id: log.id,
    session_id: log.sessionId,
    user_id: log.userId,
    bucket_start: log.bucketStart.toISOString(),
    keyboard_count: log.keyboardCount,
    mouse_count: log.mouseCount,
    is_idle: log.isIdle,
    client_at: log.clientAt?.toISOString() ?? null,
    received_at: log.receivedAt.toISOString()
  }
}

export function serializeScreenshot(shot: Screenshot): {
  id: string
  session_id: string
  user_id: string
  taken_at: string
  storage_path: string
  activity_percent: number
} {
  return {
    id: shot.id,
    session_id: shot.sessionId,
    user_id: shot.userId,
    taken_at: shot.takenAt.toISOString(),
    storage_path: shot.storagePath,
    activity_percent: Number(shot.activityPercent)
  }
}
