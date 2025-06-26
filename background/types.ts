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
  SYNC_TIME: 'ive:sync_time',

  // Video playback controls
  PLAY: 'ive:video:play',
  PAUSE: 'ive:video:pause',
  STOP: 'ive:video:stop',
  SEEK: 'ive:video:seek',
  RATE_CHANGE: 'ive:video:rate_change',
  TIME_CHANGE: 'ive:video:time_change',
  DURATION_CHANGE: 'ive:video:duration_change',
  VOLUME_CHANGE: 'ive:video:volume_change',

  // Video state updates (for sending to content scripts)
  PLAY_UPDATE: 'ive:video:play_update',
  PAUSE_UPDATE: 'ive:video:pause_update',
  SEEK_UPDATE: 'ive:video:seek_update',
  VOLUME_UPDATE: 'ive:video:volume_update',

  // IDB changes
  SAVE_SCRIPT: 'ive:save_script',
  GET_SCRIPTS: 'ive:get_scripts',

  // Settings
  SHOW_HEATMAP: 'ive:settings:show_heatmap',
  SET_CUSTOM_URLS: 'ive:settings:set_custom_urls',

  // Device state
  DEVICE_STATE_UPDATE: 'ive:device_state_update',
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
  | { type: typeof MESSAGES.SYNC_TIME; timeMs: number }
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
  | { type: typeof MESSAGES.SEEK; timeMs: number }
  | { type: typeof MESSAGES.RATE_CHANGE; playbackRate: number }
  | { type: typeof MESSAGES.TIME_CHANGE; timeMs: number }
  | { type: typeof MESSAGES.DURATION_CHANGE; duration: number }
  | { type: typeof MESSAGES.VOLUME_CHANGE; volume: number; muted: boolean }
  // Video state updates
  | { type: typeof MESSAGES.PLAY_UPDATE }
  | { type: typeof MESSAGES.PAUSE_UPDATE }
  | { type: typeof MESSAGES.SEEK_UPDATE; timeMs: number }
  | { type: typeof MESSAGES.VOLUME_UPDATE; volume: number; muted: boolean }
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
