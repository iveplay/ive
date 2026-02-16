import {
  DeviceManager,
  ScriptData,
  Funscript,
  ScriptLoadResult,
} from 'ive-connect'
import { contextMenuService } from '../contextMenuService'
import { DeviceServiceState, DevicesInfo, MESSAGES } from '../types'
import { AutoblowManager } from './autoblowManager'
import { ButtplugManager } from './buttplugManager'
import { HandyManager } from './handyManager'
import { PlaybackManager } from './playbackManager'
import { ScriptResolver } from './scriptResolver'
import { TabTracker } from './tabTracker'

const defaultState: DeviceServiceState = {
  handyConnectionKey: '',
  buttplugServerUrl: 'ws://localhost:12345',
  autoblowDeviceToken: '',
  handyConnected: false,
  buttplugConnected: false,
  autoblowConnected: false,
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
  autoblowSettings: {
    offset: 0,
  },
}

class DeviceService {
  private deviceManager: DeviceManager
  private handyManager: HandyManager
  private buttplugManager: ButtplugManager
  private autoblowManager: AutoblowManager
  private tabTracker: TabTracker
  private scriptResolver: ScriptResolver
  private playbackManager: PlaybackManager

  private scriptLoaded = false
  private scriptInverted = false
  private funscript: Funscript | null = null
  private lastScriptData: ScriptData | null = null

  private state: DeviceServiceState = defaultState

  constructor() {
    this.deviceManager = new DeviceManager()
    this.handyManager = new HandyManager()
    this.buttplugManager = new ButtplugManager()
    this.autoblowManager = new AutoblowManager()
    this.tabTracker = new TabTracker()
    this.scriptResolver = new ScriptResolver()
    this.playbackManager = new PlaybackManager()
    this.loadState()
  }

  // ===========================================
  // State Management
  // ===========================================

  private async loadState(): Promise<void> {
    try {
      const storedState = await chrome.storage.sync.get('ive-state')
      const savedState = storedState['ive-state']

      if (savedState) {
        const parsed = JSON.parse(savedState) as DeviceServiceState
        this.state.handyConnectionKey = parsed.handyConnectionKey || ''
        this.state.buttplugServerUrl =
          parsed.buttplugServerUrl || 'ws://localhost:12345'
        this.state.autoblowDeviceToken = parsed.autoblowDeviceToken || ''
        this.state.showHeatmap = parsed.showHeatmap || false
        this.state.customUrls = parsed.customUrls || []
        this.state.handySettings = parsed.handySettings || {
          offset: 0,
          stroke: { min: 0, max: 1 },
        }
        this.state.buttplugSettings = parsed.buttplugSettings || {
          stroke: { min: 0, max: 1 },
        }
        this.state.autoblowSettings = parsed.autoblowSettings || {
          offset: 0,
        }
      }
    } catch (error) {
      console.error('Error loading state:', error)
    }
  }

  private async saveState(): Promise<void> {
    try {
      await chrome.storage.sync.set({ 'ive-state': JSON.stringify(this.state) })
    } catch (error) {
      console.error('Error saving state:', error)
    }
  }

  public getState(): DeviceServiceState {
    return {
      ...this.state,
      scriptLoaded: this.scriptLoaded,
      funscript: this.funscript,
      scriptInverted: this.scriptInverted,
      ...this.playbackManager.getState(),
    }
  }

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

    chrome.runtime.sendMessage(messageState).catch(() => {})

