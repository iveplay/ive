import { contextMenuService } from './contextMenuService'
import { iveDBService } from './ive-db.service'
import { setupMessageHandler } from './messageHandler'
import { deviceService } from './service'

async function init(): Promise<void> {
  console.log('Initializing IVE background service...')

  try {
    await iveDBService.openDB()
    console.log('IveDB initialized successfully')
  } catch (error) {
    console.error('Failed to initialize IveDB:', error)
  }

  setupMessageHandler()

  await deviceService.autoConnect()

  // Initialize context menus
  await contextMenuService.init()

  console.log('IVE background service initialized successfully')
}

init().catch((error) => {
  console.error('Error initializing IVE background service:', error)
})
