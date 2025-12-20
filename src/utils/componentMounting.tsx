import { CSSProperties, ReactNode, StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { EroLoadPanel } from '@/pages/eroLoadPanel/EroLoadPanel'
import { FaptapCardHandler } from '@/pages/faptapPanel/FaptapCardHandler'
import { FaptapPanel } from '@/pages/faptapPanel/FaptapPanel'
import { FunscripthubPanel } from '@/pages/funscripthubPanel/FunscripthubPanel'
import { IvdbPanel } from '@/pages/ivdbPanel/IvdbPanel'
import { VideoPage } from '@/pages/videoPage/VideoPage'
import { IveEntry } from '@/types/ivedb'
import { findHtmlElement } from '@/utils/findHtmlElement'

export const SITE_URLS = {
  EROSCRIPT: 'discuss.eroscripts.com/t/',
  FAPTAP: 'faptap.net/v/',
  FAPTAP_DOMAIN: 'faptap.net',
  IVDB: 'ivdb.io/#/videos/',
  FUNSCRIPTHUB: 'funscripthub.com/detail',
} as const

export const hasVideoIframes = (): boolean => {
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

export const mountComponent = (
  container: Element,
  component: ReactNode,
  insertMethod: 'append' | 'prepend' = 'append',
  styles: CSSProperties = {},
) => {
  if (!container || document.getElementById('ive')) return false

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

  return true
}

// Site-specific mounting handlers
export const mountEroscriptPanel = async (): Promise<boolean> => {
  const isMobile =
    window.matchMedia('(max-width: 924px)').matches ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    )

  const container = document.querySelector(
    isMobile ? '#post_1' : '[class*="with-timeline"]',
  )

  if (!container) return false

  return mountComponent(container, <EroLoadPanel />, 'prepend', {
    position: 'relative',
  })
}

export const mountFaptapPanel = async (): Promise<boolean> => {
  const container = await findHtmlElement(
    '#app > div > div.py-2.lg\\:py-8.lg\\:px-8.flex-1.flex.flex-col.relative > div.flex-1 > div.text-white.flex.flex-col.gap-y-2.mt-3.px-2.md\\:px-0 > div.flex.flex-col-reverse.lg\\:flex-row.lg\\:items-center.justify-between.gap-y-2 > div.relative.-mx-2.lg\\:mx-0 > div > div',
  )

  if (!container) return false

  return mountComponent(container, <FaptapPanel />, 'prepend', {
    position: 'relative',
  })
}

export const mountFaptapCardHandler = (): boolean => {
  return mountComponent(document.body, <FaptapCardHandler />, 'append', {
    display: 'none',
  })
}

export const mountIvdbPanel = async (): Promise<boolean> => {
  const container = await findHtmlElement('#handy-ui')
  if (!container) return false

  return mountComponent(container, <IvdbPanel />, 'prepend', {
    position: 'relative',
  })
}

export const mountFunscripthubPanel = async (): Promise<boolean> => {
  const videoLinksSection = document.querySelector(
    '#app > div > div:nth-child(2) > div > div > div.lg\\:col-start-3.lg\\:row-end-1',
  )

  if (!videoLinksSection) return false

  return mountComponent(videoLinksSection, <FunscripthubPanel />, 'prepend', {
    position: 'relative',
    marginBottom: '16px',
  })
}

export const mountVideoPage = (
  entry: IveEntry | undefined,
  isInIframe: boolean = false,
  force: boolean = false,
): boolean => {
  if (!(isInIframe || !!entry) && !force) return false

  console.log('IVE: Mounted panel')
  return mountComponent(document.body, <VideoPage entry={entry} />, 'append', {
    zIndex: '2147483640',
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
  })
}
