import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'

export interface PendingActivity {
  id: number
  session_id: string
  bucket_start: string
  keyboard_count: number
  mouse_count: number
  is_idle: number
  client_at: string
}

export interface PendingScreenshot {
  id: number
  session_id: string
  file_path: string
  taken_at: string
  activity_percent: number
}

let db: Database.Database | null = null

function getDb(): Database.Database {
  if (db) return db

  const dir = join(app.getPath('userData'), 'clocksy')
  mkdirSync(dir, { recursive: true })
  db = new Database(join(dir, 'queue.sqlite'))
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      bucket_start TEXT NOT NULL,
      keyboard_count INTEGER NOT NULL,
      mouse_count INTEGER NOT NULL,
      is_idle INTEGER NOT NULL DEFAULT 0,
      client_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pending_screenshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      taken_at TEXT NOT NULL,
      activity_percent REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS daily_totals (
      day TEXT PRIMARY KEY,
      seconds INTEGER NOT NULL DEFAULT 0
    );
  `)

  return db
}

export const queueService = {
  enqueueActivity(row: Omit<PendingActivity, 'id'>): void {
    getDb()
      .prepare(
        `INSERT INTO pending_activity
         (session_id, bucket_start, keyboard_count, mouse_count, is_idle, client_at)
         VALUES (@session_id, @bucket_start, @keyboard_count, @mouse_count, @is_idle, @client_at)`
      )
      .run(row)
  },

  dequeuePendingActivity(limit = 50): PendingActivity[] {
    return getDb()
      .prepare(
        `SELECT * FROM pending_activity ORDER BY id ASC LIMIT ?`
      )
      .all(limit) as PendingActivity[]
  },

  confirmActivity(ids: number[]): void {
    if (ids.length === 0) return
    const placeholders = ids.map(() => '?').join(',')
    getDb()
      .prepare(`DELETE FROM pending_activity WHERE id IN (${placeholders})`)
      .run(...ids)
  },

  enqueueScreenshot(row: Omit<PendingScreenshot, 'id'>): void {
    getDb()
      .prepare(
        `INSERT INTO pending_screenshots
         (session_id, file_path, taken_at, activity_percent)
         VALUES (@session_id, @file_path, @taken_at, @activity_percent)`
      )
      .run(row)
  },

  dequeuePendingScreenshots(limit = 10): PendingScreenshot[] {
    return getDb()
      .prepare(
        `SELECT * FROM pending_screenshots ORDER BY id ASC LIMIT ?`
      )
      .all(limit) as PendingScreenshot[]
  },

  confirmScreenshot(id: number): void {
    getDb().prepare(`DELETE FROM pending_screenshots WHERE id = ?`).run(id)
  },

  addTodaySeconds(seconds: number): void {
    if (seconds <= 0) return
    const day = new Date().toISOString().slice(0, 10)
    getDb()
      .prepare(
        `INSERT INTO daily_totals (day, seconds) VALUES (?, ?)
         ON CONFLICT(day) DO UPDATE SET seconds = seconds + excluded.seconds`
      )
      .run(day, Math.floor(seconds))
  },

  getTodaySeconds(): number {
    const day = new Date().toISOString().slice(0, 10)
    const row = getDb()
      .prepare(`SELECT seconds FROM daily_totals WHERE day = ?`)
      .get(day) as { seconds: number } | undefined
    return row?.seconds ?? 0
  }
}
