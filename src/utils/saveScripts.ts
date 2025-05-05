import { ScriptEntries, ScriptInfo } from '@/types/script'

export const getScripts = async (): Promise<ScriptEntries> => {
  try {
    return await chrome.runtime.sendMessage({ type: 'idb:get_scripts' })
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
    await chrome.runtime.sendMessage({
      type: 'idb:save_script',
      websiteKey,
      scriptId,
      scriptInfo,
    })
  } catch (error) {
    console.error('Error saving scripts:', error)
    throw error
  }
}
