import {
  DeviceManager,
  HandyDevice,
  ButtplugDevice,
  ButtplugConnectionType,
  ScriptData,
} from 'ive-connect'

// Core service that manages devices and state
class DeviceService {
  private deviceManager: DeviceManager
  private handyDevice: HandyDevice | null = null
  private buttplugDevice: ButtplugDevice | null = null
  private scriptLoaded = false
  private isPlaying = false
  private currentTimeMs = 0
  private playbackRate = 1.0
  private loop = false

  // Last known states for persistence
  private state = {
    handyConnectionKey: '',
    buttplugServerUrl: 'ws://localhost:12345',
    handyConnected: false,
    buttplugConnected: false,
    scriptUrl: '',
    handySettings: {
      offset: 0,
      stroke: { min: 0, max: 1 },
    },
  }

  constructor() {
    this.deviceManager = new DeviceManager()
    this.loadState()
  }

  // State management
  private async loadState() {
    try {
      const storedState = await chrome.storage.sync.get('ive-state')
      if (storedState['ive-state']) {
        this.state = JSON.parse(storedState['ive-state'])
      }
    } catch (error) {
      console.error('Error loading state:', error)
    }
  }

  private async saveState() {
    try {
      await chrome.storage.sync.set({
        'ive-state': JSON.stringify(this.state),
      })
    } catch (error) {
      console.error('Error saving state:', error)
    }
  }

  // Get current state
  public getState() {
    return {
      ...this.state,
      isPlaying: this.isPlaying,
      scriptLoaded: this.scriptLoaded,
    }
  }

  // Handy device methods
  public async connectHandy(connectionKey: string) {
    try {
      // Save to state
      this.state.handyConnectionKey = connectionKey
      await this.saveState()

      // Create device if needed
      if (!this.handyDevice) {
        this.handyDevice = new HandyDevice({
          connectionKey,
          applicationId: 'qPH5gJibT7vahb3v27DdWkagy53yeOqD',
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
        return true
      } else {
        throw new Error('Failed to connect to Handy')
      }
    } catch (error) {
      console.error('Error connecting to Handy:', error)
      this.state.handyConnected = false
      await this.saveState()
      await this.broadcastState()
      throw error
    }
  }

  public async disconnectHandy() {
    if (!this.handyDevice) return false

    try {
      await this.handyDevice.disconnect()
      this.state.handyConnected = false
      await this.saveState()
      await this.broadcastState()
      return true
    } catch (error) {
      console.error('Error disconnecting Handy:', error)
      throw error
    }
  }

  public async updateHandySettings(settings: {
    offset?: number
    stroke?: { min: number; max: number }
  }) {
    if (!this.handyDevice) return false

    try {
      const config: any = {}

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
      console.error('Error updating Handy settings:', error)
      throw error
    }
  }

  // Buttplug device methods
  public async connectButtplug(serverUrl: string) {
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
        return true
      } else {
        throw new Error('Failed to connect to Buttplug server')
      }
    } catch (error) {
      console.error('Error connecting to Buttplug server:', error)
      this.state.buttplugConnected = false
      await this.saveState()
      await this.broadcastState()
      throw error
    }
  }

  public async disconnectButtplug() {
    if (!this.buttplugDevice) return false

    try {
      await this.buttplugDevice.disconnect()
      this.state.buttplugConnected = false
      await this.saveState()
      await this.broadcastState()
      return true
    } catch (error) {
      console.error('Error disconnecting from Buttplug server:', error)
      throw error
    }
  }

  public async scanForButtplugDevices() {
    if (!this.buttplugDevice || !this.state.buttplugConnected) {
      throw new Error('Buttplug not connected')
    }

    // This is a bit of a hack since we need to access the internal API
    const api = (this.buttplugDevice as any)._api
    if (api && typeof api.startScanning === 'function') {
      return api.startScanning()
    }

    throw new Error('Unable to start scanning')
  }

  // Script management
  public async loadScriptFromUrl(url: string) {
    if (!this.state.handyConnected && !this.state.buttplugConnected) {
      throw new Error('No devices connected')
    }

    try {
      this.state.scriptUrl = url
      await this.saveState()

      const scriptData: ScriptData = {
        type: 'funscript',
        url: url,
      }

      // Load script to all connected devices
      const results = await this.deviceManager.loadScriptAll(scriptData)
      const successCount = Object.values(results).filter(Boolean).length

      if (successCount > 0) {
        this.scriptLoaded = true
        await this.broadcastState()
        return true
      } else {
        throw new Error('Failed to load script on any device')
      }
    } catch (error) {
      console.error('Error loading script:', error)
      this.scriptLoaded = false
      await this.broadcastState()
      throw error
    }
  }

