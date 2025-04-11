import { createTheme, MantineProvider } from '@mantine/core'
import { DeviceConnect } from '@/components/deviceConnect/DeviceConnect'
import { useHandySetup } from '@/store/useHandyStore'
import styles from './PopupApp.module.scss'

const theme = createTheme({})

export const PopupApp = () => {
  useHandySetup('popup', true)

  return (
    <MantineProvider theme={theme}>
      <div className={styles.popupApp}>
        <DeviceConnect />
      </div>
    </MantineProvider>
  )
}
