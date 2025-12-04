import { MESSAGES } from '@background/types'
import Meyda from 'meyda'

interface MeydaFeatures {
  rms: number
}

class AudioSyncService {
  private meyda: Meyda.MeydaAnalyzer | null = null
  private audioContext: AudioContext | null = null
  private isActive = false

  // Beat detection
  private energyHistory: number[] = []
  private beatTimes: number[] = []
  private lastBeatTime = 0

  // Stroke state
  private isStroking = false
  private strokeDirection: 'up' | 'down' = 'up'

  async start(videoElement: HTMLVideoElement): Promise<void> {
    if (this.isActive) return

    this.audioContext = new AudioContext()
    const source = this.audioContext.createMediaElementSource(videoElement)
    source.connect(this.audioContext.destination)

    this.meyda = Meyda.createMeydaAnalyzer({
      audioContext: this.audioContext,
      source: source,
      bufferSize: 1024,
      featureExtractors: ['rms'],
      callback: (features: MeydaFeatures) => this.onAudioFeatures(features),
    })

    this.meyda.start()
    this.isActive = true
    console.log('[AudioSync] Started')
  }

  stop(): void {
    if (this.meyda) {
      this.meyda.stop()
      this.meyda = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.isActive = false
    this.isStroking = false
    this.energyHistory = []
    this.beatTimes = []
    console.log('[AudioSync] Stopped')
  }

  private onAudioFeatures(features: MeydaFeatures): void {
    const { rms } = features

    this.energyHistory.push(rms)
    if (this.energyHistory.length > 43) {
      this.energyHistory.shift()
    }

    if (this.energyHistory.length < 15) return

    const avgEnergy =
      this.energyHistory.reduce((a, b) => a + b) / this.energyHistory.length
    const currentTime = Date.now()
    const timeSinceLastBeat = currentTime - this.lastBeatTime

    // Beat detection
    const threshold = avgEnergy * 1.4
    const minInterval = 180

    if (
      rms > threshold &&
      timeSinceLastBeat > minInterval &&
      !this.isStroking
    ) {
      this.beatTimes.push(currentTime)
      if (this.beatTimes.length > 6) this.beatTimes.shift()
      this.lastBeatTime = currentTime

      this.executeFullStroke(rms, avgEnergy)
    }
  }

  private async executeFullStroke(
    energy: number,
    avgEnergy: number,
  ): Promise<void> {
    if (this.isStroking) return
    this.isStroking = true

    // Calculate duration from beat interval (time for FULL up-down stroke)
    let fullStrokeDuration = 400
    if (this.beatTimes.length >= 2) {
      const intervals: number[] = []
      for (let i = 1; i < this.beatTimes.length; i++) {
        intervals.push(this.beatTimes[i] - this.beatTimes[i - 1])
      }
      const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length
      // Full stroke should complete just before next beat
      fullStrokeDuration = Math.max(200, Math.min(avgInterval * 0.9, 800))
    }

    const halfDuration = Math.round(fullStrokeDuration / 2)

    // Calculate stroke range from energy
    const energyRatio = energy / avgEnergy
    const range = Math.min(15 + (energyRatio - 1) * 30, 48)

    const topPos = Math.round(50 + range)
    const bottomPos = Math.round(50 - range)

    const bpm =
      this.beatTimes.length >= 2
        ? Math.round(
            60000 /
              (this.beatTimes[this.beatTimes.length - 1] -
                this.beatTimes[this.beatTimes.length - 2]),
          )
        : 0

    console.log('[AudioSync] Stroke:', {
      range: `${bottomPos}-${topPos}`,
      duration: halfDuration * 2,
      bpm,
    })

    // Execute full stroke: up then down (or vice versa)
    const firstPos = this.strokeDirection === 'up' ? topPos : bottomPos
    const secondPos = this.strokeDirection === 'up' ? bottomPos : topPos

    // First half
    await this.sendPosition(firstPos, halfDuration)
    await this.sleep(halfDuration)

    // Second half
    await this.sendPosition(secondPos, halfDuration)
    await this.sleep(halfDuration)

    // Alternate starting direction for next beat
    this.strokeDirection = this.strokeDirection === 'up' ? 'down' : 'up'
    this.isStroking = false
  }

  private sendPosition(position: number, duration: number): Promise<void> {
    return chrome.runtime
      .sendMessage({
        type: MESSAGES.BUTTPLUG_SET_POSITION,
        position,
        duration,
      })
      .catch(console.error) as Promise<void>
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export const audioSyncService = new AudioSyncService()
