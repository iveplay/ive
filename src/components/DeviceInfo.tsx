import clsx from 'clsx'
import { useShallow } from 'zustand/shallow'
import { useDeviceStore } from '@/store/useDeviceStore'
import styles from './DeviceInfo.module.scss'

interface DeviceInfoProps {
  type: 'handy' | 'buttplug'
}

export const DeviceInfo: React.FC<DeviceInfoProps> = ({ type }) => {
  const {
    handyConnected,
    buttplugConnected,
    handyDeviceInfo,
    buttplugDeviceInfo,
    isPlaying,
  } = useDeviceStore(
    useShallow((state) => ({
      handyConnected: state.handyConnected,
      buttplugConnected: state.buttplugConnected,
      handyDeviceInfo: state.handyDeviceInfo,
      buttplugDeviceInfo: state.buttplugDeviceInfo,
      isPlaying: state.isPlaying,
    })),
  )

  // Check connection status based on device type
  const isConnected = type === 'handy' ? handyConnected : buttplugConnected

  // Get display name
  const displayName = type === 'handy' ? 'Handy' : 'Intiface'

  return (
    <div
      className={clsx(
        styles.deviceInfo,
        isConnected ? styles.connected : styles.disconnected,
      )}
    >
      <h3 className={styles.title}>
        <span
          className={clsx(
            styles.statusDot,
            isConnected ? styles.connected : styles.disconnected,
          )}
        ></span>
        {displayName} {isConnected ? 'Connected' : 'Disconnected'}
      </h3>

      <ul className={styles.infoList}>
        {type === 'handy' && handyDeviceInfo && (
          <>
            <li className={styles.infoItem}>
              <span className={styles.label}>Firmware:</span>
              <span
                className={clsx(
                  styles.value,
                  !handyDeviceInfo?.firmware && styles.empty,
                )}
              >
                {handyDeviceInfo?.firmware || 'Not available'}
              </span>
            </li>
            <li className={styles.infoItem}>
              <span className={styles.label}>Hardware:</span>
              <span
                className={clsx(
                  styles.value,
                  !handyDeviceInfo?.hardware && styles.empty,
                )}
              >
                {handyDeviceInfo?.hardware || 'Not available'}
              </span>
            </li>
          </>
        )}

        {type === 'buttplug' && buttplugDeviceInfo && (
          <li className={styles.infoItem}>
            <span className={styles.label}>Devices:</span>
            <span
              className={clsx(
                styles.value,
                !buttplugDeviceInfo?.deviceCount && styles.empty,
              )}
            >
              {buttplugDeviceInfo?.deviceCount || 0} connected
            </span>
          </li>
        )}

        <li className={styles.infoItem}>
          <span className={styles.label}>Status:</span>
          <span
            className={clsx(
              styles.value,
              isPlaying ? styles.playing : styles.stopped,
            )}
          >
            {isPlaying ? 'Playing' : 'Stopped'}
          </span>
        </li>
      </ul>
    </div>
  )
}
