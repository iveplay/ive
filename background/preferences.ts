export const preferences = {
  showInfoPanel: true,
  showLoadPanel: true,
}

// Load stored preferences
export async function loadPreferences() {
  try {
    const storedData = await chrome.storage.sync.get('ive-preferences')
    if (storedData['ive-preferences']) {
      Object.assign(preferences, JSON.parse(storedData['ive-preferences']))
      console.log('Loaded stored preferences:', preferences)
    }
  } catch (error) {
    console.error('Error loading preferences:', error)
  }
}

// Save preferences
export async function savePreferences() {
  try {
    await chrome.storage.sync.set({
      'ive-preferences': JSON.stringify(preferences),
    })
  } catch (error) {
    console.error('Error saving preferences:', error)
  }
}

// Broadcast preferences to all contexts
export function broadcastPreferences() {
  // Send to popup
  chrome.runtime
    .sendMessage({
      type: 'preferences_update',
      preferences,
    })
    .catch(() => {})

  // Send to all active content script tabs
  chrome.tabs.query({}).then((tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs
          .sendMessage(tab.id, {
            type: 'preferences_update',
            preferences,
          })
          .catch(() => {})
      }
    })
  })
}
