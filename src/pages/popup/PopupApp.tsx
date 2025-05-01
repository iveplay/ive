import { useState } from 'react'
import { ButtplugConnect } from '@/components/buttplugConnect/ButtplugConnect'
import { HandyConnect } from '@/components/handyConnect/HandyConnect'
import { ScriptControl } from '@/components/scriptControl/ScriptControl'
import { useDeviceSetup } from '@/store/useDeviceStore'
import styles from './PopupApp.module.scss'

type TabType = 'handy' | 'buttplug' | 'script'

export const PopupApp = () => {
  const [activeTab, setActiveTab] = useState<TabType>('script')

  useDeviceSetup()

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'buttplug':
        return <ButtplugConnect />
      case 'script':
        return <ScriptControl />
      case 'handy':
      default:
        return <HandyConnect />
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
            Intiface
          </li>
          {import.meta.env.DEV && (
            <li
              className={`${styles.tabItem} ${activeTab === 'script' ? styles.active : ''}`}
              onClick={() => setActiveTab('script')}
            >
              Script
            </li>
          )}
        </ul>
      </nav>

      <main className={styles.content}>{renderActiveTab()}</main>
    </div>
  )
}
