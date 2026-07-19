import { powerMonitor } from 'electron'
import { EventEmitter } from 'node:events'
import { config } from './config'
import { queueService } from './queue'

type HookApi = EventEmitter & {
  start: () => void
  stop: () => void
}

let uiohook: HookApi | null = null
let hookAvailable = false
let loadAttempted = false

function tryLoadHook(): void {
  if (loadAttempted) return
  loadAttempted = true
  try {
    // Optional native module — needs libxt-dev / libxtst-dev on Linux to build.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('uiohook-napi') as { uIOhook: HookApi }
    uiohook = mod.uIOhook
    hookAvailable = true
  } catch {
    uiohook = null
    hookAvailable = false
  }
}

let sessionId: string | null = null
let keyboardCount = 0
let mouseCount = 0
let flushTimer: NodeJS.Timeout | null = null
let idleFlag = false

// Activity-level interval accounting (scrin.io method). Every activityIntervalMs
// the OS idle time is sampled: the window counts as one interval, "active" if any
// input happened during it. These accumulate until the next screenshot consumes
// them, giving activity_percent = active / total for that screenshot's span.
let sampleTimer: NodeJS.Timeout | null = null
let activeIntervals = 0
let totalIntervals = 0

function sampleInterval(): void {
  if (!sessionId) return
  // Skip paused / idle-flagged time so it does not drag the score down.
  if (idleFlag) return

  const intervalSeconds = config.activityIntervalMs / 1000
  const idleSeconds = powerMonitor.getSystemIdleTime()

  totalIntervals += 1
  if (idleSeconds < intervalSeconds) {
    activeIntervals += 1
  }
}

function flushBucket(): void {
  if (!sessionId) return

  const now = new Date()
  const bucketStart = new Date(now)
  bucketStart.setSeconds(0, 0)

  queueService.enqueueActivity({
    session_id: sessionId,
    bucket_start: bucketStart.toISOString(),
    keyboard_count: keyboardCount,
    mouse_count: mouseCount,
    is_idle: idleFlag ? 1 : 0,
    client_at: now.toISOString()
  })

  keyboardCount = 0
  mouseCount = 0
}

export const activityService = {
  isHookAvailable(): boolean {
    tryLoadHook()
    return hookAvailable
  },

  start(nextSessionId: string): void {
    tryLoadHook()
    sessionId = nextSessionId
    keyboardCount = 0
    mouseCount = 0
    idleFlag = false
    activeIntervals = 0
    totalIntervals = 0

    if (uiohook && hookAvailable) {
      uiohook.removeAllListeners()
      uiohook.on('keydown', () => {
        keyboardCount += 1
      })
      uiohook.on('mousedown', () => {
        mouseCount += 1
      })
      uiohook.on('mousemove', () => {
        mouseCount += 1
      })
      uiohook.on('wheel', () => {
        mouseCount += 1
      })
      uiohook.start()
    }

    flushTimer = setInterval(() => flushBucket(), config.activityBucketMs)
    sampleTimer = setInterval(() => sampleInterval(), config.activityIntervalMs)
  },

  setIdle(isIdle: boolean): void {
    idleFlag = isIdle
  },

  stop(): void {
    if (flushTimer) {
      clearInterval(flushTimer)
      flushTimer = null
    }
    if (sampleTimer) {
      clearInterval(sampleTimer)
      sampleTimer = null
    }
    flushBucket()
    sessionId = null

    if (uiohook && hookAvailable) {
      try {
        uiohook.stop()
      } catch {
        // ignore stop errors from native hook
      }
    }
  },

  peekCounts(): { keyboard: number; mouse: number } {
    return { keyboard: keyboardCount, mouse: mouseCount }
  },

  /**
   * Returns the activity level for the span since the last call and resets the
   * counters, so each screenshot measures only its own window:
   *   activity_percent = active intervals / total intervals * 100
   */
  consumeActivityWindow(): {
    activeIntervals: number
    totalIntervals: number
    activityPercent: number
  } {
    const active = activeIntervals
    const total = totalIntervals
    activeIntervals = 0
    totalIntervals = 0

    const activityPercent =
      total > 0 ? Math.round((active / total) * 100) : 0

    return { activeIntervals: active, totalIntervals: total, activityPercent }
  }
}
