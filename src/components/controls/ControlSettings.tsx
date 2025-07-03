import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  IconSettings,
  IconPictureInPicture,
  IconChevronRight,
  IconHourglass,
  IconRotate3d,
  IconRectangle,
  IconMaximize,
} from '@tabler/icons-react'
import clsx from 'clsx'
import { useCallback, useRef, useState } from 'react'
import styles from './ControlSettings.module.scss'

type ControlSettingsProps = {
  handleSpeedChange: (speed: number) => void
  handlePictureInPicture: () => void
  onOrientationChange: (isVertical: boolean) => void
  isVertical: boolean
  isLiveContent?: boolean
  onTheaterMode?: () => void
  onFullscreen?: () => void
  isCompact?: boolean
  showSkipButtons?: boolean
  onSkip?: (seconds: number) => void
}

export const ControlSettings = ({
  handleSpeedChange,
  handlePictureInPicture,
  onOrientationChange,
  isVertical,
  isLiveContent,
  onTheaterMode,
  onFullscreen,
  isCompact = false,
}: ControlSettingsProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false)
  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const subMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Menu hover handlers
  const handleMenuMouseEnter = useCallback(() => {
    // Cancel any pending close timers when entering menu content
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current)
      menuTimeoutRef.current = null
    }
    setIsMenuOpen(true)
  }, [])

  const handleMenuMouseLeave = useCallback(() => {
    // Close menu when leaving menu content
    menuTimeoutRef.current = setTimeout(() => {
      setIsMenuOpen(false)
      setIsSubMenuOpen(false)
    }, 100)
  }, [])

  const handleTriggerMouseLeave = useCallback(() => {
    // Close menu when leaving trigger, but allow time to move to menu content
    menuTimeoutRef.current = setTimeout(() => {
      setIsMenuOpen(false)
      setIsSubMenuOpen(false)
    }, 500)
  }, [])

  const handleSubMenuMouseEnter = useCallback(() => {
    // Cancel any pending submenu close timers
    if (subMenuTimeoutRef.current) {
      clearTimeout(subMenuTimeoutRef.current)
      subMenuTimeoutRef.current = null
    }
    setIsSubMenuOpen(true)
  }, [])

  const handleSubMenuMouseLeave = useCallback(() => {
    subMenuTimeoutRef.current = setTimeout(() => {
      setIsSubMenuOpen(false)
    }, 100)
  }, [])

  return (
    <DropdownMenu.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className={clsx(styles.controlButton, styles.menuTrigger)}
          aria-label='Settings'
          onClick={handleMenuMouseEnter}
          onMouseLeave={handleTriggerMouseLeave}
        >
          <IconSettings size={16} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={styles.menuContent}
          side='top'
          align='end'
          sideOffset={8}
          onMouseEnter={handleMenuMouseEnter}
          onMouseLeave={handleMenuMouseLeave}
        >
          <DropdownMenu.Item
            className={styles.menuItem}
            onClick={handlePictureInPicture}
          >
            <IconPictureInPicture size={14} />
            Picture in Picture
          </DropdownMenu.Item>

          <DropdownMenu.Separator className={styles.menuSeparator} />
          <DropdownMenu.Item
            className={styles.menuItem}
            onClick={() => onOrientationChange(!isVertical)}
          >
            <IconRotate3d size={14} />
            {isVertical ? 'Horizontal' : 'Vertical'} orientation
          </DropdownMenu.Item>

          {isCompact && (
            <>
              <DropdownMenu.Separator className={styles.menuSeparator} />
              <DropdownMenu.Item
                className={styles.menuItem}
                onClick={onTheaterMode}
              >
                <IconRectangle size={14} />
                Theater Mode
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className={styles.menuItem}
                onClick={onFullscreen}
              >
                <IconMaximize size={14} />
                Fullscreen
              </DropdownMenu.Item>
            </>
          )}
          {!isLiveContent && (
            <>
              <DropdownMenu.Separator className={styles.menuSeparator} />
              <DropdownMenu.Sub
                open={isSubMenuOpen}
                onOpenChange={setIsSubMenuOpen}
              >
                <DropdownMenu.SubTrigger
                  className={styles.menuSubTrigger}
                  onMouseEnter={handleSubMenuMouseEnter}
                >
                  <div style={{ flex: 1 }}>
                    <IconHourglass size={14} style={{ marginRight: 8 }} />
                    Playback Speed
                  </div>
                  <IconChevronRight size={14} className={styles.chevron} />
                </DropdownMenu.SubTrigger>

                <DropdownMenu.Portal>
                  <DropdownMenu.SubContent
                    className={styles.menuContent}
                    sideOffset={2}
                    alignOffset={-5}
                    onClick={handleSubMenuMouseEnter}
                    onMouseLeave={handleSubMenuMouseLeave}
                  >
                    <DropdownMenu.Item
                      className={styles.menuItem}
                      onClick={() => handleSpeedChange(0.5)}
                    >
                      0.5x
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className={styles.menuItem}
                      onClick={() => handleSpeedChange(1)}
                    >
                      1x (Normal)
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className={styles.menuItem}
                      onClick={() => handleSpeedChange(1.25)}
                    >
                      1.25x
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className={styles.menuItem}
                      onClick={() => handleSpeedChange(1.5)}
                    >
                      1.5x
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className={styles.menuItem}
                      onClick={() => handleSpeedChange(2)}
                    >
                      2x
                    </DropdownMenu.Item>
                  </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
