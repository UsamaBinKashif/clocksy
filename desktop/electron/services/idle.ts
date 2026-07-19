import { powerMonitor } from 'electron'
import { EventEmitter } from 'node:events'
import { config } from './config'

export type IdleEvents = {
  idle: []
  active: []
}

class IdleService extends EventEmitter {
  private timer: NodeJS.Timeout | null = null
  private isIdle = false

  start(thresholdSeconds = config.idleThresholdSeconds): void {
    this.stop()
    this.isIdle = false

    this.timer = setInterval(() => {
      const idleSeconds = powerMonitor.getSystemIdleTime()
      if (!this.isIdle && idleSeconds >= thresholdSeconds) {
        this.isIdle = true
        this.emit('idle')
      } else if (this.isIdle && idleSeconds < thresholdSeconds) {
        this.isIdle = false
        this.emit('active')
      }
    }, config.idlePollMs)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.isIdle = false
  }
}

export const idleService = new IdleService()
