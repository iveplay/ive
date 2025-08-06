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
  funscript?: Funscript | null
  scriptInverted?: boolean

  // Player state
  isPlaying?: boolean
  currentTimeMs?: number
  playbackRate?: number
  volume?: number
  muted?: boolean
  duration?: number
  loop?: boolean

  // Device settings
  deviceInfo?: DevicesInfo
  handySettings: {
    offset: number
    stroke: {
      min: number
      max: number
    }
  }
  buttplugSettings: {
    stroke: {
      min: number
      max: number
    }
  }

  // Settings
  showHeatmap: boolean
  customUrls: string[]

  // Error state
  error?: string | null
  timestamp?: number
}

export interface Funscript {
  actions: {
    at: number
    pos: number
  }[]
  inverted?: boolean
  range?: number
  version?: string
  [key: string]: unknown
}

export interface DevicesInfo {
  handy: IVEDeviceInfo | null
  buttplug: IVEDeviceInfo | null
}

export const EVENTS = {
  SAVE_SCRIPT: 'ive:events:save_script',
}

export type EventType = (typeof EVENTS)[keyof typeof EVENTS]

export const CONTEXT_MESSAGES = {
  TOGGLE_HEATMAP: 'ive:context:toggle_heatmap',
  FLOAT_VIDEO: 'ive:context:float_video',
  EROSCRIPTS_VIDEO: 'ive:context:eroscripts_video',
  EROSCRIPTS_SCRIPT: 'ive:context:eroscripts_script',
}

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
  BUTTPLUG_SET_STROKE_SETTINGS: 'ive:buttplug_set_stroke_settings',
  LOAD_SCRIPT_URL: 'ive:load_script_url',
  LOAD_SCRIPT_CONTENT: 'ive:load_script_content',
  TOGGLE_SCRIPT_INVERSION: 'ive:toggle_script_inversion',

  // Video playback controls
  PLAY: 'ive:video:play',
  PAUSE: 'ive:video:pause',
  STOP: 'ive:video:stop',
  RATE_CHANGE: 'ive:video:rate_change',
  TIME_CHANGE: 'ive:video:time_change',
  DURATION_CHANGE: 'ive:video:duration_change',
  VOLUME_CHANGE: 'ive:video:volume_change',

  // IDB changes
  SAVE_SCRIPT: 'ive:save_script',
  GET_SCRIPTS: 'ive:get_scripts',

  // Settings
  SHOW_HEATMAP: 'ive:settings:show_heatmap',
  SET_CUSTOM_URLS: 'ive:settings:set_custom_urls',

  // Device state
  DEVICE_STATE_UPDATE: 'ive:device_state_update',

  // Utils
  EXTRACT_SCRIPT_URL: 'ive:extract_script_url',
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
  | {
      type: typeof MESSAGES.BUTTPLUG_SET_STROKE_SETTINGS
      min: number
      max: number
    }
  | { type: typeof MESSAGES.LOAD_SCRIPT_URL; url: string }
  | {
      type: typeof MESSAGES.LOAD_SCRIPT_CONTENT
      content: Record<string, unknown>
    }
  | { type: typeof MESSAGES.TOGGLE_SCRIPT_INVERSION }
  // Video playback controls
  | {
      type: typeof MESSAGES.PLAY
      timeMs: number
      playbackRate?: number
      duration?: number
      loop?: boolean
    }
  | { type: typeof MESSAGES.PAUSE }
  | { type: typeof MESSAGES.STOP }
  | { type: typeof MESSAGES.RATE_CHANGE; playbackRate: number }
  | { type: typeof MESSAGES.TIME_CHANGE; timeMs: number }
  | { type: typeof MESSAGES.DURATION_CHANGE; duration: number }
  | { type: typeof MESSAGES.VOLUME_CHANGE; volume: number; muted: boolean }
  // IDB changes
  | {
      type: typeof MESSAGES.SAVE_SCRIPT
      websiteKey: string
      scriptId: string
      scriptInfo: ScriptInfo
    }
  | { type: typeof MESSAGES.GET_SCRIPTS }
  // Settings
  | {
      type: typeof MESSAGES.SHOW_HEATMAP
      settings: {
        showHeatmap: boolean
      }
    }
  | {
      type: typeof MESSAGES.SET_CUSTOM_URLS
      urls: string[]
    }
  // Device state
  | {
      type: typeof MESSAGES.DEVICE_STATE_UPDATE
      state: DeviceServiceState
    }
  // Utils
  | { type: typeof MESSAGES.EXTRACT_SCRIPT_URL; url: string }
