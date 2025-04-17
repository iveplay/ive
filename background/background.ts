import { initializeApi } from './apiHandler'
import { setupMessageHandler } from './messageHandler'
import { loadPreferences } from './preferences'
import { loadCustomScriptMapping } from './scriptManager'
import { loadSessionState } from './sessionManager'
import { loadConfig } from './state'

async function init() {
  // Initialize all modules
  await loadConfig()
  await loadCustomScriptMapping()
  await loadSessionState()
  await loadPreferences()

  // Initialize API without connecting
  initializeApi()
  setupMessageHandler()

  console.log('Background service initialized')
}

// Start initialization
init().catch(console.error)
