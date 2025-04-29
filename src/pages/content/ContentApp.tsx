import { MantineProvider } from '@mantine/core'
import { VideoPanel } from '@/components/videoPanel/VideoPanel'
import { Scripts } from '@/types/script'
import styles from './ContentApp.module.scss'
import '@mantine/core/styles.css'
import '@/styles/global.scss'

type ContentAppProps = {
  scripts: Scripts
}

export const ContentApp = ({ scripts }: ContentAppProps) => {
  return (
    <div className={styles.contentApp}>
      <MantineProvider forceColorScheme='dark'>
        <VideoPanel scripts={scripts} />
      </MantineProvider>
    </div>
  )
}
