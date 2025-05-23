import { Slider, RangeSlider } from '@mantine/core'
import clsx from 'clsx'
import { useState, useEffect, ChangeEvent } from 'react'
import { useShallow } from 'zustand/shallow'
import { useDeviceStore } from '@/store/useDeviceStore'
import { DeviceInfo } from '../deviceInfo/DeviceInfo'
import styles from './HandyConnect.module.scss'

export const HandyConnect = () => {
  const {
    handyConnected,
    handyConnectionKey,
    handyOffset,
    handyStrokeMin,
    handyStrokeMax,
    error,
    connectHandy,
    disconnectHandy,
    setHandyOffset,
    setHandyStrokeSettings,
    setHandyConnectionKey,
  } = useDeviceStore(
    useShallow((state) => ({
      handyConnected: state.handyConnected,
      handyConnectionKey: state.handyConnectionKey,
      handyOffset: state.handyOffset,
      handyStrokeMin: state.handyStrokeMin,
      handyStrokeMax: state.handyStrokeMax,
      error: state.error,
      connectHandy: state.connectHandy,
      disconnectHandy: state.disconnectHandy,
      setHandyOffset: state.setHandyOffset,
      setHandyStrokeSettings: state.setHandyStrokeSettings,
      setHandyConnectionKey: state.setHandyConnectionKey,
    })),
  )

  const [localConnectionKey, setLocalConnectionKey] = useState('')
  const [currentOffset, setCurrentOffset] = useState(0)
  const [strokeRange, setStrokeRange] = useState<[number, number]>([0, 1])
  const [isConnecting, setIsConnecting] = useState(false)

  // Load initial values from store
  useEffect(() => {
    setLocalConnectionKey(handyConnectionKey)
  }, [handyConnectionKey])

  useEffect(() => {
    setCurrentOffset(handyOffset)
  }, [handyOffset])

  useEffect(() => {
    setStrokeRange([handyStrokeMin, handyStrokeMax])
  }, [handyStrokeMin, handyStrokeMax])

  // Update connection key in background when input changes
  const handleConnectionKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value
    setLocalConnectionKey(newKey)

    // Debounce the update to store
    if (newKey.length >= 5) {
      setHandyConnectionKey(newKey)
    }
  }

  const handleConnect = async () => {
    try {
      setIsConnecting(true)

      if (handyConnected) {
        await disconnectHandy()
      } else {
        await connectHandy(localConnectionKey)
      }
    } catch (err) {
      console.error('Error during connect/disconnect:', err)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleOffsetChangeEnd = async (value: number) => {
    try {
      await setHandyOffset(value)
    } catch (err) {
      console.error('Error changing offset:', err)
    }
  }

  const handleStrokeRangeChange = (value: [number, number]) => {
    setStrokeRange(value)
  }

  const handleStrokeRangeChangeEnd = async (value: [number, number]) => {
    try {
      await setHandyStrokeSettings(value[0], value[1])
    } catch (err) {
      console.error('Error changing stroke settings:', err)
    }
  }

  return (
    <div className={styles.handyConnect}>
      {error && !handyConnected && (
        <div className={styles.errorMessage}>{error}</div>
      )}

      <div className={styles.connectionForm}>
        <input
          type='text'
          className={clsx('input', styles.keyInput)}
          placeholder='Enter connection key'
          value={localConnectionKey}
          onChange={handleConnectionKeyChange}
          disabled={handyConnected || isConnecting}
        />

        <button
          className={clsx(
            'button primary',
            styles.connectButton,
            handyConnected && styles.connected,
            isConnecting && styles.connecting,
          )}
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting
            ? 'Connecting...'
            : handyConnected
              ? 'Disconnect'
              : 'Connect'}
        </button>
      </div>

      <DeviceInfo type='handy' />

      {!handyConnected && (
        <p className={styles.handyAffiliate}>
          Don't have the best
          <br />
          interactive stroker toy yet?
          <br />
          Check out{' '}
          <a
            href='https://www.thehandy.com/?ref=otjlmgq&utm_source=otjlmgq&utm_medium=affiliate&utm_campaign=The+Handy+Affiliate+program'
            target='_blank'
          >
            The Handy
          </a>
          .
        </p>
      )}

      {handyConnected && (
        <div className={styles.settings}>
          <h3 className={styles.title}>Device Settings</h3>

          <div className={styles.settingsGroup}>
            <label htmlFor='offset' className={styles.settingLabel}>
              Timing Offset
              <span className={styles.valueDisplay}>
                {currentOffset > 0 ? '+' : ''}
                {currentOffset}ms
              </span>
            </label>
            <Slider
              id='offset'
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

          <div className={styles.settingsGroup}>
            <label htmlFor='stroke-range' className={styles.settingLabel}>
              Stroke Range
              <span className={styles.valueDisplay}>
                {(strokeRange[0] * 100).toFixed(0)}% -{' '}
                {(strokeRange[1] * 100).toFixed(0)}%
              </span>
            </label>
            <RangeSlider
              id='stroke-range'
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
