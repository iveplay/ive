import { AutoblowDevice, ScriptData } from 'ive-connect'
import { DeviceServiceState } from '../types'

export class AutoblowManager {
  device: AutoblowDevice | null = null

  setupListeners(
    state: DeviceServiceState,
    saveState: () => Promise<void>,
    broadcastState: (extra?: { error?: string | null }) => Promise<void>,
  ): void {
    if (!this.device) return

    this.device.on('connected', async (deviceInfo) => {
      console.log('Autoblow connected:', deviceInfo)
      state.autoblowConnected = true
      await saveState()
      await broadcastState()
    })

    this.device.on('disconnected', async () => {
      console.log('Autoblow disconnected')
      state.autoblowConnected = false
      await saveState()
      await broadcastState()
    })

    this.device.on('error', async (error) => {
      const errorMessage = typeof error === 'string' ? error : String(error)
      console.error('Autoblow error:', errorMessage)
      await broadcastState({ error: `Autoblow: ${errorMessage}` })
    })

    this.device.on(
      'playbackStateChanged',
      async (playbackState: { isPlaying: boolean }) => {
        console.log('Autoblow playback state changed:', playbackState)
        await broadcastState()
      },
    )
  }

  async connect(
    deviceToken: string,
    state: DeviceServiceState,
    saveState: () => Promise<void>,
    broadcastState: (extra?: { error?: string | null }) => Promise<void>,
    loadScriptToDevice: (
      device: AutoblowDevice,
      scriptData: ScriptData,
    ) => Promise<boolean>,
    lastLoadedScript: ScriptData | null,
    isPlaying: boolean,
  ): Promise<boolean> {
    try {
      state.autoblowDeviceToken = deviceToken
      await saveState()

      if (!this.device) {
        this.device = new AutoblowDevice({
          deviceToken,
        })

        this.setupListeners(state, saveState, broadcastState)
      } else {
        await this.device.updateConfig({ deviceToken })
      }

      const success = await this.device.connect()

      if (success) {
        state.autoblowConnected = true
        await saveState()
        await broadcastState()

        if (!isPlaying && lastLoadedScript) {
          await loadScriptToDevice(this.device, lastLoadedScript)
        }

        return true
      }

      throw new Error('Failed to connect to Autoblow')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error connecting to Autoblow:', errorMessage)

      state.autoblowConnected = false
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
      state.autoblowConnected = false
      await saveState()
      await broadcastState()
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error disconnecting Autoblow:', errorMessage)
      throw error
    }
  }

  async updateSettings(
    settings: { offset?: number },
    state: DeviceServiceState,
    saveState: () => Promise<void>,
    broadcastState: () => Promise<void>,
  ): Promise<boolean> {
    if (!this.device) return false

    try {
      if (settings.offset !== undefined) {
        state.autoblowSettings.offset = settings.offset
        await this.device.updateConfig({ offset: settings.offset })
      }

      await saveState()
      await broadcastState()
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error updating Autoblow settings:', errorMessage)
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

  async loadScript(
    scriptData: ScriptData,
    inverted: boolean,
  ): Promise<boolean> {
    if (!this.device) return false
    const result = await this.device.loadScript(scriptData, {
      invertScript: inverted,
    })
    return result.success
  }

  getDeviceInfo() {
    return this.device?.getDeviceInfo() || null
  }

  isConnected(state: DeviceServiceState): boolean {
    return state.autoblowConnected
  }
}
