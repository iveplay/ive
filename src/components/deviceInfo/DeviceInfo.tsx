import clsx from 'clsx'
import { useShallow } from 'zustand/shallow'
import { useDeviceStore } from '@/store/useDeviceStore'
import styles from './DeviceInfo.module.scss'

interface DeviceInfoProps {
  type: 'handy' | 'buttplug' | 'autoblow'
}

export const DeviceInfo: React.FC<DeviceInfoProps> = ({ type }) => {
  const {
    handyConnected,
    buttplugConnected,
    autoblowConnected,
    handyDeviceInfo,
    buttplugDeviceInfo,
    autoblowDeviceInfo,
  } = useDeviceStore(
    useShallow((state) => ({
      handyConnected: state.handyConnected,
      buttplugConnected: state.buttplugConnected,
      autoblowConnected: state.autoblowConnected,
      handyDeviceInfo: state.handyDeviceInfo,
      buttplugDeviceInfo: state.buttplugDeviceInfo,
      autoblowDeviceInfo: state.autoblowDeviceInfo,
    })),
  )

  // Check connection status based on device type
  const isConnected =
    type === 'handy'
      ? handyConnected
      : type === 'buttplug'
        ? buttplugConnected
        : autoblowConnected

  // Get display name
  const displayName =
    type === 'handy' ? 'Handy' : type === 'buttplug' ? 'Intiface' : 'Autoblow'

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
              {String(buttplugDeviceInfo?.deviceType || 0)} connected
            </span>
          </li>
        )}

        {type === 'autoblow' && autoblowDeviceInfo && (
          <>
            <li className={styles.infoItem}>
              <span className={styles.label}>Device:</span>
              <span
                className={clsx(
                  styles.value,
                  !autoblowDeviceInfo?.deviceType && styles.empty,
                )}
              >
                {String(autoblowDeviceInfo?.deviceType || 'Unknown')}
              </span>
            </li>
            <li className={styles.infoItem}>
              <span className={styles.label}>Firmware:</span>
              <span
                className={clsx(
                  styles.value,
                  !autoblowDeviceInfo?.firmware && styles.empty,
                )}
              >
                {autoblowDeviceInfo?.firmware || 'Not available'}
              </span>
            </li>
          </>
        )}
      </ul>
    </div>
  )
}
