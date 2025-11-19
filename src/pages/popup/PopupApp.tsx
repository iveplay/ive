import { Burger, Drawer, ScrollArea, Text } from '@mantine/core'
import clsx from 'clsx'
import { ReactNode, useState, useEffect } from 'react'
import { useShallow } from 'zustand/shallow'
import DiscordIcon from '@/assets/discord.svg'
import logoImg from '@/assets/logo.png'
import PatreonIcon from '@/assets/patreon.svg'
import { ButtplugConnect } from '@/components/buttplugConnect/ButtplugConnect'
import { HandyConnect } from '@/components/handyConnect/HandyConnect'
import { Settings } from '@/components/settings/Settings'
import { useDeviceSetup, useDeviceStore } from '@/store/useDeviceStore'
import { useSettingsSetup } from '@/store/useSettingsStore'
import styles from './PopupApp.module.scss'

type NavItem = {
  id: string
  label: string
  component?: ReactNode
  onClick?: () => void
  visible: boolean
}

export const PopupApp = () => {
  const [opened, setOpened] = useState(false)
  const [activeItem, setActiveItem] = useState<string>()

  useDeviceSetup()
  useSettingsSetup()

  const { handyConnected, buttplugConnected, isLoaded } = useDeviceStore(
    useShallow((state) => ({
      handyConnected: state.handyConnected,
      buttplugConnected: state.buttplugConnected,
      isLoaded: state.isLoaded,
    })),
  )

  useEffect(() => {
    if (!isLoaded || activeItem) return

    if (buttplugConnected && !handyConnected) {
      setActiveItem('buttplug')
      return
    }

    setActiveItem('handy')
  }, [handyConnected, buttplugConnected, isLoaded, activeItem])

  const navItems: NavItem[] = [
    { id: 'handy', label: 'Handy', component: <HandyConnect />, visible: true },
    {
      id: 'buttplug',
      label: 'Intiface',
      component: <ButtplugConnect />,
      visible: true,
    },
    {
      id: 'settings',
      label: 'Settings',
      component: <Settings />,
      visible: true,
    },
  ]

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
        <a
          href={
            process.env.NODE_ENV === 'development'
              ? 'https://localhost:3000/hub'
              : 'https://iveplay.io/hub'
          }
          target='_blank'
          className={clsx('button primary', styles.hubButton)}
        >
          Hub
        </a>
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
            {navItems.map((item) =>
              !item.visible ? null : (
                <div
                  key={item.id}
                  className={`${styles.navItem} ${activeItem === item.id ? styles.active : ''}`}
                  onClick={() => {
                    if (item.onClick) {
                      item.onClick()
                      return
                    }
                    setActiveItem(item.id)
                    setOpened(false)
                  }}
                >
                  {item.label}
                </div>
              ),
            )}
          </div>
        </ScrollArea>
        <div className={styles.drawerFooter}>
          <a
            href='https://discord.gg/KsYCE4jRHE'
            target='_blank'
            rel='noopener noreferrer'
            className={styles.discordLink}
          >
            <DiscordIcon />
            Help & Support
          </a>
          <a
            href='https://patreon.com/iveplay'
            target='_blank'
            rel='noopener noreferrer'
            className={styles.supportLink}
          >
            <PatreonIcon />
            Support us
          </a>
          <Text size='xs' c='dimmed' ta='center' className={styles.versionText}>
            Version{' '}
            {process.env.NODE_ENV === 'development'
              ? 'DEV'
              : chrome.runtime.getManifest().version}
          </Text>
        </div>
      </Drawer>

      <main className={styles.content}>{currentItem.component}</main>
    </div>
  )
}
