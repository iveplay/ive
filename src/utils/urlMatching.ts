import { IveEntry } from '@/types/ivedb'
import { getEntry, getVideoLookups } from '@/utils/iveDbUtils'

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
    const normalizedCurrentUrl = normalizeUrl(currentUrl)

    const videoLookups = await getVideoLookups()

    const matchingLookup = videoLookups.find((videoSource) => {
      const normalizedVideoUrl = normalizeUrl(videoSource.url)

      return (
        normalizedCurrentUrl.includes(normalizedVideoUrl) ||
        normalizedVideoUrl.includes(normalizedCurrentUrl)
      )
    })

    if (!matchingLookup) return undefined

    const entryDetails = await getEntry(matchingLookup.entryId)

    if (entryDetails) return entryDetails.entry

    return undefined
  } catch (error) {
    console.error('Error finding matching entry:', error)
    return undefined
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
