import { MESSAGES } from '@background/types'
import { ScriptEntries, ScriptInfo } from '@/types/script'

export const getScripts = async (): Promise<ScriptEntries> => {
  try {
    return await chrome.runtime.sendMessage({ type: MESSAGES.GET_SCRIPTS })
  } catch (error) {
    console.error('Error getting scripts:', error)
    return {}
  }
}

export const saveScript = async (
  websiteKey: string,
  scriptId: string,
  scriptInfo: ScriptInfo,
) => {
  try {
    const result = await chrome.runtime.sendMessage({
      type: MESSAGES.SAVE_SCRIPT,
      websiteKey,
      scriptId,
      scriptInfo,
    })

    return !result?.error
  } catch (error) {
    console.error('Error saving scripts:', error)
    throw error
  }
}
