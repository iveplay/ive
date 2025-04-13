import { useState, useRef, useEffect } from 'react'
import styles from './Navigation.module.scss'

type Screen = {
  id: string
  label: string
}

type NavigationProps = {
  activeScreen: string
  onNavigate: (screen: string) => void
}

export const Navigation = ({ activeScreen, onNavigate }: NavigationProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const screens: Screen[] = [
    { id: 'device', label: 'Connect Handy' },
    { id: 'preferences', label: 'Preferences' },
  ]

  const activeScreenLabel =
    screens.find((screen) => screen.id === activeScreen)?.label || 'Device'

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className={styles.navigation}>
      <h2 className={styles.pageTitle}>{activeScreenLabel}</h2>

      <div className={styles.dropdownContainer} ref={dropdownRef}>
        <button
          className={styles.menuButton}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <span className={styles.menuIcon}>☰</span>
        </button>

        {isDropdownOpen && (
          <div className={styles.dropdown}>
            {screens.map((screen) => (
              <button
                key={screen.id}
                className={`${styles.dropdownItem} ${activeScreen === screen.id ? styles.active : ''}`}
                onClick={() => {
                  onNavigate(screen.id)
                  setIsDropdownOpen(false)
                }}
              >
                {screen.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
