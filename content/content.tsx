import { CONTEXT_MESSAGES } from '@background/types'
import { CSSProperties, ReactNode, StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { EroLoadPanel } from '@/pages/eroLoadPanel/EroLoadPanel'
import { FaptapCardHandler } from '@/pages/faptapPanel/FaptapCardHandler'
import { FaptapPanel } from '@/pages/faptapPanel/FaptapPanel'
import { FunscripthubPanel } from '@/pages/funscripthubPanel/FunscripthubPanel'
import { IvdbPanel } from '@/pages/ivdbPanel/IvdbPanel'
import { VideoPage } from '@/pages/videoPage/VideoPage'
import { useVideoStore } from '@/store/useVideoStore'
import { findHtmlElement } from '@/utils/findHtmlElement'
import { setupIveEventApi } from '@/utils/iveEventApi'

const EROSCRIPT_URL = 'discuss.eroscripts.com/t/'
const FAPTAP_URL = 'faptap.net/v'
const FAPTAP_DOMAIN = 'faptap.net'
const IVDB_URL = 'ivdb.io/#/videos/'
const FUNSCRIPTHUB_URL = 'funscripthub.com/detail'

let currentUrl = window.location.href
let mountedComponent = false
const isInIframe = window !== window.top

const hasVideoIframes = (): boolean => {
  const iframes = document.querySelectorAll('iframe')
  return Array.from(iframes).some((iframe) => {
    const src = iframe.src.toLowerCase()
    return (
      src.includes('player') ||
      src.includes('embed') ||
      src.includes('video') ||
      src.includes('mediadelivery') ||
      src.includes('iframe.') ||
      iframe.allowFullscreen
    )
  })
}

// Expose extension API to the page
setupIveEventApi()

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.type === CONTEXT_MESSAGES.FLOAT_VIDEO && !isInIframe) {
    // First check if we need to mount the video page component
    if (!document.getElementById('ive')) {
      mountedComponent = false
      mountComponent(document.body, <VideoPage />, 'append', {
        zIndex: '2147483640',
        position: 'fixed',
        inset: '0',
        pointerEvents: 'none',
      })
    }

    // Then trigger floating mode
    setTimeout(() => {
      useVideoStore.getState().setIsFloating(true)
    }, 100)

    sendResponse({ success: true })
  }

  if (
    message.type === CONTEXT_MESSAGES.EROSCRIPTS_VIDEO ||
    message.type === CONTEXT_MESSAGES.EROSCRIPTS_SCRIPT
  ) {
    // Forward to EroLoadPanel - the panel component will handle it via its own listener
    sendResponse({ success: true })
  }
})

setInterval(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href
    mountedComponent = false

    if (!currentUrl.includes(EROSCRIPT_URL)) {
      document.getElementById('ive')?.remove()
    }

    handleUrlChange()
  } else if (!mountedComponent && window.location.href.includes(FAPTAP_URL)) {
    handleUrlChange()
  }
}, 1000)

