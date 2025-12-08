import { RangeSlider } from '@mantine/core'
import clsx from 'clsx'
import { useState, useEffect, ChangeEvent } from 'react'
import { useShallow } from 'zustand/shallow'
import { useDeviceStore } from '@/store/useDeviceStore'
import { DeviceInfo as DeviceInfoComp } from '../deviceInfo/DeviceInfo'
import styles from './ButtplugConnect.module.scss'

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
    buttplugStrokeMin,
    buttplugStrokeMax,
    error,
    connectButtplug,
    disconnectButtplug,
    scanForButtplugDevices,
    setButtplugServerUrl,
    setButtplugStrokeSettings,
    buttplugDeviceInfo,
  } = useDeviceStore(
    useShallow((state) => ({
      buttplugConnected: state.buttplugConnected,
      buttplugServerUrl: state.buttplugServerUrl,
      buttplugStrokeMin: state.buttplugStrokeMin || 0,
      buttplugStrokeMax: state.buttplugStrokeMax || 1,
      error: state.error,
      connectButtplug: state.connectButtplug,
      disconnectButtplug: state.disconnectButtplug,
      scanForButtplugDevices: state.scanForButtplugDevices,
      setButtplugServerUrl: state.setButtplugServerUrl,
      setButtplugStrokeSettings: state.setButtplugStrokeSettings,
      buttplugDeviceInfo: state.buttplugDeviceInfo,
    })),
  )

  const [localServerUrl, setLocalServerUrl] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [deviceCount, setDeviceCount] = useState(0)
  const [deviceList, setDeviceList] = useState<DeviceListItem[]>([])
  const [strokeRange, setStrokeRange] = useState<[number, number]>([0, 1])

  // Load initial values from store
  useEffect(() => {
    setLocalServerUrl(buttplugServerUrl)
  }, [buttplugServerUrl])

  useEffect(() => {
    setStrokeRange([buttplugStrokeMin, buttplugStrokeMax])
  }, [buttplugStrokeMin, buttplugStrokeMax])

  // Update device info when it changes
  useEffect(() => {
    if (buttplugDeviceInfo && buttplugDeviceInfo.devices) {
      setDeviceCount(
        typeof buttplugDeviceInfo.deviceCount === 'number'
          ? buttplugDeviceInfo.deviceCount
          : 0,
      )

      // Convert to our internal device list format
      const devices = (
        (buttplugDeviceInfo.devices || []) as DeviceListItem[]
      ).map((device: DeviceListItem) => {
        const features = Array.isArray(device.features)
          ? device.features.map((feature) => ({
              name: feature.name,
              type: feature.type,
            }))
          : []

        return {
          name: device.name,
          features,
        }
      })

      setDeviceList(devices)
    } else {
      setDeviceCount(0)
      setDeviceList([])
    }
  }, [buttplugDeviceInfo])

  // Check if any devices support linear movement
  const hasLinearDevices = deviceList.some((device) =>
    device.features.some((feature) => feature.name === 'linear'),
  )

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

  const handleStrokeRangeChange = (value: [number, number]) => {
    setStrokeRange(value)
  }

  const handleStrokeRangeChangeEnd = async (value: [number, number]) => {
    try {
      await setButtplugStrokeSettings(value[0], value[1])
    } catch (err) {
      console.error('Error changing stroke settings:', err)
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

      <DeviceInfoComp type='buttplug' />

      {buttplugConnected && renderDeviceList()}

      {buttplugConnected && hasLinearDevices && (
        <div className={styles.settings}>
          <h3 className={styles.title}>Linear Device Settings</h3>

          <div className={styles.settingsGroup}>
            <label
              htmlFor='buttplug-stroke-range'
              className={styles.settingLabel}
            >
              Stroke Range
              <span className={styles.valueDisplay}>
                {(strokeRange[0] * 100).toFixed(0)}% -{' '}
                {(strokeRange[1] * 100).toFixed(0)}%
              </span>
            </label>
            <RangeSlider
              id='buttplug-stroke-range'
              min={0}
              max={1}
              step={0.01}
              minRange={0.05}
              value={strokeRange}
              onChange={handleStrokeRangeChange}
              onChangeEnd={handleStrokeRangeChangeEnd}
              marks={[
                { value: 0, label: '0%' },
                { value: 0.5, label: '50%' },
                { value: 1, label: '100%' },
              ]}
              className={styles.slider}
              size='md'
              color='#7b024d'
              thumbSize={16}
            />
          </div>
        </div>
      )}
    </div>
  )
}
