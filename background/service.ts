import {
  DeviceManager,
  HandyDevice,
  ButtplugDevice,
  ButtplugConnectionType,
  ScriptData,
} from 'ive-connect'
import { DeviceServiceState, DevicesInfo, Funscript, MESSAGES } from './types'

/**
 * Core service that manages devices and state
 */
class DeviceService {
  private deviceManager: DeviceManager
  private handyDevice: HandyDevice | null = null
  private buttplugDevice: ButtplugDevice | null = null
  private scriptLoaded = false
  private funscript: Funscript | null = null
  private lastLoadedScript: ScriptData | null = null

  // Track which tab has the active script
  private activeScriptTabId: number | null = null

  // Playback state
  private isPlaying = false
  private currentTimeMs = 0
  private playbackRate = 1.0
  private volume = 1.0
  private muted = false
  private duration = 0
  private loop = false

  // Last known states for persistence
  private state: DeviceServiceState = {
    handyConnectionKey: '',
    buttplugServerUrl: 'ws://localhost:12345',
    handyConnected: false,
    buttplugConnected: false,
    scriptUrl: '',
    showHeatmap: false,
    customUrls: [],
    handySettings: {
      offset: 0,
      stroke: { min: 0, max: 1 },
    },
  }

  constructor() {
    this.deviceManager = new DeviceManager()
    this.loadState()
  }

  // Helper method to check if a tab should control scripts
  private shouldControlScript(tabId?: number): boolean {
    // If no script is loaded, no control allowed
    if (!this.scriptLoaded || !this.lastLoadedScript) {
      return false
    }

    // If no active tab is set, allow the first tab to take control
    if (this.activeScriptTabId === null && tabId) {
      this.activeScriptTabId = tabId
      return true
    }

    // Only allow control from the active script tab
    return tabId === this.activeScriptTabId
  }

  // Helper method to get sender tab ID from Chrome API
  private getSenderTabId(
    sender?: chrome.runtime.MessageSender,
  ): number | undefined {
    return sender?.tab?.id
  }

  // State management
  private async loadState(): Promise<void> {
    try {
      const storedState = await chrome.storage.sync.get('ive-state')
      const savedState = storedState['ive-state']

      if (savedState) {
        this.state = JSON.parse(savedState) as DeviceServiceState
      }
    } catch (error) {
      console.error('Error loading state:', error)
    }
  }

  private async saveState(): Promise<void> {
    try {
      await chrome.storage.sync.set({
        'ive-state': JSON.stringify(this.state),
      })
    } catch (error) {
      console.error('Error saving state:', error)
    }
  }

  // Get current state
  public getState(): DeviceServiceState {
    return {
      ...this.state,
      scriptLoaded: this.scriptLoaded,
      funscript: this.funscript,
      isPlaying: this.isPlaying,
      currentTimeMs: this.currentTimeMs,
      playbackRate: this.playbackRate,
      volume: this.volume,
      muted: this.muted,
      duration: this.duration,
      loop: this.loop,
    }
  }

  // Settings
  public async setSettings({
    showHeatmap,
  }: {
    showHeatmap: boolean
  }): Promise<void> {
    this.state.showHeatmap = showHeatmap
    await this.saveState()
    await this.broadcastState()
  }

  public async setCustomUrls(urls: string[]): Promise<void> {
    this.state.customUrls = urls
    await this.saveState()
    await this.broadcastState()
  }

