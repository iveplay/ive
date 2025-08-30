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
  hasVideoIframes,
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
    mountVideoPage(undefined, false, !isInIframe) // Force mount if not in iframe
  }

  // Trigger floating mode
  setTimeout(() => {
    useVideoStore.getState().setIsFloating(true)
  }, 200)
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
    // Handle specific site panels first
    if (currentUrl.includes(SITE_URLS.EROSCRIPT)) {
      const success = await mountEroscriptPanel()
      if (success) mountedComponent = true
      return
    }

    if (currentUrl.includes(SITE_URLS.FAPTAP)) {
      const success = await mountFaptapPanel()
      if (success) mountedComponent = true
      return
    }

    if (currentUrl.includes(SITE_URLS.FAPTAP_DOMAIN)) {
      const success = mountFaptapCardHandler()
      if (success) mountedComponent = true
      return
    }

    if (currentUrl.includes(SITE_URLS.IVDB)) {
      const success = await mountIvdbPanel()
      if (success) mountedComponent = true
      return
    }

    if (currentUrl.includes(SITE_URLS.FUNSCRIPTHUB)) {
      const success = await mountFunscripthubPanel()
      if (success) mountedComponent = true
      return
    }

    let entry: IveEntry | undefined = undefined
    let shouldMount = false

    // Try to find matching IveDB entry
    entry = await findMatchingEntry(currentUrl)

    // Check custom URLs if no entry found
    if (!entry) {
      const customUrls = await getCustomUrls()
      shouldMount = matchesCustomUrls(currentUrl, customUrls)
    } else {
      shouldMount = true
    }

    // Handle iframe context
    if (isInIframe && !entry && !shouldMount) {
      try {
        // Try to get parent URL and check for matches
        const parentUrl = window.parent.location.href
        entry = await findMatchingEntry(parentUrl)

        if (!entry) {
          const customUrls = await getCustomUrls()
          const normalizedParentUrl = parentUrl
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')

          shouldMount = customUrls.some((url) => {
            const normalizedCustomUrl = url
              .replace(/^https?:\/\//, '')
              .replace(/^www\./, '')
            return normalizedParentUrl.includes(normalizedCustomUrl)
          })
        } else {
          shouldMount = true
        }
      } catch {
        // CORS error - try domain-based matching (from original)
        const currentDomain = new URL(currentUrl).hostname.replace(/^www\./, '')
        entry = await findMatchingEntry(`https://${currentDomain}`)
        if (entry) shouldMount = true
      }
    }

    // Only mount if we have entry OR custom URL match
    // For iframe: always mount if conditions are met
    // For main page: only mount if no video iframes OR we have an entry
    if (shouldMount) {
      const shouldMountFinal =
        isInIframe || (!hasVideoIframes() && (entry || shouldMount))

      if (shouldMountFinal) {
        const success = mountVideoPage(entry, isInIframe)
        if (success) mountedComponent = true
      }
    }
  } catch (error) {
    console.error('Error mounting IVE component:', error)
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
