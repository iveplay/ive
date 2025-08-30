import { CONTEXT_MESSAGES } from '@background/types'
import { useVideoStore } from '@/store/useVideoStore'
import { IveEntry } from '@/types/ivedb'
import {
  SITE_URLS,
  mountEroscriptPanel,
  mountFaptapPanel,
  mountFaptapCardHandler,
  mountIvdbPanel,
  mountFunscripthubPanel,
  mountVideoPage,
} from '@/utils/componentMounting'
import { setupIveEventApi } from '@/utils/iveEventApi'
import {
  findMatchingEntry,
  matchesCustomUrls,
  getCustomUrls,
} from '@/utils/urlMatching'

let currentUrl = window.location.href
let mountedComponent = false
const isInIframe = window !== window.top

// Handle messages from popup
const setupMessageListeners = () => {
  chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
    if (message.type === CONTEXT_MESSAGES.FLOAT_VIDEO && !isInIframe) {
      handleFloatVideoMessage()
      sendResponse({ success: true })
    }

    if (
      message.type === CONTEXT_MESSAGES.EROSCRIPTS_VIDEO ||
      message.type === CONTEXT_MESSAGES.EROSCRIPTS_SCRIPT
    ) {
      sendResponse({ success: true })
    }
  })
}

const handleFloatVideoMessage = () => {
  // Mount component if needed
  if (!document.getElementById('ive')) {
    mountedComponent = false
    mountVideoPage(null)
  }

  // Trigger floating mode
  setTimeout(() => {
    useVideoStore.getState().setIsFloating(true)
  }, 100)
}

// URL change monitoring
const setupUrlMonitoring = () => {
  setInterval(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href
      mountedComponent = false

      // Clean up old components
      if (!currentUrl.includes(SITE_URLS.EROSCRIPT)) {
        document.getElementById('ive')?.remove()
      }

      handleUrlChange()
    } else if (
      !mountedComponent &&
      window.location.href.includes(SITE_URLS.FAPTAP)
    ) {
      handleUrlChange()
    }
  }, 1000)
}

// Main URL change handler
const handleUrlChange = async () => {
  if (document.getElementById('ive')) return // Prevent duplicates

  try {
    await mountComponentForUrl(currentUrl)
  } catch (error) {
    console.error('Error mounting IVE component:', error)
  }
}

// Mount appropriate component based on URL
const mountComponentForUrl = async (url: string): Promise<void> => {
  let successMount = false

  // Handle specific site panels first
  if (url.includes(SITE_URLS.EROSCRIPT)) {
    successMount = await mountEroscriptPanel()
  } else if (url.includes(SITE_URLS.FAPTAP)) {
    successMount = await mountFaptapPanel()
  } else if (url.includes(SITE_URLS.FAPTAP_DOMAIN)) {
    successMount = await mountFaptapCardHandler()
  } else if (url.includes(SITE_URLS.IVDB)) {
    successMount = await mountIvdbPanel()
  } else if (url.includes(SITE_URLS.FUNSCRIPTHUB)) {
    successMount = await mountFunscripthubPanel()
  } else {
    // Handle video pages with IveDB entries
    successMount = await handleVideoPageMounting(url)
  }

  if (successMount) {
    console.log('IVE component mounted successfully')
    mountedComponent = true
  }
}

// Handle video page mounting with IveDB lookup
const handleVideoPageMounting = async (url: string) => {
  let matchingEntry: IveEntry | null = null
  let shouldMount = false

  // Try to find matching IveDB entry
  matchingEntry = await findMatchingEntry(url)

  // Check custom URLs if no entry found
  if (!matchingEntry) {
    const customUrls = await getCustomUrls()
    shouldMount = matchesCustomUrls(url, customUrls)
  } else {
    shouldMount = true
  }

  // Handle iframe context
  if (isInIframe && !shouldMount) {
    matchingEntry = await handleIframeContext(url)
    shouldMount = !!matchingEntry
  }

  if (shouldMount) {
    return mountVideoPage(matchingEntry, isInIframe)
  }

  return false
}

// Handle iframe-specific logic
const handleIframeContext = async (url: string): Promise<IveEntry | null> => {
  try {
    // Try to get parent URL and check for matches
    const parentUrl = window.parent.location.href
    const matchingEntry = await findMatchingEntry(parentUrl)
    if (matchingEntry) return matchingEntry

    // Check parent URL against custom URLs
    const customUrls = await getCustomUrls()
    if (matchesCustomUrls(parentUrl, customUrls)) {
      return null // Return null but indicate we should mount
    }
  } catch {
    // CORS error - try domain-based matching
    return await handleCorsRestrictedIframe(url)
  }

  return null
}

// Handle CORS-restricted iframe by domain matching
const handleCorsRestrictedIframe = async (
  url: string,
): Promise<IveEntry | null> => {
  try {
    const currentDomain = new URL(url).hostname.replace(/^www\./, '')
    return await findMatchingEntry(`https://${currentDomain}`)
  } catch {
    return null
  }
}

// Initialize everything
const initialize = () => {
  setupIveEventApi()
  setupMessageListeners()
  setupUrlMonitoring()
  handleUrlChange() // Initial setup
}

// Start the content script
initialize()
