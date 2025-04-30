import { MantineProvider } from '@mantine/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PopupApp } from '@/pages/popup/PopupApp'
import '@mantine/core/styles.css'
import './global.scss'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider forceColorScheme='dark'>
      <PopupApp />
    </MantineProvider>
  </StrictMode>,
)
