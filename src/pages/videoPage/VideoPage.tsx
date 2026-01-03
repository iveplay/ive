import { useEffect } from 'react'
import { FloatingIframe } from '@/components/floatingIframe/FloatingIframe'
import { FloatingVideo } from '@/components/floatingVideo/FloatingVideo'
import { ScrubberHeatmap } from '@/components/heatmap/ScrubberHeatmap'
import { useDeviceSetup, useDeviceStore } from '@/store/useDeviceStore'
import { useSettingsStore, useSettingsSetup } from '@/store/useSettingsStore'
import { useVideoStore } from '@/store/useVideoStore'
import { IveEntry } from '@/types/ivedb'
import { VideoPanel } from '../videoPanel/VideoPanel'
import styles from './VideoPage.module.scss'

type VideoPageProps = {
  entry?: IveEntry
}

export const VideoPage = ({ entry }: VideoPageProps) => {
  useSettingsSetup()
  useDeviceSetup()

  const showHeatmap = useSettingsStore((state) => state.showHeatmap)
  const videoElement = useVideoStore((state) => state.videoElement)
  const searchForVideo = useVideoStore((state) => state.searchForVideo)
  const isFloating = useVideoStore((state) => state.isFloating)
  const activeScript = useVideoStore((state) => state.activeScript)
  const scriptUrl = useDeviceStore((state) => state.scriptUrl)

  const isAudioScriptingEnabled = useVideoStore(
    (state) => state.isAudioScriptingEnabled,
  )

  const isIvdbScript = scriptUrl?.startsWith('ivdb://')
  const shouldShowScriptHeatmap =
    showHeatmap && entry && scriptUrl === activeScript && !isIvdbScript
  const shouldShowHeatmap = shouldShowScriptHeatmap || isAudioScriptingEnabled
  const isInIframe = window !== window.top

  useEffect(() => {
    if (!videoElement) {
      searchForVideo()
    }
  }, [videoElement, searchForVideo])

  // Find iframe only if no video element exists
  const iframeElement =
    !videoElement &&
    document.querySelectorAll('iframe').length > 0 &&
    Array.from(document.querySelectorAll('iframe')).find((iframe) => {
      const src = iframe.src.toLowerCase()
      return (
        src.includes('player') ||
        src.includes('embed') ||
        src.includes('video') ||
        src.includes('mediadelivery') ||
        iframe.allowFullscreen
      )
    })

  const hasVideoIframes = !!iframeElement

  return (
    <div className={styles.videoPage}>
      <VideoPanel
        entry={entry}
        isIvdbScript={isIvdbScript}
        disableFloat={isInIframe}
        hasVideoIframes={hasVideoIframes}
      />
      {showHeatmap && !hasVideoIframes && <ScrubberHeatmap />}
      {isFloating && (
        <>
          {videoElement ? (
            <FloatingVideo
              videoElement={videoElement}
              shouldShowHeatmap={shouldShowHeatmap}
            />
          ) : (
            hasVideoIframes &&
            !isInIframe && <FloatingIframe iframeElement={iframeElement} />
          )}
        </>
      )}
    </div>
  )
}