    chrome.tabs.query({}).then((tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, messageState).catch(() => {})
        }
      })
    })
  }

  // ===========================================
  // Settings
  // ===========================================

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

  // ===========================================
  // Handy Methods
  // ===========================================

  public async connectHandy(connectionKey: string): Promise<boolean> {
    const result = await this.handyManager.connect(
      connectionKey,
      this.state,
      () => this.saveState(),
      (extra) => this.broadcastState(extra),
    )

    if (result && this.handyManager.device) {
      this.deviceManager.registerDevice(this.handyManager.device)

      // If we have a script loaded, prepare it on the new device
      if (this.funscript) {
        await this.handyManager.device.prepareScript(this.funscript)
      }
    }

    return result
  }

  public async disconnectHandy(): Promise<boolean> {
    return this.handyManager.disconnect(
      this.state,
      () => this.saveState(),
      () => this.broadcastState(),
    )
  }

  public async updateHandySettings(settings: {
    offset?: number
    stroke?: { min: number; max: number }
  }): Promise<boolean> {
    return this.handyManager.updateSettings(
      settings,
      this.state,
      () => this.saveState(),
      () => this.broadcastState(),
    )
  }

  // ===========================================
  // Buttplug Methods
  // ===========================================

  public async connectButtplug(serverUrl: string): Promise<boolean> {
    try {
      const result = await this.buttplugManager.connect(
        serverUrl,
        this.state,
        () => this.saveState(),
        (extra) => this.broadcastState(extra),
      )
      if (result && this.buttplugManager.device) {
        this.deviceManager.registerDevice(this.buttplugManager.device)

        // If we have a script loaded, prepare it on the new device
        if (this.funscript) {
          await this.buttplugManager.device.prepareScript(this.funscript)
        }
      }

      return result
    } catch {
      return false
    }
  }

  public async disconnectButtplug(): Promise<boolean> {
    return this.buttplugManager.disconnect(
      this.state,
      () => this.saveState(),
      () => this.broadcastState(),
    )
  }

  public async updateButtplugSettings(settings: {
    stroke?: { min: number; max: number }
  }): Promise<boolean> {
    return this.buttplugManager.updateSettings(
      settings,
      this.state,
      () => this.saveState(),
      () => this.broadcastState(),
    )
  }

  public async scanForButtplugDevices(): Promise<boolean> {
    return this.buttplugManager.scan(this.state)
  }

  // ===========================================
  // Autoblow Methods
  // ===========================================

  public async connectAutoblow(deviceToken: string): Promise<boolean> {
    const result = await this.autoblowManager.connect(
      deviceToken,
      this.state,
      () => this.saveState(),
      (extra) => this.broadcastState(extra),
    )

    if (result && this.autoblowManager.device) {
      this.deviceManager.registerDevice(this.autoblowManager.device)

      // If we have a script loaded, prepare it on the new device
      if (this.funscript) {
        await this.autoblowManager.device.prepareScript(this.funscript)
      }
    }

    return result
  }

  public async disconnectAutoblow(): Promise<boolean> {
    return this.autoblowManager.disconnect(
      this.state,
      () => this.saveState(),
      () => this.broadcastState(),
    )
  }

  public async updateAutoblowSettings(settings: {
    offset?: number
  }): Promise<boolean> {
    return this.autoblowManager.updateSettings(
      settings,
      this.state,
      () => this.saveState(),
      () => this.broadcastState(),
    )
  }

  // ===========================================
  // Script Management
  // ===========================================

  public async toggleScriptInversion(
    sender?: chrome.runtime.MessageSender,
  ): Promise<boolean> {
    if (
      !this.tabTracker.shouldControlScript(
        sender,
        this.scriptLoaded,
        !!this.lastScriptData,
      )
    ) {
      return false
    }

    this.scriptInverted = !this.scriptInverted

    // Reload the script with the new inversion setting
    if (this.lastScriptData) {
      try {
        const result = await this.deviceManager.loadScript(
          this.lastScriptData,
          {
            invertScript: this.scriptInverted,
          },
        )

        if (result.success && result.funscript) {
          this.funscript = result.funscript
        }

        // Restart playback if it was playing
        if (this.playbackManager.isPlaying) {
          await this.play(
            this.playbackManager.currentTimeMs,
            this.playbackManager.playbackRate,
            this.playbackManager.duration,
            this.playbackManager.loop,
            sender,
          )
        }
      } catch (error) {
        console.error('Error reloading script with inversion:', error)
      }
    }

    await this.broadcastState()
    return true
  }

  public async loadScriptFromUrl(
    url: string,
    sender?: chrome.runtime.MessageSender,
  ): Promise<boolean> {
    try {
      // Resolve the URL to ScriptData
      const scriptData = await this.scriptResolver.resolve(
        url,
        this.state.handyConnectionKey,
      )

      this.state.scriptUrl = url
      await this.saveState()

      // Store the original script data for re-loading with different options
      this.lastScriptData = scriptData

      // Set up tab tracking
      const tabId = sender?.tab?.id
      const frameId = sender?.frameId
      if (tabId) {
        this.tabTracker.setActiveTab(tabId, frameId)
      }

      // Use DeviceManager to load script (handles fetching, parsing, and distribution)
      const result: ScriptLoadResult = await this.deviceManager.loadScript(
        scriptData,
        { invertScript: this.scriptInverted },
      )

      if (result.success && result.funscript) {
        this.scriptLoaded = true
        this.funscript = result.funscript
        await this.broadcastState()
        return true
      }

      // Script loading failed
      throw new Error(result.error || 'Failed to load script')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error loading script:', errorMessage)

      this.scriptLoaded = false
      this.funscript = null
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
        content: content as Funscript,
      }
      this.lastScriptData = scriptData

      const tabId = sender?.tab?.id
      if (tabId) {
        this.tabTracker.setActiveTab(tabId, sender?.frameId)
      }

      // Use DeviceManager to load script
      const result: ScriptLoadResult = await this.deviceManager.loadScript(
        scriptData,
        { invertScript: this.scriptInverted },
      )

      if (result.success && result.funscript) {
        this.scriptLoaded = true
        this.funscript = result.funscript
        await this.broadcastState()
        return true
      }

      throw new Error(result.error || 'Failed to load script')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error loading script:', errorMessage)

      this.scriptLoaded = false
      this.funscript = null
      await this.broadcastState({
        error: `Script loading error: ${errorMessage}`,
      })
      throw error
    }
  }

  // ===========================================
  // Playback Control
  // ===========================================

  public async play(
    timeMs: number,
    playbackRate: number = 1.0,
    duration: number = 0,
    loop: boolean = false,
    sender?: chrome.runtime.MessageSender,
  ): Promise<boolean> {
    if (
      !this.tabTracker.shouldControlScript(
        sender,
        this.scriptLoaded,
        !!this.lastScriptData,
      )
    ) {
      console.log(
        `Tab ${sender?.tab?.id} frame ${sender?.frameId} attempted to play but is not the active script context`,
      )
      return false
    }

    if (!this.scriptLoaded) {
      throw new Error('No script loaded')
    }

    try {
      const success = await this.playbackManager.play(
        timeMs,
        playbackRate,
        duration,
        loop,
        this.state,
        this.handyManager,
        this.buttplugManager,
        this.autoblowManager,
      )

      await this.broadcastState()
      return success
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error playing script:', errorMessage)

      this.playbackManager.isPlaying = false
      await this.broadcastState({ error: `Playback error: ${errorMessage}` })
      throw error
    }
  }

  public async stop(sender?: chrome.runtime.MessageSender): Promise<boolean> {
    if (
      !this.tabTracker.shouldControlScript(
        sender,
        this.scriptLoaded,
        !!this.lastScriptData,
      )
    ) {
      console.log(
        `Tab ${sender?.tab?.id} frame ${sender?.frameId} attempted to stop but is not the active script context`,
      )
      return false
    }

    try {
      await this.playbackManager.stop(
        this.handyManager,
        this.buttplugManager,
        this.autoblowManager,
      )
      await this.broadcastState()
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error stopping playback:', errorMessage)

      this.playbackManager.isPlaying = false
      await this.broadcastState({ error: `Stop error: ${errorMessage}` })
      throw error
    }
  }

  public async timeUpdate(
    timeMs: number,
    sender?: chrome.runtime.MessageSender,
  ): Promise<void> {
    if (
      !this.tabTracker.shouldControlScript(
        sender,
        this.scriptLoaded,
        !!this.lastScriptData,
      )
    )
      return
    this.playbackManager.updateTime(timeMs)
  }

  public async durationChange(
    duration: number,
    sender?: chrome.runtime.MessageSender,
  ): Promise<void> {
    if (
      !this.tabTracker.shouldControlScript(
        sender,
        this.scriptLoaded,
        !!this.lastScriptData,
      )
    )
      return
    this.playbackManager.updateDuration(duration)
    await this.broadcastState()
  }

  public async setPlaybackRate(
    playbackRate: number,
    sender?: chrome.runtime.MessageSender,
  ): Promise<void> {
    if (
      !this.tabTracker.shouldControlScript(
        sender,
        this.scriptLoaded,
        !!this.lastScriptData,
      )
    )
      return
    this.playbackManager.updatePlaybackRate(playbackRate)
    await this.broadcastState()
  }

  public async setVolume(
    volume: number,
    muted: boolean,
    sender?: chrome.runtime.MessageSender,
  ): Promise<void> {
    if (
      !this.tabTracker.shouldControlScript(
        sender,
        this.scriptLoaded,
        !!this.lastScriptData,
      )
    )
      return
    this.playbackManager.updateVolume(volume, muted)
    await this.broadcastState()
  }

  public async setLoop(loop: boolean): Promise<void> {
    this.playbackManager.updateLoop(loop)
    await this.broadcastState()
  }

  // ===========================================
  // Tab Management
  // ===========================================

  private clearScriptForTab(tabId: number): void {
    if (this.tabTracker.isActiveTab(tabId)) {
      this.tabTracker.clear()
      this.scriptLoaded = false
      this.lastScriptData = null
      this.funscript = null
      this.deviceManager.clearScript()
      this.playbackManager.reset()
      this.broadcastState()
    }
    this.tabTracker.clearTabUrl(tabId)
  }

  public clearActiveScriptTab(tabId: number): void {
    this.clearScriptForTab(tabId)
  }

  // ===========================================
  // Device Info
  // ===========================================

  public getDeviceInfo(): DevicesInfo {
    return {
      handy: this.handyManager.getDeviceInfo(),
      buttplug: this.buttplugManager.getDeviceInfo(),
      autoblow: this.autoblowManager.getDeviceInfo(),
    }
  }

  // ===========================================
  // Auto Connect
  // ===========================================

  public async autoConnect(): Promise<void> {
    try {
      if (this.state.handyConnectionKey && !this.state.handyConnected) {
        try {
          await this.connectHandy(this.state.handyConnectionKey)
        } catch (error) {
          console.warn('Auto-connect to Handy failed:', error)
        }
      }

      if (this.state.buttplugServerUrl && !this.state.buttplugConnected) {
        try {
          await this.connectButtplug(this.state.buttplugServerUrl)
        } catch (error) {
          console.warn('Auto-connect to Intiface failed:', error)
        }
      }

      if (this.state.autoblowDeviceToken && !this.state.autoblowConnected) {
        try {
          await this.connectAutoblow(this.state.autoblowDeviceToken)
        } catch (error) {
          console.warn('Auto-connect to Autoblow failed:', error)
        }
      }
    } catch (error) {
      console.error('Error during auto-connect:', error)
    }
  }

  // ===========================================
  // Utility
  // ===========================================

  extractRealScriptUrlFromCloudflare = async (
    scriptUrl: string,
  ): Promise<string | null> => {
    return this.scriptResolver.extractCloudflareUrl(scriptUrl)
  }
}

export const deviceService = new DeviceService()
