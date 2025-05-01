import logoImg from '@/assets/logo.png'
import styles from './LoadPanel.module.scss'

type LoadPanelProps = {
  page: string
}

export const LoadPanel = ({ page }: LoadPanelProps) => {
  console.log('LoadPanel page:', page)
  return (
    <button className={styles.openPanel}>
      <img
        src={chrome.runtime.getURL(logoImg)}
        alt='Logo'
        className={styles.logo}
      />
    </button>
  )
}
