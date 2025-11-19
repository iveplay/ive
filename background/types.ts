import { DeviceInfo as IVEDeviceInfo } from 'ive-connect'
import { CreateIveEntryData, IveSearchOptions } from '@/types/ivedb'

export const DB_NAME = 'ive-database'
export const LOCAL_STORAGE_KEYS = {
  IVE_PENDING_SCRIPT: 'ive-pending-script',
}

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

  // Settings
  SHOW_HEATMAP: 'ive:settings:show_heatmap',
  SET_CUSTOM_URLS: 'ive:settings:set_custom_urls',

  // Device state
  DEVICE_STATE_UPDATE: 'ive:device_state_update',

  // Utils
  EXTRACT_SCRIPT_URL: 'ive:extract_script_url',

  // IveDB messages
  IVEDB_PING: 'ive:ivedb:ping',
  IVEDB_GET_ENTRIES_PAGINATED: 'ive:ivedb:get_entries_paginated',
  IVEDB_GET_ENTRY_WITH_DETAILS: 'ive:ivedb:get_entry_with_details',
  IVEDB_CREATE_ENTRY: 'ive:ivedb:create_entry',
  IVEDB_GET_ENTRY: 'ive:ivedb:get_entry',
  IVEDB_GET_ALL_ENTRIES: 'ive:ivedb:get_all_entries',
  IVEDB_SEARCH_ENTRIES: 'ive:ivedb:search_entries',
  IVEDB_UPDATE_ENTRY: 'ive:ivedb:update_entry',
  IVEDB_DELETE_ENTRY: 'ive:ivedb:delete_entry',
  IVEDB_ADD_FAVORITE: 'ive:ivedb:add_favorite',
  IVEDB_REMOVE_FAVORITE: 'ive:ivedb:remove_favorite',
  IVEDB_GET_FAVORITES: 'ive:ivedb:get_favorites',
  IVEDB_IS_FAVORITED: 'ive:ivedb:is_favorited',
  IVEDB_FIND_BY_VIDEO_URL: 'ive:ivedb:find_by_video_url',
  IVEDB_FIND_BY_SCRIPT_URL: 'ive:ivedb:find_by_script_url',
  IVEDB_GET_VIDEO_LOOKUPS: 'ive:ivedb:get_video_lookups',
  IVE_SELECT_SCRIPT: 'ive:select_script',
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
  // IveDB messages
  | { type: typeof MESSAGES.IVEDB_PING }
  | {
      type: typeof MESSAGES.IVEDB_GET_ENTRIES_PAGINATED
      offset: number
      limit: number
      options?: IveSearchOptions
    }
  | { type: typeof MESSAGES.IVEDB_GET_ENTRY_WITH_DETAILS; entryId: string }
  | { type: typeof MESSAGES.IVEDB_CREATE_ENTRY; data: CreateIveEntryData }
  | { type: typeof MESSAGES.IVEDB_GET_ENTRY; entryId: string }
  | { type: typeof MESSAGES.IVEDB_GET_ALL_ENTRIES }
  | { type: typeof MESSAGES.IVEDB_SEARCH_ENTRIES; options: IveSearchOptions }
  | {
      type: typeof MESSAGES.IVEDB_UPDATE_ENTRY
      entryId: string
      data: CreateIveEntryData
    }
  | { type: typeof MESSAGES.IVEDB_DELETE_ENTRY; entryId: string }
  | { type: typeof MESSAGES.IVEDB_ADD_FAVORITE; entryId: string }
  | { type: typeof MESSAGES.IVEDB_REMOVE_FAVORITE; entryId: string }
  | { type: typeof MESSAGES.IVEDB_GET_FAVORITES }
  | { type: typeof MESSAGES.IVEDB_IS_FAVORITED; entryId: string }
  | { type: typeof MESSAGES.IVEDB_FIND_BY_VIDEO_URL; url: string }
  | { type: typeof MESSAGES.IVEDB_FIND_BY_SCRIPT_URL; url: string }
  | { type: typeof MESSAGES.IVEDB_GET_VIDEO_LOOKUPS }
