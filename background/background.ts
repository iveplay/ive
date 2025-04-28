import { setupMessageHandler } from './messageHandler'
import { deviceService } from './service'

async function init(): Promise<void> {
  console.log('Initializing IVE background service...')

  setupMessageHandler()

  await deviceService.autoConnect()

  console.log('IVE background service initialized successfully')
}

init().catch((error) => {
  console.error('Error initializing IVE background service:', error)
})
