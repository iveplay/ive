import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { LoadPanel } from '@/pages/loadPanel/LoadPanel'
import { VideoPanel } from '@/pages/videoPanel/VideoPanel'
import { ScriptEntries } from '@/types/script'

export const SCRIPT_MAPPINGS: ScriptEntries = {
  'https://sweettecheu.s3.eu-central-1.amazonaws.com/testsync/sync_video_2021.mp4':
    {
      'https://sweettecheu.s3.eu-central-1.amazonaws.com/testsync/sync_video_2021.csv':
        {
          name: 'Handy test script',
          creator: 'The Handy',
          supportUrl: 'https://www.thehandy.com/',
          isDefault: true,
        },
    },
  'https://www.pornhub.com/view_video.php?viewkey=ph5ef6a1d92ae1f': {
    'https://sweettecheu.s3.eu-central-1.amazonaws.com/testsync/sync_video_2021.csv':
      {
        name: 'Script Name',
        creator: 'Creator Name',
        supportUrl: 'https://creator.com/support',
        isDefault: false,
      },
    'https://eroscripts-discourse.eroscripts.com/original/3X/5/8/5842f55e8a52834076424f909bdcf09059b4b81d.funscript':
      {
        name: 'Script Name 2',
        creator: 'Creator Name 2',
        supportUrl: 'https://creator.com/support',
        isDefault: true,
      },
  },
}

const LOAD_SCRIPT_PAGES = ['discuss.eroscripts.com/t/', 'faptap.net/v']

const scripts = SCRIPT_MAPPINGS[window.location.href] ?? undefined

const loadScriptPage = LOAD_SCRIPT_PAGES.find((page) =>
  window.location.href.includes(page),
)

if (scripts) {
  const root = document.createElement('div')
  root.id = 'ive'
  root.style.zIndex = '2147483640'
  root.style.position = 'fixed'
  root.style.inset = '0'
  root.style.pointerEvents = 'none'

  document.body.appendChild(root)
  ReactDOM.createRoot(root).render(
    <StrictMode>
      <VideoPanel scripts={scripts} />
    </StrictMode>,
  )
}

if (loadScriptPage) {
  const root = document.createElement('div')
  root.id = 'ive'

  document
    .getElementsByClassName('timeline-footer-controls')[0]
    ?.appendChild(root)

  ReactDOM.createRoot(root).render(
    <StrictMode>
      <LoadPanel page={loadScriptPage} />
    </StrictMode>,
  )
}