const handleUrlChange = async () => {
  if (document.getElementById('ive')) {
    // Prevent duplicate components
    return
  }
  const scriptMappings = await getScripts()

  const normalizedCurrentUrl = currentUrl
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/^[a-z]{2,3}\./, '')

  let scripts: Scripts | undefined

  scripts = Object.entries(scriptMappings).find(
    ([url]) =>
      normalizedCurrentUrl.includes(url) || url.includes(normalizedCurrentUrl),
  )?.[1]

  // Get custom URLs from settings
  let customUrls: string[] = []
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'ive:get_state',
    })
    customUrls = response.customUrls || []
  } catch (error) {
    console.error('Error getting custom URLs:', error)
  }

  // Check if current URL matches any custom URLs
  let matchesCustomUrl = customUrls.some((url) => {
    const normalizedCustomUrl = url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
    return normalizedCurrentUrl.includes(normalizedCustomUrl)
  })

  if (isInIframe && !scripts && !matchesCustomUrl) {
    try {
      // Get parent window URL if accessible
      const parentUrl = window.parent.location.href

      // Check if parent URL has scripts
      scripts = Object.entries(scriptMappings).find(([url]) =>
        parentUrl.includes(url),
      )?.[1]

      const normalizedParentUrl = parentUrl
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')

      // Check if parent URL matches custom URLs
      if (!scripts && !matchesCustomUrl) {
        matchesCustomUrl = customUrls.some((url) => {
          const normalizedCustomUrl = url
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
          return normalizedParentUrl.includes(normalizedCustomUrl)
        })
      }
    } catch {
      // Parent URL not accessible due to CORS, try alternative approach

      // Extract domain from iframe URL and check against script domains
      const currentDomain = new URL(currentUrl).hostname.replace(/^www\./, '')

      scripts = Object.entries(scriptMappings).find(([url]) => {
        const scriptDomain = new URL(url).hostname.replace(/^www\./, '')
        return (
          currentDomain === scriptDomain ||
          currentDomain.endsWith(`.${scriptDomain}`) ||
          scriptDomain.endsWith(`.${currentDomain}`)
        )
      })?.[1]
    }
  }

  try {
    if (currentUrl.includes(EROSCRIPT_URL)) {
      const isMobile =
        window.matchMedia('(max-width: 924px)').matches ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        )

      const container = document.querySelector(
        isMobile ? '#post_1' : '[class*="with-timeline"]',
      )
      if (container) {
        mountComponent(container, <EroLoadPanel />, 'prepend', {
          position: 'relative',
        })
      }
    } else if (currentUrl.includes(FAPTAP_URL)) {
      const container = await findHtmlElement(
        '#app > div > div.py-2.lg\\:py-8.lg\\:px-8.flex-1.flex.flex-col.relative > div.flex-1 > div.text-white.flex.flex-col.gap-y-2.mt-3.px-2.md\\:px-0 > div.flex.flex-col-reverse.lg\\:flex-row.lg\\:items-center.justify-between.gap-y-2 > div.relative.-mx-2.lg\\:mx-0 > div > div',
      )

      if (container) {
        mountComponent(container, <FaptapPanel />, 'prepend', {
          position: 'relative',
        })
      }
    } else if (currentUrl.includes(FAPTAP_DOMAIN)) {
      mountComponent(document.body, <FaptapCardHandler />, 'append', {
        display: 'none',
      })
    } else if (currentUrl.includes(IVDB_URL)) {
      const container = await findHtmlElement('#handy-ui')

      if (container) {
        mountComponent(container, <IvdbPanel />, 'prepend', {
          position: 'relative',
        })
      }
    } else if (currentUrl.includes(FUNSCRIPTHUB_URL)) {
      // Find the section with video links and inject above it
      const videoLinksSection = document.querySelector(
        '#app > div > div:nth-child(2) > div > div > div.lg\\:col-start-3.lg\\:row-end-1',
      )

      if (videoLinksSection) {
        mountComponent(videoLinksSection, <FunscripthubPanel />, 'prepend', {
          position: 'relative',
          marginBottom: '16px',
        })
      }
    } else if (scripts || matchesCustomUrl) {
      // Only mount on iframe OR main page without video iframes
      // Don't mount if we're on main page with iframes (let iframe handle it)
      const shouldMount = isInIframe || (!hasVideoIframes() && scripts)

      if (shouldMount) {
        mountComponent(
          document.body,
          <VideoPage scripts={scripts} />,
          'append',
          {
            zIndex: '2147483640',
            position: 'fixed',
            inset: '0',
            pointerEvents: 'none',
          },
        )
      }
    }
  } catch (error) {
    console.error('Error mounting IVE component:', error)
  }
}

const mountComponent = (
  container: Element,
  component: ReactNode,
  insertMethod: 'append' | 'prepend' = 'append',
  styles: CSSProperties,
) => {
  if (!container || document.getElementById('ive')) return

  const root = document.createElement('div')
  root.id = 'ive'

  Object.entries(styles).forEach(([key, value]) => {
    root.style[key as unknown as number] = value
  })

  if (insertMethod === 'prepend') {
    container.prepend(root)
  } else {
    container.appendChild(root)
  }

  console.log('Mounting IVE component')
  ReactDOM.createRoot(root).render(<StrictMode>{component}</StrictMode>)

  mountedComponent = true
}

// Initial setup
handleUrlChange()
