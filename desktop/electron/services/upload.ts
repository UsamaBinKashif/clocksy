import { readFile, unlink } from 'node:fs/promises'
import { basename } from 'node:path'
import { config } from './config'
import { authService } from './auth'
import { queueService } from './queue'

let running = false
let loopTimer: NodeJS.Timeout | null = null
let backoffMs = 2000

async function postJson(
  path: string,
  body: unknown,
  token: string
): Promise<Response> {
  return fetch(`${config.backendUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  })
}

async function drainActivity(token: string): Promise<boolean> {
  const rows = queueService.dequeuePendingActivity(50)
  if (rows.length === 0) return true

  const payload = rows.map((row) => ({
    session_id: row.session_id,
    bucket_start: row.bucket_start,
    keyboard_count: row.keyboard_count,
    mouse_count: row.mouse_count,
    is_idle: row.is_idle === 1,
    client_at: row.client_at
  }))

  try {
    const res = await postJson('/activity', payload, token)
    if (!res.ok) return false
    queueService.confirmActivity(rows.map((r) => r.id))
    return true
  } catch {
    return false
  }
}

interface UploadUrlResponse {
  url: string
  key: string
}

/**
 * Uploads queued screenshots to object storage via a backend-issued presigned
 * PUT URL, then registers metadata with the backend.
 */
async function drainScreenshots(token: string): Promise<boolean> {
  const user = authService.getUser()
  if (!user) return false

  const rows = queueService.dequeuePendingScreenshots(5)
  if (rows.length === 0) return true

  for (const row of rows) {
    try {
      const file = await readFile(row.file_path)
      const fileName = basename(row.file_path)

      // 1) Ask the backend for a presigned PUT URL scoped to this user.
      const urlRes = await postJson(
        '/screenshots/upload-url',
        { session_id: row.session_id, file_name: fileName },
        token
      )
      if (!urlRes.ok) return false
      const { url, key } = (await urlRes.json()) as UploadUrlResponse

      // 2) Upload the JPEG bytes straight to storage.
      const putRes = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: file
      })
      if (!putRes.ok) return false

      // 3) Register the metadata (storage_path = the presigned key).
      const register = await postJson(
        '/screenshots/register',
        {
          session_id: row.session_id,
          taken_at: row.taken_at,
          storage_path: key,
          activity_percent: row.activity_percent
        },
        token
      )

      // 200 = registered; if backend is down keep local file for retry next tick
      if (!register.ok) {
        return false
      }

      queueService.confirmScreenshot(row.id)
      try {
        await unlink(row.file_path)
      } catch {
        // best-effort local cleanup
      }
    } catch {
      return false
    }
  }

  return true
}

async function tick(): Promise<void> {
  if (!running) return

  const token = authService.getAccessToken()
  if (!token) return

  const activityOk = await drainActivity(token)
  const shotsOk = await drainScreenshots(token)

  if (activityOk && shotsOk) {
    backoffMs = 2000
  } else {
    backoffMs = Math.min(backoffMs * 2, 60_000)
  }

  loopTimer = setTimeout(() => {
    void tick()
  }, backoffMs)
}

export const uploadService = {
  start(): void {
    if (running) return
    running = true
    backoffMs = 2000
    void tick()
  },

  stop(): void {
    running = false
    if (loopTimer) {
      clearTimeout(loopTimer)
      loopTimer = null
    }
  }
}
