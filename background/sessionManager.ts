import { connectDevice, disconnectDevice } from './apiHandler'
import { state } from './state'

// Keep track of tabs with active content scripts
export const activeTabs = new Set<number>()

// Track active contexts that need the connection
export const activeContexts = {
  popup: false,
  contentScript: false,
}

export let wasPopupOpenedThisSession = false

// Load session state from storage
export async function loadSessionState() {
  try {
    const data = await chrome.storage.session.get('ive-session-state')
    if (data['ive-session-state']) {
      wasPopupOpenedThisSession =
        data['ive-session-state'].wasPopupOpened || false
      console.log(
        'Loaded session state, popup was opened:',
        wasPopupOpenedThisSession,
      )
    }
  } catch (error) {
    console.error('Error loading session state:', error)
  }
}

// Save session state to storage
export async function saveSessionState() {
  try {
    await chrome.storage.session.set({
      'ive-session-state': {
        wasPopupOpened: wasPopupOpenedThisSession,
      },
    })
  } catch (error) {
    console.error('Error saving session state:', error)
  }
}

// Function to check if we need to connect or disconnect
export async function updateConnectionState(broadcastState: () => void) {
  const needsConnection =
    activeContexts.popup ||
    activeContexts.contentScript ||
    wasPopupOpenedThisSession

  if (
    needsConnection &&
    !state.isConnected &&
    state.config.connectionKey &&
    !state.config.wasManuallyDisconnected
  ) {
    console.log('Auto-connecting because a context needs it')
    connectDevice(broadcastState).catch(console.error)
  } else if (!needsConnection && state.isConnected) {
    console.log('Auto-disconnecting because no contexts need it')
    disconnectDevice(broadcastState).catch(console.error)
  }
}

// Handle context activation/deactivation
export function handleContextUpdate(
  broadcastState: () => void,
  context: 'popup' | 'contentScript',
  active: boolean,
  tabId?: number,
) {
  activeContexts[context] = active

  // If this is the popup becoming active
  if (context === 'popup' && active) {
    // Remember the popup was opened this session
    wasPopupOpenedThisSession = true
    saveSessionState()
  }

  // If this is a content script becoming active/inactive and we have tab info
  if (context === 'contentScript' && tabId) {
    if (active) {
      activeTabs.add(tabId)
    } else {
      activeTabs.delete(tabId)
    }
  }

  updateConnectionState(broadcastState)
  return true
}
