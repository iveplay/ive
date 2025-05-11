import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { EroLoadPanel } from '@/pages/eroLoadPanel/EroLoadPanel'
import { FaptapPanel } from '@/pages/faptapPanel/FaptapPanel'
import { VideoPage } from '@/pages/videoPage/VideoPage'
import { findHtmlElement } from '@/utils/findHtmlElement'
import { setupIveEventApi } from '@/utils/iveEventApi'
import { getScripts } from '@/utils/saveScripts'

const EROSCRIPT_URL = 'discuss.eroscripts.com/t/'
const FAPTAP_URL = 'faptap.net/v'

let currentUrl = window.location.href

// Expose extension API to the page
setupIveEventApi()

setInterval(() => {
  if (window.location.href !== currentUrl) {
    const loadScriptPage = [EROSCRIPT_URL, FAPTAP_URL].find((page) =>
      currentUrl.includes(page),
    )

    currentUrl = window.location.href
    if (!loadScriptPage) {
      handleUrlChange()
    }
  }
}, 1000)

async function handleUrlChange() {
  const scriptMappings = await getScripts()

  const scripts = Object.entries(scriptMappings).find(([url, scripts]) => {
    if (currentUrl.includes(url)) {
      return scripts
    }
    return undefined
  })

  document.getElementById('ive')?.remove()

  if (window.location.href.includes(EROSCRIPT_URL)) {
    const root = document.createElement('div')
    root.id = 'ive'
    root.style.position = 'relative'

    document.getElementsByClassName('icons d-header-icons')[0]?.prepend(root)

    ReactDOM.createRoot(root).render(
      <StrictMode>
        <EroLoadPanel />
      </StrictMode>,
    )
  } else if (window.location.href.includes(FAPTAP_URL)) {
    const container = await findHtmlElement(
      '#app > div > div.py-2.lg\\:py-8.lg\\:px-8.flex-1.flex.flex-col.relative > div.flex-1 > div.text-white.flex.flex-col.gap-y-2.mt-3.px-2.md\\:px-0 > div.flex.flex-col-reverse.lg\\:flex-row.lg\\:items-center.justify-between.gap-y-2 > div.relative.-mx-2.lg\\:mx-0 > div > div',
    )

    if (!container) {
      return
    }

    const root = document.createElement('div')
    root.id = 'ive'
    root.style.position = 'relative'

    container?.prepend(root)

    ReactDOM.createRoot(root).render(
      <StrictMode>
        <FaptapPanel />
      </StrictMode>,
    )
  } else if (scripts && scripts[1]) {
    const root = document.createElement('div')
    root.id = 'ive'
    root.style.zIndex = '2147483640'
    root.style.position = 'fixed'
    root.style.inset = '0'
    root.style.pointerEvents = 'none'

    document.body.appendChild(root)

    ReactDOM.createRoot(root).render(
      <StrictMode>
        <VideoPage scripts={scripts[1]} />
      </StrictMode>,
    )
  }
}

// Initial setup
handleUrlChange()
