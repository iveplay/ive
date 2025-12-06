import { DeviceServiceState } from '../types'
import { ButtplugManager } from './buttplugManager'
import { HandyManager } from './handyManager'

export class PlaybackManager {
  private syncTimeouts: NodeJS.Timeout[] = []

  isPlaying = false
  currentTimeMs = 0
  playbackRate = 1.0
  volume = 1.0
  muted = false
  duration = 0
  loop = false

  async play(
    timeMs: number,
    playbackRate: number,
    duration: number,
    loop: boolean,
    state: DeviceServiceState,
    handyManager: HandyManager,
    buttplugManager: ButtplugManager,
  ): Promise<boolean> {
    this.currentTimeMs = timeMs
    this.playbackRate = playbackRate
    this.duration = duration
    this.loop = loop

    const results: Record<string, boolean> = {}

    if (state.handyConnected) {
      try {
        results['handy'] = await handyManager.play(timeMs, playbackRate, loop)
      } catch (error) {
        console.error('Error playing script on Handy:', error)
        results['handy'] = false
      }
    }

    if (state.buttplugConnected) {
      try {
        results['buttplug'] = await buttplugManager.play(
          timeMs,
          playbackRate,
          loop,
        )
      } catch (error) {
        console.error('Error playing script on Intiface:', error)
        results['buttplug'] = false
      }
    }

    const successCount = Object.values(results).filter(Boolean).length

    if (successCount > 0) {
      this.isPlaying = true
      this.setupSyncTimeouts(state, handyManager)
      return true
    }

    return false
  }

  async stop(
    handyManager: HandyManager,
    buttplugManager: ButtplugManager,
  ): Promise<void> {
    this.clearSyncTimeouts()
    await handyManager.stop()
    await buttplugManager.stop()
    this.isPlaying = false
  }

  private setupSyncTimeouts(
    state: DeviceServiceState,
    handyManager: HandyManager,
  ): void {
    this.clearSyncTimeouts()

    if (!state.handyConnected) return

    this.syncTimeouts.push(
      setTimeout(() => {
        if (this.isPlaying) handyManager.syncTime(this.currentTimeMs, 0.9)
      }, 2000),
    )

    this.syncTimeouts.push(
      setTimeout(() => {
        if (this.isPlaying) {
          handyManager.syncTime(this.currentTimeMs, 0.5)
          this.syncTimeouts.push(
            setInterval(() => {
              if (this.isPlaying) handyManager.syncTime(this.currentTimeMs, 0.5)
            }, 15000),
          )
        }
      }, 17000),
    )
  }

  clearSyncTimeouts(): void {
    this.syncTimeouts.forEach((t) => clearTimeout(t))
    this.syncTimeouts = []
  }

  updateTime(timeMs: number): void {
    this.currentTimeMs = timeMs
  }

  updateDuration(duration: number): void {
    this.duration = duration
  }

  updatePlaybackRate(rate: number): void {
    this.playbackRate = rate
  }

  updateVolume(volume: number, muted: boolean): void {
    this.volume = volume
    this.muted = muted
  }

  updateLoop(loop: boolean): void {
    this.loop = loop
  }

  reset(): void {
    this.clearSyncTimeouts()
    this.isPlaying = false
    this.currentTimeMs = 0
    this.playbackRate = 1.0
    this.duration = 0
    this.loop = false
  }

  getState() {
    return {
      isPlaying: this.isPlaying,
      currentTimeMs: this.currentTimeMs,
      playbackRate: this.playbackRate,
      volume: this.volume,
      muted: this.muted,
      duration: this.duration,
      loop: this.loop,
    }
  }
}
