import { desktopCapturer, screen, app } from 'electron'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import sharp from 'sharp'
import { queueService } from './queue'
import { activityService } from './activity'
import type { CaptureSettings } from './catalog'

let sessionId: string | null = null
let timer: NodeJS.Timeout | null = null
let settings: CaptureSettings | null = null

/**
 * Screenshots are captured at a *random* interval between the team's configured
 * min and max (scrin.io-style), so their timing is unpredictable. A recursive
 * timeout re-rolls the delay after each capture.
 */
function nextIntervalMs(): number {
  const min = settings?.screenshotMinIntervalMs ?? 15 * 60 * 1000
  const max = settings?.screenshotMaxIntervalMs ?? min
  if (max <= min) return min
  return Math.floor(min + Math.random() * (max - min))
}

function scheduleNext(): void {
  timer = setTimeout(() => {
    safeCapture()
    scheduleNext()
  }, nextIntervalMs())
}

async function captureOnce(): Promise<void> {
  if (!sessionId) return

  const primary = screen.getPrimaryDisplay()
  const { width, height } = primary.size
  const scale = primary.scaleFactor || 1

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.floor(width * scale),
      height: Math.floor(height * scale)
    }
  })

  const source =
    sources.find((s) => s.display_id === String(primary.id)) ?? sources[0]

  if (!source) return

  const png = source.thumbnail.toPNG()
  if (!png || png.length === 0) return

  const dir = join(app.getPath('userData'), 'clocksy', 'screenshots')
  mkdirSync(dir, { recursive: true })

  const takenAt = new Date()
  const filePath = join(
    dir,
    `${sessionId}-${takenAt.getTime()}.jpg`
  )

  await sharp(png)
    .resize({ width: 1280, withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toFile(filePath)

  // Activity level for this screenshot's span: active 10s intervals / total.
  const { activityPercent } = activityService.consumeActivityWindow()

  queueService.enqueueScreenshot({
    session_id: sessionId,
    file_path: filePath,
    taken_at: takenAt.toISOString(),
    activity_percent: activityPercent
  })
}

function safeCapture(): void {
  captureOnce().catch((err) => {
    console.error('[screenshot] capture failed:', err)
  })
}

export const screenshotService = {
  start(nextSessionId: string, captureSettings: CaptureSettings): void {
    sessionId = nextSessionId
    settings = captureSettings
    if (timer) clearTimeout(timer)

    // Team setting: screenshots can be turned off entirely.
    if (!captureSettings.screenshotsEnabled) {
      console.log('[screenshot] disabled by team settings')
      return
    }

    console.log(
      `[screenshot] enabled — random interval ${captureSettings.screenshotMinIntervalMs}-${captureSettings.screenshotMaxIntervalMs}ms`
    )
    // Capture once immediately so a screenshot exists early in the session,
    // then continue on a randomised interval.
    safeCapture()
    scheduleNext()
  },

  async stop(): Promise<void> {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    // Take one final capture for the session (only if screenshots are enabled).
    if (settings?.screenshotsEnabled) {
      try {
        await captureOnce()
      } catch {
        // ignore capture errors on stop
      }
    }
    sessionId = null
    settings = null
  },

  /** Manual capture for testing — only while a session is active. */
  async captureNow(): Promise<void> {
    await captureOnce()
  }
}
