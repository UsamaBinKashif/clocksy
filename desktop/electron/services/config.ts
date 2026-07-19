function optionalEnv(key: string, fallback: string): string {
  return process.env[key] || fallback
}

export const config = {
  get backendUrl(): string {
    return optionalEnv(
      'BACKEND_URL',
      optionalEnv('VITE_BACKEND_URL', 'http://localhost:3001')
    )
  },
  /** Default 15 minutes. Override with SCREENSHOT_INTERVAL_MS for local testing. */
  get screenshotIntervalMs(): number {
    const raw = process.env.SCREENSHOT_INTERVAL_MS
    if (!raw) return 15 * 60 * 1000
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 15 * 60 * 1000
  },
  activityBucketMs: 60_000,
  // Activity-level sampling window: one 10s interval is "active" if any input
  // occurred during it (scrin.io-style measurement).
  activityIntervalMs: 10_000,
  idlePollMs: 30_000,
  idleThresholdSeconds: 300
}
