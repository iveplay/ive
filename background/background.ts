import { contextMenuService } from './contextMenuService'
import { setupMessageHandler } from './messageHandler'
import { deviceService } from './service'

async function init(): Promise<void> {
  console.log('Initializing IVE background service...')

  setupMessageHandler()

  await deviceService.autoConnect()

  // Initialize context menus
  await contextMenuService.init()

  console.log('IVE background service initialized successfully')
}

init().catch((error) => {
  console.error('Error initializing IVE background service:', error)
})
