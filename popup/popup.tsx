import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PopupApp } from '@/pages/popup/PopupApp'
import '@mantine/core/styles.css'
import '@/styles/global.scss'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>,
)
