import { Burger, Drawer, ScrollArea, Text } from '@mantine/core'
import { useState } from 'react'
import logoImg from '@/assets/logo.png'
import PatreonIcon from '@/assets/patreon.svg'
import { ButtplugConnect } from '@/components/buttplugConnect/ButtplugConnect'
import { HandyConnect } from '@/components/handyConnect/HandyConnect'
import { ScriptControl } from '@/components/scriptControl/ScriptControl'
import { Settings } from '@/components/settings/Settings'
import { useDeviceSetup } from '@/store/useDeviceStore'
import styles from './PopupApp.module.scss'

type NavItem = {
  id: string
  label: string
  component: React.ReactNode
}

export const PopupApp = () => {
  const [opened, setOpened] = useState(false)
  const [activeItem, setActiveItem] = useState<string>('handy')

  useDeviceSetup()

  const navItems: NavItem[] = [
    { id: 'handy', label: 'Handy', component: <HandyConnect /> },
    { id: 'buttplug', label: 'Intiface', component: <ButtplugConnect /> },
    { id: 'settings', label: 'Settings', component: <Settings /> },
    { id: 'settings', label: 'Settings', component: <Settings /> },
    { id: 'settings', label: 'Settings', component: <Settings /> },
    { id: 'settings', label: 'Settings', component: <Settings /> },
  ]

  // Add Script tab only in dev mode
  if (import.meta.env.DEV) {
    navItems.push({
      id: 'script',
      label: 'Script',
      component: <ScriptControl />,
    })
  }

  const currentItem =
    navItems.find((item) => item.id === activeItem) || navItems[0]

  return (
    <div className={styles.popupApp}>
      <header className={styles.header}>
        <Burger
          opened={opened}
          onClick={() => setOpened((o) => !o)}
          size='sm'
          color='#fff'
          className={styles.burger}
        />
        <Text className={styles.title}>{currentItem.label}</Text>
      </header>

      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        size='50%'
        className={styles.drawer}
        withCloseButton={false}
      >
        <img
          src={chrome.runtime.getURL(logoImg)}
          alt='Logo'
          className={styles.logo}
        />
        <ScrollArea className={styles.scrollArea} type='always'>
          <div className={styles.navList}>
            {navItems.map((item) => (
              <div
                key={item.id}
                className={`${styles.navItem} ${activeItem === item.id ? styles.active : ''}`}
                onClick={() => {
                  setActiveItem(item.id)
                  setOpened(false)
                }}
              >
                {item.label}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className={styles.drawerFooter}>
          <a
            href='https://patreon.com/iveplay'
            target='_blank'
            rel='noopener noreferrer'
            className={styles.supportLink}
          >
            <PatreonIcon />
            Support us
          </a>
          <Text size='xs' c='dimmed' className={styles.versionText}>
            Version {chrome.runtime.getManifest().version}
          </Text>
        </div>
      </Drawer>

      <main className={styles.content}>{currentItem.component}</main>
    </div>
  )
}
