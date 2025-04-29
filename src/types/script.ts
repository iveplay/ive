export type ScriptInfo = {
  name: string
  creator: string
  supportUrl: string
  isDefault: boolean
}

export type Scripts = Record<string, ScriptInfo>

export type ScriptEntries = Record<string, Scripts>
