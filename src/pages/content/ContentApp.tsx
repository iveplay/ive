import { VideoPanel } from '@/components/videoPanel/VideoPanel'
import { Scripts } from '@/types/script'
import styles from './ContentApp.module.scss'

type ContentAppProps = {
  scripts: Scripts
}

export const ContentApp = ({ scripts }: ContentAppProps) => {
  return (
    <div className={styles.contentApp}>
      <VideoPanel scripts={scripts} />
    </div>
  )
}
