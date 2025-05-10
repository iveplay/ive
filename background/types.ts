import { DeviceInfo as IVEDeviceInfo } from 'ive-connect'
import { ScriptInfo } from '@/types/script'

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

export const EVENTS = {
  SAVE_SCRIPT: 'ive:events:save_script',
}

export type EventType = (typeof EVENTS)[keyof typeof EVENTS]

export const MESSAGES = {
  GET_STATE: 'ive:get_state',
  GET_DEVICE_INFO: 'ive:get_device_info',
  AUTO_CONNECT: 'ive:auto_connect',
  HANDY_CONNECT: 'ive:handy_connect',
  HANDY_DISCONNECT: 'ive:handy_disconnect',
  HANDY_SET_OFFSET: 'ive:handy_set_offset',
  HANDY_SET_STROKE_SETTINGS: 'ive:handy_set_stroke_settings',
  BUTTPLUG_CONNECT: 'ive:buttplug_connect',
  BUTTPLUG_DISCONNECT: 'ive:buttplug_disconnect',
  BUTTPLUG_SCAN: 'ive:buttplug_scan',
  LOAD_SCRIPT_URL: 'ive:load_script_url',
  LOAD_SCRIPT_CONTENT: 'ive:load_script_content',
  PLAY: 'ive:play',
  STOP: 'ive:stop',
  SYNC_TIME: 'ive:sync_time',
  SAVE_SCRIPT: 'ive:save_script',
  GET_SCRIPTS: 'ive:get_scripts',
  DEVICE_STATE_UPDATE: 'ive:device_state_update',
  SETTINGS_UPDATE: 'ive:settings_update',
} as const

export type UIMessageType = (typeof MESSAGES)[keyof typeof MESSAGES]

export type UIMessage =
  | { type: typeof MESSAGES.GET_STATE }
  | { type: typeof MESSAGES.GET_DEVICE_INFO }
  | { type: typeof MESSAGES.AUTO_CONNECT }
  | { type: typeof MESSAGES.HANDY_CONNECT; connectionKey: string }
  | { type: typeof MESSAGES.HANDY_DISCONNECT }
  | { type: typeof MESSAGES.HANDY_SET_OFFSET; offset: number }
  | {
      type: typeof MESSAGES.HANDY_SET_STROKE_SETTINGS
      min: number
      max: number
    }
  | { type: typeof MESSAGES.BUTTPLUG_CONNECT; serverUrl: string }
  | { type: typeof MESSAGES.BUTTPLUG_DISCONNECT }
  | { type: typeof MESSAGES.BUTTPLUG_SCAN }
  | { type: typeof MESSAGES.LOAD_SCRIPT_URL; url: string }
  | {
      type: typeof MESSAGES.LOAD_SCRIPT_CONTENT
      content: Record<string, unknown>
    }
  | {
      type: typeof MESSAGES.PLAY
      timeMs: number
      playbackRate?: number
      loop?: boolean
    }
  | { type: typeof MESSAGES.STOP }
  | { type: typeof MESSAGES.SYNC_TIME; timeMs: number }
  | {
      type: typeof MESSAGES.SAVE_SCRIPT
      websiteKey: string
      scriptId: string
      scriptInfo: ScriptInfo
    }
  | { type: typeof MESSAGES.GET_SCRIPTS }
  | {
      type: typeof MESSAGES.DEVICE_STATE_UPDATE
      state: DeviceServiceState & {
        deviceInfo?: DevicesInfo
        timestamp: number
      }
    }
  | {
      type: typeof MESSAGES.SETTINGS_UPDATE
      settings: {
        showHeatmap: boolean
      }
    }
