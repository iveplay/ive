import { useState } from 'react'
import { ButtplugConnect } from '@/components/buttplugConnect/ButtplugConnect'
import { HandyConnect } from '@/components/handyConnect/HandyConnect'
import { ScriptControl } from '@/components/scriptControl/ScriptControl'
import { Settings } from '@/components/settings/Settings'
import { useDeviceSetup } from '@/store/useDeviceStore'
import styles from './PopupApp.module.scss'

type TabType = 'handy' | 'buttplug' | 'script' | 'settings'

export const PopupApp = () => {
  const [activeTab, setActiveTab] = useState<TabType>('handy')

  useDeviceSetup()

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'buttplug':
        return <ButtplugConnect />
      case 'script':
        return <ScriptControl />
      case 'settings':
        return <Settings />
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
          <li
            className={`${styles.tabItem} ${activeTab === 'settings' ? styles.active : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
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
