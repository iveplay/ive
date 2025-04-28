import clsx from 'clsx'
import { useState, useRef } from 'react'
import { useShallow } from 'zustand/shallow'
import { useDeviceStore } from '@/store/useDeviceStore'
import styles from './ScriptControl.module.scss'

export const ScriptControl = () => {
  const {
    handyConnected,
    buttplugConnected,
    scriptLoaded,
    isPlaying,
    error,
    loadScriptFromUrl,
    loadScriptFile,
    play,
    stop,
  } = useDeviceStore(
    useShallow((state) => ({
      handyConnected: state.handyConnected,
      buttplugConnected: state.buttplugConnected,
      scriptLoaded: state.scriptLoaded,
      scriptUrl: state.scriptUrl,
      isPlaying: state.isPlaying,
      error: state.error,
      loadScriptFromUrl: state.loadScriptFromUrl,
      loadScriptFile: state.loadScriptFile,
      play: state.play,
      stop: state.stop,
      syncTime: state.syncTime,
    })),
  )

  const [localScriptUrl, setLocalScriptUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isAnyDeviceConnected = handyConnected || buttplugConnected

  const handleScriptUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalScriptUrl(e.target.value)
  }

  const handleLoadScript = async () => {
    if (!isAnyDeviceConnected || !localScriptUrl) {
      return
    }

    await stop()

    try {
      setIsLoading(true)
      await loadScriptFromUrl(localScriptUrl)
    } catch (err) {
      console.error('Error loading script:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return
    }

    await stop()

    try {
      setIsLoading(true)
      await loadScriptFile(e.target.files[0])
    } catch (err) {
      console.error('Error loading script file:', err)
    } finally {
      setIsLoading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleManualPlay = async () => {
    if (!scriptLoaded) return

    try {
      await play(0, 1.0, false)
    } catch (err) {
      console.error('Error starting manual playback:', err)
    }
  }

  const handleManualStop = async () => {
    try {
      await stop()
    } catch (err) {
      console.error('Error stopping manual playback:', err)
    }
  }

  return (
    <div className={styles.scriptControl}>
      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.scriptForm}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Script URL</label>
          <div className={styles.inputGroup}>
            <input
              type='text'
              className={clsx('input', styles.urlInput)}
              placeholder='https://example.com/script.funscript'
              value={localScriptUrl}
              onChange={handleScriptUrlChange}
              disabled={isLoading || !isAnyDeviceConnected}
            />
            <button
              className={clsx(
                'button primary',
                styles.loadButton,
                isLoading && styles.loading,
              )}
              onClick={handleLoadScript}
              disabled={isLoading || !isAnyDeviceConnected || !localScriptUrl}
            >
              {isLoading ? 'Loading...' : 'Load Script'}
            </button>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Upload Script File</label>
          <div className={styles.fileInputGroup}>
            <input
              ref={fileInputRef}
              type='file'
              accept='.funscript'
              className={clsx(styles.fileInput, isLoading && styles.loading)}
              onChange={handleFileChange}
              disabled={isLoading || !isAnyDeviceConnected}
            />
          </div>
        </div>
      </div>

      <div className={styles.playbackControls}>
        <div className={styles.statusInfo}>
          <div className={styles.scriptStatus}>
            Script Status:{' '}
            <span
              className={clsx(
                styles.statusText,
                scriptLoaded ? styles.loaded : styles.notLoaded,
              )}
            >
              {scriptLoaded ? 'Loaded' : 'Not Loaded'}
            </span>
          </div>

          <div className={styles.playStatus}>
            Playback Status:{' '}
            <span
              className={clsx(
                styles.statusText,
                isPlaying ? styles.playing : styles.stopped,
              )}
            >
              {isPlaying ? 'Playing' : 'Stopped'}
            </span>
          </div>
        </div>

        <div className={styles.manualControls}>
          <div className={styles.buttonGroup}>
            <button
              className={clsx(
                'button primary',
                styles.playButton,
                isPlaying && styles.hidden,
              )}
              onClick={handleManualPlay}
              disabled={!scriptLoaded}
            >
              Play
            </button>

            <button
              className={clsx(
                'button primary',
                styles.stopButton,
                !isPlaying && styles.hidden,
              )}
              onClick={handleManualStop}
            >
              Stop
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
