import { setupMessageHandler } from './messageHandler'
import { deviceService } from './service'

async function init() {
  setupMessageHandler()

  await deviceService.autoConnect()

  console.log('IVE background service initialized')
}

// Start initialization
init().catch(console.error)
