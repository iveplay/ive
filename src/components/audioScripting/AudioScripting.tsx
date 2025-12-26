import { IconWaveSquare } from '@tabler/icons-react'
import clsx from 'clsx'
import { AudioScriptingSettings } from '@/hooks/useAudioScripting'
import styles from './AudioScripting.module.scss'

type AudioScriptingProps = {
  isEnabled: boolean
  settings: AudioScriptingSettings
  onToggle: () => void
  onSettingsChange: (settings: Partial<AudioScriptingSettings>) => void
}

export const AudioScripting = ({
  isEnabled,
  settings,
  onToggle,
  onSettingsChange,
}: AudioScriptingProps) => {
  return (
    <div className={styles.container}>
      <button
        className={clsx(styles.toggleButton, { [styles.active]: isEnabled })}
        onClick={onToggle}
        title={isEnabled ? 'Disable Audio Scripting' : 'Enable Audio Scripting'}
      >
        <IconWaveSquare size={16} />
      </button>
    </div>
  )
}

// Separate settings panel component for use in VideoPanel
export const AudioScriptingSettingsPanel = ({
  settings,
  onSettingsChange,
}: {
  settings: AudioScriptingSettings
  onSettingsChange: (settings: Partial<AudioScriptingSettings>) => void
}) => {
  return (
    <div className={styles.settingsPanel}>
      <div className={styles.setting}>
        <label>
          <span>Energy</span>
          <span>{settings.energyBoost.toFixed(1)}x</span>
        </label>
        <input
          type='range'
          min='0.5'
          max='3'
          step='0.1'
          value={settings.energyBoost}
          onChange={(e) =>
            onSettingsChange({ energyBoost: parseFloat(e.target.value) })
          }
        />
      </div>
      <div className={styles.setting}>
        <label>
          <span>Speed</span>
          <span>{settings.strokeSpeed}</span>
        </label>
        <input
          type='range'
          min='50'
          max='400'
          step='10'
          value={settings.strokeSpeed}
          onChange={(e) =>
            onSettingsChange({ strokeSpeed: parseInt(e.target.value) })
          }
        />
      </div>
    </div>
  )
}
