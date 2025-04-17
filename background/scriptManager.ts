import { initializeApi } from './apiHandler'
import { state } from './state'

// Script mapping storage
export const customScriptMapping: Record<string, string> = {}

// Upload script and return the hosted URL
export async function uploadScriptUrl(
  scriptUrl: string,
  broadcastState: () => void,
): Promise<string | null> {
  try {
    const handyApi = initializeApi()

    if (!handyApi) {
      state.error = 'Not connected to a device'
      broadcastState()
      return null
    }

    // First fetch the script file
    const response = await fetch(scriptUrl)
    if (!response.ok) {
      state.error = 'Failed to fetch script'
      broadcastState()
      return null
    }

    // Create a file from the response
    const contentType = response.headers.get('content-type') || 'text/plain'
    const blob = await response.blob()
    const filename = scriptUrl.split('/').pop() || 'script.funscript'
    const file = new File([blob], filename, { type: contentType })

    // Upload the file using the API
    const uploadedUrl = await handyApi.uploadScript(file)

    if (!uploadedUrl) {
      state.error = 'Failed to upload script'
      broadcastState()
      return null
    }

    return uploadedUrl
  } catch (error) {
    console.error('Error uploading script:', error)
    state.error = 'Failed to upload script'
    broadcastState()
    return null
  }
}

// Add new function to save custom script mapping
export async function saveCustomScriptMapping(
  videoUrl: string,
  scriptUrl: string,
): Promise<boolean> {
  try {
    customScriptMapping[videoUrl] = scriptUrl

    // Save to storage
    await chrome.storage.local.set({
      'custom-script-mapping': customScriptMapping,
    })

    console.log('Saved custom script mapping:', videoUrl, scriptUrl)
    return true
  } catch (error) {
    console.error('Error saving custom script mapping:', error)
    return false
  }
}

// Add function to get custom script for URL
export async function getCustomScriptForUrl(
  videoUrl: string,
): Promise<string | null> {
  // Check if we have a direct match
  if (customScriptMapping[videoUrl]) {
    return customScriptMapping[videoUrl]
  }

  // Check if we have a partial match (site domain)
  const matchingKey = Object.keys(customScriptMapping).find(
    (key) => videoUrl.includes(key) || key.includes(videoUrl),
  )

  if (matchingKey) {
    return customScriptMapping[matchingKey]
  }

  return null
}

// Load custom scripts on startup
export async function loadCustomScriptMapping() {
  try {
    const data = await chrome.storage.local.get('custom-script-mapping')
    if (data['custom-script-mapping']) {
      Object.assign(customScriptMapping, data['custom-script-mapping'])
      console.log('Loaded custom script mapping:', customScriptMapping)
    }
  } catch (error) {
    console.error('Error loading custom script mapping:', error)
  }
}
