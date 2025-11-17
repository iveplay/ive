import { IveEntry } from '@/types/ivedb'
import { getEntryWithDetails, getVideoLookups } from '@/utils/iveDbUtils'

const normalizeUrl = (url: string): string => {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/^[a-z]{2,3}\./, '') // Remove language prefixes like 'en.', 'de.'
    .toLowerCase()
}

const isRootDomain = (url: string): boolean => {
  // Check if URL is just a domain without path (or only has trailing slash)
  const normalized = normalizeUrl(url)
  const pathPart = normalized.split('/')[1] // Get everything after domain
  return !pathPart || pathPart === ''
}

// Find IveDB entry that matches current URL
export const findMatchingEntry = async (
  currentUrl: string,
): Promise<IveEntry | undefined> => {
  try {
    const normalizedCurrentUrl = normalizeUrl(currentUrl)
    const currentIsRoot = isRootDomain(currentUrl)

    const videoLookups = await getVideoLookups()

    const matchingLookup = videoLookups.find((videoSource) => {
      const normalizedVideoUrl = normalizeUrl(videoSource.url)
      const videoIsRoot = isRootDomain(videoSource.url)

      // If both are root domains, they must match exactly
      if (currentIsRoot && videoIsRoot) {
        return normalizedCurrentUrl === normalizedVideoUrl
      }

      // If only one is root, no match
      if (currentIsRoot || videoIsRoot) {
        return false
      }

      // Both have paths - do substring matching
      return (
        normalizedCurrentUrl.includes(normalizedVideoUrl) ||
        normalizedVideoUrl.includes(normalizedCurrentUrl)
      )
    })

    if (!matchingLookup) return undefined

    const entryDetails = await getEntryWithDetails(matchingLookup.entryId)

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
  const urlIsRoot = isRootDomain(url)

  return customUrls.some((customUrl) => {
    const normalizedCustomUrl = normalizeUrl(customUrl)
    const customIsRoot = isRootDomain(customUrl)

    // If both are root domains, they must match exactly
    if (urlIsRoot && customIsRoot) {
      return normalizedUrl === normalizedCustomUrl
    }

    // If only one is root, no match
    if (urlIsRoot || customIsRoot) {
      return false
    }

    // Both have paths - do substring matching
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
