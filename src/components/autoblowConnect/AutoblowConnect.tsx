import { Slider } from '@mantine/core'
import clsx from 'clsx'
import { useState, useEffect, ChangeEvent } from 'react'
import { useShallow } from 'zustand/shallow'
import { useDeviceStore } from '@/store/useDeviceStore'
import { DeviceInfo } from '../deviceInfo/DeviceInfo'
import styles from './AutoblowConnect.module.scss'

export const AutoblowConnect = () => {
  const {
    autoblowConnected,
    autoblowDeviceToken,
    autoblowOffset,
    error,
    connectAutoblow,
    disconnectAutoblow,
    setAutoblowDeviceToken,
    setAutoblowOffset,
  } = useDeviceStore(
    useShallow((state) => ({
      autoblowConnected: state.autoblowConnected,
      autoblowDeviceToken: state.autoblowDeviceToken,
      autoblowOffset: state.autoblowOffset || 0,
      error: state.error,
      connectAutoblow: state.connectAutoblow,
      disconnectAutoblow: state.disconnectAutoblow,
      setAutoblowDeviceToken: state.setAutoblowDeviceToken,
      setAutoblowOffset: state.setAutoblowOffset,
    })),
  )

  const [localDeviceToken, setLocalDeviceToken] = useState('')
  const [currentOffset, setCurrentOffset] = useState(0)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    setLocalDeviceToken(autoblowDeviceToken)
  }, [autoblowDeviceToken])

  useEffect(() => {
    setCurrentOffset(autoblowOffset)
  }, [autoblowOffset])

  const handleDeviceTokenChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newToken = e.target.value
    setLocalDeviceToken(newToken)
    if (newToken.length >= 5) {
      setAutoblowDeviceToken(newToken)
    }
  }

  const handleConnect = async () => {
    try {
      setIsConnecting(true)

      if (autoblowConnected) {
        await disconnectAutoblow()
      } else {
        await connectAutoblow(localDeviceToken)
      }
    } catch (err) {
      console.error('Error during connect/disconnect:', err)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleOffsetChangeEnd = async (value: number) => {
    try {
      await setAutoblowOffset(value)
    } catch (err) {
      console.error('Error changing offset:', err)
    }
  }

  return (
    <div className={styles.autoblowConnect}>
      {error && !autoblowConnected && (
        <div className={styles.errorMessage}>{error}</div>
      )}

      <div className={styles.connectionForm}>
        <input
          type='text'
          className={clsx('input', styles.tokenInput)}
          placeholder='Enter device token'
          value={localDeviceToken}
          onChange={handleDeviceTokenChange}
          disabled={autoblowConnected || isConnecting}
        />

        <button
          className={clsx(
            'button primary',
            styles.connectButton,
            autoblowConnected && styles.connected,
            isConnecting && styles.connecting,
          )}
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting
            ? 'Connecting...'
            : autoblowConnected
              ? 'Disconnect'
              : 'Connect'}
        </button>
      </div>

      <DeviceInfo type='autoblow' />

      {autoblowConnected && (
        <div className={styles.settings}>
          <h3 className={styles.title}>Device Settings</h3>

          <div className={styles.settingsGroup}>
            <label htmlFor='autoblow-offset' className={styles.settingLabel}>
              Timing Offset
              <span className={styles.valueDisplay}>
                {currentOffset > 0 ? '+' : ''}
                {currentOffset}ms
              </span>
            </label>
            <Slider
              id='autoblow-offset'
              min={-500}
              max={500}
              value={currentOffset}
              onChange={setCurrentOffset}
              onChangeEnd={handleOffsetChangeEnd}
              marks={[
                { value: -500, label: '-500ms' },
                { value: 0, label: '0' },
                { value: 500, label: '+500ms' },
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
