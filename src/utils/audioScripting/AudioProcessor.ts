/**
 * Real-time audio processing for beat detection
 */

// Constants
const BUFFER_LENGTH = 2048
const HISTORY_LENGTH = 43 // ~430ms at 10ms intervals
const BEAT_HISTORY_WINDOW = 3000 // 3 second window
const BASS_FREQ_MIN = 20
const BASS_FREQ_MAX = 250

export interface AudioFeatures {
  energy: number
  bass: number
  isBeat: boolean
  beatStrength: number
  beatCount: number
  beatDensity: number
}

interface EnergyHistoryEntry {
  time: number
  energy: number
  bass: number
}

export class AudioProcessor {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaElementAudioSourceNode | null = null
  private sourceConnected = false

  private dataArray: Uint8Array<ArrayBuffer> | null = null
  private freqData: Uint8Array<ArrayBuffer> | null = null

  private energyHistory: EnergyHistoryEntry[] = []
  private beatHistory: number[] = []
  private lastBeatTime = 0
  private beatCount = 0

  // Settings
  private sensitivity = 1.2
  private minBeatGap = 100
  private energyBoost = 1.0

  async init(audioElement: HTMLMediaElement): Promise<boolean> {
    this.audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)()

    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = BUFFER_LENGTH
    this.analyser.smoothingTimeConstant = 0.1

    if (!this.sourceConnected) {
      this.source = this.audioContext.createMediaElementSource(audioElement)
      this.source.connect(this.analyser)
      this.analyser.connect(this.audioContext.destination)
      this.sourceConnected = true
    }

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount)

    return true
  }

  getFeatures(): AudioFeatures | null {
    if (!this.analyser || !this.dataArray || !this.freqData) return null

    this.analyser.getByteTimeDomainData(this.dataArray)
    this.analyser.getByteFrequencyData(this.freqData)

    // Calculate RMS energy
    let sum = 0
    for (let i = 0; i < this.dataArray.length; i++) {
      const normalized = (this.dataArray[i] - 128) / 128
      sum += normalized * normalized
    }
    let energy = Math.sqrt(sum / this.dataArray.length)
    energy = Math.min(1.0, energy * this.energyBoost)

    // Calculate bass energy
    const sampleRate = this.audioContext!.sampleRate
    const binSize = sampleRate / BUFFER_LENGTH
    const bassStart = Math.floor(BASS_FREQ_MIN / binSize)
    const bassEnd = Math.floor(BASS_FREQ_MAX / binSize)

    let bassSum = 0
    for (let i = bassStart; i < bassEnd; i++) {
      bassSum += this.freqData[i] / 255
    }
    const bass = bassSum / (bassEnd - bassStart)

    // Store in history
    const now = performance.now()
    this.energyHistory.push({ time: now, energy, bass })
    if (this.energyHistory.length > HISTORY_LENGTH) {
      this.energyHistory.shift()
    }

    // Clean old beats
    this.beatHistory = this.beatHistory.filter(
      (t) => now - t < BEAT_HISTORY_WINDOW,
    )

    // Detect beat
    const beatInfo = this.detectBeat(energy, now)
    const beatDensity = this.beatHistory.length / (BEAT_HISTORY_WINDOW / 1000)

    return {
      energy,
      bass,
      isBeat: beatInfo.isBeat,
      beatStrength: beatInfo.strength,
      beatCount: this.beatCount,
      beatDensity,
    }
  }

  private detectBeat(
    energy: number,
    now: number,
  ): { isBeat: boolean; strength: number } {
    if (this.energyHistory.length < 20) {
      return { isBeat: false, strength: 0 }
    }

    let localSum = 0
    for (let i = 0; i < this.energyHistory.length; i++) {
      localSum += this.energyHistory[i].energy
    }
    const localAvg = localSum / this.energyHistory.length

    const onset = energy - localAvg
    const threshold = localAvg * this.sensitivity * 0.4

    if (now - this.lastBeatTime < this.minBeatGap) {
      return { isBeat: false, strength: 0 }
    }

    if (onset > threshold && energy > 0.1) {
      if (this.energyHistory.length >= 3) {
        const prev = this.energyHistory[this.energyHistory.length - 2]
        const isPeak = energy >= prev.energy && energy > 0.15

        if (isPeak) {
          this.lastBeatTime = now
          this.beatCount++
          this.beatHistory.push(now)
          const strength = Math.min(1, onset / localAvg)
          return { isBeat: true, strength }
        }
      }
    }

    return { isBeat: false, strength: 0 }
  }

  updateSettings(settings: {
    sensitivity?: number
    minBeatGap?: number
    energyBoost?: number
  }): void {
    if (settings.sensitivity !== undefined)
      this.sensitivity = settings.sensitivity
    if (settings.minBeatGap !== undefined) this.minBeatGap = settings.minBeatGap
    if (settings.energyBoost !== undefined)
      this.energyBoost = settings.energyBoost
  }

  reset(): void {
    this.energyHistory = []
    this.beatHistory = []
    this.lastBeatTime = 0
    this.beatCount = 0
  }

  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  suspend(): void {
    // Don't actually suspend - it kills audio playback!
    // Just reset state, the context must stay running
    this.reset()
  }

  isInitialized(): boolean {
    return this.sourceConnected
  }
}
