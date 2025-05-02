import { idbService } from './idb.service'
import { deviceService } from './service'
import { UIMessage } from './types'

export function setupMessageHandler(): void {
  chrome.runtime.onMessage.addListener(
    (message: UIMessage, _, sendResponse) => {
      console.log('Background received message:', message.type)

      const handleAsyncOperation = async () => {
        try {
          switch (message.type) {
            case 'ive:get_state':
              return deviceService.getState()

            case 'ive:get_device_info':
              return deviceService.getDeviceInfo()

            case 'ive:auto_connect':
              return await deviceService.autoConnect()

            case 'ive:handy_connect':
              return await deviceService.connectHandy(message.connectionKey)

            case 'ive:handy_disconnect':
              return await deviceService.disconnectHandy()

            case 'ive:handy_set_offset':
              return await deviceService.updateHandySettings({
                offset: message.offset,
              })

            case 'ive:handy_set_stroke_settings':
              return await deviceService.updateHandySettings({
                stroke: { min: message.min, max: message.max },
              })

            case 'ive:buttplug_connect':
              return await deviceService.connectButtplug(message.serverUrl)

            case 'ive:buttplug_disconnect':
              return await deviceService.disconnectButtplug()

            case 'ive:buttplug_scan':
              return await deviceService.scanForButtplugDevices()

            case 'ive:load_script_url':
              return await deviceService.loadScriptFromUrl(message.url)

            case 'ive:load_script_content':
              return await deviceService.loadScriptFromContent(message.content)

            case 'ive:play':
              return await deviceService.play(
                message.timeMs,
                message.playbackRate,
                message.loop,
              )

            case 'ive:stop':
              return await deviceService.stop()

            case 'ive:sync_time':
              return await deviceService.syncTime(message.timeMs)

            // Add IndexedDB handlers
            case 'idb:get_scripts':
              return await idbService.getScripts()

            case 'idb:save_scripts':
              return await idbService.saveScripts(message.scripts)

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
