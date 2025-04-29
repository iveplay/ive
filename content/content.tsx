import React from 'react'
import ReactDOM from 'react-dom/client'
import { ContentApp } from '@/pages/content/ContentApp'
import { ScriptEntries } from '@/types/script'

export const SCRIPT_MAPPINGS: ScriptEntries = {
  'https://sweettecheu.s3.eu-central-1.amazonaws.com/testsync/sync_video_2021.mp4':
    {
      'https://sweettecheu.s3.eu-central-1.amazonaws.com/testsync/sync_video_2021.csv':
        {
          name: 'Script Name',
          creator: 'Creator Name',
          supportUrl: 'https://creator.com/support',
          isDefault: true,
        },
    },
}

const scripts = SCRIPT_MAPPINGS[window.location.href] ?? undefined

if (scripts) {
  // Create root element
  const root = document.createElement('div')
  root.id = 'crx-root'
  root.style.zIndex = '2147483640'
  root.style.position = 'fixed'
  root.style.inset = '0'
  root.style.pointerEvents = 'none'
  document.body.appendChild(root)

  // Render React content
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ContentApp scripts={scripts} />
    </React.StrictMode>,
  )
}
