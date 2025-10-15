export interface IveEntry {
  id: string
  title: string
  duration?: number
  thumbnail?: string
  tags?: string[]
  videoSourceIds: string[]
  scriptIds: string[]
  createdAt: number
  updatedAt: number
}

export interface VideoSource {
  id: string
  url: string
  status?: 'working' | 'broken' | 'unknown'
  createdAt: number
  updatedAt: number
}

export interface ScriptMetadata {
  id: string
  url: string
  name: string
  creator: string
  supportUrl?: string
  avgSpeed?: number
  maxSpeed?: number
  actionCount?: number
  createdAt: number
  updatedAt: number
}

export interface IveDbState {
  entries: Record<string, IveEntry>
  videoSources: Record<string, VideoSource>
  scripts: Record<string, ScriptMetadata>
}

export interface CreateIveEntryData {
  title: string
  duration?: number
  thumbnail?: string
  tags?: string[]
  videoSources: Omit<VideoSource, 'id' | 'createdAt' | 'updatedAt'>[]
  scripts: Omit<ScriptMetadata, 'id' | 'createdAt' | 'updatedAt'>[]
}

export interface IveSearchOptions {
  query?: string
  tags?: string[]
  creator?: string
  minDuration?: number
  maxDuration?: number
  status?: VideoSource['status']
  favorites?: boolean
}
