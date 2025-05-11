import { CSSProperties, ReactNode, StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { EroLoadPanel } from '@/pages/eroLoadPanel/EroLoadPanel'
import { FaptapPanel } from '@/pages/faptapPanel/FaptapPanel'
import { IvdbPanel } from '@/pages/ivdbPanel/IvdbPanel'
import { VideoPage } from '@/pages/videoPage/VideoPage'
import { findHtmlElement } from '@/utils/findHtmlElement'
import { setupIveEventApi } from '@/utils/iveEventApi'
import { getScripts } from '@/utils/saveScripts'

const EROSCRIPT_URL = 'discuss.eroscripts.com/t/'
const FAPTAP_URL = 'faptap.net/v'
const IVDB_URL = 'ivdb.io/#/videos/'

let currentUrl = window.location.href
let mountedComponent = false

// Expose extension API to the page
setupIveEventApi()

setInterval(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href
    mountedComponent = false
    document.getElementById('ive')?.remove()
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
  const scripts = Object.entries(scriptMappings).find(([url]) =>
    currentUrl.includes(url),
  )?.[1]

  try {
    if (currentUrl.includes(EROSCRIPT_URL)) {
      const container = document.getElementsByClassName(
        'icons d-header-icons',
      )[0]
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
    } else if (currentUrl.includes(IVDB_URL)) {
      const container = await findHtmlElement('#handy-ui')

      if (container) {
        mountComponent(container, <IvdbPanel />, 'prepend', {
          position: 'relative',
        })
      }
    } else if (scripts) {
      mountComponent(document.body, <VideoPage scripts={scripts} />, 'append', {
        zIndex: '2147483640',
        position: 'fixed',
        inset: '0',
        pointerEvents: 'none',
      })
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
