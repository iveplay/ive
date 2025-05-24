import { idbService } from './idb.service'
import { deviceService } from './service'
import { MESSAGES, UIMessage } from './types'

export function setupMessageHandler(): void {
  chrome.runtime.onMessage.addListener(
    (message: UIMessage, _, sendResponse) => {
      console.log('Background received message:', message.type)

      const handleAsyncOperation = async () => {
        try {
          switch (message.type) {
            case MESSAGES.GET_STATE:
              return deviceService.getState()

            case MESSAGES.GET_DEVICE_INFO:
              return deviceService.getDeviceInfo()

            case MESSAGES.AUTO_CONNECT:
              return await deviceService.autoConnect()

            case MESSAGES.HANDY_CONNECT:
              return await deviceService.connectHandy(message.connectionKey)

            case MESSAGES.HANDY_DISCONNECT:
              return await deviceService.disconnectHandy()

            case MESSAGES.HANDY_SET_OFFSET:
              return await deviceService.updateHandySettings({
                offset: message.offset,
              })

            case MESSAGES.HANDY_SET_STROKE_SETTINGS:
              return await deviceService.updateHandySettings({
                stroke: { min: message.min, max: message.max },
              })

            case MESSAGES.BUTTPLUG_CONNECT:
              return await deviceService.connectButtplug(message.serverUrl)

            case MESSAGES.BUTTPLUG_DISCONNECT:
              return await deviceService.disconnectButtplug()

            case MESSAGES.BUTTPLUG_SCAN:
              return await deviceService.scanForButtplugDevices()

            case MESSAGES.LOAD_SCRIPT_URL:
              return await deviceService.loadScriptFromUrl(message.url)

            case MESSAGES.LOAD_SCRIPT_CONTENT:
              return await deviceService.loadScriptFromContent(message.content)

            case MESSAGES.PLAY:
              return await deviceService.play(
                message.timeMs,
                message.playbackRate,
                message.loop,
              )

            case MESSAGES.STOP:
              return await deviceService.stop()

            case MESSAGES.SYNC_TIME:
              return await deviceService.syncTime(message.timeMs)

            // Settings
            case MESSAGES.SHOW_HEATMAP:
              return await deviceService.setSettings(message.settings)

            // Add IndexedDB handlers
            case MESSAGES.GET_SCRIPTS:
              return await idbService.getScripts()

            case MESSAGES.SAVE_SCRIPT:
              return await idbService.saveScript(
                message.websiteKey,
                message.scriptId,
                message.scriptInfo,
              )

            default:
              return {
                error: `Unknown message type: ${(message as { type: string }).type}`,
              }
          }
        } catch (error) {
          console.error('Error handling message:', error)
          return {
            error: error instanceof Error ? error.message : String(error),
          }
        }
      }

      // For asynchronous operations, we need to return true from the listener
      // and then call sendResponse when the async operation completes
      handleAsyncOperation().then(sendResponse)
      return true
    },
  )
}