  public async loadScriptFromContent(content: any) {
    if (!this.state.handyConnected && !this.state.buttplugConnected) {
      throw new Error('No devices connected')
    }

    try {
      const scriptData: ScriptData = {
        type: 'funscript',
        content: content,
      }

      // Load script to all connected devices
      const results = await this.deviceManager.loadScriptAll(scriptData)
      const successCount = Object.values(results).filter(Boolean).length

      if (successCount > 0) {
        this.scriptLoaded = true
        await this.broadcastState()
        return true
      } else {
        throw new Error('Failed to load script on any device')
      }
    } catch (error) {
      console.error('Error loading script:', error)
      this.scriptLoaded = false
      await this.broadcastState()
      throw error
    }
  }

  // Playback control
  public async play(
    timeMs: number,
    playbackRate: number = 1.0,
    loop: boolean = false,
  ) {
    if (!this.scriptLoaded) {
      throw new Error('No script loaded')
    }

    try {
      this.currentTimeMs = timeMs
      this.playbackRate = playbackRate
      this.loop = loop

      // Play on all connected devices
      const results = await this.deviceManager.playAll(
        timeMs,
        playbackRate,
        loop,
      )
      const successCount = Object.values(results).filter(Boolean).length

      if (successCount > 0) {
        this.isPlaying = true
        await this.broadcastState()
        return true
      } else {
        throw new Error('Failed to start playback on any device')
      }
    } catch (error) {
      console.error('Error playing script:', error)
      this.isPlaying = false
      await this.broadcastState()
      throw error
    }
  }

  public async stop() {
    try {
      // Stop all devices
      const results = await this.deviceManager.stopAll()
      this.isPlaying = false
      await this.broadcastState()
      return true
    } catch (error) {
      console.error('Error stopping playback:', error)
      this.isPlaying = false
      await this.broadcastState()
      throw error
    }
  }

  public async syncTime(timeMs: number) {
    try {
      this.currentTimeMs = timeMs

      // Only sync if playing
      if (this.isPlaying) {
        await this.deviceManager.syncTimeAll(timeMs)
      }

      return true
    } catch (error) {
      console.error('Error syncing time:', error)
      throw error
    }
  }

  // Event listeners
  private setupHandyListeners() {
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
      console.error('Handy error:', error)
      await this.broadcastState({ error: `Handy: ${error}` })
    })

    this.handyDevice.on('playbackStateChanged', async (state) => {
      console.log('Handy playback state changed:', state)
      this.isPlaying = state.isPlaying
      await this.broadcastState()
    })
  }

  private setupButtplugListeners() {
    if (!this.buttplugDevice) return

    this.buttplugDevice.on('connected', async (deviceInfo) => {
      console.log('Buttplug connected:', deviceInfo)
      this.state.buttplugConnected = true
      await this.saveState()
      await this.broadcastState()
    })

    this.buttplugDevice.on('disconnected', async () => {
      console.log('Buttplug disconnected')
      this.state.buttplugConnected = false
      await this.saveState()
      await this.broadcastState()
    })

    this.buttplugDevice.on('error', async (error) => {
      console.error('Buttplug error:', error)
      await this.broadcastState({ error: `Buttplug: ${error}` })
    })

    this.buttplugDevice.on('deviceAdded', async (device) => {
      console.log('Buttplug device added:', device)
      await this.broadcastState()
    })

    this.buttplugDevice.on('deviceRemoved', async (device) => {
      console.log('Buttplug device removed:', device)
      await this.broadcastState()
    })

    this.buttplugDevice.on('playbackStateChanged', async (state) => {
      console.log('Buttplug playback state changed:', state)
      this.isPlaying = state.isPlaying
      await this.broadcastState()
    })
  }

  // Messaging
  private async broadcastState(extra: any = {}) {
    const currentState = {
      ...this.getState(),
      ...extra,
      timestamp: Date.now(),
    }

    // Broadcast to popup
    chrome.runtime
      .sendMessage({
        type: 'state_update',
        state: currentState,
      })
      .catch(() => {
        // Popup might not be open, ignore error
      })

    // Broadcast to content scripts
    chrome.tabs.query({}).then((tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs
            .sendMessage(tab.id, {
              type: 'state_update',
              state: currentState,
            })
            .catch(() => {
              // Tab might not have our content script, ignore error
            })
        }
      })
    })
  }

  // Get device info
  public getDeviceInfo() {
    const info: any = {
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

  // Auto-reconnect
  public async autoConnect() {
    try {
      // Try reconnecting to Handy if we have a key
      if (this.state.handyConnectionKey && !this.state.handyConnected) {
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
          console.warn('Auto-connect to Buttplug failed:', error)
        }
      }
    } catch (error) {
      console.error('Error during auto-connect:', error)
    }
  }
}

// Export singleton instance
export const deviceService = new DeviceService()
