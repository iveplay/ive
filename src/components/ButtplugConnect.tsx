import clsx from 'clsx'
import { useState, useEffect } from 'react'
import { useShallow } from 'zustand/shallow'
import { useDeviceStore } from '@/store/useDeviceStore'
import styles from './ButtplugConnect.module.scss'
import { DeviceInfo } from './DeviceInfo'

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

  // Load initial values from store
  useEffect(() => {
    setLocalServerUrl(buttplugServerUrl)
  }, [buttplugServerUrl])

  // Update device count when device info changes
  useEffect(() => {
    if (buttplugDeviceInfo && buttplugDeviceInfo.devices) {
      setDeviceCount(buttplugDeviceInfo.devices.length)
    } else {
      setDeviceCount(0)
    }
  }, [buttplugDeviceInfo])

  // Update server URL in store when input changes
  const handleServerUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (
      !buttplugDeviceInfo ||
      !buttplugDeviceInfo.devices ||
      buttplugDeviceInfo.devices.length === 0
    ) {
      return <div className={styles.noDevices}>No devices found</div>
    }

    return (
      <div className={styles.deviceList}>
        {buttplugDeviceInfo.devices.map((device: any, index: number) => (
          <div key={index} className={styles.deviceItem}>
            <div className={styles.deviceName}>{device.name}</div>
            <div className={styles.deviceFeatures}>
              {device.features.map((feature: string) => (
                <span key={feature} className={styles.feature}>
                  {feature}
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

      <DeviceInfo type='buttplug' />

      {buttplugConnected && renderDeviceList()}
    </div>
  )
}
