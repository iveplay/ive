import { HandyDevice } from 'ive-connect'
import { DeviceServiceState } from '../types'

export class HandyManager {
  device: HandyDevice | null = null

  setupListeners(
    state: DeviceServiceState,
    saveState: () => Promise<void>,
    broadcastState: (extra?: { error?: string | null }) => Promise<void>,
  ): void {
    if (!this.device) return

    this.device.on('connected', async (deviceInfo) => {
      console.log('Handy connected:', deviceInfo)
      state.handyConnected = true
      await saveState()
      await broadcastState()
    })

    this.device.on('disconnected', async () => {
      console.log('Handy disconnected')
      state.handyConnected = false
      await saveState()
      await broadcastState()
    })

    this.device.on('error', async (error) => {
      const errorMessage = typeof error === 'string' ? error : String(error)
      console.error('Handy error:', errorMessage)
      await broadcastState({ error: `Handy: ${errorMessage}` })
    })

    this.device.on(
      'playbackStateChanged',
      async (playbackState: { isPlaying: boolean }) => {
        console.log('Handy playback state changed:', playbackState)
        await broadcastState()
      },
    )
  }

  async connect(
    connectionKey: string,
    state: DeviceServiceState,
    saveState: () => Promise<void>,
    broadcastState: (extra?: { error?: string | null }) => Promise<void>,
  ): Promise<boolean> {
    try {
      state.handyConnectionKey = connectionKey
      await saveState()

      if (!this.device) {
        this.device = new HandyDevice({
          connectionKey,
          applicationId: 'h_Jw26kJiyU3JZ2vV_X5TYutefunJJKe',
        })

        this.setupListeners(state, saveState, broadcastState)
      } else {
        await this.device.updateConfig({ connectionKey })
      }

      const success = await this.device.connect()

      if (success) {
        state.handyConnected = true
        await saveState()
        await broadcastState()
        return true
      }

      throw new Error('Failed to connect to Handy')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error connecting to Handy:', errorMessage)

      state.handyConnected = false
      await saveState()
      await broadcastState()
      throw error
    }
  }

  async disconnect(
    state: DeviceServiceState,
    saveState: () => Promise<void>,
    broadcastState: () => Promise<void>,
  ): Promise<boolean> {
    if (!this.device) return false

    try {
      await this.device.disconnect()
      state.handyConnected = false
      await saveState()
      await broadcastState()
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error disconnecting Handy:', errorMessage)
      throw error
    }
  }

  async updateSettings(
    settings: { offset?: number; stroke?: { min: number; max: number } },
    state: DeviceServiceState,
    saveState: () => Promise<void>,
    broadcastState: () => Promise<void>,
  ): Promise<boolean> {
    if (!this.device) return false

    try {
      const config: { offset?: number; stroke?: { min: number; max: number } } =
        {}

      if (settings.offset !== undefined) {
        config.offset = settings.offset
        state.handySettings.offset = settings.offset
      }

      if (settings.stroke) {
        config.stroke = settings.stroke
        state.handySettings.stroke = settings.stroke
      }

      await this.device.updateConfig(config)
      await saveState()
      await broadcastState()
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error updating Handy settings:', errorMessage)
      throw error
    }
  }

  async play(
    timeMs: number,
    playbackRate: number,
    loop: boolean,
  ): Promise<boolean> {
    if (!this.device) return false
    return await this.device.play(timeMs, playbackRate, loop)
  }

  async stop(): Promise<void> {
    if (this.device) {
      await this.device.stop()
    }
  }

  async syncTime(timeMs: number, filter: number): Promise<void> {
    if (this.device) {
      await this.device.syncTime(timeMs, filter)
    }
  }

  getDeviceInfo() {
    return this.device?.getDeviceInfo() || null
  }

  isConnected(state: DeviceServiceState): boolean {
    return state.handyConnected
  }
}
