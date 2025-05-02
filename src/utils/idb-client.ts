import { ScriptEntries } from '@/types/script'

export const getScripts = async (): Promise<ScriptEntries> => {
  try {
    return await chrome.runtime.sendMessage({ type: 'idb:get_scripts' })
  } catch (error) {
    console.error('Error getting scripts:', error)
    return {}
  }
}

export const saveScripts = async (scripts: ScriptEntries) => {
  try {
    await chrome.runtime.sendMessage({
      type: 'idb:save_scripts',
      scripts,
    })
  } catch (error) {
    console.error('Error saving scripts:', error)
    throw error
  }
}
