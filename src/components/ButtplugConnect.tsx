import clsx from 'clsx'
import { useState, useEffect, ChangeEvent } from 'react'
import { useShallow } from 'zustand/shallow'
import { useDeviceStore } from '@/store/useDeviceStore'
import styles from './ButtplugConnect.module.scss'
import { DeviceInfo as DeviceInfoComponent } from './DeviceInfo'

// Type for device features
interface DeviceFeature {
  name: string
  type: 'vibrate' | 'rotate' | 'linear' | string
}

// Type for device in the list
interface DeviceListItem {
  name: string
  features: DeviceFeature[]
}

export const ButtplugConnect = () => {
  const {
    buttplugConnected,
    buttplugServerUrl,
    error,
    connectButtplug,
    disconnectButtplug,
    scanForButtplugDevices,
    setButtplugServerUrl,
    buttplugDeviceInfo,
  } = useDeviceStore(
    useShallow((state) => ({
      buttplugConnected: state.buttplugConnected,
      buttplugServerUrl: state.buttplugServerUrl,
      error: state.error,
      connectButtplug: state.connectButtplug,
      disconnectButtplug: state.disconnectButtplug,
      scanForButtplugDevices: state.scanForButtplugDevices,
      setButtplugServerUrl: state.setButtplugServerUrl,
      buttplugDeviceInfo: state.buttplugDeviceInfo,
    })),
  )

  const [localServerUrl, setLocalServerUrl] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [deviceCount, setDeviceCount] = useState(0)
  const [deviceList, setDeviceList] = useState<DeviceListItem[]>([])

  // Load initial values from store
  useEffect(() => {
    setLocalServerUrl(buttplugServerUrl)
  }, [buttplugServerUrl])

  // Update device info when it changes
  useEffect(() => {
    if (buttplugDeviceInfo && buttplugDeviceInfo.devices) {
      setDeviceCount(buttplugDeviceInfo.deviceCount || 0)

      // Convert to our internal device list format
      const devices = (buttplugDeviceInfo.devices || []).map(
        (device: DeviceListItem) => {
          const features = Array.isArray(device.features)
            ? device.features.map((feature) => ({
                name: feature,
                type: feature.type,
              }))
            : []

          return {
            name: device.name,
            features,
          }
        },
      )

      setDeviceList(devices)
    } else {
      setDeviceCount(0)
      setDeviceList([])
    }
  }, [buttplugDeviceInfo])

  // Update server URL in store when input changes
  const handleServerUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value
    setLocalServerUrl(newUrl)
    setButtplugServerUrl(newUrl)
  }

  const handleConnect = async () => {
    try {
      setIsConnecting(true)

      if (buttplugConnected) {
        await disconnectButtplug()
      } else {
        await connectButtplug(localServerUrl)
      }
    } catch (err) {
      console.error('Error during connect/disconnect:', err)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleScan = async () => {
    if (!buttplugConnected) return

    try {
      setIsScanning(true)
      await scanForButtplugDevices()
    } catch (err) {
      console.error('Error scanning for devices:', err)
    } finally {
      setIsScanning(false)
    }
  }

  // Render device list if there are devices
  const renderDeviceList = () => {
    if (deviceList.length === 0) {
      return <div className={styles.noDevices}>No devices found</div>
    }

    return (
      <div className={styles.deviceList}>
        {deviceList.map((device, index) => (
          <div key={index} className={styles.deviceItem}>
            <div className={styles.deviceName}>{device.name}</div>
            <div className={styles.deviceFeatures}>
              {device.features.map((feature, featureIndex) => (
                <span
                  key={featureIndex}
                  className={styles.feature}
                  data-feature={feature.type}
                >
                  {feature.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.buttplugConnect}>
      {error && !buttplugConnected && (
        <div className={styles.errorMessage}>{error}</div>
      )}

      <div className={styles.connectionForm}>
        <input
          type='text'
          className={clsx('input', styles.urlInput)}
          placeholder='ws://localhost:12345'
          value={localServerUrl}
          onChange={handleServerUrlChange}
          disabled={buttplugConnected || isConnecting}
        />

        <button
          className={clsx(
            'button primary',
            styles.connectButton,
            buttplugConnected && styles.connected,
            isConnecting && styles.connecting,
          )}
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting
            ? 'Connecting...'
            : buttplugConnected
              ? 'Disconnect'
              : 'Connect'}
        </button>
      </div>

      {buttplugConnected && (
        <div className={styles.scanControls}>
          <button
            className={clsx(
              'button primary',
              styles.scanButton,
              isScanning && styles.scanning,
            )}
            onClick={handleScan}
            disabled={isScanning || !buttplugConnected}
          >
            {isScanning ? 'Scanning...' : 'Scan for Devices'}
          </button>

          <div className={styles.deviceCount}>
            {deviceCount} device{deviceCount !== 1 ? 's' : ''} found
          </div>
        </div>
      )}

      <DeviceInfoComponent type='buttplug' />

      {buttplugConnected && renderDeviceList()}
    </div>
  )
}
