/**
 * Generate haptic patterns from audio features
 */
import { AudioFeatures } from './AudioProcessor'

export class HapticGenerator {
  private position = 0
  private targetPosition = 100

  // Settings
  private minIntensity = 50
  private maxIntensity = 100
  private strokeSpeed = 200
  private smoothing = 0.7

  // Energy tracking
  private smoothedEnergy = 0
  private smoothedBeatDensity = 0

  // Pattern state
  private currentLow = 0
  private currentHigh = 100
  private isStroking = false
  private strokePhase = 0
  private currentSpeed = 100

  update(features: AudioFeatures): number {
    const { energy, isBeat, beatDensity } = features

    // Smooth energy and beat density
    this.smoothedEnergy =
      this.smoothing * this.smoothedEnergy + (1 - this.smoothing) * energy
    this.smoothedBeatDensity =
      0.95 * this.smoothedBeatDensity + 0.05 * beatDensity

    // Calculate stroke range based on energy
    const amplitude =
      this.minIntensity +
      (this.maxIntensity - this.minIntensity) * this.smoothedEnergy
    this.currentLow = Math.max(0, 50 - amplitude / 2)
    this.currentHigh = Math.min(100, 50 + amplitude / 2)

    // Calculate speed
    const densityMultiplier = 0.5 + Math.min(this.smoothedBeatDensity / 4, 0.8)
    const energyMultiplier =
      0.2 + this.smoothedEnergy * this.smoothedEnergy * 1.8
    this.currentSpeed = this.strokeSpeed * densityMultiplier * energyMultiplier

    // On beat: trigger direction change
    if (isBeat && !this.isStroking) {
      if (this.position < 50) {
        this.position = this.currentLow
        this.targetPosition = this.currentHigh
        this.strokePhase = 0
      } else {
        this.targetPosition = this.currentLow
        this.strokePhase = 1
      }
      this.isStroking = true
    }

    // Calculate movement
    const deltaTime = 1 / 60
    const speed = (this.currentSpeed / 100) * deltaTime * 100
    const diff = this.targetPosition - this.position

    if (Math.abs(diff) > speed) {
      this.position += Math.sign(diff) * speed
    } else {
      this.position = this.targetPosition

      if (this.isStroking) {
        if (this.strokePhase === 0) {
          this.targetPosition = this.currentLow
          this.strokePhase = 1
        } else if (this.strokePhase === 1) {
          const didDownstrokeFirst = this.position <= 50
          if (didDownstrokeFirst) {
            this.targetPosition = this.currentHigh
            this.strokePhase = 2
          } else {
            this.isStroking = false
            this.targetPosition = this.currentHigh
          }
        } else {
          this.isStroking = false
          this.targetPosition = this.currentLow
        }
      } else {
        // Free oscillation
        if (this.position <= this.currentLow + 5) {
          this.targetPosition = this.currentHigh
        } else if (this.position >= this.currentHigh - 5) {
          this.targetPosition = this.currentLow
        }
      }
    }

    this.position = Math.max(0, Math.min(100, this.position))
    return Math.round(this.position)
  }

  updateSettings(settings: {
    minIntensity?: number
    maxIntensity?: number
    strokeSpeed?: number
  }): void {
    if (settings.minIntensity !== undefined) {
      this.minIntensity = Math.max(50, settings.minIntensity)
    }
    if (settings.maxIntensity !== undefined) {
      this.maxIntensity = settings.maxIntensity
    }
    if (settings.strokeSpeed !== undefined) {
      this.strokeSpeed = settings.strokeSpeed
    }
  }

  reset(): void {
    this.position = 0
    this.targetPosition = 100
    this.smoothedEnergy = 0
    this.smoothedBeatDensity = 0
    this.isStroking = false
    this.strokePhase = 0
    this.currentSpeed = 100
  }

  getPosition(): number {
    return Math.round(this.position)
  }
}