  // Handy device methods
  public async connectHandy(connectionKey: string): Promise<boolean> {
    try {
      // Save to state
      this.state.handyConnectionKey = connectionKey
      await this.saveState()

      // Create device if needed
      if (!this.handyDevice) {
        this.handyDevice = new HandyDevice({
          connectionKey,
          applicationId: 'h_Jw26kJiyU3JZ2vV_X5TYutefunJJKe',
        })

        // Register device with manager
        this.deviceManager.registerDevice(this.handyDevice)

        // Set up event listeners
        this.setupHandyListeners()
      } else {
        // Update existing device
        await this.handyDevice.updateConfig({ connectionKey })
      }

      // Connect to device
      const success = await this.handyDevice.connect()

      if (success) {
        this.state.handyConnected = true
        await this.saveState()
        await this.broadcastState()

        if (!this.isPlaying && this.lastLoadedScript) {
          await this.loadScriptToDevice(this.handyDevice, this.lastLoadedScript)
        }

        return true
      }

      throw new Error('Failed to connect to Handy')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error connecting to Handy:', errorMessage)

      this.state.handyConnected = false
      await this.saveState()
      await this.broadcastState()
      throw error
    }
  }

  public async disconnectHandy(): Promise<boolean> {
    if (!this.handyDevice) return false

    try {
      await this.handyDevice.disconnect()
      this.state.handyConnected = false
      await this.saveState()
      await this.broadcastState()
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error disconnecting Handy:', errorMessage)
      throw error
    }
  }

  public async updateHandySettings(settings: {
    offset?: number
    stroke?: { min: number; max: number }
  }): Promise<boolean> {
    if (!this.handyDevice) return false

    try {
      const config: {
        offset?: number
        stroke?: { min: number; max: number }
      } = {}

      if (settings.offset !== undefined) {
        config.offset = settings.offset
        this.state.handySettings.offset = settings.offset
      }

      if (settings.stroke) {
        config.stroke = settings.stroke
        this.state.handySettings.stroke = settings.stroke
      }

      await this.handyDevice.updateConfig(config)
      await this.saveState()
      await this.broadcastState()
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error updating Handy settings:', errorMessage)
      throw error
    }
  }

  // Buttplug device methods
  public async connectButtplug(serverUrl: string): Promise<boolean> {
    try {
      // Save to state
      this.state.buttplugServerUrl = serverUrl
      await this.saveState()

      // Create device if needed
      if (!this.buttplugDevice) {
        this.buttplugDevice = new ButtplugDevice({
          connectionType: ButtplugConnectionType.WEBSOCKET,
          serverUrl: serverUrl,
          clientName: 'IVE-Extension',
        })

        // Register device with manager
        this.deviceManager.registerDevice(this.buttplugDevice)

        // Set up event listeners
        this.setupButtplugListeners()
      } else {
        // Update existing device
        await this.buttplugDevice.updateConfig({
          connectionType: ButtplugConnectionType.WEBSOCKET,
          serverUrl: serverUrl,
        })
      }

      // Connect to server
      const success = await this.buttplugDevice.connect()

      if (success) {
        this.state.buttplugConnected = true
        await this.saveState()
        await this.broadcastState()

        if (!this.isPlaying && this.lastLoadedScript) {
          await this.loadScriptToDevice(
            this.buttplugDevice,
            this.lastLoadedScript,
          )
        }

        return true
      }

      throw new Error('Failed to connect to Intiface server')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error connecting to Intiface server:', errorMessage)

      this.state.buttplugConnected = false
      await this.saveState()
      await this.broadcastState()
      throw error
    }
  }

  public async disconnectButtplug(): Promise<boolean> {
    if (!this.buttplugDevice) return false

    try {
      await this.buttplugDevice.disconnect()
      this.state.buttplugConnected = false
      await this.saveState()
      await this.broadcastState()
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error disconnecting from Intiface server:', errorMessage)
      throw error
    }
  }

