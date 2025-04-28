import { DeviceInfo as IVEDeviceInfo } from 'ive-connect'

export interface DeviceServiceState {
  // Connection state
  handyConnectionKey: string
  buttplugServerUrl: string
  handyConnected: boolean
  buttplugConnected: boolean

  // Script state
  scriptUrl: string
  scriptLoaded?: boolean
  isPlaying?: boolean

  // Device settings
  handySettings: {
    offset: number
    stroke: {
      min: number
      max: number
    }
  }

  // Error state
  error?: string | null
}

export interface DevicesInfo {
  handy: IVEDeviceInfo | null
  buttplug: IVEDeviceInfo | null
}

export interface StateUpdateMessage {
  type: 'state_update'
  state: DeviceServiceState & {
    deviceInfo?: DevicesInfo
    timestamp: number
  }
}

export type UIMessage =
  | { type: 'ive:get_state' }
  | { type: 'ive:get_device_info' }
  | { type: 'ive:handy_connect'; connectionKey: string }
  | { type: 'ive:handy_disconnect' }
  | { type: 'ive:handy_set_offset'; offset: number }
  | { type: 'ive:handy_set_stroke_settings'; min: number; max: number }
  | { type: 'ive:buttplug_connect'; serverUrl: string }
  | { type: 'ive:buttplug_disconnect' }
  | { type: 'ive:buttplug_scan' }
  | { type: 'ive:load_script_url'; url: string }
  | { type: 'ive:load_script_content'; content: Record<string, unknown> }
  | { type: 'ive:play'; timeMs: number; playbackRate?: number; loop?: boolean }
  | { type: 'ive:stop' }
  | { type: 'ive:sync_time'; timeMs: number }
