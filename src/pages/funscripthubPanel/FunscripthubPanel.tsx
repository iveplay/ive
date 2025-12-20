import clsx from 'clsx'
import { useState, useEffect } from 'react'
import logoImg from '@/assets/logo.png'
import { CreateIveEntryData } from '@/types/ivedb'
import { createEntry } from '@/utils/iveDbUtils'
import styles from './FunscripthubPanel.module.scss'

type VideoLink = {
  url: string
  label: string
}

type ScriptLink = {
  url: string
  name: string
}

const getAllLinks = () => {
  const videoLinks: VideoLink[] = []
  const scriptLinks: ScriptLink[] = []
  const container = document.querySelector(
    '#app > div > div:nth-child(2) > div > div > div.lg\\:col-start-3.lg\\:row-end-1 > div.rounded-lg.bg-gray-50.shadow-sm.ring-1.ring-gray-900\\/5 > dl',
  )

  if (container) {
    const links = container.querySelectorAll('a[href]')
    links.forEach((link) => {
      const href = link.getAttribute('href')
      const text = link.textContent?.trim()

      if (href && text && !text.endsWith('.twist.funscript')) {
        if (href.endsWith('.funscript')) {
          scriptLinks.push({
            url: href,
            name: text.replace('.funscript', ''),
          })
        } else {
          try {
            const hostname = new URL(href).hostname
            videoLinks.push({
              url: href,
              label: hostname,
            })
          } catch {
            // Skip invalid URLs
          }
        }
      }
    })
  }

  return { videoLinks, scriptLinks }
}

export const FunscripthubPanel = () => {
  const [selectedVideo, setSelectedVideo] = useState('')
  const [selectedScript, setSelectedScript] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [videoLinks, setVideoLinks] = useState<VideoLink[]>([])
  const [scriptLinks, setScriptLinks] = useState<ScriptLink[]>([])

  useEffect(() => {
    let attempts = 0
    let timeoutId: NodeJS.Timeout | null = null

    const recheckLinks = () => {
      const { videoLinks, scriptLinks } = getAllLinks()

      if (videoLinks.length > 0 || scriptLinks.length > 0) {
        setVideoLinks(videoLinks)
        setScriptLinks(scriptLinks)

        // Auto-select if only one option is available
        if (videoLinks.length === 1 && !selectedVideo) {
          setSelectedVideo(videoLinks[0].url)
        }
        if (scriptLinks.length === 1 && !selectedScript) {
          setSelectedScript(scriptLinks[0].url)
        }
        return
      }

      attempts++
      if (attempts < 3) {
        timeoutId = setTimeout(recheckLinks, 1000)
      }
    }

    recheckLinks()

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [selectedScript, selectedVideo])

  const handleLoad = async () => {
    if (!selectedVideo || !selectedScript) return

    setIsLoading(true)
    try {
      const realScriptUrl = await chrome.runtime.sendMessage({
        type: 'ive:extract_script_url',
        url: selectedScript,
      })

      if (!realScriptUrl) {
        throw new Error(
          'Failed to extract script URL from Cloudflare protection',
        )
      }

      const title =
        document
          .querySelector(
            '#app > div > div:nth-child(2) > div > div > div.-mx-4.px-4.py-4.shadow-sm.ring-1.ring-gray-900\\/5.sm\\:mx-0.sm\\:rounded-lg.lg\\:col-span-2.lg\\:row-span-2.lg\\:row-end-2.lg\\:px-8.lg\\:py-8 > h2',
          )
          ?.textContent?.trim() || 'FunScriptHub'
      const authorLink: HTMLAnchorElement | null = document.querySelector(
        '#app > div > div:nth-child(2) > div > div > div.-mx-4.px-4.py-4.shadow-sm.ring-1.ring-gray-900\\/5.sm\\:mx-0.sm\\:rounded-lg.lg\\:col-span-2.lg\\:row-span-2.lg\\:row-end-2.lg\\:px-8.lg\\:py-8 > dl > div.mt-6.border-t.border-gray-900\\/5.pt-6.sm\\:pr-4 > dd > span > a',
      )
      const thumbnail = document
        .querySelector(
          '#app > div > div:nth-child(2) > div > div > div.-mx-4.px-4.py-4.shadow-sm.ring-1.ring-gray-900\\/5.sm\\:mx-0.sm\\:rounded-lg.lg\\:col-span-2.lg\\:row-span-2.lg\\:row-end-2.lg\\:px-8.lg\\:py-8 > div > img',
        )
        ?.getAttribute('src')
      const durationText = document
        .querySelector(
          '#app > div > div:nth-child(2) > div > div > div.-mx-4.px-4.py-4.shadow-sm.ring-1.ring-gray-900\\/5.sm\\:mx-0.sm\\:rounded-lg.lg\\:col-span-2.lg\\:row-span-2.lg\\:row-end-2.lg\\:px-8.lg\\:py-8 > dl > div.mt-8.sm\\:mt-6.sm\\:border-t.sm\\:border-gray-900\\/5.sm\\:pl-4.sm\\:pt-6 > div:nth-child(1) > dd',
        )
        ?.textContent?.trim()
      const duration = durationText
        ?.split(':')
        .map(Number)
        .reduce((ms, time, index) => {
          const multipliers = [3600000, 60000, 1000]
          return ms + time * multipliers[index]
        }, 0)

      const creator = authorLink?.textContent?.trim() || 'Unknown'
      const selectedScriptName =
        scriptLinks.find((s) => s.url === selectedScript)?.name || title

      const createData: CreateIveEntryData = {
        title: title || selectedScriptName,
        tags: ['funscripthub'],
        thumbnail: thumbnail || undefined,
        duration: duration || undefined,
        videoSources: [
          {
            url: selectedVideo,
            status: 'working' as const,
          },
        ],
        scripts: [
          {
            name: selectedScriptName,
            url: realScriptUrl,
            creator,
            supportUrl: authorLink?.href || '',
          },
        ],
      }

      await createEntry(createData)
      window.open(selectedVideo, '_blank')
    } catch (error) {
      console.error('Error loading script:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <img
        src={chrome.runtime.getURL(logoImg)}
        alt='IVE'
        className={styles.logo}
      />
      <select
        className={styles.select}
        value={selectedVideo}
        onChange={(e) => setSelectedVideo(e.target.value)}
        disabled={isLoading}
      >
        <option value=''>Choose video...</option>
        {videoLinks.map((video, index) => (
          <option key={index} value={video.url}>
            {video.label}
          </option>
        ))}
      </select>
      <select
        className={styles.select}
        value={selectedScript}
        onChange={(e) => setSelectedScript(e.target.value)}
        disabled={isLoading}
      >
        <option value=''>Choose script...</option>
        {scriptLinks.map((script, index) => (
          <option key={index} value={script.url}>
            {script.name}
          </option>
        ))}
      </select>
      <button
        className={clsx(styles.loadButton, { [styles.loading]: isLoading })}
        onClick={handleLoad}
        disabled={!selectedVideo || !selectedScript || isLoading}
      >
        {isLoading ? 'Loading...' : 'Load & Play'}
      </button>
    </div>
  )
}
