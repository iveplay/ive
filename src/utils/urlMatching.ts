import { IveEntry } from '@/types/ivedb'
import { getAllEntries, getEntry } from '@/utils/iveDbUtils'

const normalizeUrl = (url: string): string => {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/^[a-z]{2,3}\./, '') // Remove language prefixes like 'en.', 'de.'
    .toLowerCase()
}

// Find IveDB entry that matches current URL
export const findMatchingEntry = async (
  currentUrl: string,
): Promise<IveEntry | undefined> => {
  try {
    const allEntries = await getAllEntries()
    const normalizedCurrentUrl = normalizeUrl(currentUrl)

    for (const entry of allEntries) {
      const entryDetails = await getEntry(entry.id)
      if (!entryDetails) continue

      // Check if any video source URL matches
      const hasMatchingVideo = entryDetails.videoSources.some((videoSource) => {
        const normalizedVideoUrl = normalizeUrl(videoSource.url)

        return (
          normalizedCurrentUrl.includes(normalizedVideoUrl) ||
          normalizedVideoUrl.includes(normalizedCurrentUrl)
        )
      })

      if (hasMatchingVideo) {
        return entry
      }
    }

    return
  } catch (error) {
    console.error('Error finding matching entry:', error)
    return
  }
}

// Check if URL matches custom URLs from settings
export const matchesCustomUrls = (
  url: string,
  customUrls: string[],
): boolean => {
  const normalizedUrl = normalizeUrl(url)

  return customUrls.some((customUrl) => {
    const normalizedCustomUrl = normalizeUrl(customUrl)
    return normalizedUrl.includes(normalizedCustomUrl)
  })
}

// Get custom URLs from settings
export const getCustomUrls = async (): Promise<string[]> => {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'ive:get_state',
    })
    return response.customUrls || []
  } catch (error) {
    console.error('Error getting custom URLs:', error)
    return []
  }
}
