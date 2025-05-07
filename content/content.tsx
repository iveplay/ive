import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { EroLoadPanel } from '@/pages/eroLoadPanel/EroLoadPanel'
import { VideoPage } from '@/pages/videoPage/VideoPage'
import { getScripts, saveScript } from '@/utils/saveScripts'

// Extend Window interface
declare global {
  interface Window {
    ive: {
      saveScript: typeof saveScript
      getScripts: typeof getScripts
    }
  }
}

// Exports to window
window.ive = {
  saveScript,
  getScripts,
}

const LOAD_SCRIPT_PAGES = ['discuss.eroscripts.com/t/', 'faptap.net/v']

let currentUrl = window.location.href

setInterval(() => {
  if (window.location.href !== currentUrl) {
    const loadScriptPage = LOAD_SCRIPT_PAGES.find((page) =>
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

  const loadScriptPage = LOAD_SCRIPT_PAGES.find((page) =>
    window.location.href.includes(page),
  )

  document.getElementById('ive')?.remove()

  if (scripts && scripts[1]) {
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

  if (loadScriptPage) {
    const root = document.createElement('div')
    root.id = 'ive'
    root.style.position = 'relative'

    document.getElementsByClassName('icons d-header-icons')[0]?.prepend(root)

    ReactDOM.createRoot(root).render(
      <StrictMode>
        <EroLoadPanel />
      </StrictMode>,
    )
  }
}

// Initial setup
handleUrlChange()
