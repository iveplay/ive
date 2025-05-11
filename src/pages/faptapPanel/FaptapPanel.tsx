import logoImg from '@/assets/logo.png'
import styles from './FaptapPanel.module.scss'

export const FaptapPanel = () => {
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
