import {
  DeviceManager,
  HandyDevice,
  ButtplugDevice,
  ButtplugConnectionType,
  ScriptData,
} from 'ive-connect'
import { contextMenuService } from './contextMenuService'
import { DeviceServiceState, DevicesInfo, Funscript, MESSAGES } from './types'

const defaultState: DeviceServiceState = {
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
  buttplugSettings: {
    stroke: { min: 0, max: 1 },
  },
}

/**
 * Core service that manages devices and state
 */
class DeviceService {
  private deviceManager: DeviceManager
  private handyDevice: HandyDevice | null = null
  private buttplugDevice: ButtplugDevice | null = null
  private scriptLoaded = false
  private scriptInverted = false
  private funscript: Funscript | null = null
  private lastLoadedScript: ScriptData | null = null
  private syncTimeouts: NodeJS.Timeout[] = []

  // Track which tab has the active script
  private activeScriptTabId: number | null = null
  private activeScriptFrameId: number | null = null
  private tabUrls: Map<number, string> = new Map()

  // Playback state
  private isPlaying = false
  private currentTimeMs = 0
  private playbackRate = 1.0
  private volume = 1.0
  private muted = false
  private duration = 0
  private loop = false

  // Last known states for persistence
  private state: DeviceServiceState = defaultState

  constructor() {
    this.deviceManager = new DeviceManager()
    this.loadState()
  }

  // Helper method to check if a tab should control scripts
  private shouldControlScript(sender?: chrome.runtime.MessageSender): boolean {
    if (!this.scriptLoaded || !this.lastLoadedScript) {
      return false
    }

    const tabId = sender?.tab?.id
    const frameId = sender?.frameId
    const currentUrl = sender?.tab?.url

    if (!tabId) return false

    // Check if URL changed for this tab (different video)
    const lastUrl = this.tabUrls.get(tabId)
    if (lastUrl && currentUrl && lastUrl !== currentUrl) {
      // URL changed - clear the script if this was the controlling tab
      if (this.activeScriptTabId === tabId) {
        console.log(`URL changed in controlling tab ${tabId}, clearing script`)
        this.clearScriptForTab(tabId)
        return false
      }
    }

    // Update URL tracking
    if (currentUrl) {
      this.tabUrls.set(tabId, currentUrl)
    }

    // If no active script tab, allow first requester to take control
    if (this.activeScriptTabId === null && tabId) {
      this.activeScriptTabId = tabId
      this.activeScriptFrameId = frameId || 0
      console.log(`Script control taken by tab ${tabId}, frame ${frameId}`)
      return true
    }

    // Allow control from same tab
    if (tabId === this.activeScriptTabId) {
      // Update frame ID if it's more specific
      if (
        frameId !== undefined &&
        frameId !== 0 &&
        this.activeScriptFrameId === 0
      ) {
        this.activeScriptFrameId = frameId
        console.log(`Frame control updated to frame ${frameId} in tab ${tabId}`)
      }
      return true
    }

    return false
  }

  private clearScriptForTab(tabId: number): void {
    if (this.activeScriptTabId === tabId) {
      console.log(`Clearing script for tab ${tabId}`)
      this.activeScriptTabId = null
      this.activeScriptFrameId = null
      this.scriptLoaded = false
      this.lastLoadedScript = null
      this.funscript = null
      this.isPlaying = false
      this.broadcastState()
    }
    // Clean up URL tracking
    this.tabUrls.delete(tabId)
  }

