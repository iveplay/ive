import { useState } from 'react'
import { ButtplugConnect } from '@/components/ButtplugConnect'
import { HandyConnect } from '@/components/HandyConnect'
import { ScriptControl } from '@/components/ScriptControl'
import { useDeviceSetup } from '@/store/useDeviceStore'
import styles from './PopupApp.module.scss'

type TabType = 'handy' | 'buttplug' | 'script'

export const PopupApp = () => {
  const [activeTab, setActiveTab] = useState<TabType>('script')

  useDeviceSetup()

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'handy':
        return <HandyConnect />
      case 'buttplug':
        return <ButtplugConnect />
      case 'script':
      default:
        return <ScriptControl />
    }
  }

  return (
    <div className={styles.popupApp}>
      <nav className={styles.navigation}>
        <ul className={styles.tabList}>
          <li
            className={`${styles.tabItem} ${activeTab === 'handy' ? styles.active : ''}`}
            onClick={() => setActiveTab('handy')}
          >
            Handy
          </li>
          <li
            className={`${styles.tabItem} ${activeTab === 'buttplug' ? styles.active : ''}`}
            onClick={() => setActiveTab('buttplug')}
          >
            Buttplug
          </li>
          <li
            className={`${styles.tabItem} ${activeTab === 'script' ? styles.active : ''}`}
            onClick={() => setActiveTab('script')}
          >
            Script
          </li>
        </ul>
      </nav>

      <main className={styles.content}>{renderActiveTab()}</main>
    </div>
  )
}
