import { createTheme, MantineProvider } from '@mantine/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PopupApp } from '../src/pages/popup/PopupApp'
import '@mantine/core/styles.css'
import '../src/styles/global.scss'

const theme = createTheme({})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <PopupApp />
    </MantineProvider>
  </StrictMode>,
)
