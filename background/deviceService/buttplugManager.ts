import { ButtplugDevice, ButtplugConnectionType, ScriptData } from 'ive-connect'
import { DeviceServiceState } from '../types'

export class ButtplugManager {
  device: ButtplugDevice | null = null

  setupListeners(
    state: DeviceServiceState,
    saveState: () => Promise<void>,
    broadcastState: (extra?: { error?: string | null }) => Promise<void>,
  ): void {
    if (!this.device) return

    this.device.on('connected', async (deviceInfo) => {
      console.log('Intiface connected:', deviceInfo)
      state.buttplugConnected = true
      await saveState()
      await broadcastState()
    })

    this.device.on('disconnected', async () => {
      console.log('Intiface disconnected')
      state.buttplugConnected = false
      await saveState()
      await broadcastState()
    })

    this.device.on('error', async (error) => {
      const errorMessage = typeof error === 'string' ? error : String(error)
      console.error('Intiface error:', errorMessage)
      await broadcastState({ error: `Intiface: ${errorMessage}` })
    })

    this.device.on('deviceAdded', async () => {
      console.log('Intiface device added')
      await broadcastState()
    })

    this.device.on('deviceRemoved', async () => {
      console.log('Intiface device removed')
      await broadcastState()
    })

    this.device.on(
      'playbackStateChanged',
      async (playbackState: { isPlaying: boolean }) => {
        console.log('Intiface playback state changed:', playbackState)
        await broadcastState()
      },
    )
  }

  async connect(
    serverUrl: string,
    state: DeviceServiceState,
    saveState: () => Promise<void>,
    broadcastState: (extra?: { error?: string | null }) => Promise<void>,
    loadScriptToDevice: (
      device: ButtplugDevice,
      scriptData: ScriptData,
    ) => Promise<boolean>,
    lastLoadedScript: ScriptData | null,
    isPlaying: boolean,
  ): Promise<boolean> {
    try {
      state.buttplugServerUrl = serverUrl
      await saveState()

      if (!this.device) {
        this.device = new ButtplugDevice({
          connectionType: ButtplugConnectionType.WEBSOCKET,
          serverUrl: serverUrl,
          clientName: 'IVE-Extension',
        })

        this.setupListeners(state, saveState, broadcastState)
      } else {
        await this.device.updateConfig({
          connectionType: ButtplugConnectionType.WEBSOCKET,
          serverUrl: serverUrl,
        })
      }

      const success = await this.device.connect()

      if (success) {
        state.buttplugConnected = true
        await saveState()
        await broadcastState()

        if (!isPlaying && lastLoadedScript) {
          await loadScriptToDevice(this.device, lastLoadedScript)
        }

        return true
      }

      throw new Error('Failed to connect to Intiface server')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error connecting to Intiface server:', errorMessage)

      state.buttplugConnected = false
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
      state.buttplugConnected = false
      await saveState()
      await broadcastState()
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error disconnecting from Intiface server:', errorMessage)
      throw error
    }
  }

  async updateSettings(
    settings: { stroke?: { min: number; max: number } },
    state: DeviceServiceState,
    saveState: () => Promise<void>,
    broadcastState: () => Promise<void>,
  ): Promise<boolean> {
    if (!this.device) return false

    try {
      if (settings.stroke) {
        state.buttplugSettings.stroke = settings.stroke
      }

      await this.device.updateConfig({
        strokeRange: settings.stroke,
      })

      await saveState()
      await broadcastState()
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error updating Buttplug settings:', errorMessage)
      throw error
    }
  }

  async scan(state: DeviceServiceState): Promise<boolean> {
    if (!this.device || !state.buttplugConnected) {
      throw new Error('Intiface not connected')
    }

    try {
      interface ButtplugAPI {
        startScanning: () => Promise<boolean>
      }

      const device = this.device as unknown as { _api?: ButtplugAPI }

      if (device._api && typeof device._api.startScanning === 'function') {
        return await device._api.startScanning()
      }

      throw new Error('Unable to start scanning')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error scanning for Intiface devices:', errorMessage)
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
    return state.buttplugConnected
  }
}
