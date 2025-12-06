import { useEffect, useRef } from 'react'
import { ScriptOption } from '@/pages/videoPanel/VideoPanel'
import { IveEntry } from '@/types/ivedb'

export const useScriptAutoload = (
  videoElement: HTMLVideoElement | null,
  currentScript: string | null,
  scriptOptions: ScriptOption[],
  entry: IveEntry | undefined,
  handleScriptSelect: (url: string) => Promise<void>,
) => {
  const hasLoadedScript = useRef(false)

  useEffect(() => {
    if (
      !videoElement ||
      currentScript ||
      scriptOptions.length === 0 ||
      hasLoadedScript.current
    ) {
      return
    }

    chrome.storage.local.get('ive-pending-script', (result) => {
      const pending = result['ive-pending-script']

      if (pending) {
        const isRecent = Date.now() - pending.timestamp < 30000

        if (isRecent) {
          const targetScript = scriptOptions.find(
            (s) => s.id === pending.scriptId,
          )
          if (targetScript) {
            console.log('Loading script from hub selection')
            chrome.storage.local.remove('ive-pending-script')
            hasLoadedScript.current = true
            handleScriptSelect(targetScript.url)
            return
          }
        }
        chrome.storage.local.remove('ive-pending-script')
      }

      // Fallback to default
      const defaultScript =
        scriptOptions.find((s) => s.url === entry?.defaultScriptId) ||
        scriptOptions[0]

      if (defaultScript) {
        console.log('Auto loading default script')
        hasLoadedScript.current = true
        handleScriptSelect(defaultScript.url)
      }
    })
  }, [
    videoElement,
    currentScript,
    scriptOptions,
    entry?.defaultScriptId,
    handleScriptSelect,
  ])
}