  public clearActiveScriptTab(tabId: number): void {
    this.clearScriptForTab(tabId)
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
        const parsed = JSON.parse(savedState) as DeviceServiceState

        // Don't override connected states
        this.state.handyConnectionKey = parsed.handyConnectionKey || ''
        this.state.buttplugServerUrl =
          parsed.buttplugServerUrl || 'ws://localhost:12345'
        this.state.showHeatmap = parsed.showHeatmap || false
        this.state.customUrls = parsed.customUrls || []
        this.state.handySettings = parsed.handySettings || {
          offset: 0,
          stroke: { min: 0, max: 1 },
        }
        this.state.buttplugSettings = parsed.buttplugSettings || {
          stroke: { min: 0, max: 1 },
        }
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
      scriptInverted: this.scriptInverted,
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
    contextMenuService.updateHeatmapState(showHeatmap)
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

  public async updateButtplugSettings(settings: {
    stroke?: { min: number; max: number }
  }): Promise<boolean> {
    if (!this.buttplugDevice) return false

    try {
      if (settings.stroke) {
        this.state.buttplugSettings.stroke = settings.stroke
      }

      // Update the device configuration
      await this.buttplugDevice.updateConfig({
        strokeRange: settings.stroke,
      })

      await this.saveState()
      await this.broadcastState()
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error updating Buttplug settings:', errorMessage)
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
      const result = await device.loadScript(scriptData, {
        invertScript: this.scriptInverted,
      })
      return result.success
    } catch (error) {
      console.error('Error loading script to device:', error)
      return false
    }
  }

  public async toggleScriptInversion(
    sender?: chrome.runtime.MessageSender,
  ): Promise<boolean> {
    if (!this.shouldControlScript(sender)) {
      return false
    }

    this.scriptInverted = !this.scriptInverted

    // Reload script with new inversion state if we have one loaded
    if (this.lastLoadedScript) {
      try {
        const results: Record<string, boolean> = {}

        if (this.handyDevice && this.state.handyConnected) {
          const result = await this.handyDevice.loadScript(
            this.lastLoadedScript,
            { invertScript: this.scriptInverted },
          )
          results['handy'] = result.success
        }

        if (this.buttplugDevice && this.state.buttplugConnected) {
          const result = await this.buttplugDevice.loadScript(
            this.lastLoadedScript,
            { invertScript: this.scriptInverted },
          )
          results['buttplug'] = result.success
        }

        const successCount = Object.values(results).filter(Boolean).length

        if (successCount > 0) {
          await this.broadcastState()

          // If currently playing, restart playback with new inversion
          if (this.isPlaying) {
            await this.play(
              this.currentTimeMs,
              this.playbackRate,
              this.duration,
              this.loop,
              sender,
            )
          }

          return true
        }
      } catch (error) {
        console.error('Error reloading script with inversion:', error)
      }
    }

    await this.broadcastState()
    return true
  }

  /**
   * Resolve IVDB script URL to actual token URL
   */
  private async resolveIvdbScript(ivdbUrl: string): Promise<string> {
    // Parse ivdb://videoId/scriptId
    const match = ivdbUrl.match(/^ivdb:\/\/([^/]+)\/(.+)$/)
    if (!match) {
      throw new Error('Invalid IVDB script URL format')
    }

    const [, videoId, scriptId] = match

    if (!this.state.handyConnectionKey) {
      throw new Error('Handy connection key required for IVDB scripts')
    }

    try {
      const tokenResponse = await fetch(
        `https://scripts01.handyfeeling.com/api/script/index/v0/videos/${videoId}/scripts/${scriptId}/token`,
        {
          headers: {
            Authorization: `Bearer ${this.state.handyConnectionKey}`,
          },
        },
      )

      if (!tokenResponse.ok) {
        throw new Error(`Failed to get script token: ${tokenResponse.status}`)
      }

      const tokenData = await tokenResponse.json()

      if (!tokenData.url) {
        throw new Error('Invalid script token response')
      }

      return tokenData.url
    } catch (error) {
      throw new Error(
        `IVDB script resolution failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  // Update loadScriptFromUrl method
  public async loadScriptFromUrl(
    url: string,
    sender?: chrome.runtime.MessageSender,
  ): Promise<boolean> {
    try {
      let actualUrl = url

      // Resolve IVDB URLs to actual token URLs
      if (url.startsWith('ivdb://')) {
        actualUrl = await this.resolveIvdbScript(url)
      }

      this.state.scriptUrl = url // Keep original URL for reference
      await this.saveState()

      const scriptData: ScriptData = {
        type: actualUrl.toLowerCase().split('.').pop() || 'funscript',
        url: actualUrl,
      }

      // Store the script data in memory only
      this.lastLoadedScript = scriptData

      // Set the active script tab
      const tabId = sender?.tab?.id
      const frameId = sender?.frameId
      if (tabId) {
        this.activeScriptTabId = tabId
        this.activeScriptFrameId = frameId || 0
        console.log(
          `Script loaded in tab ${tabId}, frame ${frameId}, now controlling devices`,
        )
      }

      // Load script to all connected devices
      const results = await this.deviceManager.loadScriptAll(scriptData, {
        invertScript: this.scriptInverted,
      })
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
      const results = await this.deviceManager.loadScriptAll(scriptData, {
        invertScript: this.scriptInverted,
      })
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
    if (!this.shouldControlScript(sender)) {
      console.log(
        `Tab ${sender?.tab?.id} frame ${sender?.frameId} attempted to play but is not the active script context (tab: ${this.activeScriptTabId}, frame: ${this.activeScriptFrameId})`,
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

        // Clear old timeouts
        this.syncTimeouts.forEach((t) => clearTimeout(t))
        this.syncTimeouts = []

        // Only set up sync timeouts for Handy devices
        if (this.handyDevice && this.state.handyConnected) {
          // Sync with filter 0.9 after 2 seconds
          this.syncTimeouts.push(
            setTimeout(() => {
              if (this.isPlaying) this.syncHandyTime(this.currentTimeMs, 0.9)
            }, 2000),
          )

          // Sync with filter 0.5 every 15 seconds starting at 17 seconds
          this.syncTimeouts.push(
            setTimeout(() => {
              if (this.isPlaying) {
                this.syncHandyTime(this.currentTimeMs, 0.5)
                this.syncTimeouts.push(
                  setInterval(() => {
                    if (this.isPlaying)
                      this.syncHandyTime(this.currentTimeMs, 0.5)
                  }, 15000),
                )
              }
            }, 17000),
          )
        }

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
    if (!this.shouldControlScript(sender)) {
      console.log(
        `Tab ${sender?.tab?.id} frame ${sender?.frameId} attempted to stop but is not the active script context`,
      )
      return false
    }

    try {
      this.syncTimeouts.forEach((t) => clearTimeout(t))
      this.syncTimeouts = []

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

  private async syncHandyTime(
    timeMs: number,
    filter: number,
  ): Promise<boolean> {
    try {
      // Only sync if playing and Handy is connected
      if (this.isPlaying && this.handyDevice && this.state.handyConnected) {
        await this.handyDevice.syncTime(timeMs, filter)
      }
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error syncing Handy time:', errorMessage)
      throw error
    }
  }

  public async timeUpdate(
    timeMs: number,
    sender?: chrome.runtime.MessageSender,
  ): Promise<void> {
    if (!this.shouldControlScript(sender)) {
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
    if (!this.shouldControlScript(sender)) {
      return
    }

    this.duration = duration
    await this.broadcastState()
  }

  public async setPlaybackRate(
    playbackRate: number,
    sender?: chrome.runtime.MessageSender,
  ): Promise<void> {
    if (!this.shouldControlScript(sender)) {
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
    if (!this.shouldControlScript(sender)) {
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

  // Extract real script URL from Cloudflare on background worker because of CORS
  extractRealScriptUrlFromCloudflare = async (
    scriptUrl: string,
  ): Promise<string | null> => {
    try {
      const response = await fetch(scriptUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch funscript: ${response.status}`)
      }
      const responseText = await response.text()

      // Look for any path containing .funscript in the HTML
      const funscriptPathMatch = responseText.match(
        /["']([^"']*\.funscript[^"']*?)["']/,
      )
      const cZoneMatch = responseText.match(/cZone:\s*"([^"]+)"/)

      if (funscriptPathMatch && cZoneMatch) {
        let path = funscriptPathMatch[1]
        const cZone = cZoneMatch[1]

        // Remove URL parameters (everything after ?)
        const questionMarkIndex = path.indexOf('?')
        if (questionMarkIndex !== -1) {
          path = path.substring(0, questionMarkIndex)
        }

        return `https://${cZone}${path}`
      }

      return null
    } catch (error) {
      console.error('Error extracting URL from HTML:', error)
      return null
    }
  }
}

// Export singleton instance
export const deviceService = new DeviceService()