  public async scanForButtplugDevices(): Promise<boolean> {
    if (!this.buttplugDevice || !this.state.buttplugConnected) {
      throw new Error('Intiface not connected')
    }

    try {
      // This requires accessing the internal _api property, we'll use type assertion
      interface ButtplugAPI {
        startScanning: () => Promise<boolean>
      }

      // Try to access the internal API
      const device = this.buttplugDevice as unknown as { _api?: ButtplugAPI }

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

  // Script management
  private async loadScriptToDevice(
    device: HandyDevice | ButtplugDevice,
    scriptData: ScriptData,
  ): Promise<boolean> {
    try {
      const result = await device.loadScript(scriptData)
      return result.success
    } catch (error) {
      console.error('Error loading script to device:', error)
      return false
    }
  }

  public async loadScriptFromUrl(
    url: string,
    sender?: chrome.runtime.MessageSender,
  ): Promise<boolean> {
    try {
      this.state.scriptUrl = url
      await this.saveState()

      const scriptData: ScriptData = {
        type: 'funscript',
        url: url,
      }

      // Store the script data in memory only
      this.lastLoadedScript = scriptData

      // Set the active script tab
      const tabId = this.getSenderTabId(sender)
      if (tabId) {
        this.activeScriptTabId = tabId
        console.log(`Script loaded in tab ${tabId}, now controlling devices`)
      }

      // Load script to all connected devices
      const results = await this.deviceManager.loadScriptAll(scriptData)
      const successCount = Object.values(results).filter(Boolean).length

      if (successCount > 0) {
        this.scriptLoaded = true
        this.funscript = results['script'] as unknown as Funscript
        await this.broadcastState()
        return true
      }

      throw new Error('Failed to load script on any device')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error loading script:', errorMessage)

      this.scriptLoaded = false
      await this.broadcastState({
        error: `Script loading error: ${errorMessage}`,
      })
      throw error
    }
  }

  public async loadScriptFromContent(
    content: Record<string, unknown>,
    sender?: chrome.runtime.MessageSender,
  ): Promise<boolean> {
    try {
      const scriptData: ScriptData = {
        type: 'funscript',
        content: content,
      }

      // Store the script data in memory only
      this.lastLoadedScript = scriptData

      // Set the active script tab
      const tabId = this.getSenderTabId(sender)
      if (tabId) {
        this.activeScriptTabId = tabId
        console.log(`Script loaded in tab ${tabId}, now controlling devices`)
      }

      // Load script to all connected devices
      const results = await this.deviceManager.loadScriptAll(scriptData)
      const successCount = Object.values(results).filter(Boolean).length

      if (successCount > 0) {
        this.scriptLoaded = true
        this.funscript = results['script'] as unknown as Funscript
        await this.broadcastState()
        return true
      }

      throw new Error('Failed to load script on any device')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error loading script:', errorMessage)

      this.scriptLoaded = false
      await this.broadcastState({
        error: `Script loading error: ${errorMessage}`,
      })
      throw error
    }
  }

  // Playback control - now with tab checking
  public async play(
    timeMs: number,
    playbackRate: number = 1.0,
    duration: number = 0,
    loop: boolean = false,
    sender?: chrome.runtime.MessageSender,
  ): Promise<boolean> {
    const tabId = this.getSenderTabId(sender)

    // Check if this tab should control the script
    if (!this.shouldControlScript(tabId)) {
      console.log(
        `Tab ${tabId} attempted to play but is not the active script tab (${this.activeScriptTabId})`,
      )
      return false
    }

    if (!this.scriptLoaded) {
      throw new Error('No script loaded')
    }

    try {
      this.currentTimeMs = timeMs
      this.playbackRate = playbackRate
      this.duration = duration
      this.loop = loop

      // Try-catch around specific devices to handle errors more gracefully
      const results: Record<string, boolean> = {}

      if (this.handyDevice && this.state.handyConnected) {
        try {
          results['handy'] = await this.handyDevice.play(
            timeMs,
            playbackRate,
            loop,
          )
        } catch (error) {
          console.error('Error playing script on Handy:', error)
          results['handy'] = false
        }
      }

      if (this.buttplugDevice && this.state.buttplugConnected) {
        try {
          results['buttplug'] = await this.buttplugDevice.play(
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
        await this.broadcastState()
        return true
      }

      throw new Error('Failed to start playback on any device')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error playing script:', errorMessage)

      this.isPlaying = false
      await this.broadcastState({ error: `Playback error: ${errorMessage}` })
      throw error
    }
  }

  public async stop(sender?: chrome.runtime.MessageSender): Promise<boolean> {
    const tabId = this.getSenderTabId(sender)

    // Check if this tab should control the script
    if (!this.shouldControlScript(tabId)) {
      console.log(
        `Tab ${tabId} attempted to stop but is not the active script tab (${this.activeScriptTabId})`,
      )
      return false
    }

    try {
      // Stop all devices
      await this.deviceManager.stopAll()
      this.isPlaying = false
      await this.broadcastState()
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error stopping playback:', errorMessage)

      this.isPlaying = false
      await this.broadcastState({ error: `Stop error: ${errorMessage}` })
      throw error
    }
  }

  public async syncTime(
    timeMs: number,
    sender?: chrome.runtime.MessageSender,
  ): Promise<boolean> {
    const tabId = this.getSenderTabId(sender)

    // Check if this tab should control the script
    if (!this.shouldControlScript(tabId)) {
      return false
    }

    try {
      this.currentTimeMs = timeMs

      // Only sync if playing
      if (this.isPlaying) {
        await this.deviceManager.syncTimeAll(timeMs)
      }

      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error syncing time:', errorMessage)
      throw error
    }
  }

  public async seek(
    timeMs: number,
    sender?: chrome.runtime.MessageSender,
  ): Promise<boolean> {
    const tabId = this.getSenderTabId(sender)

    // Check if this tab should control the script
    if (!this.shouldControlScript(tabId)) {
      return false
    }

    return this.syncTime(timeMs, sender)
  }

  public async timeUpdate(
    timeMs: number,
    sender?: chrome.runtime.MessageSender,
  ): Promise<void> {
    const tabId = this.getSenderTabId(sender)

    // Check if this tab should control the script
    if (!this.shouldControlScript(tabId)) {
      return
    }

    this.currentTimeMs = timeMs
    // Disabled, try to not have this, it spams broadcasts
    // await this.broadcastState()
  }

  public async durationChange(
    duration: number,
    sender?: chrome.runtime.MessageSender,
  ): Promise<void> {
    const tabId = this.getSenderTabId(sender)

    // Check if this tab should control the script
    if (!this.shouldControlScript(tabId)) {
      return
    }

    this.duration = duration
    await this.broadcastState()
  }

  public async setPlaybackRate(
    playbackRate: number,
    sender?: chrome.runtime.MessageSender,
  ): Promise<void> {
    const tabId = this.getSenderTabId(sender)

    // Check if this tab should control the script
    if (!this.shouldControlScript(tabId)) {
      return
    }

    this.playbackRate = playbackRate
    await this.broadcastState()
  }

  public async setVolume(
    volume: number,
    muted: boolean,
    sender?: chrome.runtime.MessageSender,
  ): Promise<void> {
    const tabId = this.getSenderTabId(sender)

    // Check if this tab should control the script
    if (!this.shouldControlScript(tabId)) {
      return
    }

    this.volume = volume
    this.muted = muted
    await this.broadcastState()
  }

  public async setLoop(loop: boolean): Promise<void> {
    this.loop = loop
    await this.broadcastState()
  }

  // Clear active script tab when tab is closed
  public clearActiveScriptTab(tabId: number): void {
    if (this.activeScriptTabId === tabId) {
      console.log(`Active script tab ${tabId} closed, clearing script control`)
      this.activeScriptTabId = null
      this.scriptLoaded = false
      this.lastLoadedScript = null
      this.funscript = null
      this.isPlaying = false
      this.broadcastState()
    }
  }

  // Event listeners
  private setupHandyListeners(): void {
    if (!this.handyDevice) return

    this.handyDevice.on('connected', async (deviceInfo) => {
      console.log('Handy connected:', deviceInfo)
      this.state.handyConnected = true
      await this.saveState()
      await this.broadcastState()
    })

    this.handyDevice.on('disconnected', async () => {
      console.log('Handy disconnected')
      this.state.handyConnected = false
      await this.saveState()
      await this.broadcastState()
    })

    this.handyDevice.on('error', async (error) => {
      const errorMessage = typeof error === 'string' ? error : String(error)
      console.error('Handy error:', errorMessage)
      await this.broadcastState({ error: `Handy: ${errorMessage}` })
    })

    this.handyDevice.on(
      'playbackStateChanged',
      async (state: { isPlaying: boolean }) => {
        console.log('Handy playback state changed:', state)
        this.isPlaying = state.isPlaying
        await this.broadcastState()
      },
    )
  }

  private setupButtplugListeners(): void {
    if (!this.buttplugDevice) return

    this.buttplugDevice.on('connected', async (deviceInfo) => {
      console.log('Intiface connected:', deviceInfo)
      this.state.buttplugConnected = true
      await this.saveState()
      await this.broadcastState()
    })

    this.buttplugDevice.on('disconnected', async () => {
      console.log('Intiface disconnected')
      this.state.buttplugConnected = false
      await this.saveState()
      await this.broadcastState()
    })

    this.buttplugDevice.on('error', async (error) => {
      const errorMessage = typeof error === 'string' ? error : String(error)
      console.error('Intiface error:', errorMessage)
      await this.broadcastState({ error: `Intiface: ${errorMessage}` })
    })

    this.buttplugDevice.on('deviceAdded', async () => {
      console.log('Intiface device added')
      await this.broadcastState()
    })

    this.buttplugDevice.on('deviceRemoved', async () => {
      console.log('Intiface device removed')
      await this.broadcastState()
    })

    this.buttplugDevice.on(
      'playbackStateChanged',
      async (state: { isPlaying: boolean }) => {
        console.log('Intiface playback state changed:', state)
        this.isPlaying = state.isPlaying
        await this.broadcastState()
      },
    )
  }

  // Get device info
  public getDeviceInfo(): DevicesInfo {
    const info: DevicesInfo = {
      handy: null,
      buttplug: null,
    }

    if (this.handyDevice) {
      info.handy = this.handyDevice.getDeviceInfo()
    }

    if (this.buttplugDevice) {
      info.buttplug = this.buttplugDevice.getDeviceInfo()
    }

    return info
  }

  // Messaging
  private async broadcastState(
    extra: { error?: string | null } = {},
  ): Promise<void> {
    const deviceInfo = this.getDeviceInfo()

    const messageState = {
      type: MESSAGES.DEVICE_STATE_UPDATE,
      state: {
        ...this.getState(),
        ...extra,
        deviceInfo,
        timestamp: Date.now(),
      },
    }

    // Broadcast to popup
    chrome.runtime.sendMessage(messageState).catch((err) => {
      // Popup might not be open, ignore error
      console.debug('Failed to send message to popup:', err)
    })

    // Broadcast to content scripts
    chrome.tabs.query({}).then((tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, messageState).catch(() => {
            // Tab might not have our content script, ignore error
          })
        }
      })
    })
  }

  // Auto-reconnect
  public async autoConnect(): Promise<void> {
    try {
      // Try reconnecting to Handy if we have a key
      if (this.state.handyConnectionKey) {
        try {
          await this.connectHandy(this.state.handyConnectionKey)
        } catch (error) {
          console.warn('Auto-connect to Handy failed:', error)
        }
      }

      // Try reconnecting to Buttplug if we have a URL
      if (this.state.buttplugServerUrl && !this.state.buttplugConnected) {
        try {
          await this.connectButtplug(this.state.buttplugServerUrl)
        } catch (error) {
          console.warn('Auto-connect to Intiface failed:', error)
        }
      }
    } catch (error) {
      console.error('Error during auto-connect:', error)
    }
  }
}

// Export singleton instance
export const deviceService = new DeviceService()
